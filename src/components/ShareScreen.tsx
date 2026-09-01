import React, { useState, useEffect } from 'react';
import { AppScreen, CapturedPhoto, FrameColor, StripLayout, FrameStyle, SlotCustomization } from '../types';
import { FRAME_COLORS, LAYOUT_OPTIONS, FRAME_STYLE_OPTIONS, FILTER_PRESETS } from '../constants/filters';
import { generatePhotostripCanvas, downloadCanvas } from '../utils/canvas';
import QRCode from 'qrcode';
import { uploadPhotoToCloud, isCloudStorageConfigured } from '../utils/cloudStorage';
import { LayoutIllustration, FrameStyleIllustration } from './VisualPreviews';
import { useIsTabletOrLarger } from '../hooks/useIsTabletOrLarger';
import {
  Download,
  Film,
  Sparkles,
  Image as ImageIcon,
  Check,
  Share2,
  QrCode,
  RotateCw,
  FlipHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShareScreenProps {
  onNavigate: (screen: AppScreen) => void;
  capturedPhotos: CapturedPhoto[];
  allLibraryPhotos?: CapturedPhoto[];
  currentFilterId: string;
  currentFilterIntensity: number;
  initialLayout?: StripLayout;
  onLayoutChange?: (layout: StripLayout) => void;
  eventConfig?: import('../types').EventConfig;
  sessionVideoUrl?: string | null;
  onUpdatePhotoFilter?: (photoId: string, filterId: string, intensity: number) => void;
  onApplyFilterToAll?: (filterId: string, intensity: number) => void;
  onUpdateConsent?: (photoIds: string[], consent: boolean) => void;
  // Chế độ Biên Tập / Xuất Bản giờ do TopAppBar hiển thị & điều khiển (đối xứng với nút Chụp Ảnh),
  // nên ShareScreen chỉ còn ĐỌC & yêu cầu đổi giá trị này qua props, không tự giữ state nội bộ nữa.
  activeMode: 'edit' | 'export';
  onSetActiveMode: (mode: 'edit' | 'export') => void;
}

export const ShareScreen: React.FC<ShareScreenProps> = ({
  onNavigate,
  capturedPhotos,
  allLibraryPhotos = [],
  currentFilterId,
  currentFilterIntensity,
  initialLayout = 'double-3-vert',
  onLayoutChange,
  eventConfig,
  sessionVideoUrl,
  onUpdateConsent,
  activeMode,
  onSetActiveMode,
}) => {
  const [publicConsent, setPublicConsent] = useState(true);
  const [layoutCategoryTab, setLayoutCategoryTab] = useState<'double-vert' | 'double-horiz' | 'single-col' | 'editorial' | 'all'>('all');
  const [layout, setLayout] = useState<StripLayout>(initialLayout);
  const [columnAlign, setColumnAlign] = useState<'left' | 'center' | 'right'>('left');
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('classic');
  const [frameColor, setFrameColor] = useState<FrameColor>('white');
  const [customTitle, setCustomTitle] = useState<string>(
    eventConfig?.eventMainSubject || eventConfig?.eventName || 'Jane & Johnny'
  );
  const [dateStr, setDateStr] = useState<string>(
    new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [noteText, setNoteText] = useState<string>('Forever & Always ♡\nLưu giữ từng khoảnh khắc ngọt ngào!');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Tải ảnh lên đám mây (Cloudflare R2 qua Worker) để có link tải thật cho mã QR — thay cho mã QR
  // giả trước đây chỉ trỏ về link trang camera, không tải được ảnh nào.
  const [cloudUploadStatus, setCloudUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error' | 'not_configured'>('idle');
  const [cloudUploadError, setCloudUploadError] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoQrSvg, setUploadedPhotoQrSvg] = useState<string | null>(null);
  const [cloudUploadAttempt, setCloudUploadAttempt] = useState(0);

  // Pool of available photos (from current session or library)
  const availablePool = capturedPhotos.length > 0 ? capturedPhotos : allLibraryPhotos;

  // Selected photo slots for collage based on layout
  const currentLayoutConfig = LAYOUT_OPTIONS.find((l) => l.id === layout) || LAYOUT_OPTIONS[0];
  const requiredCount = currentLayoutConfig.photoCount;

  // Selected photo IDs per slot
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(() => {
    const initial = availablePool.slice(0, requiredCount).map((p) => p.id);
    while (initial.length < requiredCount && availablePool.length > 0) {
      initial.push(availablePool[initial.length % availablePool.length].id);
    }
    return initial;
  });

  // Per-slot customization (rotation: 0, 90, 180, 270; flipH: boolean; filterId: string; filterIntensity: number)
  const [slotCustomizations, setSlotCustomizations] = useState<Record<number, SlotCustomization>>({});

  // Keep selectedPhotoIds length in sync with required layout count
  useEffect(() => {
    setSelectedPhotoIds((prev) => {
      const next = [...prev];
      if (next.length < requiredCount) {
        while (next.length < requiredCount && availablePool.length > 0) {
          next.push(availablePool[next.length % availablePool.length].id);
        }
      } else if (next.length > requiredCount) {
        return next.slice(0, requiredCount);
      }
      return next;
    });
  }, [layout, requiredCount, availablePool]);

  // Active selected slot (null = không chọn ảnh nào mặc định)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  // Resolved list of photo objects for the strip
  const stripPhotos: CapturedPhoto[] = selectedPhotoIds.map((id, idx) => {
    const found = availablePool.find((p) => p.id === id);
    if (found) return found;
    return (
      availablePool[idx % Math.max(1, availablePool.length)] || {
        id: `fallback_${idx}`,
        dataUrl: '',
        timestamp: Date.now(),
        filterId: currentFilterId,
        filterIntensity: currentFilterIntensity,
      }
    );
  });

  const frameInfo = FRAME_COLORS.find((f) => f.id === frameColor) || FRAME_COLORS[0];
  const activeFrameStyleOption = FRAME_STYLE_OPTIONS.find((f) => f.id === frameStyle) || FRAME_STYLE_OPTIONS[0];

  const activeSlotCustom = activeSlotIndex !== null ? (slotCustomizations[activeSlotIndex] || { slotIndex: activeSlotIndex, rotation: 0, flipH: false }) : null;

  // Rotate active slot by 90 degrees
  const handleRotateSlot = (slotIdx: number) => {
    setSlotCustomizations((prev) => {
      const current = prev[slotIdx] || { slotIndex: slotIdx, rotation: 0, flipH: false };
      const newRotation = (((current.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
      return {
        ...prev,
        [slotIdx]: { ...current, rotation: newRotation },
      };
    });
  };

  // Flip horizontal for active slot
  const handleFlipSlot = (slotIdx: number) => {
    setSlotCustomizations((prev) => {
      const current = prev[slotIdx] || { slotIndex: slotIdx, rotation: 0, flipH: false };
      const newFlip = !(current.flipH || false);
      return {
        ...prev,
        [slotIdx]: { ...current, flipH: newFlip },
      };
    });
  };

  // Máy tính bảng trở lên (mọi hướng xoay) dùng bố cục 2 cột: trái cố định xem trước, phải cuộn
  // riêng các thông số — tránh nội dung cuộn trồi lên trùng vùng trong suốt của TopAppBar, đồng
  // thời tận dụng khoảng trống 2 bên tờ in trên màn rộng. Điện thoại (mọi hướng) vẫn giữ 1 cột.
  const isTabletOrLarger = useIsTabletOrLarger();

  // Đánh lại số thứ tự các mục biên tập: mục "Bố Cục Ghép" chỉ hiện ở Chế Độ Chụp Tự Do (nên chiếm
  // số 1 khi có mặt), các mục còn lại dịch số lên tương ứng khi mục đó bị ẩn.
  const showLayoutSection = eventConfig?.captureMode === 'free';
  const stepFrameStyle = showLayoutSection ? 2 : 1;
  const stepPaperColor = stepFrameStyle + 1;
  const stepNote = stepPaperColor + 1;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://photobooth.app';
  // Link để chia sẻ/mã QR: ưu tiên link ảnh thật vừa tải lên đám mây, nếu chưa có (đang tải, lỗi,
  // hoặc chưa cấu hình nơi lưu) thì tạm dùng link trang hiện tại.
  const shareUrl = uploadedPhotoUrl || currentUrl;

  // Dựng lại đúng canvas dải ảnh theo layout/khung/tuỳ chỉnh hiện tại — dùng chung cho cả nút tải
  // về máy VÀ bước tải lên đám mây để tạo mã QR (đảm bảo 2 nơi luôn ra đúng 1 ảnh giống nhau).
  const buildStripCanvas = async () => {
    const customList: SlotCustomization[] = [];
    for (let i = 0; i < requiredCount; i++) {
      customList.push(slotCustomizations[i] || { slotIndex: i, rotation: 0, flipH: false });
    }

    return generatePhotostripCanvas({
      photos: stripPhotos,
      layout,
      frameColor,
      frameStyle,
      customTitle: customTitle || 'PHOTOBOOTH',
      dateStr: dateStr || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      noteText,
      columnAlign,
      slotCustomizations: customList,
    });
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);

      const canvas = await buildStripCanvas();

      const filename = `photobooth_${layout}_${frameStyle}_${Date.now()}.png`;
      downloadCanvas(canvas, filename);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#1A1A1A', '#8C7A5B', '#EFEEE8', '#F9F7F2'],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Dải Ảnh Kỷ Niệm Photobooth Của Tôi',
          text: 'Xem dải ảnh photobooth phong cách nghệ thuật từ Studio!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User cancelled share
    }
  };

  // Tự động tải ảnh lên đám mây ngay khi khách chuyển sang màn "Xuất Bản" — để có link thật cho
  // mã QR kịp sẵn sàng trước khi khách kịp lấy điện thoại ra quét.
  useEffect(() => {
    if (activeMode !== 'export') return;
    if (!isCloudStorageConfigured(eventConfig?.cloudStorage)) {
      setCloudUploadStatus('not_configured');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setCloudUploadStatus('uploading');
        setCloudUploadError(null);
        const canvas = await buildStripCanvas();
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
        if (!blob) throw new Error('Không tạo được ảnh để tải lên.');
        if (cancelled) return;

        const { url } = await uploadPhotoToCloud(blob, eventConfig!.cloudStorage!);
        if (cancelled) return;

        const svg = await QRCode.toString(url, {
          type: 'svg',
          margin: 1,
          color: { dark: '#1A1A1A', light: '#00000000' },
        });
        if (cancelled) return;

        setUploadedPhotoUrl(url);
        setUploadedPhotoQrSvg(svg);
        setCloudUploadStatus('done');
      } catch (err) {
        if (cancelled) return;
        setCloudUploadStatus('error');
        setCloudUploadError(err instanceof Error ? err.message : 'Tải ảnh lên đám mây thất bại.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, cloudUploadAttempt]);

  const handleDownloadBtsVideo = () => {
    if (!sessionVideoUrl) return;
    const a = document.createElement('a');
    a.href = sessionVideoUrl;
    a.download = `photobooth_bts_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper render for photos with transformation - KHÔNG CÓ NÚT OVERLAY ĐÈ LÊN ẢNH
  const renderPhotoItem = (photo: CapturedPhoto, slotIdx: number, customClass = '') => {
    const isSelected = activeSlotIndex === slotIdx;
    const custom = slotCustomizations[slotIdx];
    const filterId = custom?.filterId || photo.filterId || currentFilterId || 'original';
    const intensity = custom?.filterIntensity ?? photo.filterIntensity ?? currentFilterIntensity ?? 80;
    const preset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];

    const rotation = custom?.rotation || 0;
    const flipH = custom?.flipH || false;

    return (
      <div
        key={slotIdx}
        onClick={(e) => {
          e.stopPropagation();
          // Bấm chọn, bấm lần nữa để bỏ chọn
          setActiveSlotIndex((prev) => (prev === slotIdx ? null : slotIdx));
        }}
        className={`bg-[#1A1A1A]/5 overflow-hidden relative border transition-all cursor-pointer select-none flex items-center justify-center ${customClass} ${
          isSelected
            ? 'ring-3 ring-amber-500 shadow-md z-10 scale-[1.01]'
            : 'border-current/15 hover:ring-2 hover:ring-amber-400/50'
        } ${frameStyle === 'cinema-film' ? 'rounded-none' : 'rounded-xs'}`}
      >
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200 pointer-events-none"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
          }}
        >
          <img
            src={photo.dataUrl}
            alt={`Ô #${slotIdx + 1}`}
            className="w-full h-full object-cover block select-none pointer-events-none"
            style={{
              filter: preset ? preset.filterCss(intensity) : 'none',
            }}
          />

          {/* Preset Optical Color Tint Overlay */}
          {preset?.overlayColor && intensity > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: preset.overlayColor,
                mixBlendMode: (preset.blendMode as any) || 'overlay',
                opacity: (intensity / 100) * 0.9,
              }}
            />
          )}
        </div>

        {/* Số thứ tự ô ảnh: khi chọn thì sáng rõ, bình thường thì mờ nhẹ góc */}
        {isSelected ? (
          <div className="absolute top-1 left-1 bg-amber-400 text-black text-[7.5px] px-1.5 py-0.5 rounded-full font-mono font-black shadow-xs pointer-events-none flex items-center gap-0.5">
            <span>✓ Ô #{slotIdx + 1}</span>
            {rotation > 0 && <span>({rotation}°)</span>}
            {flipH && <span>↔</span>}
          </div>
        ) : (
          <div className="absolute top-1 left-1 bg-black/40 text-white/90 text-[7px] px-1 py-0.2 rounded-xs font-mono font-medium pointer-events-none opacity-60">
            #{slotIdx + 1}
          </div>
        )}
      </div>
    );
  };

  // Render Note area for previews
  const renderNotePreviewArea = (titleText: string, dateDisplay: string, isCompact = false) => {
    return (
      <div className="flex flex-col items-center justify-center p-2 rounded-xs border border-dashed border-current/25 bg-current/5 text-center flex-1 h-full min-h-0 overflow-hidden">
        <span className="font-artistic-serif text-[9px] sm:text-[11px] font-bold tracking-widest uppercase leading-tight">
          {titleText || 'June & Johnny'}
        </span>
        <span className="text-[7px] sm:text-[8px] opacity-75 tracking-wider mt-0.5 font-sans">
          {dateDisplay || '1-15-2019'}
        </span>
        {!isCompact && (
          <div className="mt-1 text-[6.5px] sm:text-[7.5px] italic opacity-85 leading-snug line-clamp-3">
            {noteText || 'Lưu bút kỷ niệm ♡'}
          </div>
        )}
      </div>
    );
  };

  // Visual container styles according to frameStyle & frameColor
  const getContainerFrameStyles = () => {
    if (frameStyle === 'onepiece-wanted') {
      return {
        backgroundColor: '#E8CCA0',
        borderColor: '#5E381A',
        color: '#4A2A11',
      };
    }
    if (frameStyle === 'cinema-film') {
      return {
        backgroundColor: '#0D0D0D',
        borderColor: '#222222',
        color: '#EAB308',
      };
    }
    if (frameStyle === 'movie-ticket') {
      return {
        backgroundColor: frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#1A1A1A' : '#FAF8F2',
        borderColor: 'rgba(0,0,0,0.15)',
        color: frameInfo.id === 'charcoal' || frameInfo.id === 'black' ? '#F9F7F2' : '#1A1A1A',
      };
    }
    if (frameStyle === 'instagram') {
      return {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(0,0,0,0.12)',
        color: '#1A1A1A',
      };
    }
    if (frameStyle === 'vinyl-cd') {
      return {
        backgroundColor: '#262220',
        borderColor: '#D97706',
        color: '#F3ECE4',
      };
    }
    return {
      backgroundColor: frameInfo.hex,
      borderColor: frameInfo.borderHex,
      color: frameInfo.textHex,
    };
  };

  const isHorizontalLayout =
    layout === 'double-2-horiz' ||
    layout === 'double-3-horiz' ||
    layout === 'double-4-horiz' ||
    layout.startsWith('layout-');
  const isSingleStrip = layout === 'strip-3' || layout === 'strip-4';

  const hasActiveSlot = activeSlotIndex !== null && activeSlotCustom !== null;

  return (
    isTabletOrLarger ? (
      <div className="w-full h-full flex flex-row select-none text-[#1A1A1A]">
        {/* CỘT TRÁI CỐ ĐỊNH: tờ in xem trước — không cuộn, luôn thấy trọn khung khi chỉnh thông số bên phải. */}
        <div className="w-[40%] min-w-[300px] max-w-md h-full flex flex-col items-center justify-center gap-2 border-r border-[#1A1A1A]/10 bg-[#FAF8F5] px-3 sm:px-4 py-4 shrink-0 overflow-y-auto overscroll-contain">
        {/* DÒNG TIÊU ĐỀ — nút chuyển Biên Tập/Xuất Bản giờ nằm ở góc phải trên TopAppBar,
            đối xứng với nút Chụp Ảnh góc trái, nên ở đây chỉ còn tiêu đề mô tả màn hình. */}
        <div className="w-full max-w-4xl px-3 sm:px-4 pt-2.5 pb-1.5 flex items-center justify-between gap-2">
          <div>
            <span className="font-sans-vietnam text-[9px] uppercase tracking-[0.25em] text-[#8C7A5B] font-semibold block">
              BIÊN TẬP & XUẤT BẢN
            </span>
            <h2 className="font-artistic-serif text-base sm:text-lg font-semibold text-[#1A1A1A] tracking-[0.08em] leading-tight uppercase">
              SỬA NGAY LẤY LIỀN
            </h2>
          </div>
        </div>

        {/* KHUNG XEM TRƯỚC DẢI ẢNH TỰ ĐỘNG CO GIÃN THEO TỶ LỆ TỜ IN */}
        <div className="w-full h-[38vh] sm:h-[42vh] max-h-[350px] min-h-[230px] flex items-center justify-center p-2 sm:p-2.5 overflow-hidden">
          <div
            id="photostrip-share-preview"
            className={`shadow-[0_14px_36px_rgba(0,0,0,0.16)] border transition-all duration-300 rounded-xs relative overflow-hidden flex flex-col justify-between h-full max-h-full ${
              isHorizontalLayout
                ? 'aspect-[3/2] w-auto max-w-[95%] p-2 sm:p-2.5'
                : isSingleStrip
                ? 'aspect-[1/3] w-auto max-w-[90%] p-1.5 sm:p-2'
                : 'aspect-[2/3] w-auto max-w-[92%] p-2 sm:p-2.5'
            }`}
            style={getContainerFrameStyles()}
          >
            {/* SPOCKET HOLES CHO KHUNG PHIM 35MM */}
            {frameStyle === 'cinema-film' && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#111] flex flex-col justify-around py-1 items-center z-10 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-white/90 rounded-xs" />
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#111] flex flex-col justify-around py-1 items-center z-10 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-white/90 rounded-xs" />
                  ))}
                </div>
              </>
            )}

            {/* HEADER CHO TỪNG THEME */}
            {frameStyle === 'instagram' && (
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-linear-to-tr from-yellow-500 via-rose-500 to-purple-600 p-[1px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[5.5px] font-bold text-rose-500">
                      PB
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold tracking-tight leading-none">
                      {customTitle.toLowerCase().replace(/\s+/g, '_') || 'photobooth_studio'}
                    </div>
                    <div className="text-[6px] text-gray-500 leading-none mt-0.5">Original Audio</div>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-gray-700">•••</span>
              </div>
            )}

            {frameStyle === 'magazine' && (
              <div className="text-center pb-0.5 mb-1 border-b border-current/20 shrink-0">
                <h1 className="text-sm sm:text-base font-serif font-black tracking-[0.25em] uppercase leading-none">
                  {customTitle || 'V O G U E'}
                </h1>
                <p className="text-[6px] font-sans tracking-[0.2em] uppercase opacity-70 mt-0.5">
                  SPECIAL EDITION • EDITORIAL
                </p>
              </div>
            )}

            {frameStyle === 'onepiece-wanted' && (
              <div className="text-center pb-0.5 mb-0.5 shrink-0">
                <h1 className="text-sm sm:text-base font-black tracking-[0.15em] uppercase text-[#4A2A11] leading-none">
                  WANTED
                </h1>
                <p className="text-[6.5px] font-serif font-bold tracking-[0.2em] uppercase text-[#6B3B18] leading-tight">
                  DEAD OR ALIVE
                </p>
              </div>
            )}

            {frameStyle === 'movie-ticket' && (
              <div className="text-center pb-0.5 mb-0.5 border-b border-dashed border-current/30 shrink-0">
                <span className="text-[6.5px] font-bold font-sans tracking-[0.2em] uppercase">
                  ★ ADMIT ONE • MEMORY PASS ★
                </span>
              </div>
            )}

            {/* BỐ CỤC ẢNH & VÙNG GHI CHÚ THEO LAYOUT */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
              {/* 1. DẢI ĐÔI DỌC (double-2-vert, double-3-vert, double-4-vert) */}
              {(layout === 'double-2-vert' || layout === 'double-3-vert' || layout === 'double-4-vert') && (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 relative h-full flex-1 min-h-0 overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-current/30 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10">
                    <span className="bg-current/10 text-[6.5px] px-0.5 rounded-xs">✂</span>
                  </div>

                  {/* Dải Trái (Slot 0..N-1) */}
                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos
                      .slice(0, requiredCount / 2)
                      .map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                  </div>

                  {/* Dải Phải (Slot N..2N-1) */}
                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos
                      .slice(requiredCount / 2, requiredCount)
                      .map((photo, i) =>
                        renderPhotoItem(photo, requiredCount / 2 + i, 'w-full h-full flex-1 min-h-0')
                      )}
                  </div>
                </div>
              )}

              {/* 2. DẢI ĐÔI NGANG (double-2-horiz, double-3-horiz, double-4-horiz) */}
              {(layout === 'double-2-horiz' || layout === 'double-3-horiz' || layout === 'double-4-horiz') && (
                <div className="flex flex-col gap-1 sm:gap-1.5 relative h-full flex-1 min-h-0 justify-between overflow-hidden">
                  {/* Hàng 1 */}
                  <div className="flex flex-row gap-1 sm:gap-1.5 h-full flex-1 min-h-0 w-full overflow-hidden">
                    {stripPhotos
                      .slice(0, requiredCount / 2)
                      .map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-w-0 min-h-0'))}
                  </div>

                  {/* Đường cắt đôi ngang */}
                  <div className="w-full border-t border-dashed border-current/30 relative flex items-center justify-center my-0.5 shrink-0 pointer-events-none">
                    <span className="bg-current/10 text-[6px] px-1 rounded-xs -translate-y-1/2">✂ CẮT ĐÔI</span>
                  </div>

                  {/* Hàng 2 */}
                  <div className="flex flex-row gap-1 sm:gap-1.5 h-full flex-1 min-h-0 w-full overflow-hidden">
                    {stripPhotos
                      .slice(requiredCount / 2, requiredCount)
                      .map((photo, i) =>
                        renderPhotoItem(photo, requiredCount / 2 + i, 'w-full h-full flex-1 min-w-0 min-h-0')
                      )}
                  </div>
                </div>
              )}

              {/* 3. CỘT ĐƠN 2, 3, 4 ẢNH TRÊN TỜ IN 4X6 CĂN TRÁI / GIỮA / PHẢI (single-col-2, single-col-3, single-col-4) */}
              {(layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') && (
                <div
                  className={`grid h-full flex-1 min-h-0 gap-1.5 sm:gap-2 ${
                    columnAlign === 'center' ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {columnAlign === 'right' && renderNotePreviewArea(customTitle, dateStr)}

                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos.map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                  </div>

                  {columnAlign === 'left' && renderNotePreviewArea(customTitle, dateStr)}
                </div>
              )}

              {/* 4. LAYOUT F (1 Lớn trên trái + 3 Nhỏ dưới + Note trên phải) */}
              {layout === 'layout-f' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="grid grid-cols-2 gap-1.5 flex-[1.4] min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                    {renderNotePreviewArea(customTitle, dateStr)}
                  </div>
                  <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[3] || availablePool[3] || availablePool[0], 3, 'w-full h-full')}
                  </div>
                </div>
              )}

              {/* 5. LAYOUT G (Lưới 4 ô 2x2 với 2 dòng chữ dưới mỗi cột) */}
              {layout === 'layout-g' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 4).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full min-h-0 min-w-0'))}
                </div>
              )}

              {/* 6. LAYOUT H (2 ảnh dọc trái, 1 lớn trên phải, note dưới phải) */}
              {layout === 'layout-h' && (
                <div className="grid grid-cols-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full flex-1 min-h-0')}
                  </div>
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full flex-1 min-h-0')}
                    {renderNotePreviewArea(customTitle, dateStr, true)}
                  </div>
                </div>
              )}

              {/* 7. LAYOUT I (1 trên trái, 1 dưới trái, Note trên phải, 1 dưới phải) */}
              {layout === 'layout-i' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                  {renderNotePreviewArea(customTitle, dateStr, true)}
                  {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                  {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full')}
                </div>
              )}

              {/* 8. LAYOUT J (2 ảnh dọc trái + Vùng lưu bút lớn bên phải) */}
              {layout === 'layout-j' && (
                <div className="grid grid-cols-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full flex-1 min-h-0')}
                  </div>
                  {renderNotePreviewArea(customTitle, dateStr)}
                </div>
              )}

              {/* 9. LAYOUT K (2 ảnh ngang giữa) */}
              {layout === 'layout-k' && (
                <div className="flex flex-col justify-center h-full flex-1 min-h-0 overflow-hidden">
                  <div className="text-center font-artistic-serif text-xs font-bold uppercase mb-1">
                    {customTitle || 'Jane & Johnny'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                  </div>
                  <div className="text-center text-[8px] opacity-75 uppercase mt-1 font-sans">
                    {dateStr || '1-15-2019'}
                  </div>
                </div>
              )}

              {/* 10. LAYOUT M (1 ảnh panorama lớn) */}
              {layout === 'layout-m' && (
                <div className="h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                </div>
              )}

              {/* 11. 2 ẢNH ĐƠN (single-2) */}
              {layout === 'single-2' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 2).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                </div>
              )}

              {/* 12. 1 ẢNH ĐƠN (single-1) */}
              {layout === 'single-1' && (
                <div className="h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                </div>
              )}

              {/* 13. 1 ẢNH LỚN + 2 ẢNH NHỎ (featured-1-2) */}
              {layout === 'featured-1-2' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex-[1.4] min-h-0 w-full">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5 flex-1 min-h-0 w-full">
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full min-h-0')}
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full min-h-0')}
                  </div>
                </div>
              )}

              {/* 14. LƯỚI 4 Ô (grid-4) */}
              {layout === 'grid-4' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 justify-center h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 4).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full min-h-0 min-w-0'))}
                </div>
              )}

              {/* 15. DẢI ĐƠN 3/4 ẢNH (strip-3, strip-4) */}
              {(layout === 'strip-3' || layout === 'strip-4') && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                </div>
              )}
            </div>

            {/* FOOTER CHO TỪNG THEME */}
            {frameStyle === 'instagram' && (
              <div className="pt-1 mt-0.5 border-t border-black/10 shrink-0">
                <div className="flex items-center justify-between text-[9px] mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">❤️</span>
                    <span>💬</span>
                    <span>✈️</span>
                  </div>
                  <span>🔖</span>
                </div>
                <div className="text-[6.5px] font-bold leading-tight">1,248 likes</div>
                <div className="text-[5.5px] text-gray-500 truncate leading-tight">
                  #{customTitle.replace(/\s+/g, '')} #photobooth #{dateStr}
                </div>
              </div>
            )}

            {frameStyle === 'onepiece-wanted' && (
              <div className="text-center pt-0.5 mt-0.5 border-t border-[#5E381A]/40 shrink-0">
                <div className="font-serif font-black text-[8px] tracking-wider text-[#4A2A11] leading-none">
                  ฿ 1,500,000,000 -
                </div>
                <div className="text-[5.5px] tracking-[0.2em] font-sans font-bold text-[#6B3B18] mt-0.5">
                  MARINE • {dateStr}
                </div>
              </div>
            )}

            {frameStyle === 'movie-ticket' && (
              <div className="pt-0.5 mt-0.5 border-t border-dashed border-current/30 flex items-center justify-between text-[6px] font-mono shrink-0">
                <span>ROW: VIP • SEAT: 01</span>
                <span>{dateStr}</span>
              </div>
            )}

            {frameStyle === 'cinema-film' && (
              <div className="pt-0.5 mt-0.5 flex items-center justify-between text-[6px] font-mono tracking-widest text-[#EAB308]/80 shrink-0">
                <span>KODAK PORTRA 400</span>
                <span>{dateStr}</span>
                <span>ISO 400</span>
              </div>
            )}

            {frameStyle === 'vinyl-cd' && (
              <div className="pt-0.5 mt-0.5 text-center shrink-0">
                <div className="text-[7.5px] font-serif font-bold tracking-widest text-[#D97706] leading-none">
                  ♫ SIDE A • LOVE TRACK
                </div>
                <div className="text-[6px] opacity-70 mt-0.5">{dateStr} • STUDIO LP</div>
              </div>
            )}

            {(frameStyle === 'classic' || frameStyle === 'polaroid') && (
              <div className="text-center pt-1 mt-0.5 shrink-0">
                <h3 className="font-artistic-serif text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase leading-tight">
                  {customTitle || 'Jane & Johnny'}
                </h3>
                <p className="text-[6px] tracking-[0.2em] opacity-70 uppercase font-sans mt-0.5">
                  {dateStr} • STUDIO KỶ NIỆM
                </p>
              </div>
            )}
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN XOAY & LẬT GƯƠNG NGOÀI PHẠM VI ẢNH */}
        {activeMode === 'edit' && (
          <div className="w-full max-w-4xl px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1A1A1A]/10 bg-[#F4F1EA]">
            {hasActiveSlot ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-sans text-xs sm:text-sm font-bold text-[#1A1A1A]">
                    Đang chọn: <span className="text-amber-900 bg-amber-300/80 px-2 py-0.5 rounded-lg font-mono font-black">Ô #{activeSlotIndex! + 1}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSlotIndex(null)}
                    className="text-[11px] text-gray-500 hover:text-black underline cursor-pointer ml-1"
                  >
                    (Bỏ chọn)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotateSlot(activeSlotIndex!)}
                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-amber-400 hover:text-black text-[#1A1A1A] rounded-xl font-sans text-xs sm:text-sm font-bold border border-[#1A1A1A]/20 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-4 h-4 text-amber-600" />
                    <span>Xoay 90°</span>
                    {(activeSlotCustom?.rotation || 0) > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-xs font-mono font-bold">
                        {activeSlotCustom?.rotation}°
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFlipSlot(activeSlotIndex!)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-sans text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      activeSlotCustom?.flipH
                        ? 'bg-[#1A1A1A] text-amber-300 border-[#1A1A1A] shadow-xs'
                        : 'bg-white hover:bg-amber-400 hover:text-black text-[#1A1A1A] border-[#1A1A1A]/20 shadow-xs'
                    }`}
                  >
                    <FlipHorizontal className={`w-4 h-4 ${activeSlotCustom?.flipH ? 'text-amber-300' : 'text-amber-600'}`} />
                    <span>Lật Ngang</span>
                    {activeSlotCustom?.flipH && (
                      <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded-xs font-bold">
                        Đã lật
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-sm">👆</span>
                  <span className="text-xs sm:text-sm font-medium font-sans">
                    Chạm vào ảnh bất kỳ trên dải giấy để <span className="font-bold text-amber-800">Xoay</span> hoặc <span className="font-bold text-amber-800">Lật ảnh</span>
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 hidden sm:inline font-sans">
                  (Chạm lại để bỏ chọn)
                </span>
              </div>
            )}
          </div>
        )}
        </div>
        {/* CỘT PHẢI: các thông số biên tập / xuất bản — cuộn riêng, không bao giờ trồi lên vùng trong suốt của TopAppBar vì cột này đã nằm dưới phần đệm pt của khung ngoài. */}
        <div className="flex-1 h-full overflow-y-auto overscroll-contain">
          <main className="w-full max-w-2xl mx-auto px-3.5 sm:px-6 py-5 flex flex-col gap-5">
        {/* ==================== CHẾ ĐỘ 1: BIÊN TẬP ==================== */}
        {activeMode === 'edit' && (
          <>
            {/* Bố Cục Ghép chỉ hiện ở Chế Độ Chụp Tự Do — các chế độ khác đã chọn bố cục từ trước (màn Chọn Bố Cục). */}
            {eventConfig?.captureMode === 'free' && (
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8C7A5B]"></span>
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    1. Bố Cục Ghép ({LAYOUT_OPTIONS.length} Kiểu Dàn Trang)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#8C7A5B] font-bold">
                  {currentLayoutConfig.shortName} • {requiredCount} Ô Ảnh
                </span>
              </div>

              {/* Nếu là Cột Đơn (single-col-*): Tùy chọn Căn Trái / Giữa / Phải */}
              {(layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') && (
                <div className="flex flex-col gap-2 bg-white/70 p-3 rounded-xl border border-[#1A1A1A]/10">
                  <span className="text-[10.5px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Vị Trí Cột Ảnh Trên Tờ Giấy In 4x6:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setColumnAlign('left')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'left'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Lệch Trái (Viết chữ Phải)</span>
                    </button>
                    <button
                      onClick={() => setColumnAlign('center')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'center'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                      <span>Nằm Ở Giữa</span>
                    </button>
                    <button
                      onClick={() => setColumnAlign('right')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'right'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                      <span>Lệch Phải (Viết chữ Trái)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB DANH MỤC LAYOUT */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-[#1A1A1A]/10">
                <button
                  onClick={() => setLayoutCategoryTab('double-vert')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'double-vert'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Dải Đôi Dọc (4x6)
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('double-horiz')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'double-horiz'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Dải Đôi Ngang (6x4)
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('single-col')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'single-col'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Cột Đơn + Lưu Bút
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('editorial')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'editorial'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Bố Cục Mẫu & Bìa
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'all'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Tất Cả
                </button>
              </div>

              {/* GRID CÁC NÚT CHỌN BỐ CỤC (CÓ HÌNH ẢNH MINH HỌA TRỰC QUAN CHO TRẺ EM & NGƯỜI DÙNG) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {LAYOUT_OPTIONS.filter((l) => {
                  if (layoutCategoryTab === 'all') return true;
                  return l.category === layoutCategoryTab;
                }).map((opt) => {
                  const isSelected = layout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A] font-bold shadow-md ring-2 ring-[#8C7A5B]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/60 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Badge số lượng ảnh */}
                      <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-[#8C7A5B]/15 text-[#8C7A5B]'
                        }`}>
                          {opt.photoCount} ảnh
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>

                      {/* Khung mô phỏng hình ảnh trực quan */}
                      <div className="py-1 flex items-center justify-center min-h-[96px]">
                        <LayoutIllustration layoutId={opt.id} isSelected={isSelected} />
                      </div>

                      {/* Tên bố cục */}
                      <div className="text-[11px] font-sans font-bold mt-1.5 line-clamp-1">{opt.shortName}</div>
                      <div className={`text-[8.5px] mt-0.5 leading-tight line-clamp-1 ${isSelected ? 'text-[#F9F7F2]/75' : 'text-[#1A1A1A]/65'}`}>
                        {opt.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            )}

            {/* KHỐI 3: CHỦ ĐỀ & KIỂU KHUNG */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#8C7A5B]" />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    {stepFrameStyle}. Kiểu Khung & Chủ Đề Nghệ Thuật:
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#8C7A5B]">
                  {activeFrameStyleOption.name}
                </span>
              </div>

              {/* GRID CÁC KIỂU KHUNG (HÌNH MINH HỌA ĐỒ HỌA MẪU DỄ NHẬN BIẾT CHO TRẺ EM) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FRAME_STYLE_OPTIONS.map((styleOpt) => {
                  const isSelected = frameStyle === styleOpt.id;
                  return (
                    <button
                      key={styleOpt.id}
                      onClick={() => setFrameStyle(styleOpt.id)}
                      className={`p-2 rounded-2xl border flex flex-col gap-1.5 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A] ring-2 ring-[#8C7A5B] shadow-md'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/60 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Mô hình hình ảnh trực quan */}
                      <FrameStyleIllustration styleId={styleOpt.id} isSelected={isSelected} />

                      {/* Thông tin tên & nhãn chủ đề */}
                      <div className="flex items-center justify-between mt-1 px-1">
                        <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-400/30 text-amber-300' : 'bg-[#8C7A5B]/15 text-[#8C7A5B]'
                        }`}>
                          {styleOpt.tag}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[11px] font-sans font-bold px-1 text-left">{styleOpt.name}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* KHỐI 5: MÀU SẮC GIẤY IN */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80">
                  {stepPaperColor}. Màu Giấy In & Chất Liệu Viền:
                </span>
                <span className="text-[10px] font-bold text-[#8C7A5B]">{frameInfo.name}</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FRAME_COLORS.map((frame) => {
                  const isSelected = frameColor === frame.id;
                  return (
                    <button
                      key={frame.id}
                      onClick={() => setFrameColor(frame.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1A1A1A] ring-2 ring-[#8C7A5B] shadow-xs bg-white'
                          : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/50 bg-[#F9F7F2]'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full border border-black/20 shadow-inner"
                        style={{ backgroundColor: frame.hex }}
                      />
                      <span className="text-[9px] font-sans uppercase tracking-tight text-center truncate w-full font-medium">
                        {frame.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* KHỐI 6: TÙY CHỈNH TIÊU ĐỀ, NGÀY THÁNG & LƯU BÚT GHI CHÚ */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80">
                {stepNote}. Tiêu Đề, Ngày In & Lời Chúc Lưu Bút:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                    Tiêu Đề / Tên Nhân Vật / Cặp Đôi:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={40}
                    placeholder="VD: Jane & Johnny"
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                    Ngày Tháng In:
                  </label>
                  <input
                    type="text"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    maxLength={20}
                    placeholder="VD: 1-15-2019"
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                  Nội Dung Lưu Bút / Lời Chúc (Hiển thị trên phần giấy trắng trống):
                </label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={140}
                  placeholder="Nhập lời chúc, lưu bút, thông điệp kỷ niệm..."
                  className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </section>

            {/* NÚT HÀNH ĐỘNG DƯỚI CÙNG TRONG CHẾ ĐỘ BIÊN TẬP — quay lại chụp đã có sẵn ở nút góc trên (TopAppBar) nên chỉ cần 1 nút hành động chính ở đây */}
            <div className="flex mt-1">
              <button
                onClick={() => onSetActiveMode('export')}
                className="w-full py-3 bg-[#1A1A1A] hover:bg-[#8C7A5B] text-[#F9F7F2] font-sans text-xs uppercase tracking-widest font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Chuyển Sang Xuất Bản & Tải Về</span>
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ==================== CHẾ ĐỘ 2: XUẤT BẢN ==================== */}
        {activeMode === 'export' && (
          <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#8C7A5B]" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Xuất Bản & Tải Dải Ảnh
                </h3>
              </div>
              <span className="text-[10px] font-sans font-bold text-[#8C7A5B] bg-[#8C7A5B]/10 px-2 py-0.5 rounded-full">
                {currentLayoutConfig.shortName} • {activeFrameStyleOption.shortName}
              </span>
            </div>

            {/* NÚT TẢI VỀ ẢNH PNG 300 DPI CHÍNH */}
            <button
              id="download-photostrip-btn"
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-4 bg-[#1A1A1A] hover:bg-[#8C7A5B] text-[#F9F7F2] font-sans text-xs uppercase tracking-widest transition-all active:scale-98 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting
                  ? 'Đang Kết Xuất Bản In 300 DPI...'
                  : `Tải Về Ảnh PNG 300 DPI (${activeFrameStyleOption.name})`}
              </span>
            </button>

            {/* Video BTS nếu có */}
            {sessionVideoUrl && (
              <div className="bg-[#F9F7F2] p-3.5 rounded-xl border border-rose-400/40 shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-rose-500 text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Video Quá Trình Chụp (BTS)
                      </h4>
                      <span className="text-[9.5px] text-[#1A1A1A]/60 font-sans">
                        Ghi lại toàn bộ khoảnh khắc từ tấm 1 đến khi hoàn thành
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                    Sẵn Sàng
                  </span>
                </div>

                <div className="w-full rounded-lg overflow-hidden border border-[#1A1A1A]/15 bg-black aspect-video flex items-center justify-center relative">
                  <video
                    src={sessionVideoUrl}
                    controls
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <button
                  onClick={handleDownloadBtsVideo}
                  className="w-full py-2.5 bg-[#E86A7C] hover:bg-[#D45668] text-white font-sans text-xs uppercase tracking-wider transition-all active:scale-98 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-bold shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Video BTS Về Máy (.webm)</span>
                </button>
              </div>
            )}

            {/* CHIA SẺ LIÊN KẾT — đã bỏ nút "In Trực Tiếp" vì chỉ gọi in cả trang web (window.print),
                không in đúng ảnh dải, dễ gây hiểu lầm là in được trong khi chưa nối máy in thật. */}
            <button
              id="share-native-btn"
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-[#F9F7F2] hover:bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 font-sans text-xs uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-2xs"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Đã Sao Chép Liên Kết!' : 'Chia Sẻ Liên Kết'}</span>
            </button>

            {/* Mã QR Quét Tải Về Điện Thoại */}
            <div className="bg-[#F9F7F2] p-3.5 rounded-xl border border-[#1A1A1A]/15 flex items-center gap-3.5">
              <div className="w-18 h-18 bg-white p-1 rounded-lg border border-[#1A1A1A]/10 flex items-center justify-center shrink-0">
                {cloudUploadStatus === 'done' && uploadedPhotoQrSvg ? (
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: uploadedPhotoQrSvg }} />
                ) : cloudUploadStatus === 'uploading' ? (
                  <RefreshCw className="w-5 h-5 text-[#8C7A5B] animate-spin" />
                ) : (
                  <QrCode className="w-6 h-6 text-[#1A1A1A]/25" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-[#8C7A5B]" />
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#8C7A5B] font-bold">
                    QUÉT MÃ TRÊN ĐIỆN THOẠI
                  </span>
                </div>
                <p className="font-sans text-xs font-bold text-[#1A1A1A] mt-0.5">
                  Tải Dải Ảnh Về Thư Viện
                </p>
                {cloudUploadStatus === 'done' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Mở camera quét mã để xem và lưu dải ảnh sắc nét về máy.
                  </span>
                )}
                {cloudUploadStatus === 'uploading' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Đang tải ảnh lên để tạo mã QR, chờ vài giây...
                  </span>
                )}
                {cloudUploadStatus === 'not_configured' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Chưa cấu hình nơi lưu ảnh trên đám mây (Admin → Quản Lý Ảnh & Bộ Nhớ).
                  </span>
                )}
                {cloudUploadStatus === 'error' && (
                  <div className="flex flex-col gap-1 mt-0.5">
                    <span className="font-sans text-[10px] text-rose-600">
                      {cloudUploadError || 'Tải ảnh lên thất bại.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCloudUploadAttempt((n) => n + 1)}
                      className="self-start text-[10px] font-bold text-[#8C7A5B] underline cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tùy chọn quyền riêng tư: Cho phép hiển thị lên màn hình chờ (Attract Feed) */}
            <div className="bg-white/80 p-3.5 rounded-xl border border-[#1A1A1A]/10 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1A1A1A]">
                    Hiển thị trên màn hình chờ sự kiện (Live Feed)
                  </span>
                  <span className="text-[10px] text-[#1A1A1A]/60 font-sans">
                    Chia sẻ khoảnh khắc vui vẻ để lan tỏa không khí sự kiện
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicConsent}
                onChange={(e) => {
                  const val = e.target.checked;
                  setPublicConsent(val);
                  if (onUpdateConsent && capturedPhotos.length > 0) {
                    onUpdateConsent(
                      capturedPhotos.map((p) => p.id),
                      val
                    );
                  }
                }}
                className="w-5 h-5 rounded border-neutral-300 text-[#1A1A1A] focus:ring-[#1A1A1A] cursor-pointer"
              />
            </div>

            {/* HÀNG NÚT ĐIỀU HƯỚNG — quay lại Thư Viện để đổi ảnh/thứ tự in nếu cần, đổi Biên Tập/Xuất
                Bản đã có sẵn ở nút góc trên (TopAppBar) nên không cần nút quay lại Biên Tập ở đây nữa */}
            <div className="flex mt-1">
              <button
                onClick={() => onNavigate('gallery')}
                className="w-full py-2.5 bg-[#F9F7F2] hover:bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 font-sans text-xs uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Quay Lại Bộ Sưu Tập</span>
              </button>
            </div>
          </section>
        )}
          </main>
        </div>
      </div>
    ) : (
      <div className="w-full h-full overflow-y-auto overscroll-contain flex flex-col select-none text-[#1A1A1A] pb-10">
        <header className="sticky top-0 z-30 w-full bg-[#FAF8F5] border-b border-[#1A1A1A]/10 shadow-[0_6px_20px_rgba(0,0,0,0.06)] flex flex-col items-center">
        {/* DÒNG TIÊU ĐỀ — nút chuyển Biên Tập/Xuất Bản giờ nằm ở góc phải trên TopAppBar,
            đối xứng với nút Chụp Ảnh góc trái, nên ở đây chỉ còn tiêu đề mô tả màn hình. */}
        <div className="w-full max-w-4xl px-3 sm:px-4 pt-2.5 pb-1.5 flex items-center justify-between gap-2">
          <div>
            <span className="font-sans-vietnam text-[9px] uppercase tracking-[0.25em] text-[#8C7A5B] font-semibold block">
              BIÊN TẬP & XUẤT BẢN
            </span>
            <h2 className="font-artistic-serif text-base sm:text-lg font-semibold text-[#1A1A1A] tracking-[0.08em] leading-tight uppercase">
              SỬA NGAY LẤY LIỀN
            </h2>
          </div>
        </div>

        {/* KHUNG XEM TRƯỚC DẢI ẢNH TỰ ĐỘNG CO GIÃN THEO TỶ LỆ TỜ IN */}
        <div className="w-full h-[38vh] sm:h-[42vh] max-h-[350px] min-h-[230px] flex items-center justify-center p-2 sm:p-2.5 overflow-hidden">
          <div
            id="photostrip-share-preview"
            className={`shadow-[0_14px_36px_rgba(0,0,0,0.16)] border transition-all duration-300 rounded-xs relative overflow-hidden flex flex-col justify-between h-full max-h-full ${
              isHorizontalLayout
                ? 'aspect-[3/2] w-auto max-w-[95%] p-2 sm:p-2.5'
                : isSingleStrip
                ? 'aspect-[1/3] w-auto max-w-[90%] p-1.5 sm:p-2'
                : 'aspect-[2/3] w-auto max-w-[92%] p-2 sm:p-2.5'
            }`}
            style={getContainerFrameStyles()}
          >
            {/* SPOCKET HOLES CHO KHUNG PHIM 35MM */}
            {frameStyle === 'cinema-film' && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#111] flex flex-col justify-around py-1 items-center z-10 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-white/90 rounded-xs" />
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#111] flex flex-col justify-around py-1 items-center z-10 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-white/90 rounded-xs" />
                  ))}
                </div>
              </>
            )}

            {/* HEADER CHO TỪNG THEME */}
            {frameStyle === 'instagram' && (
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-linear-to-tr from-yellow-500 via-rose-500 to-purple-600 p-[1px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[5.5px] font-bold text-rose-500">
                      PB
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold tracking-tight leading-none">
                      {customTitle.toLowerCase().replace(/\s+/g, '_') || 'photobooth_studio'}
                    </div>
                    <div className="text-[6px] text-gray-500 leading-none mt-0.5">Original Audio</div>
                  </div>
                </div>
                <span className="text-[8px] font-bold text-gray-700">•••</span>
              </div>
            )}

            {frameStyle === 'magazine' && (
              <div className="text-center pb-0.5 mb-1 border-b border-current/20 shrink-0">
                <h1 className="text-sm sm:text-base font-serif font-black tracking-[0.25em] uppercase leading-none">
                  {customTitle || 'V O G U E'}
                </h1>
                <p className="text-[6px] font-sans tracking-[0.2em] uppercase opacity-70 mt-0.5">
                  SPECIAL EDITION • EDITORIAL
                </p>
              </div>
            )}

            {frameStyle === 'onepiece-wanted' && (
              <div className="text-center pb-0.5 mb-0.5 shrink-0">
                <h1 className="text-sm sm:text-base font-black tracking-[0.15em] uppercase text-[#4A2A11] leading-none">
                  WANTED
                </h1>
                <p className="text-[6.5px] font-serif font-bold tracking-[0.2em] uppercase text-[#6B3B18] leading-tight">
                  DEAD OR ALIVE
                </p>
              </div>
            )}

            {frameStyle === 'movie-ticket' && (
              <div className="text-center pb-0.5 mb-0.5 border-b border-dashed border-current/30 shrink-0">
                <span className="text-[6.5px] font-bold font-sans tracking-[0.2em] uppercase">
                  ★ ADMIT ONE • MEMORY PASS ★
                </span>
              </div>
            )}

            {/* BỐ CỤC ẢNH & VÙNG GHI CHÚ THEO LAYOUT */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
              {/* 1. DẢI ĐÔI DỌC (double-2-vert, double-3-vert, double-4-vert) */}
              {(layout === 'double-2-vert' || layout === 'double-3-vert' || layout === 'double-4-vert') && (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 relative h-full flex-1 min-h-0 overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-current/30 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10">
                    <span className="bg-current/10 text-[6.5px] px-0.5 rounded-xs">✂</span>
                  </div>

                  {/* Dải Trái (Slot 0..N-1) */}
                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos
                      .slice(0, requiredCount / 2)
                      .map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                  </div>

                  {/* Dải Phải (Slot N..2N-1) */}
                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos
                      .slice(requiredCount / 2, requiredCount)
                      .map((photo, i) =>
                        renderPhotoItem(photo, requiredCount / 2 + i, 'w-full h-full flex-1 min-h-0')
                      )}
                  </div>
                </div>
              )}

              {/* 2. DẢI ĐÔI NGANG (double-2-horiz, double-3-horiz, double-4-horiz) */}
              {(layout === 'double-2-horiz' || layout === 'double-3-horiz' || layout === 'double-4-horiz') && (
                <div className="flex flex-col gap-1 sm:gap-1.5 relative h-full flex-1 min-h-0 justify-between overflow-hidden">
                  {/* Hàng 1 */}
                  <div className="flex flex-row gap-1 sm:gap-1.5 h-full flex-1 min-h-0 w-full overflow-hidden">
                    {stripPhotos
                      .slice(0, requiredCount / 2)
                      .map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-w-0 min-h-0'))}
                  </div>

                  {/* Đường cắt đôi ngang */}
                  <div className="w-full border-t border-dashed border-current/30 relative flex items-center justify-center my-0.5 shrink-0 pointer-events-none">
                    <span className="bg-current/10 text-[6px] px-1 rounded-xs -translate-y-1/2">✂ CẮT ĐÔI</span>
                  </div>

                  {/* Hàng 2 */}
                  <div className="flex flex-row gap-1 sm:gap-1.5 h-full flex-1 min-h-0 w-full overflow-hidden">
                    {stripPhotos
                      .slice(requiredCount / 2, requiredCount)
                      .map((photo, i) =>
                        renderPhotoItem(photo, requiredCount / 2 + i, 'w-full h-full flex-1 min-w-0 min-h-0')
                      )}
                  </div>
                </div>
              )}

              {/* 3. CỘT ĐƠN 2, 3, 4 ẢNH TRÊN TỜ IN 4X6 CĂN TRÁI / GIỮA / PHẢI (single-col-2, single-col-3, single-col-4) */}
              {(layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') && (
                <div
                  className={`grid h-full flex-1 min-h-0 gap-1.5 sm:gap-2 ${
                    columnAlign === 'center' ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {columnAlign === 'right' && renderNotePreviewArea(customTitle, dateStr)}

                  <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 justify-between overflow-hidden">
                    {stripPhotos.map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                  </div>

                  {columnAlign === 'left' && renderNotePreviewArea(customTitle, dateStr)}
                </div>
              )}

              {/* 4. LAYOUT F (1 Lớn trên trái + 3 Nhỏ dưới + Note trên phải) */}
              {layout === 'layout-f' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="grid grid-cols-2 gap-1.5 flex-[1.4] min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                    {renderNotePreviewArea(customTitle, dateStr)}
                  </div>
                  <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[3] || availablePool[3] || availablePool[0], 3, 'w-full h-full')}
                  </div>
                </div>
              )}

              {/* 5. LAYOUT G (Lưới 4 ô 2x2 với 2 dòng chữ dưới mỗi cột) */}
              {layout === 'layout-g' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 4).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full min-h-0 min-w-0'))}
                </div>
              )}

              {/* 6. LAYOUT H (2 ảnh dọc trái, 1 lớn trên phải, note dưới phải) */}
              {layout === 'layout-h' && (
                <div className="grid grid-cols-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full flex-1 min-h-0')}
                  </div>
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full flex-1 min-h-0')}
                    {renderNotePreviewArea(customTitle, dateStr, true)}
                  </div>
                </div>
              )}

              {/* 7. LAYOUT I (1 trên trái, 1 dưới trái, Note trên phải, 1 dưới phải) */}
              {layout === 'layout-i' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                  {renderNotePreviewArea(customTitle, dateStr, true)}
                  {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                  {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full')}
                </div>
              )}

              {/* 8. LAYOUT J (2 ảnh dọc trái + Vùng lưu bút lớn bên phải) */}
              {layout === 'layout-j' && (
                <div className="grid grid-cols-2 gap-1.5 h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-1 h-full flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full flex-1 min-h-0')}
                  </div>
                  {renderNotePreviewArea(customTitle, dateStr)}
                </div>
              )}

              {/* 9. LAYOUT K (2 ảnh ngang giữa) */}
              {layout === 'layout-k' && (
                <div className="flex flex-col justify-center h-full flex-1 min-h-0 overflow-hidden">
                  <div className="text-center font-artistic-serif text-xs font-bold uppercase mb-1">
                    {customTitle || 'Jane & Johnny'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full')}
                  </div>
                  <div className="text-center text-[8px] opacity-75 uppercase mt-1 font-sans">
                    {dateStr || '1-15-2019'}
                  </div>
                </div>
              )}

              {/* 10. LAYOUT M (1 ảnh panorama lớn) */}
              {layout === 'layout-m' && (
                <div className="h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                </div>
              )}

              {/* 11. 2 ẢNH ĐƠN (single-2) */}
              {layout === 'single-2' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 2).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                </div>
              )}

              {/* 12. 1 ẢNH ĐƠN (single-1) */}
              {layout === 'single-1' && (
                <div className="h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                  {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full flex-1 min-h-0')}
                </div>
              )}

              {/* 13. 1 ẢNH LỚN + 2 ẢNH NHỎ (featured-1-2) */}
              {layout === 'featured-1-2' && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  <div className="flex-[1.4] min-h-0 w-full">
                    {renderPhotoItem(stripPhotos[0] || availablePool[0], 0, 'w-full h-full')}
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5 flex-1 min-h-0 w-full">
                    {renderPhotoItem(stripPhotos[1] || availablePool[1] || availablePool[0], 1, 'w-full h-full min-h-0')}
                    {renderPhotoItem(stripPhotos[2] || availablePool[2] || availablePool[0], 2, 'w-full h-full min-h-0')}
                  </div>
                </div>
              )}

              {/* 14. LƯỚI 4 Ô (grid-4) */}
              {layout === 'grid-4' && (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 justify-center h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.slice(0, 4).map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full min-h-0 min-w-0'))}
                </div>
              )}

              {/* 15. DẢI ĐƠN 3/4 ẢNH (strip-3, strip-4) */}
              {(layout === 'strip-3' || layout === 'strip-4') && (
                <div className="flex flex-col gap-1 sm:gap-1.5 justify-between h-full flex-1 min-h-0 overflow-hidden">
                  {stripPhotos.map((photo, i) => renderPhotoItem(photo, i, 'w-full h-full flex-1 min-h-0'))}
                </div>
              )}
            </div>

            {/* FOOTER CHO TỪNG THEME */}
            {frameStyle === 'instagram' && (
              <div className="pt-1 mt-0.5 border-t border-black/10 shrink-0">
                <div className="flex items-center justify-between text-[9px] mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">❤️</span>
                    <span>💬</span>
                    <span>✈️</span>
                  </div>
                  <span>🔖</span>
                </div>
                <div className="text-[6.5px] font-bold leading-tight">1,248 likes</div>
                <div className="text-[5.5px] text-gray-500 truncate leading-tight">
                  #{customTitle.replace(/\s+/g, '')} #photobooth #{dateStr}
                </div>
              </div>
            )}

            {frameStyle === 'onepiece-wanted' && (
              <div className="text-center pt-0.5 mt-0.5 border-t border-[#5E381A]/40 shrink-0">
                <div className="font-serif font-black text-[8px] tracking-wider text-[#4A2A11] leading-none">
                  ฿ 1,500,000,000 -
                </div>
                <div className="text-[5.5px] tracking-[0.2em] font-sans font-bold text-[#6B3B18] mt-0.5">
                  MARINE • {dateStr}
                </div>
              </div>
            )}

            {frameStyle === 'movie-ticket' && (
              <div className="pt-0.5 mt-0.5 border-t border-dashed border-current/30 flex items-center justify-between text-[6px] font-mono shrink-0">
                <span>ROW: VIP • SEAT: 01</span>
                <span>{dateStr}</span>
              </div>
            )}

            {frameStyle === 'cinema-film' && (
              <div className="pt-0.5 mt-0.5 flex items-center justify-between text-[6px] font-mono tracking-widest text-[#EAB308]/80 shrink-0">
                <span>KODAK PORTRA 400</span>
                <span>{dateStr}</span>
                <span>ISO 400</span>
              </div>
            )}

            {frameStyle === 'vinyl-cd' && (
              <div className="pt-0.5 mt-0.5 text-center shrink-0">
                <div className="text-[7.5px] font-serif font-bold tracking-widest text-[#D97706] leading-none">
                  ♫ SIDE A • LOVE TRACK
                </div>
                <div className="text-[6px] opacity-70 mt-0.5">{dateStr} • STUDIO LP</div>
              </div>
            )}

            {(frameStyle === 'classic' || frameStyle === 'polaroid') && (
              <div className="text-center pt-1 mt-0.5 shrink-0">
                <h3 className="font-artistic-serif text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase leading-tight">
                  {customTitle || 'Jane & Johnny'}
                </h3>
                <p className="text-[6px] tracking-[0.2em] opacity-70 uppercase font-sans mt-0.5">
                  {dateStr} • STUDIO KỶ NIỆM
                </p>
              </div>
            )}
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN XOAY & LẬT GƯƠNG NGOÀI PHẠM VI ẢNH */}
        {activeMode === 'edit' && (
          <div className="w-full max-w-4xl px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1A1A1A]/10 bg-[#F4F1EA]">
            {hasActiveSlot ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-sans text-xs sm:text-sm font-bold text-[#1A1A1A]">
                    Đang chọn: <span className="text-amber-900 bg-amber-300/80 px-2 py-0.5 rounded-lg font-mono font-black">Ô #{activeSlotIndex! + 1}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSlotIndex(null)}
                    className="text-[11px] text-gray-500 hover:text-black underline cursor-pointer ml-1"
                  >
                    (Bỏ chọn)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotateSlot(activeSlotIndex!)}
                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-amber-400 hover:text-black text-[#1A1A1A] rounded-xl font-sans text-xs sm:text-sm font-bold border border-[#1A1A1A]/20 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-4 h-4 text-amber-600" />
                    <span>Xoay 90°</span>
                    {(activeSlotCustom?.rotation || 0) > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-xs font-mono font-bold">
                        {activeSlotCustom?.rotation}°
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFlipSlot(activeSlotIndex!)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-sans text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      activeSlotCustom?.flipH
                        ? 'bg-[#1A1A1A] text-amber-300 border-[#1A1A1A] shadow-xs'
                        : 'bg-white hover:bg-amber-400 hover:text-black text-[#1A1A1A] border-[#1A1A1A]/20 shadow-xs'
                    }`}
                  >
                    <FlipHorizontal className={`w-4 h-4 ${activeSlotCustom?.flipH ? 'text-amber-300' : 'text-amber-600'}`} />
                    <span>Lật Ngang</span>
                    {activeSlotCustom?.flipH && (
                      <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded-xs font-bold">
                        Đã lật
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-sm">👆</span>
                  <span className="text-xs sm:text-sm font-medium font-sans">
                    Chạm vào ảnh bất kỳ trên dải giấy để <span className="font-bold text-amber-800">Xoay</span> hoặc <span className="font-bold text-amber-800">Lật ảnh</span>
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 hidden sm:inline font-sans">
                  (Chạm lại để bỏ chọn)
                </span>
              </div>
            )}
          </div>
        )}
        </header>
        <main className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-4 flex flex-col gap-5 relative z-10">
        {/* ==================== CHẾ ĐỘ 1: BIÊN TẬP ==================== */}
        {activeMode === 'edit' && (
          <>
            {/* Bố Cục Ghép chỉ hiện ở Chế Độ Chụp Tự Do — các chế độ khác đã chọn bố cục từ trước (màn Chọn Bố Cục). */}
            {eventConfig?.captureMode === 'free' && (
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8C7A5B]"></span>
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    1. Bố Cục Ghép ({LAYOUT_OPTIONS.length} Kiểu Dàn Trang)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#8C7A5B] font-bold">
                  {currentLayoutConfig.shortName} • {requiredCount} Ô Ảnh
                </span>
              </div>

              {/* Nếu là Cột Đơn (single-col-*): Tùy chọn Căn Trái / Giữa / Phải */}
              {(layout === 'single-col-2' || layout === 'single-col-3' || layout === 'single-col-4') && (
                <div className="flex flex-col gap-2 bg-white/70 p-3 rounded-xl border border-[#1A1A1A]/10">
                  <span className="text-[10.5px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Vị Trí Cột Ảnh Trên Tờ Giấy In 4x6:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setColumnAlign('left')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'left'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Lệch Trái (Viết chữ Phải)</span>
                    </button>
                    <button
                      onClick={() => setColumnAlign('center')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'center'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                      <span>Nằm Ở Giữa</span>
                    </button>
                    <button
                      onClick={() => setColumnAlign('right')}
                      className={`py-2 px-2.5 rounded-lg border text-center font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        columnAlign === 'right'
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                      <span>Lệch Phải (Viết chữ Trái)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB DANH MỤC LAYOUT */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-[#1A1A1A]/10">
                <button
                  onClick={() => setLayoutCategoryTab('double-vert')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'double-vert'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Dải Đôi Dọc (4x6)
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('double-horiz')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'double-horiz'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Dải Đôi Ngang (6x4)
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('single-col')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'single-col'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Cột Đơn + Lưu Bút
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('editorial')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'editorial'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Bố Cục Mẫu & Bìa
                </button>
                <button
                  onClick={() => setLayoutCategoryTab('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    layoutCategoryTab === 'all'
                      ? 'bg-[#1A1A1A] text-[#F9F7F2]'
                      : 'bg-[#EFEEE8] text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Tất Cả
                </button>
              </div>

              {/* GRID CÁC NÚT CHỌN BỐ CỤC (CÓ HÌNH ẢNH MINH HỌA TRỰC QUAN CHO TRẺ EM & NGƯỜI DÙNG) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {LAYOUT_OPTIONS.filter((l) => {
                  if (layoutCategoryTab === 'all') return true;
                  return l.category === layoutCategoryTab;
                }).map((opt) => {
                  const isSelected = layout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A] font-bold shadow-md ring-2 ring-[#8C7A5B]'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/60 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Badge số lượng ảnh */}
                      <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-[#8C7A5B]/15 text-[#8C7A5B]'
                        }`}>
                          {opt.photoCount} ảnh
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>

                      {/* Khung mô phỏng hình ảnh trực quan */}
                      <div className="py-1 flex items-center justify-center min-h-[96px]">
                        <LayoutIllustration layoutId={opt.id} isSelected={isSelected} />
                      </div>

                      {/* Tên bố cục */}
                      <div className="text-[11px] font-sans font-bold mt-1.5 line-clamp-1">{opt.shortName}</div>
                      <div className={`text-[8.5px] mt-0.5 leading-tight line-clamp-1 ${isSelected ? 'text-[#F9F7F2]/75' : 'text-[#1A1A1A]/65'}`}>
                        {opt.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            )}

            {/* KHỐI 3: CHỦ ĐỀ & KIỂU KHUNG */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#8C7A5B]" />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    {stepFrameStyle}. Kiểu Khung & Chủ Đề Nghệ Thuật:
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#8C7A5B]">
                  {activeFrameStyleOption.name}
                </span>
              </div>

              {/* GRID CÁC KIỂU KHUNG (HÌNH MINH HỌA ĐỒ HỌA MẪU DỄ NHẬN BIẾT CHO TRẺ EM) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FRAME_STYLE_OPTIONS.map((styleOpt) => {
                  const isSelected = frameStyle === styleOpt.id;
                  return (
                    <button
                      key={styleOpt.id}
                      onClick={() => setFrameStyle(styleOpt.id)}
                      className={`p-2 rounded-2xl border flex flex-col gap-1.5 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A] ring-2 ring-[#8C7A5B] shadow-md'
                          : 'bg-[#F9F7F2] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/60 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Mô hình hình ảnh trực quan */}
                      <FrameStyleIllustration styleId={styleOpt.id} isSelected={isSelected} />

                      {/* Thông tin tên & nhãn chủ đề */}
                      <div className="flex items-center justify-between mt-1 px-1">
                        <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-400/30 text-amber-300' : 'bg-[#8C7A5B]/15 text-[#8C7A5B]'
                        }`}>
                          {styleOpt.tag}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[11px] font-sans font-bold px-1 text-left">{styleOpt.name}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* KHỐI 5: MÀU SẮC GIẤY IN */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80">
                  {stepPaperColor}. Màu Giấy In & Chất Liệu Viền:
                </span>
                <span className="text-[10px] font-bold text-[#8C7A5B]">{frameInfo.name}</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FRAME_COLORS.map((frame) => {
                  const isSelected = frameColor === frame.id;
                  return (
                    <button
                      key={frame.id}
                      onClick={() => setFrameColor(frame.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1A1A1A] ring-2 ring-[#8C7A5B] shadow-xs bg-white'
                          : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/50 bg-[#F9F7F2]'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full border border-black/20 shadow-inner"
                        style={{ backgroundColor: frame.hex }}
                      />
                      <span className="text-[9px] font-sans uppercase tracking-tight text-center truncate w-full font-medium">
                        {frame.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* KHỐI 6: TÙY CHỈNH TIÊU ĐỀ, NGÀY THÁNG & LƯU BÚT GHI CHÚ */}
            <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-3">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80">
                {stepNote}. Tiêu Đề, Ngày In & Lời Chúc Lưu Bút:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                    Tiêu Đề / Tên Nhân Vật / Cặp Đôi:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={40}
                    placeholder="VD: Jane & Johnny"
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                    Ngày Tháng In:
                  </label>
                  <input
                    type="text"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    maxLength={20}
                    placeholder="VD: 1-15-2019"
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9.5px] font-sans font-bold uppercase tracking-widest text-[#1A1A1A]/70 block mb-1">
                  Nội Dung Lưu Bút / Lời Chúc (Hiển thị trên phần giấy trắng trống):
                </label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={140}
                  placeholder="Nhập lời chúc, lưu bút, thông điệp kỷ niệm..."
                  className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#1A1A1A]/20 rounded-lg text-xs font-sans focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </section>

            {/* NÚT HÀNH ĐỘNG DƯỚI CÙNG TRONG CHẾ ĐỘ BIÊN TẬP — quay lại chụp đã có sẵn ở nút góc trên (TopAppBar) nên chỉ cần 1 nút hành động chính ở đây */}
            <div className="flex mt-1">
              <button
                onClick={() => onSetActiveMode('export')}
                className="w-full py-3 bg-[#1A1A1A] hover:bg-[#8C7A5B] text-[#F9F7F2] font-sans text-xs uppercase tracking-widest font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Chuyển Sang Xuất Bản & Tải Về</span>
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ==================== CHẾ ĐỘ 2: XUẤT BẢN ==================== */}
        {activeMode === 'export' && (
          <section className="bg-[#EFEEE8]/60 p-4 sm:p-5 rounded-2xl border border-[#1A1A1A]/10 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#8C7A5B]" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Xuất Bản & Tải Dải Ảnh
                </h3>
              </div>
              <span className="text-[10px] font-sans font-bold text-[#8C7A5B] bg-[#8C7A5B]/10 px-2 py-0.5 rounded-full">
                {currentLayoutConfig.shortName} • {activeFrameStyleOption.shortName}
              </span>
            </div>

            {/* NÚT TẢI VỀ ẢNH PNG 300 DPI CHÍNH */}
            <button
              id="download-photostrip-btn"
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-4 bg-[#1A1A1A] hover:bg-[#8C7A5B] text-[#F9F7F2] font-sans text-xs uppercase tracking-widest transition-all active:scale-98 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting
                  ? 'Đang Kết Xuất Bản In 300 DPI...'
                  : `Tải Về Ảnh PNG 300 DPI (${activeFrameStyleOption.name})`}
              </span>
            </button>

            {/* Video BTS nếu có */}
            {sessionVideoUrl && (
              <div className="bg-[#F9F7F2] p-3.5 rounded-xl border border-rose-400/40 shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-rose-500 text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Video Quá Trình Chụp (BTS)
                      </h4>
                      <span className="text-[9.5px] text-[#1A1A1A]/60 font-sans">
                        Ghi lại toàn bộ khoảnh khắc từ tấm 1 đến khi hoàn thành
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                    Sẵn Sàng
                  </span>
                </div>

                <div className="w-full rounded-lg overflow-hidden border border-[#1A1A1A]/15 bg-black aspect-video flex items-center justify-center relative">
                  <video
                    src={sessionVideoUrl}
                    controls
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <button
                  onClick={handleDownloadBtsVideo}
                  className="w-full py-2.5 bg-[#E86A7C] hover:bg-[#D45668] text-white font-sans text-xs uppercase tracking-wider transition-all active:scale-98 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-bold shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Video BTS Về Máy (.webm)</span>
                </button>
              </div>
            )}

            {/* CHIA SẺ LIÊN KẾT — đã bỏ nút "In Trực Tiếp" vì chỉ gọi in cả trang web (window.print),
                không in đúng ảnh dải, dễ gây hiểu lầm là in được trong khi chưa nối máy in thật. */}
            <button
              id="share-native-btn"
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-[#F9F7F2] hover:bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 font-sans text-xs uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-2xs"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Đã Sao Chép Liên Kết!' : 'Chia Sẻ Liên Kết'}</span>
            </button>

            {/* Mã QR Quét Tải Về Điện Thoại */}
            <div className="bg-[#F9F7F2] p-3.5 rounded-xl border border-[#1A1A1A]/15 flex items-center gap-3.5">
              <div className="w-18 h-18 bg-white p-1 rounded-lg border border-[#1A1A1A]/10 flex items-center justify-center shrink-0">
                {cloudUploadStatus === 'done' && uploadedPhotoQrSvg ? (
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: uploadedPhotoQrSvg }} />
                ) : cloudUploadStatus === 'uploading' ? (
                  <RefreshCw className="w-5 h-5 text-[#8C7A5B] animate-spin" />
                ) : (
                  <QrCode className="w-6 h-6 text-[#1A1A1A]/25" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-[#8C7A5B]" />
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#8C7A5B] font-bold">
                    QUÉT MÃ TRÊN ĐIỆN THOẠI
                  </span>
                </div>
                <p className="font-sans text-xs font-bold text-[#1A1A1A] mt-0.5">
                  Tải Dải Ảnh Về Thư Viện
                </p>
                {cloudUploadStatus === 'done' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Mở camera quét mã để xem và lưu dải ảnh sắc nét về máy.
                  </span>
                )}
                {cloudUploadStatus === 'uploading' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Đang tải ảnh lên để tạo mã QR, chờ vài giây...
                  </span>
                )}
                {cloudUploadStatus === 'not_configured' && (
                  <span className="font-sans text-[10px] text-[#1A1A1A]/60 mt-0.5">
                    Chưa cấu hình nơi lưu ảnh trên đám mây (Admin → Quản Lý Ảnh & Bộ Nhớ).
                  </span>
                )}
                {cloudUploadStatus === 'error' && (
                  <div className="flex flex-col gap-1 mt-0.5">
                    <span className="font-sans text-[10px] text-rose-600">
                      {cloudUploadError || 'Tải ảnh lên thất bại.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCloudUploadAttempt((n) => n + 1)}
                      className="self-start text-[10px] font-bold text-[#8C7A5B] underline cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tùy chọn quyền riêng tư: Cho phép hiển thị lên màn hình chờ (Attract Feed) */}
            <div className="bg-white/80 p-3.5 rounded-xl border border-[#1A1A1A]/10 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1A1A1A]">
                    Hiển thị trên màn hình chờ sự kiện (Live Feed)
                  </span>
                  <span className="text-[10px] text-[#1A1A1A]/60 font-sans">
                    Chia sẻ khoảnh khắc vui vẻ để lan tỏa không khí sự kiện
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicConsent}
                onChange={(e) => {
                  const val = e.target.checked;
                  setPublicConsent(val);
                  if (onUpdateConsent && capturedPhotos.length > 0) {
                    onUpdateConsent(
                      capturedPhotos.map((p) => p.id),
                      val
                    );
                  }
                }}
                className="w-5 h-5 rounded border-neutral-300 text-[#1A1A1A] focus:ring-[#1A1A1A] cursor-pointer"
              />
            </div>

            {/* HÀNG NÚT ĐIỀU HƯỚNG — quay lại Thư Viện để đổi ảnh/thứ tự in nếu cần, đổi Biên Tập/Xuất
                Bản đã có sẵn ở nút góc trên (TopAppBar) nên không cần nút quay lại Biên Tập ở đây nữa */}
            <div className="flex mt-1">
              <button
                onClick={() => onNavigate('gallery')}
                className="w-full py-2.5 bg-[#F9F7F2] hover:bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 font-sans text-xs uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Quay Lại Bộ Sưu Tập</span>
              </button>
            </div>
          </section>
        )}
        </main>
      </div>
    )
  );
};
