import { CapturedPhoto, FrameColor, StripLayout, FrameStyle, SlotCustomization } from '../types';
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
        const bRadius = frameStyle === 'polaroid' ? 4 : frameStyle === 'cinema-film' ? 0 : 6;

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

  // 3. DRAW DASHED CUT LINES IF DOUBLE STRIP
  if (isDouble) {
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
