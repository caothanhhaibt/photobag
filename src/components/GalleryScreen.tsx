import React, { useState } from 'react';
import { AppScreen, CapturedPhoto, FrameColor, StripLayout } from '../types';
import { FILTER_PRESETS, FRAME_COLORS } from '../constants/filters';
import { generatePhotostripCanvas, downloadCanvas } from '../utils/canvas';
import confetti from 'canvas-confetti';

interface GalleryScreenProps {
  onNavigate: (screen: AppScreen) => void;
  capturedPhotos: CapturedPhoto[];
  onDeletePhoto: (id: string) => void;
  onSelectPhotoForFilter: (photo: CapturedPhoto) => void;
  currentFilterId: string;
  currentFilterIntensity: number;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({
  onNavigate,
  capturedPhotos,
  onDeletePhoto,
  onSelectPhotoForFilter,
  currentFilterId,
  currentFilterIntensity,
}) => {
  const [layout, setLayout] = useState<StripLayout>('strip-3');
  const [frameColor, setFrameColor] = useState<FrameColor>('white');
  const [customTitle, setCustomTitle] = useState('PHOTOBOOTH');
  const [isExporting, setIsExporting] = useState(false);

  // Thông tin khung viền đã chọn
  const frameInfo = FRAME_COLORS.find((f) => f.id === frameColor) || FRAME_COLORS[0];
  const activePreset = FILTER_PRESETS.find((p) => p.id === currentFilterId) || FILTER_PRESETS[0];

  // Số lượng ảnh cần cho bố cục
  const requiredCount = layout === 'strip-3' ? 3 : layout === 'strip-4' ? 4 : layout === 'grid-4' ? 4 : 1;
  const stripPhotos = capturedPhotos.slice(0, requiredCount);

  // Bổ sung nếu chưa đủ số ảnh
  while (stripPhotos.length < requiredCount && capturedPhotos.length > 0) {
    stripPhotos.push(capturedPhotos[stripPhotos.length % capturedPhotos.length]);
  }

  const handleDownloadStrip = async () => {
    try {
      setIsExporting(true);
      const canvas = await generatePhotostripCanvas({
        photos: stripPhotos,
        layout,
        frameColor,
        customTitle,
        dateStr: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        overrideFilterId: currentFilterId,
        overrideFilterIntensity: currentFilterIntensity,
      });

      downloadCanvas(canvas, `photobooth-dai-anh-${layout}-${Date.now()}.png`);

      // Hiệu ứng pháo hoa chúc mừng
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#1A1A1A', '#8C7A5B', '#EFEEE8', '#F9F7F2'],
      });
    } catch (e) {
      console.error('Không thể xuất dải ảnh', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pt-2 md:pt-6 px-4 md:px-8 flex flex-col gap-8 select-none pb-28 md:pb-12 text-[#1A1A1A]">
      {/* Tiêu Đề & Nút Chuyển Màn Hình */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#8C7A5B]">
            BIÊN TẬP & BỐ CỤC DẢI ẢNH
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-[#1A1A1A] mt-0.5">
            Xưởng In Dải Ảnh Cổ Điển
          </h2>
          <p className="text-[11px] font-sans text-[#1A1A1A]/60 uppercase tracking-widest mt-1">
            {capturedPhotos.length} Tấm Ảnh Đã Chụp • Tùy Biến Bố Cục & Màu Sắc
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('camera')}
            className="px-5 py-2.5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#8C7A5B] transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
            <span>Chụp Thêm</span>
          </button>
          <button
            onClick={() => onNavigate('filters')}
            className="px-5 py-2.5 bg-transparent border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Chỉnh Màu Sắc</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cột Trái: Bản Xem Trước Dải Ảnh Trực Quan */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div
            id="photostrip-preview-container"
            className="w-full max-w-sm p-5 md:p-7 shadow-[20px_20px_60px_rgba(0,0,0,0.08)] transition-all duration-300 border"
            style={{
              backgroundColor: frameInfo.hex,
              borderColor: frameInfo.borderHex,
              color: frameInfo.textHex,
            }}
          >
            {/* Danh Sách Ảnh Trong Dải */}
            {layout === 'grid-4' ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {stripPhotos.map((photo, i) => (
                  <div key={i} className="aspect-square bg-[#1A1A1A]/5 overflow-hidden relative border border-current/10">
                    <img
                      src={photo.dataUrl}
                      alt={`Tấm ${i + 1}`}
                      className="w-full h-full object-cover"
                      style={{ filter: activePreset.filterCss(currentFilterIntensity) }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 mb-6">
                {stripPhotos.map((photo, i) => (
                  <div key={i} className="aspect-[4/3] bg-[#1A1A1A]/5 overflow-hidden relative border border-current/10">
                    <img
                      src={photo.dataUrl}
                      alt={`Tấm ${i + 1}`}
                      className="w-full h-full object-cover"
                      style={{ filter: activePreset.filterCss(currentFilterIntensity) }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Phần Chân Dải Ảnh */}
            <div className="text-center py-2 border-t border-current/15">
              <h3 className="text-lg md:text-xl font-serif font-light tracking-[0.25em] uppercase">
                {customTitle || 'PHOTOBOOTH'}
              </h3>
              <p className="text-[9px] tracking-[0.25em] opacity-70 uppercase font-sans mt-1">
                {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} • STUDIO KỶ NIỆM
              </p>
            </div>
          </div>

          {/* Nút Thao Tác Nhanh */}
          <div className="w-full max-w-sm flex gap-3 mt-5">
            <button
              id="gallery-download-strip-btn"
              onClick={handleDownloadStrip}
              disabled={isExporting || stripPhotos.length === 0}
              className="flex-1 py-3.5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#8C7A5B] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>{isExporting ? 'Đang Tạo Dải Ảnh...' : 'Lưu Dải Ảnh Mỹ Thuật'}</span>
            </button>
            <button
              onClick={() => onNavigate('share')}
              className="px-6 py-3.5 bg-transparent border border-[#1A1A1A]/30 text-[#1A1A1A] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Chia Sẻ</span>
            </button>
          </div>
        </div>

        {/* Cột Phải: Bảng Điều Khiển Tùy Biến Bố Cục */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* 1. Chọn Định Dạng Bố Cục */}
          <div className="bg-[#EFEEE8] p-5 border border-[#1A1A1A]/15 shadow-xs">
            <label className="text-[10px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em] block mb-3">
              1. Định Dạng Bố Cục Dải Ảnh
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'strip-3' as StripLayout, label: 'Dải 3 Ảnh' },
                { id: 'strip-4' as StripLayout, label: 'Dải 4 Ảnh' },
                { id: 'grid-4' as StripLayout, label: 'Lưới 4 Ảnh' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setLayout(fmt.id)}
                  className={`py-2.5 px-2 font-sans text-[11px] uppercase tracking-wider transition-all border ${
                    layout === fmt.id
                      ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                      : 'bg-[#F9F7F2] text-[#1A1A1A]/70 border-[#1A1A1A]/10 hover:border-[#1A1A1A]'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chọn Bảng Màu Khung Viền */}
          <div className="bg-[#EFEEE8] p-5 border border-[#1A1A1A]/15 shadow-xs">
            <label className="text-[10px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em] block mb-3">
              2. Màu Sắc Khung Giấy Mỹ Thuật
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {FRAME_COLORS.map((fc) => (
                <button
                  key={fc.id}
                  onClick={() => setFrameColor(fc.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 font-sans text-[11px] uppercase tracking-wider border transition-all ${
                    frameColor === fc.id
                      ? 'border-[#1A1A1A] bg-[#F9F7F2] font-bold text-[#1A1A1A] ring-1 ring-[#8C7A5B]'
                      : 'border-[#1A1A1A]/15 bg-[#F9F7F2]/60 text-[#1A1A1A]/70 hover:border-[#1A1A1A]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 border border-black/20"
                    style={{ backgroundColor: fc.hex }}
                  />
                  <span>{fc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tiêu Đề Dải Ảnh Tùy Chỉnh */}
          <div className="bg-[#EFEEE8] p-5 border border-[#1A1A1A]/15 shadow-xs">
            <label className="text-[10px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em] block mb-2">
              3. Tên Dải Ảnh / Khắc Chữ Kỷ Niệm
            </label>
            <input
              type="text"
              value={customTitle}
              maxLength={24}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="VD: PHOTOBOOTH, BẠN THÂN, 2026..."
              className="w-full px-4 py-2.5 bg-[#F9F7F2] border border-[#1A1A1A]/20 text-sm font-serif font-normal focus:outline-hidden focus:border-[#1A1A1A] tracking-widest uppercase"
            />
          </div>

          {/* 4. Thư Viện Ảnh Đã Chụp */}
          <div className="bg-[#EFEEE8] p-5 border border-[#1A1A1A]/15 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em]">
                Kho Ảnh Đã Chụp ({capturedPhotos.length})
              </label>
              <span className="text-[10px] font-sans text-[#8C7A5B] uppercase tracking-widest">Bấm để chỉnh màu</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {capturedPhotos.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPhotoForFilter(p);
                    onNavigate('filters');
                  }}
                  className="aspect-square bg-[#1A1A1A] overflow-hidden border border-[#1A1A1A]/20 relative group cursor-pointer hover:border-[#1A1A1A] transition-all"
                >
                  <img src={p.dataUrl} alt={`Tấm ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </div>
                  {capturedPhotos.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePhoto(p.id);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-red-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xóa tấm ảnh này"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
