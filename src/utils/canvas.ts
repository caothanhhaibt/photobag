import { CapturedPhoto, FrameColor, StripLayout, FrameStyle, SlotCustomization, PlacedSticker, CameraCalibrationConfig, ColorWheelValue } from '../types';
import { FILTER_PRESETS, FRAME_COLORS, LAYOUT_OPTIONS } from '../constants/filters';

/**
 * Load image as HTMLImageElement with cross-origin handling
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Apply CSS-like filter directly onto a Canvas 2D context
 */
export function applyFilterToContext(
  ctx: CanvasRenderingContext2D,
  filterId: string,
  intensity: number
) {
  const preset = FILTER_PRESETS.find((p) => p.id === filterId);
  if (!preset || filterId === 'original' || intensity === 0) {
    ctx.filter = 'none';
    return;
  }

  try {
    ctx.filter = preset.filterCss(intensity) || 'none';
  } catch {
    ctx.filter = 'none';
  }
}

// ============================================================================
// CÂN CHỈNH CAMERA GỐC (Admin) — dựng chuỗi CSS filter cho phần "nước ảnh" cơ bản (sáng/tương
// phản/bão hòa/tông ấm-lạnh), và toàn bộ luồng xử lý để bake (nướng) lớp cân chỉnh này thẳng vào
// ảnh chụp ra — áp dụng TRƯỚC khi tới phong cách lọc màu khách tự chọn (việc đó vẫn xử lý riêng ở
// applyFilterToContext như cũ, tại thời điểm ghép ảnh vào tờ in).
// ============================================================================

/**
 * Xấp xỉ (KHÔNG chính xác 100%) lớp "Cân Chỉnh Camera Gốc" thành 1 chuỗi CSS filter — dùng riêng
 * cho khung xem trực tiếp (video đang chạy, ví dụ khung xem trước của khách ở CameraScreen), vì CSS
 * filter không thể tính đúng công thức 3 bánh xe màu tách theo vùng tông (tối/trung/sáng) như
 * applyColorWheelGrading bên dưới — nơi đó mới là công thức THẬT áp lên ảnh đã chụp.
 * Lấy bánh xe VÙNG TRUNG (midtones) làm đại diện vì đây là vùng chiếm phần lớn khung hình (da mặt,
 * nền), cộng thêm độ sáng trung bình của cả 3 vùng — đủ để khung xem trực tiếp không bị lệch tông
 * quá xa so với ảnh chụp thật ra, dù không khớp tuyệt đối.
 */
export function buildCalibrationCssFilter(calib?: CameraCalibrationConfig | null): string {
  if (!calib) return 'none';
  const parts: string[] = [];

  const avgLuminance = (calib.shadows.luminance + calib.midtones.luminance + calib.highlights.luminance) / 3;
  if (avgLuminance) parts.push(`brightness(${100 + avgLuminance}%)`);

  const { x, y } = calib.midtones;
  const strength = Math.min(1, Math.sqrt(x * x + y * y));
  if (strength > 0.02) {
    const hueDeg = (Math.atan2(y, x) * 180) / Math.PI;
    const isWarm = Math.cos((hueDeg * Math.PI) / 180) >= 0;
    // Ấm (hue gần 0°) đẩy qua sepia (ánh vàng cam ấm), lạnh (hue gần 180°) xoay nhẹ hue về phía
    // xanh — CSS không có "chỉnh cân bằng trắng" thật sự nên đây là cách xấp xỉ, cùng kiểu đang
    // dùng cho các phong cách lọc màu có sẵn ở FILTER_PRESETS (sepia/hue-rotate).
    if (isWarm) {
      parts.push(`sepia(${Math.min(30, strength * 35)}%) saturate(${100 + strength * 15}%)`);
    } else {
      parts.push(`hue-rotate(${-strength * 20}deg) saturate(${100 + strength * 10}%)`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Chuyển 1 bánh xe màu (x/y trong hình tròn bán kính 1) thành góc màu (độ) + độ mạnh (0-1) — góc
 * dùng làm hue khi đổ tint, độ mạnh = khoảng cách từ tâm bánh xe (0 = giữa = không đẩy màu).
 */
function wheelToHueStrength(wheel: ColorWheelValue): { hueDeg: number; strength: number } {
  const strength = Math.min(1, Math.sqrt(wheel.x * wheel.x + wheel.y * wheel.y));
  const hueDeg = (Math.atan2(wheel.y, wheel.x) * 180) / Math.PI;
  return { hueDeg, strength };
}

/**
 * Đổi 1 góc màu (độ) + độ bão hòa (0-1) thành RGB tint quanh mức xám trung tính 128 (dùng công thức
 * HSL với L=0.5) — dùng để đổ màu ngả theo đúng hướng đã kéo bánh xe.
 */
function hueToRgbTint(hueDeg: number): [number, number, number] {
  const h = (((hueDeg % 360) + 360) % 360) / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  // L=0.5, S=1 → q = L*(1+S) = 1, p = 2L - q = 0
  const r = hue2rgb(0, 1, h + 1 / 3);
  const g = hue2rgb(0, 1, h);
  const b = hue2rgb(0, 1, h - 1 / 3);
  return [r * 255, g * 255, b * 255];
}

/**
 * THUẬT TOÁN CHÍNH của "Bánh Xe Màu 3 Vùng Tông" kiểu Blackmagic/DaVinci Resolve — Lift/Gamma/Gain
 * (Shadows/Midtones/Highlights). Duyệt từng điểm ảnh, tính trọng số thuộc về mỗi vùng tông dựa theo
 * độ sáng (luminance) của chính điểm ảnh đó (điểm càng tối càng thuộc nhiều về "Vùng Tối", càng
 * sáng càng thuộc nhiều về "Vùng Sáng"), rồi trộn màu ngả (từ x/y bánh xe) + độ sáng riêng
 * (luminance từng vùng) của cả 3 vùng theo đúng trọng số đó — cho phép vd đẩy vùng sáng ấm hơn (da
 * hồng hào) mà giữ vùng tối trung tính, khác hẳn với chỉnh 1 thanh trượt tổng áp đều cả ảnh.
 * Chạy trực tiếp trên ImageData (sửa tại chỗ) — dùng CHUNG cho cả lúc "nướng" vào ảnh chụp thật lẫn
 * khung xem trước dạng canvas (xem CameraCalibrationLivePreview ở AdminDashboardModal.tsx).
 */
export function applyColorWheelGrading(imageData: ImageData, calibration: CameraCalibrationConfig) {
  const zones: ColorWheelValue[] = [calibration.shadows, calibration.midtones, calibration.highlights];
  const hasEffect = zones.some((z) => z.x !== 0 || z.y !== 0 || z.luminance !== 0);
  if (!hasEffect) return;

  const tint = zones.map((wheel) => {
    const { hueDeg, strength } = wheelToHueStrength(wheel);
    return { rgb: hueToRgbTint(hueDeg), strength, luminance: wheel.luminance };
  });

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Độ sáng chuẩn hoá 0-1 (công thức Rec.601) để quyết định trọng số mỗi vùng tông.
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    const shadowWeight = Math.min(1, Math.max(0, 1 - 2 * L));
    const highlightWeight = Math.min(1, Math.max(0, (L - 0.5) * 2));
    const midtoneWeight = Math.max(0, 1 - shadowWeight - highlightWeight);
    const weights = [shadowWeight, midtoneWeight, highlightWeight];

    let addR = 0;
    let addG = 0;
    let addB = 0;
    for (let z = 0; z < 3; z++) {
      const w = weights[z];
      if (w <= 0) continue;
      const t = tint[z];
      // Đẩy màu theo độ mạnh đã kéo tâm bánh xe — trộn giữa xám trung tính (128) và tint đầy màu,
      // nhân với trọng số vùng tông của điểm ảnh này.
      if (t.strength > 0) {
        const push = w * t.strength * 0.5;
        addR += (t.rgb[0] - 128) * push;
        addG += (t.rgb[1] - 128) * push;
        addB += (t.rgb[2] - 128) * push;
      }
      // Chỉnh sáng riêng cho từng vùng tông (thanh trượt luminance cạnh bánh xe).
      if (t.luminance !== 0) {
        const lumAdd = w * (t.luminance / 50) * 40;
        addR += lumAdd;
        addG += lumAdd;
        addB += lumAdd;
      }
    }

    data[i] = Math.min(255, Math.max(0, r + addR));
    data[i + 1] = Math.min(255, Math.max(0, g + addG));
    data[i + 2] = Math.min(255, Math.max(0, b + addB));
  }
}

/**
 * Vẽ thêm 1 lớp mờ (Gaussian blur) đè lên canvas với độ mờ đục (alpha) tỉ lệ theo % "Độ Mịn Da" —
 * trộn giữa ảnh nét gốc (lớp dưới) và bản mờ (lớp trên) tạo cảm giác da mịn màng hơn. Đây là làm
 * mịn TOÀN ẢNH (không nhận diện khuôn mặt riêng) theo đúng lựa chọn đơn giản, nhẹ máy đã chọn —
 * chạy tốt trên mọi tablet/điện thoại kể cả máy đời cũ.
 */
export function drawSkinSmoothPass(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  skinSmooth: number
) {
  if (!skinSmooth || skinSmooth <= 0) return;
  const amount = Math.min(100, skinSmooth) / 100;
  // Bán kính mờ tỉ lệ theo độ phân giải ảnh để hiệu ứng đồng nhất dù ảnh to hay nhỏ.
  const blurPx = Math.max(2, Math.round(width / 260));
  // Chặn trần độ mờ đục ở 55% — dù kéo "Độ Mịn Da" lên tối đa cũng không làm ảnh mất nét hoàn toàn.
  const alpha = amount * 0.55;

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.globalAlpha = alpha;
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();
}

/**
 * Tăng độ nét bằng bộ lọc tích chập (convolution) kiểu "unsharp mask" đơn giản, chạy trực tiếp
 * trên dữ liệu điểm ảnh — CSS/Canvas filter không có sẵn "sharpen" nên phải tự làm bằng tay. Cường
 * độ càng cao thì viền/chi tiết càng được đẩy rõ hơn — chỉ áp dụng lên ẢNH ĐÃ CHỤP (không áp dụng
 * cho khung xem trực tiếp) vì việc này khá tốn CPU nếu chạy lặp lại mỗi khung hình video.
 */
function applySharpenPass(ctx: CanvasRenderingContext2D, width: number, height: number, sharpen: number) {
  if (!sharpen || sharpen <= 0) return;
  const amount = Math.min(100, sharpen) / 100;
  // Hệ số nhân của kernel — giữ nhỏ (tối đa ~0.35) để tránh sinh nhiễu/viền cứng khi kéo lên cao.
  const k = amount * 0.35;
  if (k <= 0) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);

  // Kernel unsharp mask 3x3: tâm được đẩy sáng lên, 4 điểm lân cận (trên/dưới/trái/phải) bị trừ đi.
  const centerWeight = 1 + 4 * k;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        // Viền ngoài cùng: giữ nguyên, không đủ điểm lân cận để tính kernel.
        out[i] = src[i];
        out[i + 1] = src[i + 1];
        out[i + 2] = src[i + 2];
        out[i + 3] = src[i + 3];
        continue;
      }
      const iUp = i - width * 4;
      const iDown = i + width * 4;
      const iLeft = i - 4;
      const iRight = i + 4;
      for (let c = 0; c < 3; c++) {
        const val =
          src[i + c] * centerWeight - k * (src[iUp + c] + src[iDown + c] + src[iLeft + c] + src[iRight + c]);
        out[i + c] = val;
      }
      out[i + 3] = src[i + 3];
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Chụp 1 khung hình từ video, "nướng" (bake) thẳng lớp Cân Chỉnh Camera Gốc của Admin vào ảnh —
 * gồm bánh xe màu 3 vùng tông (applyColorWheelGrading, tính ĐÚNG 100% trên dữ liệu điểm ảnh, khác
 * với bản xấp xỉ CSS ở khung xem trực tiếp), làm mịn da (trộn lớp mờ), rồi tăng nét (convolution).
 * Trả về dataURL JPEG — dùng thay cho việc vẽ thẳng video vào canvas không xử lý gì.
 * Phong cách lọc màu khách tự chọn (FILTER_PRESETS) KHÔNG áp dụng ở đây — vẫn giữ nguyên cách cũ,
 * chỉ áp lúc ghép ảnh vào tờ in (xem applyFilterToContext ở buildStripCanvas).
 */
export function captureCalibratedFrame(
  video: HTMLVideoElement,
  calibration: CameraCalibrationConfig | undefined | null,
  mirror: boolean,
  quality = 0.95
): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 0. Vẽ khung hình gốc (lật gương nếu cần) — chưa xử lý gì.
  ctx.save();
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 1. Bánh xe màu 3 vùng tông — chỉnh trực tiếp trên dữ liệu điểm ảnh (không cần quan tâm lật
  // gương nữa vì đã vẽ xong ở bước 0).
  if (calibration) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyColorWheelGrading(imageData, calibration);
    ctx.putImageData(imageData, 0, 0);
  }

  // 2. Làm mịn da (trộn thêm 1 lớp mờ đè lên, lấy nguồn từ chính canvas đã lên màu ở bước 1 — chứ
  // không lấy lại từ video gốc, để lớp mịn da phản ánh đúng màu đã cân chỉnh).
  if (calibration) {
    drawSkinSmoothPass(ctx, canvas, canvas.width, canvas.height, calibration.skinSmooth);
  }

  // 3. Tăng nét — chạy trên dữ liệu điểm ảnh thật của canvas.
  if (calibration && calibration.sharpen > 0) {
    applySharpenPass(ctx, canvas.width, canvas.height, calibration.sharpen);
  }

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Draw an image covering target rectangle with support for rotation (0, 90, 180, 270) and horizontal flipping
 */
export function drawImageTransformed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  borderRadius = 0,
  rotation = 0,
  flipH = false
) {
  ctx.save();
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, borderRadius);
    ctx.clip();
  }

  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);

  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  if (flipH) {
    ctx.scale(-1, 1);
  }

  const isRotated90or270 = rotation === 90 || rotation === 270;
  const drawW = isRotated90or270 ? h : w;
  const drawH = isRotated90or270 ? w : h;

  const imgRatio = img.width / img.height;
  const targetRatio = drawW / drawH;

  let sWidth = img.width;
  let sHeight = img.height;
  let sx = 0;
  let sy = 0;

  if (imgRatio > targetRatio) {
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetRatio;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Legacy wrapper
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  borderRadius = 0
) {
  drawImageTransformed(ctx, img, x, y, w, h, borderRadius, 0, false);
}

/**
 * Draw realistic procedural barcode
 */
function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color = '#1A1A1A', label?: string) {
  ctx.save();
  ctx.fillStyle = color;
  const pattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2];
  const totalUnits = pattern.reduce((a, b) => a + b, 0);
  const unitW = width / totalUnits;

  let currentX = x;
  pattern.forEach((bars, idx) => {
    if (idx % 2 === 0) {
      ctx.fillRect(currentX, y, bars * unitW, height - (label ? 14 : 0));
    }
    currentX += bars * unitW;
  });

  if (label) {
    ctx.font = '500 10px monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText(label, x + width / 2, y + height);
  }
  ctx.restore();
}

/**
 * Draw decorative dashed center cutting line with scissors icon
 */
function drawDashedCutLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = 'rgba(0,0,0,0.25)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Draw small scissors marker at midpoint
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  ctx.fillStyle = color;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✂', midX, midY);
  ctx.restore();
}

/**
 * Draw 35mm film perforations (sprocket holes)
 */
function drawFilmPerforations(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isLeft: boolean) {
  ctx.save();
  ctx.fillStyle = '#111111';
  ctx.fillRect(x - 2, y, 38, height);

  ctx.fillStyle = '#FFFFFF';
  const holeWidth = 16;
  const holeHeight = 22;
  const gap = 16;
  const totalHoles = Math.floor(height / (holeHeight + gap));

  const startY = y + 10;
  for (let i = 0; i < totalHoles; i++) {
    const holeY = startY + i * (holeHeight + gap);
    ctx.beginPath();
    ctx.roundRect(x + (isLeft ? 8 : 14), holeY, holeWidth, holeHeight, 4);
    ctx.fill();
  }

  // Draw yellow Kodak frame counter markings
  ctx.fillStyle = '#EAB308';
  ctx.font = '700 9px monospace';
  ctx.letterSpacing = '1px';
  const textX = isLeft ? x + 10 : x + 24;
  ctx.save();
  ctx.translate(textX, y + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('KODAK PORTRA 400 • 36 EXP • SAFETY FILM', -100, 0);
  ctx.restore();

  ctx.restore();
}

/**
 * Draw decorative dashed FOLD line (khác với đường CẮT — dùng biểu tượng gấp thay vì kéo)
 */
function drawDashedFoldLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = 'rgba(0,0,0,0.35)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isVertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);

  ctx.save();
  ctx.translate(midX, midY);
  if (isVertical) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = color;
  ctx.font = '600 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('⟨ GẤP ĐÔI TẠI ĐÂY ⟩', 0, 4);
  ctx.restore();
  ctx.restore();
}

/**
 * Đục các lỗ tròn xuyên thấu (perforation) dọc theo 1 cạnh, mô phỏng viền vé/tem răng cưa.
 * Dùng destination-out để tạo lỗ trong suốt thật sự trên canvas.
 */
function drawPerforatedEdge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  isVertical: boolean,
  notchRadius = 9,
  gap = 26
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  const count = Math.floor(length / gap);
  for (let i = 0; i <= count; i++) {
    const pos = i * gap;
    ctx.beginPath();
    if (isVertical) {
      ctx.arc(x, y + pos, notchRadius, 0, Math.PI * 2);
    } else {
      ctx.arc(x + pos, y, notchRadius, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Vẽ hình đĩa than vinyl (các rãnh đồng tâm + nhãn tròn ở giữa)
 */
function drawVinylDiscGraphic(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r * i) / 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#EAB308';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
  slotIndex: number;
  stripIndex?: number;
}

export function calculateLayoutDimensions(layout: StripLayout) {
  switch (layout) {
    // Dải đôi dọc (4x6 inch) & Layout E (single-2)
    case 'double-2-vert':
    case 'double-3-vert':
    case 'double-4-vert':
    case 'single-2':
      return { width: 1200, height: 1800, isDouble: layout.startsWith('double'), orientation: 'vertical' };

    // Dải đôi ngang (6x4 inch) & Layout F, G, H, I, J, K, M
    case 'double-2-horiz':
    case 'double-3-horiz':
    case 'double-4-horiz':
    case 'layout-f':
    case 'layout-g':
    case 'layout-h':
    case 'layout-i':
    case 'layout-j':
    case 'layout-k':
    case 'layout-m':
      return { width: 1800, height: 1200, isDouble: layout.startsWith('double'), orientation: 'horizontal' };

    // Cột đơn + Ghi chú trên khổ 4x6
    case 'single-col-2':
    case 'single-col-3':
    case 'single-col-4':
      return { width: 1200, height: 1800, isDouble: false, orientation: 'vertical' };

    case 'single-1':
    case 'featured-1-2':
      return { width: 1200, height: 1600, isDouble: false, orientation: 'portrait' };

    // Thẻ đánh dấu sách 2x6
    case 'strip-3':
      return { width: 800, height: 1800, isDouble: false, orientation: 'strip' };
    case 'strip-4':
      return { width: 800, height: 2200, isDouble: false, orientation: 'strip' };
    case 'grid-4':
      return { width: 1200, height: 1200, isDouble: false, orientation: 'grid' };

    default:
      return { width: 1200, height: 1800, isDouble: false, orientation: 'vertical' };
  }
}

/**
 * Compute photo slot positions on canvas for all layouts
 */
export function computeSlotRects(
  layout: StripLayout,
  canvasWidth: number,
  canvasHeight: number,
  frameStyle: FrameStyle = 'classic',
  columnAlign: 'left' | 'center' | 'right' = 'left'
): SlotRect[] {
  const rects: SlotRect[] = [];
  const padding = 36;

  // 0. KIỂU THIỆP GẤP ĐÔI (vinyl-foldcard, branded-foldcard): bất kể bố cục nào được chọn,
  // ép toàn bộ ảnh chỉ nằm gọn trong nửa "khung ảnh" của thiệp — nửa còn lại dành cho hình đĩa
  // than / mảng thương hiệu (vẽ riêng ở renderBackgroundAndThemeBase). Khách in ra rồi tự gấp đôi.
  if (frameStyle === 'vinyl-foldcard' || frameStyle === 'branded-foldcard') {
    const photoCount = LAYOUT_OPTIONS.find((o) => o.id === layout)?.photoCount || 1;
    const isLandscape = canvasWidth >= canvasHeight;
    const half = isLandscape ? canvasWidth / 2 : canvasHeight / 2;
    const foldPad = 28;

    let areaX: number, areaY: number, areaW: number, areaH: number;
    if (isLandscape) {
      areaX = half + foldPad;
      areaY = padding;
      areaW = canvasWidth - half - foldPad - padding;
      areaH = canvasHeight - padding * 2;
    } else {
      areaX = padding;
      areaY = half + foldPad;
      areaW = canvasWidth - padding * 2;
      areaH = canvasHeight - half - foldPad - padding;
    }

    const count = Math.max(1, Math.min(photoCount, 4));
    const gap = 14;
    if (count === 1) {
      rects.push({ x: areaX, y: areaY, w: areaW, h: areaH, slotIndex: 0 });
    } else {
      const stackVertical = areaH >= areaW;
      if (stackVertical) {
        const cellH = (areaH - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          rects.push({ x: areaX, y: areaY + i * (cellH + gap), w: areaW, h: cellH, slotIndex: i });
        }
      } else {
        const cellW = (areaW - gap * (count - 1)) / count;
        for (let i = 0; i < count; i++) {
          rects.push({ x: areaX + i * (cellW + gap), y: areaY, w: cellW, h: areaH, slotIndex: i });
        }
      }
    }
    return rects;
  }

  // 1. DẢI ĐÔI DỌC (double-2-vert, double-3-vert, double-4-vert)
  if (layout === 'double-2-vert' || layout === 'double-3-vert' || layout === 'double-4-vert') {
    const photoCountPerStrip = layout === 'double-2-vert' ? 2 : layout === 'double-3-vert' ? 3 : 4;
    const stripWidth = (canvasWidth - padding * 3) / 2;
    const stripPadding = 20;
    const photoWidth = stripWidth - stripPadding * 2;
    const photoHeight = Math.round(photoWidth * 0.75); // 4:3
    const gap = 16;
    const totalPhotosH = photoHeight * photoCountPerStrip + gap * (photoCountPerStrip - 1);
    const startY = (canvasHeight - 110 - totalPhotosH) / 2 + 10;

    // Left strip: slotIndex 0, 1, 2...
    for (let i = 0; i < photoCountPerStrip; i++) {
      rects.push({
        x: padding + stripPadding,
        y: startY + i * (photoHeight + gap),
        w: photoWidth,
        h: photoHeight,
        slotIndex: i,
        stripIndex: 0,
      });
    }

    // Right strip: slotIndex photoCountPerStrip .. photoCountPerStrip * 2 - 1
    const rightStripX = padding * 2 + stripWidth;
    for (let i = 0; i < photoCountPerStrip; i++) {
      rects.push({
        x: rightStripX + stripPadding,
        y: startY + i * (photoHeight + gap),
        w: photoWidth,
        h: photoHeight,
        slotIndex: photoCountPerStrip + i,
        stripIndex: 1,
      });
    }
  }

  // 2. DẢI ĐÔI NGANG (double-2-horiz, double-3-horiz, double-4-horiz)
  else if (layout === 'double-2-horiz' || layout === 'double-3-horiz' || layout === 'double-4-horiz') {
    const photoCountPerStrip = layout === 'double-2-horiz' ? 2 : layout === 'double-3-horiz' ? 3 : 4;
    const stripHeight = (canvasHeight - padding * 3) / 2;
    const gapX = 16;
    const availableW = canvasWidth - padding * 2 - gapX * (photoCountPerStrip - 1);
    const photoWidth = Math.round(availableW / photoCountPerStrip);
    const photoHeight = Math.round(photoWidth * 0.75);

    // Top horizontal strip: slotIndex 0, 1...
    const topY = padding + (stripHeight - photoHeight - 50) / 2 + 5;
    for (let i = 0; i < photoCountPerStrip; i++) {
      rects.push({
        x: padding + i * (photoWidth + gapX),
        y: topY,
        w: photoWidth,
        h: photoHeight,
        slotIndex: i,
        stripIndex: 0,
      });
    }

    // Bottom horizontal strip: slotIndex photoCountPerStrip ..
    const bottomStripY = padding * 2 + stripHeight;
    const bottomY = bottomStripY + (stripHeight - photoHeight - 50) / 2 + 5;
    for (let i = 0; i < photoCountPerStrip; i++) {
      rects.push({
        x: padding + i * (photoWidth + gapX),
        y: bottomY,
        w: photoWidth,
        h: photoHeight,
        slotIndex: photoCountPerStrip + i,
        stripIndex: 1,
      });
    }
  }

  // 3. CỘT ĐƠN TRÊN KHỔ GIẤY 4X6 CĂN TRÁI / GIỮA / PHẢI (single-col-2, 3, 4)
  else if (layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') {
    const count = layout === 'single-col-2' ? 2 : layout === 'single-col-3' ? 3 : 4;
    const colWidth = columnAlign === 'center' ? canvasWidth - padding * 2 - 200 : 540;
    const photoWidth = colWidth - 30;
    const photoHeight = Math.round(photoWidth * 0.75);
    const gap = 16;
    const totalH = photoHeight * count + gap * (count - 1);
    const startY = (canvasHeight - 100 - totalH) / 2 + 10;

    let startX = padding + 15;
    if (columnAlign === 'right') {
      startX = canvasWidth - padding - colWidth + 15;
    } else if (columnAlign === 'center') {
      startX = (canvasWidth - photoWidth) / 2;
    }

    for (let i = 0; i < count; i++) {
      rects.push({
        x: startX,
        y: startY + i * (photoHeight + gap),
        w: photoWidth,
        h: photoHeight,
        slotIndex: i,
      });
    }
  }

  // 4. LAYOUT F (Khổ ngang 6x4: 1 Lớn trên trái + 3 Nhỏ dưới)
  else if (layout === 'layout-f') {
    const topH = 620;
    const largeW = 900;
    const largeH = 560;

    // 0: Ảnh lớn trên trái
    rects.push({
      x: padding,
      y: padding,
      w: largeW,
      h: largeH,
      slotIndex: 0,
    });

    // 1, 2, 3: 3 ảnh nhỏ xếp ngang bên dưới
    const bottomGap = 16;
    const bottomW = (canvasWidth - padding * 2 - bottomGap * 2) / 3;
    const bottomH = canvasHeight - topH - padding - 60;
    const bottomY = topH;

    for (let i = 0; i < 3; i++) {
      rects.push({
        x: padding + i * (bottomW + bottomGap),
        y: bottomY,
        w: bottomW,
        h: bottomH,
        slotIndex: 1 + i,
      });
    }
  }

  // 5. LAYOUT G (Khổ ngang 6x4: Lưới 4 ô 2x2)
  else if (layout === 'layout-g') {
    const gap = 20;
    const cellW = (canvasWidth - padding * 2 - gap) / 2;
    const cellH = (canvasHeight - padding * 2 - 80 - gap) / 2;

    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      rects.push({
        x: padding + col * (cellW + gap),
        y: padding + row * (cellH + gap),
        w: cellW,
        h: cellH,
        slotIndex: i,
      });
    }
  }

  // 6. LAYOUT H (Khổ ngang: 2 ảnh dọc trái, 1 lớn trên phải)
  else if (layout === 'layout-h') {
    const colW = (canvasWidth - padding * 2 - 20) / 2;
    const leftH = (canvasHeight - padding * 2 - 20) / 2;

    // 0: Trái trên
    rects.push({
      x: padding,
      y: padding,
      w: colW,
      h: leftH,
      slotIndex: 0,
    });
    // 1: Trái dưới
    rects.push({
      x: padding,
      y: padding + leftH + 20,
      w: colW,
      h: leftH,
      slotIndex: 1,
    });
    // 2: Phải trên (ảnh lớn)
    rects.push({
      x: padding + colW + 20,
      y: padding,
      w: colW,
      h: leftH,
      slotIndex: 2,
    });
  }

  // 7. LAYOUT I (Khổ ngang: 1 trên trái, 1 dưới trái, 1 dưới phải)
  else if (layout === 'layout-i') {
    const colW = (canvasWidth - padding * 2 - 20) / 2;
    const cellH = (canvasHeight - padding * 2 - 20) / 2;

    // 0: Trên trái
    rects.push({
      x: padding,
      y: padding,
      w: colW,
      h: cellH,
      slotIndex: 0,
    });
    // 1: Dưới trái
    rects.push({
      x: padding,
      y: padding + cellH + 20,
      w: colW,
      h: cellH,
      slotIndex: 1,
    });
    // 2: Dưới phải
    rects.push({
      x: padding + colW + 20,
      y: padding + cellH + 20,
      w: colW,
      h: cellH,
      slotIndex: 2,
    });
  }

  // 8. LAYOUT J (Khổ ngang: 2 ảnh dọc lệch trái + khoảng ghi chú phải)
  else if (layout === 'layout-j') {
    const colW = 680;
    const cellH = (canvasHeight - padding * 2 - 20) / 2;

    rects.push({
      x: padding,
      y: padding,
      w: colW,
      h: cellH,
      slotIndex: 0,
    });
    rects.push({
      x: padding,
      y: padding + cellH + 20,
      w: colW,
      h: cellH,
      slotIndex: 1,
    });
  }

  // 9. LAYOUT K (Khổ ngang: 2 ảnh ngang ở giữa)
  else if (layout === 'layout-k') {
    const gap = 24;
    const photoW = (canvasWidth - padding * 2 - gap) / 2;
    const photoH = Math.round(photoW * 0.75);
    const startY = (canvasHeight - photoH) / 2;

    rects.push({
      x: padding,
      y: startY,
      w: photoW,
      h: photoH,
      slotIndex: 0,
    });
    rects.push({
      x: padding + photoW + gap,
      y: startY,
      w: photoW,
      h: photoH,
      slotIndex: 1,
    });
  }

  // 10. LAYOUT M (Khổ ngang: 1 ảnh panorama lớn duy nhất)
  else if (layout === 'layout-m') {
    const photoW = canvasWidth - padding * 2;
    const photoH = canvasHeight - padding * 2 - 100;
    rects.push({
      x: padding,
      y: padding,
      w: photoW,
      h: photoH,
      slotIndex: 0,
    });
  }

  // 11. LAYOUT E (2 ảnh lớn dọc khổ 4x6)
  else if (layout === 'single-2') {
    const photoW = canvasWidth - padding * 2;
    const photoH = Math.round((canvasHeight - padding * 2 - 140 - 24) / 2);
    const gap = 24;

    rects.push({
      x: padding,
      y: padding + 15,
      w: photoW,
      h: photoH,
      slotIndex: 0,
    });
    rects.push({
      x: padding,
      y: padding + 15 + photoH + gap,
      w: photoW,
      h: photoH,
      slotIndex: 1,
    });
  }

  // 12. 1 ẢNH ĐƠN (single-1)
  else if (layout === 'single-1') {
    rects.push({
      x: padding,
      y: padding + 30,
      w: canvasWidth - padding * 2,
      h: canvasHeight - padding * 2 - 120,
      slotIndex: 0,
    });
  }

  // 13. 1 ẢNH LỚN + 2 ẢNH NHỎ (featured-1-2)
  else if (layout === 'featured-1-2') {
    const photoW = canvasWidth - padding * 2;
    const largeH = Math.round(photoW * 0.65);
    const gap = 20;
    const smallW = (photoW - gap) / 2;
    const smallH = Math.round(smallW * 0.85);

    rects.push({
      x: padding,
      y: padding + 20,
      w: photoW,
      h: largeH,
      slotIndex: 0,
    });
    rects.push({
      x: padding,
      y: padding + 20 + largeH + gap,
      w: smallW,
      h: smallH,
      slotIndex: 1,
    });
    rects.push({
      x: padding + smallW + gap,
      y: padding + 20 + largeH + gap,
      w: smallW,
      h: smallH,
      slotIndex: 2,
    });
  }

  // 14. LƯỚI 4 Ô VUÔNG (grid-4)
  else if (layout === 'grid-4') {
    const gap = 20;
    const cellW = (canvasWidth - padding * 2 - gap) / 2;
    const cellH = cellW;
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      rects.push({
        x: padding + col * (cellW + gap),
        y: padding + 20 + row * (cellH + gap),
        w: cellW,
        h: cellH,
        slotIndex: i,
      });
    }
  }

  // 15. DẢI THẺ ĐƠN 3/4 (strip-3, strip-4)
  else {
    const count = layout === 'strip-4' ? 4 : 3;
    const photoW = canvasWidth - padding * 2;
    const photoH = Math.round(photoW * 0.75);
    const gap = 20;
    const startY = padding + 25;

    for (let i = 0; i < count; i++) {
      rects.push({
        x: padding,
        y: startY + i * (photoH + gap),
        w: photoW,
        h: photoH,
        slotIndex: i,
      });
    }
  }

  return rects;
}

/**
 * Generate a complete Photobooth Strip / Collage Canvas
 */
export async function generatePhotostripCanvas(params: {
  photos: CapturedPhoto[];
  layout: StripLayout;
  frameColor: FrameColor;
  frameStyle?: FrameStyle;
  customTitle: string;
  dateStr: string;
  noteText?: string;
  columnAlign?: 'left' | 'center' | 'right';
  slotCustomizations?: SlotCustomization[];
  overrideFilterId?: string;
  overrideFilterIntensity?: number;
  // Sticker khách kéo thả lên tờ ảnh ở màn Biên Tập — vị trí/cỡ/góc xoay lưu theo % nên vẽ đúng lại
  // ở đây dù canvas in 300 DPI có kích thước pixel khác hẳn khung xem trước trên màn hình.
  stickers?: PlacedSticker[];
}): Promise<HTMLCanvasElement> {
  const {
    photos,
    layout,
    frameColor,
    frameStyle = 'classic',
    customTitle,
    dateStr,
    noteText = '',
    columnAlign = 'left',
    slotCustomizations = [],
    overrideFilterId,
    overrideFilterIntensity,
    stickers = [],
  } = params;

  const frameInfo = FRAME_COLORS.find((f) => f.id === frameColor) || FRAME_COLORS[0];
  const { width: canvasWidth, height: canvasHeight, isDouble, orientation } = calculateLayoutDimensions(layout);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. RENDER BACKGROUND & THEME BASE
  renderBackgroundAndThemeBase(ctx, canvasWidth, canvasHeight, frameInfo, frameStyle);

  // 2. COMPUTE PHOTO SLOTS & DRAW PHOTOS
  const slotRects = computeSlotRects(layout, canvasWidth, canvasHeight, frameStyle, columnAlign);

  for (const slot of slotRects) {
    const custom = slotCustomizations[slot.slotIndex];
    const photo = photos[slot.slotIndex] || photos[slot.slotIndex % Math.max(1, photos.length)] || photos[0];

    if (photo && photo.dataUrl) {
      try {
        const img = await loadImage(photo.dataUrl);
        ctx.save();

        const filterId = overrideFilterId || custom?.filterId || photo.filterId || 'original';
        const intensity = overrideFilterIntensity ?? custom?.filterIntensity ?? photo.filterIntensity ?? 80;
        applyFilterToContext(ctx, filterId, intensity);

        const rotation = custom?.rotation || 0;
        const flipH = custom?.flipH || false;
        const bRadius =
          frameStyle === 'polaroid' ? 4
          : frameStyle === 'cinema-film' ? 0
          : frameStyle === 'concert-ticket' || frameStyle === 'train-ticket' ? 4
          : 6;

        drawImageTransformed(ctx, img, slot.x, slot.y, slot.w, slot.h, bRadius, rotation, flipH);
        ctx.restore();

        // Apply Preset Color Overlay on top of the slot if defined
        const preset = FILTER_PRESETS.find((p) => p.id === filterId);
        if (preset?.overlayColor && intensity > 0) {
          ctx.save();
          if (bRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(slot.x, slot.y, slot.w, slot.h, bRadius);
            ctx.clip();
          }
          ctx.fillStyle = preset.overlayColor;
          ctx.globalAlpha = (intensity / 100) * 0.85;
          ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
          ctx.restore();
        }

        // Slot border stroke
        if (frameStyle === 'classic' || frameStyle === 'polaroid') {
          ctx.strokeStyle = frameInfo.borderHex;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
        }
      } catch {
        ctx.fillStyle = '#E5E2E1';
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
      }
    } else {
      ctx.fillStyle = '#E5E2E1';
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
  }

  // 3. DRAW DASHED CUT LINES IF DOUBLE STRIP (bỏ qua với kiểu thiệp gấp đôi — đã có đường gấp riêng)
  if (isDouble && frameStyle !== 'vinyl-foldcard' && frameStyle !== 'branded-foldcard') {
    if (orientation === 'vertical') {
      const midX = canvasWidth / 2;
      drawDashedCutLine(ctx, midX, 20, midX, canvasHeight - 20, 'rgba(0,0,0,0.3)');
    } else if (orientation === 'horizontal') {
      const midY = canvasHeight / 2;
      drawDashedCutLine(ctx, 20, midY, canvasWidth - 20, midY, 'rgba(0,0,0,0.3)');
    }
  }

  // 4. DRAW NOTE / WISHES AREA IF APPLICABLE
  renderNoteAndWishesArea(ctx, {
    canvasWidth,
    canvasHeight,
    layout,
    columnAlign,
    noteText,
    customTitle,
    dateStr,
    frameInfo,
  });

  // 5. DRAW THEME OVERLAYS & TYPOGRAPHY
  renderThemeOverlaysAndTypography(ctx, {
    canvasWidth,
    canvasHeight,
    layout,
    frameInfo,
    frameStyle,
    customTitle,
    dateStr,
    slotRects,
    isDouble,
    orientation,
  });

  // 6. DRAW STICKERS ON TOP — vẽ sau cùng để luôn nổi trên ảnh/khung/chữ, đúng vị trí/cỡ/góc xoay
  // khách đã chỉnh ở khung xem trước (quy đổi từ % sang pixel thật của canvas in).
  for (const sticker of stickers) {
    ctx.save();
    const cx = (sticker.xPercent / 100) * canvasWidth;
    const cy = (sticker.yPercent / 100) * canvasHeight;
    ctx.translate(cx, cy);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    const fontSize = canvasWidth * 0.11 * sticker.scale;
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.emoji, 0, 0);
    ctx.restore();
  }

  return canvas;
}

/**
 * Render Note/Wishes blank space area on layouts that support it
 */
function renderNoteAndWishesArea(
  ctx: CanvasRenderingContext2D,
  params: {
    canvasWidth: number;
    canvasHeight: number;
    layout: StripLayout;
    columnAlign: 'left' | 'center' | 'right';
    noteText: string;
    customTitle: string;
    dateStr: string;
    frameInfo: typeof FRAME_COLORS[0];
  }
) {
  const { canvasWidth: w, canvasHeight: h, layout, columnAlign, noteText, customTitle, dateStr, frameInfo } = params;

  ctx.save();
  const textColor = frameInfo.textHex;
  const isDark = frameInfo.id === 'charcoal' || frameInfo.id === 'black';

  // 1. CỘT ĐƠN CĂN TRÁI / PHẢI (single-col-2, 3, 4)
  if (layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') {
    if (columnAlign === 'center') {
      ctx.restore();
      return;
    }

    const noteX = columnAlign === 'left' ? 620 : 40;
    const noteW = 540;
    const noteY = 100;
    const noteH = h - 220;

    // Elegant card background
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,26,0.03)';
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(26,26,26,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(noteX, noteY, noteW, noteH, 8);
    ctx.fill();
    ctx.stroke();

    // Decorative stamps / lines
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    const cx = noteX + noteW / 2;

    ctx.font = '600 22px "Newsreader", Georgia, serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('LƯU BÚT KỶ NIỆM', cx, noteY + 50);

    ctx.font = '400 12px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText('MEMORIES & WISHES', cx, noteY + 75);

    // Ruled lines for writing
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    ctx.setLineDash([4, 4]);
    for (let ly = noteY + 120; ly < noteY + noteH - 120; ly += 45) {
      ctx.beginPath();
      ctx.moveTo(noteX + 30, ly);
      ctx.lineTo(noteX + noteW - 30, ly);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Custom Note text
    if (noteText) {
      ctx.fillStyle = textColor;
      ctx.font = 'italic 500 20px "Caveat", "Dancing Script", cursive, Georgia, serif';
      ctx.textAlign = 'center';

      const lines = noteText.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, cx, noteY + 140 + idx * 45);
      });
    }

    // Bottom signature & date
    ctx.font = '600 16px "Newsreader", serif';
    ctx.fillStyle = textColor;
    ctx.fillText(customTitle || 'Studio Memories', cx, noteY + noteH - 65);

    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#999999' : '#8C7A5B';
    ctx.fillText(dateStr, cx, noteY + noteH - 40);
  }

  // 2. LAYOUT J (Cột 2 ảnh bên trái + Vùng chữ lớn bên phải)
  else if (layout === 'layout-j') {
    const noteX = 760;
    const noteY = 60;
    const noteW = w - noteX - 40;
    const noteH = h - 120;
    const cx = noteX + noteW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    ctx.font = '700 36px "Newsreader", Georgia, serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(customTitle || 'June & Johnny', cx, noteY + 180);

    ctx.font = '500 18px Inter, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText(dateStr || '1-15-2019', cx, noteY + 230);

    if (noteText) {
      ctx.font = 'italic 500 24px "Caveat", "Brush Script MT", cursive, serif';
      ctx.fillStyle = textColor;
      const lines = noteText.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, cx, noteY + 320 + idx * 40);
      });
    }
  }

  // 3. LAYOUT F (Vùng chữ ở góc trên bên phải)
  else if (layout === 'layout-f') {
    const noteX = 980;
    const noteY = 60;
    const noteW = w - noteX - 40;
    const cx = noteX + noteW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    ctx.font = '700 32px "Newsreader", Georgia, serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(customTitle || 'Jane & Johnny', cx, noteY + 180);

    ctx.font = '500 16px Inter, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText(dateStr || '1-15-2019', cx, noteY + 225);

    if (noteText) {
      ctx.font = 'italic 500 20px "Caveat", cursive, serif';
      ctx.fillStyle = textColor;
      const lines = noteText.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, cx, noteY + 280 + idx * 35);
      });
    }
  }

  // 4. LAYOUT H (Vùng chữ ở góc dưới bên phải)
  else if (layout === 'layout-h') {
    const colW = (w - 36 * 2 - 20) / 2;
    const noteX = 36 + colW + 20;
    const noteY = 36 + (h - 36 * 2 - 20) / 2 + 20;
    const noteW = colW;
    const cx = noteX + noteW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    ctx.font = '700 28px "Newsreader", serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(customTitle || 'Jane & Johnny', cx, noteY + 160);

    ctx.font = '500 15px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText(dateStr || '1-15-2019', cx, noteY + 200);

    if (noteText) {
      ctx.font = 'italic 500 18px "Caveat", cursive, serif';
      ctx.fillStyle = textColor;
      const lines = noteText.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, cx, noteY + 250 + idx * 30);
      });
    }
  }

  // 5. LAYOUT I (Vùng chữ ở góc trên bên phải)
  else if (layout === 'layout-i') {
    const colW = (w - 36 * 2 - 20) / 2;
    const noteX = 36 + colW + 20;
    const noteY = 36;
    const cx = noteX + colW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    ctx.font = '700 28px "Newsreader", serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(customTitle || 'Jane & Johnny', cx, noteY + 160);

    ctx.font = '500 15px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText(dateStr || '1-15-2019', cx, noteY + 200);
  }

  // 6. LAYOUT K (Tiêu đề trên + Ngày tháng dưới)
  else if (layout === 'layout-k') {
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;

    ctx.font = '700 36px "Newsreader", Georgia, serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(customTitle || 'Jane & Johnny', w / 2, 85);

    ctx.font = '500 18px Inter, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = isDark ? '#A3A3A3' : '#8C7A5B';
    ctx.fillText(dateStr || '1-15-2019', w / 2, h - 50);
  }

  ctx.restore();
}

/**
 * Background & Theme Base Render
 */
function renderBackgroundAndThemeBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frameInfo: typeof FRAME_COLORS[0],
  frameStyle: FrameStyle
) {
  ctx.save();

  if (frameStyle === 'onepiece-wanted') {
    ctx.fillStyle = '#E8CCA0';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(84, 49, 20, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#5E381A';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, 22, w - 44, h - 44);
  } else if (frameStyle === 'cinema-film') {
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, w, h);

    drawFilmPerforations(ctx, 0, 0, h, true);
    drawFilmPerforations(ctx, w - 38, 0, h, false);
  } else if (frameStyle === 'movie-ticket') {
    ctx.fillStyle = frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#1A1A1A' : '#FAF8F2';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  } else if (frameStyle === 'instagram') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  } else if (frameStyle === 'vinyl-cd') {
    ctx.fillStyle = '#262220';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  } else if (frameStyle === 'nutrition-label') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Thanh tiêu đề đậm kiểu nhãn thực phẩm
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(10, 10, w - 20, 64);
  } else if (frameStyle === 'scrapbook') {
    ctx.fillStyle = '#EFE7D8';
    ctx.fillRect(0, 0, w, h);

    // Vân giấy kraft mờ
    ctx.strokeStyle = 'rgba(140,122,91,0.08)';
    ctx.lineWidth = 1;
    for (let i = -h; i < w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(58,51,42,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 6]);
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.setLineDash([]);
  } else if (frameStyle === 'concert-ticket') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1A1A2E');
    grad.addColorStop(1, '#2D1B4E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(245,214,123,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.setLineDash([]);

    // Viền răng cưa (đục lỗ) hai cạnh ngắn (đầu vé)
    drawPerforatedEdge(ctx, w / 2, 0, w, false, 8, 24);
    drawPerforatedEdge(ctx, w / 2, h, w, false, 8, 24);
  } else if (frameStyle === 'vinyl-foldcard') {
    ctx.fillStyle = '#2B2623';
    ctx.fillRect(0, 0, w, h);

    const isLandscape = w >= h;
    const half = isLandscape ? w / 2 : h / 2;

    // Nửa bìa đĩa (bên trái/trên) đậm màu hơn để phân biệt với nửa ảnh
    ctx.fillStyle = '#221E1B';
    if (isLandscape) {
      ctx.fillRect(0, 0, half, h);
    } else {
      ctx.fillRect(0, 0, w, half);
    }

    drawVinylDiscGraphic(ctx, isLandscape ? half / 2 : w / 2, isLandscape ? h / 2 : half / 2, Math.min(half, isLandscape ? h : w) * 0.32);

    if (isLandscape) {
      drawDashedFoldLine(ctx, half, 24, half, h - 24, 'rgba(243,236,228,0.55)');
    } else {
      drawDashedFoldLine(ctx, 24, half, w - 24, half, 'rgba(243,236,228,0.55)');
    }
  } else if (frameStyle === 'branded-foldcard') {
    ctx.fillStyle = '#F9F7F2';
    ctx.fillRect(0, 0, w, h);

    const isLandscape = w >= h;
    const half = isLandscape ? w / 2 : h / 2;

    ctx.fillStyle = '#1A1A1A';
    if (isLandscape) {
      ctx.fillRect(0, 0, half, h);
    } else {
      ctx.fillRect(0, 0, w, half);
    }

    if (isLandscape) {
      drawDashedFoldLine(ctx, half, 24, half, h - 24, 'rgba(26,26,26,0.4)');
    } else {
      drawDashedFoldLine(ctx, 24, half, w - 24, half, 'rgba(26,26,26,0.4)');
    }
  } else if (frameStyle === 'train-ticket') {
    ctx.fillStyle = '#F5F0E4';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(74,58,36,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Sọc màu đầu vé kiểu vé tàu
    ctx.fillStyle = '#8C6239';
    ctx.fillRect(12, 12, w - 24, 22);

    // Viền răng cưa (đục lỗ) hai cạnh trái/phải
    drawPerforatedEdge(ctx, 0, h / 2, h, true, 8, 26);
    drawPerforatedEdge(ctx, w, h / 2, h, true, 8, 26);
  } else {
    ctx.fillStyle = frameInfo.hex;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = frameInfo.borderHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  ctx.restore();
}

/**
 * Render Theme Overlays, Badges, and High-Res Typography
 */
function renderThemeOverlaysAndTypography(
  ctx: CanvasRenderingContext2D,
  params: {
    canvasWidth: number;
    canvasHeight: number;
    layout: StripLayout;
    frameInfo: typeof FRAME_COLORS[0];
    frameStyle: FrameStyle;
    customTitle: string;
    dateStr: string;
    slotRects: SlotRect[];
    isDouble: boolean;
    orientation: string;
  }
) {
  const { canvasWidth: w, canvasHeight: h, layout, frameInfo, frameStyle, customTitle, dateStr, isDouble, orientation } = params;

  ctx.save();

  // A. KIỂU BÀI ĐĂNG INSTAGRAM
  if (frameStyle === 'instagram') {
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'left';

    const headerY = 55;
    ctx.beginPath();
    ctx.arc(60, headerY, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#E1306C';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PB', 60, headerY + 4);

    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'left';
    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(customTitle.toLowerCase().replace(/\s+/g, '_') || 'photobooth_studio', 90, headerY);

    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#737373';
    ctx.fillText('Original Audio • Studio Moment', 90, headerY + 16);

    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'right';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('•••', w - 40, headerY);

    const footerY = h - 90;
    ctx.textAlign = 'left';
    ctx.font = '20px sans-serif';
    ctx.fillText('❤️  💬  ✈️', 40, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('🔖', w - 40, footerY);

    ctx.textAlign = 'left';
    ctx.font = '700 13px -apple-system, sans-serif';
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText('1,428 likes', 40, footerY + 28);

    ctx.font = '400 12px -apple-system, sans-serif';
    ctx.fillText(`${customTitle} — Captured unforgettable moments ✨`, 40, footerY + 48);

    ctx.font = '400 11px -apple-system, sans-serif';
    ctx.fillStyle = '#00376B';
    ctx.fillText('#photobooth #memories #vintage #studio', 40, footerY + 66);

    ctx.fillStyle = '#8E8E8E';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr.toUpperCase(), w - 40, footerY + 66);
  }

  // B. KIỂU BÌA TẠP CHÍ THỜI TRANG (MAGAZINE)
  else if (frameStyle === 'magazine') {
    ctx.textAlign = 'center';
    ctx.fillStyle = frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#FFFFFF' : '#1A1A1A';

    ctx.font = '900 68px "Didot", "Bodoni MT", "Cinzel", "Newsreader", Georgia, serif';
    ctx.letterSpacing = '12px';
    ctx.fillText(customTitle.toUpperCase() || 'V O G U E', w / 2, 95);

    ctx.font = '600 12px Inter, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillStyle = '#8C7A5B';
    ctx.fillText('THE ESSENCE OF TIME • SPECIAL EDITION', w / 2, 125);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px "Newsreader", serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('EXCLUSIVE LOOK:', 50, h - 160);
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillText('Youth, Elegance & Modern Memories', 50, h - 138);
    ctx.shadowBlur = 0;

    drawBarcode(ctx, w - 180, h - 85, 130, 45, '#FFFFFF', dateStr);
  }

  // C. KIỂU TRUY NÃ ONE PIECE (WANTED)
  else if (frameStyle === 'onepiece-wanted') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4A2A11';

    ctx.font = '900 78px "Impact", "Playfair Display", "Cinzel", serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('WANTED', w / 2, 105);

    ctx.font = '900 24px "Cinzel", Georgia, serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('DEAD OR ALIVE', w / 2, 150);

    ctx.font = '900 36px "Impact", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(customTitle.toUpperCase() || 'P I R A T E', w / 2, h - 140);

    ctx.font = '900 32px "Courier New", monospace';
    ctx.letterSpacing = '2px';
    ctx.fillText('฿ 1,500,000,000 -', w / 2, h - 95);

    ctx.font = '700 14px "Cinzel", serif';
    ctx.letterSpacing = '4px';
    ctx.textAlign = 'right';
    ctx.fillText('MARINE', w - 50, h - 45);

    ctx.textAlign = 'left';
    ctx.fillText(dateStr, 50, h - 45);
  }

  // D. KIỂU KHUNG PHIM 35MM (CINEMA FILM)
  else if (frameStyle === 'cinema-film') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EAB308';
    ctx.font = '600 24px "Newsreader", serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(customTitle.toUpperCase() || 'CINEMATIC ROLL', w / 2, 35);

    ctx.font = '500 11px monospace';
    ctx.letterSpacing = '3px';
    ctx.fillText(`FRAME #36A • ISO 400 • ${dateStr}`, w / 2, h - 30);
  }

  // E. KIỂU VÉ XEM PHIM (MOVIE TICKET)
  else if (frameStyle === 'movie-ticket') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1A1A1A';

    ctx.font = '900 26px "Impact", "Montserrat", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('★ ADMIT ONE • MEMORY PASS ★', w / 2, 42);

    drawBarcode(ctx, w / 2 - 120, 52, 240, 30, '#1A1A1A', '0827-2026-LOVE');

    const footY = h - 120;
    ctx.font = '800 13px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('NUTRITION FACTS: 100% SINCERITY', w / 2, footY);

    ctx.font = '500 11px Inter, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#555555';
    ctx.fillText('INGREDIENTS: LOVE, LAUGHTER & TIMELESS MEMORIES', w / 2, footY + 20);
    ctx.fillText(`BEST BEFORE: FOREVER • DATE: ${dateStr}`, w / 2, footY + 38);

    drawBarcode(ctx, w / 2 - 100, footY + 48, 200, 36, '#1A1A1A', customTitle.toUpperCase());
  }

  // F. KIỂU POLAROID
  else if (frameStyle === 'polaroid') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2B2623';
    ctx.font = '600 32px "Caveat", "Brush Script MT", "Cormorant Garamond", cursive, serif';
    ctx.fillText(customTitle || 'Unforgettable day ♡', w / 2, h - 65);

    ctx.font = '400 12px Inter, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = '#8C7A5B';
    ctx.fillText(dateStr, w / 2, h - 35);
  }

  // G. KIỂU ĐĨA NHẠC VINYL
  else if (frameStyle === 'vinyl-cd') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F3ECE4';

    ctx.font = '700 28px "Newsreader", serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(customTitle.toUpperCase() || 'LOVE STORY ALBUM', w / 2, 45);

    const footY = h - 110;
    ctx.font = '600 12px monospace';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#D97706';
    ctx.fillText('TRACKLIST: 01. INTRO 02. MEMORIES 03. SWEET LAUGHTER', w / 2, footY);

    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillStyle = '#A8A29E';
    ctx.fillText(`PRODUCED BY STUDIO • RELEASE: ${dateStr}`, w / 2, footY + 24);

    drawBarcode(ctx, w / 2 - 90, footY + 35, 180, 30, '#F3ECE4');
  }

  // I. NHÃN DINH DƯỠNG KỶ NIỆM
  else if (frameStyle === 'nutrition-label') {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px Inter, Arial, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('NHÃN DINH DƯỠNG KỶ NIỆM', 30, 52);

    ctx.textAlign = 'right';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('MEMORY FACTS', w - 30, 52);

    const footY = h - 150;

    // Nền trắng dạng nhãn dán để chữ luôn rõ dù đè lên ảnh
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, footY - 26, w - 32, 176, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillText(`KHẨU PHẦN: 1 KỶ NIỆM • NGÀY: ${dateStr}`, 30, footY);

    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, footY + 14);
    ctx.lineTo(w - 20, footY + 14);
    ctx.stroke();

    const ingredients = [
      'TÌNH YÊU ................ 100%',
      'NIỀM TIN ................ 100%',
      'HẠNH PHÚC .............. 100%',
      'TIẾNG CƯỜI .............. 100%',
    ];
    ctx.font = '500 13px monospace';
    ingredients.forEach((line, idx) => {
      ctx.fillText(line, 30, footY + 40 + idx * 22);
    });

    ctx.textAlign = 'right';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText(customTitle.toUpperCase() || 'STUDIO MEMORIES', w - 30, footY + 12);

    drawBarcode(ctx, w / 2 - 110, h - 42, 220, 26, '#1A1A1A');
  }

  // J. SỔ LƯU NIỆM CẮT DÁN (SCRAPBOOK)
  else if (frameStyle === 'scrapbook') {
    // Băng keo washi ở góc mỗi tấm ảnh
    const tapeColors = ['rgba(217,119,6,0.55)', 'rgba(219,39,119,0.5)', 'rgba(59,130,246,0.45)', 'rgba(16,185,129,0.45)'];
    params.slotRects.forEach((slot, idx) => {
      ctx.save();
      ctx.translate(slot.x + 16, slot.y);
      ctx.rotate(-0.14);
      ctx.fillStyle = tapeColors[idx % tapeColors.length];
      ctx.fillRect(-26, -9, 52, 18);
      ctx.restore();
    });

    // Nền giấy note dán bên dưới để chữ viết tay luôn rõ dù đè lên ảnh
    ctx.save();
    ctx.fillStyle = 'rgba(239,231,216,0.94)';
    ctx.strokeStyle = 'rgba(140,122,91,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 260, h - 88, 520, 68, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(w / 2, h - 50);
    ctx.rotate(-0.02);
    ctx.fillStyle = '#3A332A';
    ctx.font = 'italic 700 28px "Caveat", "Brush Script MT", cursive, serif';
    ctx.fillText(customTitle || 'Những khoảnh khắc đáng nhớ ♡', 0, 0);
    ctx.restore();

    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillStyle = '#8C7A5B';
    ctx.fillText(dateStr, w / 2, h - 26);
  }

  // K. VÉ CONCERT / BOOKMARK (K-POP)
  else if (frameStyle === 'concert-ticket') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5D67B';
    ctx.font = '900 22px "Montserrat", Impact, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('★ ADMIT ONE • VIP PASS ★', w / 2, 42);

    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(245,214,123,0.75)';
    ctx.letterSpacing = '2px';
    ctx.fillText(customTitle.toUpperCase() || 'LIVE MEMORY TOUR', w / 2, 64);

    const footY = h - 150;

    // Nền tối mờ phía sau danh sách bài hát & QR để luôn rõ dù đè lên ảnh
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(16, footY - 30, w - 32, 172, 8);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = '700 12px monospace';
    ctx.fillStyle = '#F5D67B';
    ['01. INTRO', '02. FIRST MEET', '03. LAUGH TOGETHER', '04. MEMORIES'].forEach((t, idx) => {
      ctx.fillText(t, 30, footY + idx * 20);
    });

    // Ô QR trang trí (mô phỏng hoạ tiết, không phải mã QR thật)
    const qrSize = 90;
    const qrX = w - 30 - qrSize;
    const qrY = footY - 10;
    ctx.fillStyle = '#F9F7F2';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = '#1A1A1A';
    const cell = qrSize / 7;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if ((r + c) % 2 === 0 || r === 0 || c === 0 || r === 6 || c === 6) {
          ctx.fillRect(qrX + c * cell, qrY + r * cell, cell, cell);
        }
      }
    }

    ctx.textAlign = 'center';
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(245,214,123,0.6)';
    ctx.fillText(dateStr, w / 2, h - 22);
  }

  // L. THIỆP GẤP ĐĨA NHẠC (VINYL FOLD CARD)
  else if (frameStyle === 'vinyl-foldcard') {
    const isLandscape = w >= h;
    const half = isLandscape ? w / 2 : h / 2;
    const labelCx = isLandscape ? half / 2 : w / 2;
    const labelCy = isLandscape ? h - 70 : half - 40;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#F3ECE4';
    ctx.font = '700 20px "Newsreader", serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SIDE A', labelCx, labelCy);

    ctx.font = '500 11px monospace';
    ctx.fillStyle = 'rgba(243,236,228,0.7)';
    ctx.fillText(customTitle.toUpperCase() || 'LOVE SONG', labelCx, labelCy + 24);

    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(243,236,228,0.5)';
    ctx.fillText(dateStr, w / 2, h - 22);
  }

  // M. THIỆP GẤP THƯƠNG HIỆU (BRANDED FOLD CARD)
  else if (frameStyle === 'branded-foldcard') {
    const isLandscape = w >= h;
    const half = isLandscape ? w / 2 : h / 2;
    const cx = isLandscape ? half / 2 : w / 2;
    const cy = isLandscape ? h / 2 - 20 : half / 2 - 10;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px "Newsreader", Georgia, serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(customTitle.toUpperCase() || 'SOCIAL CLUB', cx, cy);

    ctx.font = '500 11px Inter, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(dateStr.toUpperCase() || 'MEMBERS ONLY', cx, cy + 26);
  }

  // N. VÉ TÀU KỶ NIỆM (TRAIN TICKET)
  else if (frameStyle === 'train-ticket') {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F5F0E4';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('GA KỶ NIỆM  →  GA HẠNH PHÚC', 30, 28);

    const footY = h - 90;
    ctx.fillStyle = '#4A3A24';
    ctx.font = '600 12px monospace';
    ctx.fillText(`GHẾ: A-01 • TOA: 01 • ${dateStr}`, 30, footY);

    ctx.textAlign = 'right';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(customTitle.toUpperCase() || 'VÉ KỶ NIỆM', w - 30, footY);

    drawBarcode(ctx, w / 2 - 100, h - 60, 200, 30, '#4A3A24');

    // Dấu mộc tròn kỷ niệm
    ctx.save();
    ctx.translate(w - 90, 70);
    ctx.rotate(-0.25);
    ctx.strokeStyle = 'rgba(140,98,57,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '700 9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(140,98,57,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('PHOTOBAG', 0, -2);
    ctx.fillText('MEMORY', 0, 10);
    ctx.restore();
  }

  // H. CLASSIC STUDIO (DEFAULT)
  else {
    if (isDouble && orientation === 'vertical') {
      const stripW = w / 2;
      [stripW / 2, stripW + stripW / 2].forEach((centerX) => {
        ctx.textAlign = 'center';
        ctx.fillStyle = frameInfo.textHex;

        ctx.font = '600 24px "Newsreader", "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '3px';
        ctx.fillText(customTitle.toUpperCase() || 'PHOTOBOOTH STUDIO', centerX, h - 70);

        ctx.font = '500 11px Inter, sans-serif';
        ctx.letterSpacing = '3px';
        ctx.fillStyle = frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#CCCCCC' : '#8C7A5B';
        ctx.fillText(dateStr.toUpperCase() || 'ARCHIVAL STUDY', centerX, h - 45);

        ctx.font = '400 9px Inter, sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('KỶ NIỆM • 300 DPI', centerX, h - 25);
      });
    } else if (isDouble && orientation === 'horizontal') {
      const stripH = h / 2;
      [stripH - 20, h - 20].forEach((centerY) => {
        ctx.textAlign = 'center';
        ctx.fillStyle = frameInfo.textHex;
        ctx.font = '600 18px "Newsreader", Georgia, serif';
        ctx.letterSpacing = '3px';
        ctx.fillText(`${customTitle.toUpperCase() || 'PHOTOBOOTH'} • ${dateStr}`, w / 2, centerY);
      });
    } else if (layout === 'layout-g') {
      // 2 columns have their own separate footer
      const colW = w / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = frameInfo.textHex;
      ctx.font = '700 20px "Newsreader", serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(customTitle || 'Jane & Johnny', colW / 2, h - 35);
      ctx.fillText(dateStr || '1-15-2019', colW + colW / 2, h - 35);
    } else if (!layout.startsWith('layout-')) {
      ctx.textAlign = 'center';
      ctx.fillStyle = frameInfo.textHex;

      ctx.font = '600 30px "Newsreader", "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(customTitle.toUpperCase() || "L'ESSENCE PHOTOBOOTH", w / 2, h - 75);

      ctx.font = '500 12px Inter, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillStyle = frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#CCCCCC' : '#8C7A5B';
      ctx.fillText(dateStr.toUpperCase() || 'ARCHIVAL STUDY', w / 2, h - 48);

      ctx.font = '400 10px Inter, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('STUDIO KỶ NIỆM • 300 DPI', w / 2, h - 26);
    }
  }

  ctx.restore();
}

/**
 * Trigger browser file download for a canvas element
 */
export function downloadCanvas(canvas: HTMLCanvasElement, filename = 'photobooth-strip.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 0.95);
  link.click();
}
