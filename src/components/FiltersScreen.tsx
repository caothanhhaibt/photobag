import React, { useState } from 'react';
import { AppScreen, CapturedPhoto } from '../types';
import { FILTER_PRESETS, SAMPLE_PHOTO_FRIENDS } from '../constants/filters';

interface FiltersScreenProps {
  onNavigate: (screen: AppScreen) => void;
  activePhoto: CapturedPhoto | null;
  allRecentPhotos: CapturedPhoto[];
  onUpdatePhotoFilter: (photoId: string, filterId: string, intensity: number) => void;
  onApplyFilterToAll: (filterId: string, intensity: number) => void;
}

export const FiltersScreen: React.FC<FiltersScreenProps> = ({
  onNavigate,
  activePhoto,
  allRecentPhotos,
  onUpdatePhotoFilter,
  onApplyFilterToAll,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const currentPhoto = allRecentPhotos[selectedPhotoIndex] || activePhoto || {
    id: 'sample_photo',
    dataUrl: SAMPLE_PHOTO_FRIENDS,
    timestamp: Date.now(),
    filterId: 'bw',
    filterIntensity: 85,
    label: 'Ảnh Mẫu Studio',
  };

  const [activeFilterId, setActiveFilterId] = useState<string>(currentPhoto.filterId || 'bw');
  const [intensity, setIntensity] = useState<number>(currentPhoto.filterIntensity ?? 80);

  const activePreset = FILTER_PRESETS.find((p) => p.id === activeFilterId) || FILTER_PRESETS[0];

  const handleSelectFilter = (filterId: string) => {
    setActiveFilterId(filterId);
    const preset = FILTER_PRESETS.find((p) => p.id === filterId);
    const newIntensity = preset ? preset.defaultIntensity : 80;
    setIntensity(newIntensity);
    onUpdatePhotoFilter(currentPhoto.id, filterId, newIntensity);
  };

  const handleIntensityChange = (val: number) => {
    setIntensity(val);
    onUpdatePhotoFilter(currentPhoto.id, activeFilterId, val);
  };

  const handleApplyToAll = () => {
    onApplyFilterToAll(activeFilterId, intensity);
  };

  return (
    <div className="w-full max-w-5xl mx-auto pt-2 md:pt-6 px-4 md:px-8 flex flex-col gap-6 md:gap-8 select-none pb-28 md:pb-12 text-[#1A1A1A]">
      {/* Tiêu Đề Bộ Lọc Nghệ Thuật */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#1A1A1A]/10 pb-4 gap-2">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#8C7A5B]">
            HIỆU CHỈNH MÀU & ĐỘ HẠT PHIM
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-[#1A1A1A] mt-0.5">
            Bảng Màu & Phong Cách Tone
          </h2>
        </div>

        {/* Bộ chọn từng ảnh nếu chụp dải nhiều ảnh */}
        {allRecentPhotos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {allRecentPhotos.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPhotoIndex(idx);
                  setActiveFilterId(p.filterId || 'bw');
                  setIntensity(p.filterIntensity ?? 80);
                }}
                className={`px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 transition-all border ${
                  selectedPhotoIndex === idx
                    ? 'bg-[#1A1A1A] text-[#F9F7F2] border-[#1A1A1A]'
                    : 'bg-[#EFEEE8] text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                }`}
              >
                <span>Tấm {idx + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Khung Trưng Bày Ảnh Đang Chỉnh Sửa */}
      <section className="flex flex-col gap-5 items-center w-full">
        <div className="w-full max-w-lg aspect-[3/4] bg-[#EFEEE8] border border-[#1A1A1A]/20 p-4 shadow-[20px_20px_60px_rgba(0,0,0,0.06)] relative group transition-all duration-300">
          <div className="w-full h-full relative overflow-hidden bg-[#1A1A1A]">
            <img
              src={currentPhoto.dataUrl}
              alt="Ảnh photobooth chân dung"
              className="w-full h-full object-cover transition-all duration-300"
              style={{
                filter: activePreset.filterCss(intensity),
              }}
            />

            {/* Lớp Phủ Màu Phim (Overlay) */}
            {activePreset.overlayColor && intensity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  backgroundColor: activePreset.overlayColor,
                  mixBlendMode: (activePreset.blendMode as any) || 'overlay',
                  opacity: intensity / 100,
                }}
              />
            )}
          </div>

          {/* Thẻ Tên Bộ Lọc Hiện Tại */}
          <div className="absolute top-6 right-6 bg-[#1A1A1A]/80 backdrop-blur-md text-[#F9F7F2] px-3 py-1 text-[9px] font-sans uppercase tracking-[0.25em] border border-white/20">
            {activePreset.name} {intensity > 0 ? `• ${intensity}%` : ''}
          </div>

          {/* Dấu Ấn Studio Dưới Ảnh */}
          <div className="flex justify-between items-center mt-3 text-[9px] font-sans uppercase tracking-[0.2em] opacity-60">
            <span>Mẫu Ảnh // {currentPhoto.label || 'Tấm Chân Dung'}</span>
            <span>Tráng Phim Bạc Gelatin</span>
          </div>
        </div>

        {/* Thanh Trượt Cường Độ Màu */}
        <div className="w-full max-w-md flex items-center gap-4 bg-[#EFEEE8] px-5 py-3 border border-[#1A1A1A]/15 shadow-xs">
          <span className="material-symbols-outlined text-[#8C7A5B] text-[18px]">tune</span>
          <span className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A] whitespace-nowrap">
            Độ Đậm Màu:
          </span>
          <input
            id="filter-intensity-slider"
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => handleIntensityChange(Number(e.target.value))}
            className="w-full h-1 bg-[#1A1A1A]/20 appearance-none cursor-pointer accent-[#1A1A1A]"
          />
          <span className="text-xs font-mono font-bold text-[#1A1A1A] min-w-[38px] text-right">
            {intensity}%
          </span>
        </div>
      </section>

      {/* Danh Sách Bộ Lọc Phim Analog */}
      <section className="w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8C7A5B]"></span>
            <h2 className="text-[11px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em]">
              BỘ LỌC MÀU PHIM ANALOG
            </h2>
          </div>
          {allRecentPhotos.length > 1 && (
            <button
              onClick={handleApplyToAll}
              className="text-[10px] font-sans uppercase tracking-[0.15em] text-[#8C7A5B] hover:text-[#1A1A1A] hover:underline"
            >
              Áp dụng cho tất cả {allRecentPhotos.length} ảnh
            </button>
          )}
        </div>

        {/* Thẻ Chọn Bộ Lọc Cuộn Ngang */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 snap-x snap-mandatory px-1 pb-2">
          {FILTER_PRESETS.map((preset) => {
            const isActive = activeFilterId === preset.id;
            return (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                onClick={() => handleSelectFilter(preset.id)}
                className="flex flex-col gap-2 items-center min-w-[86px] snap-center group focus:outline-hidden"
              >
                <div
                  className={`w-20 h-20 overflow-hidden relative bg-[#EFEEE8] p-1 transition-all active:scale-95 duration-150 border ${
                    isActive
                      ? 'border-[#1A1A1A] ring-2 ring-[#8C7A5B]/40 shadow-sm'
                      : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/60'
                  }`}
                >
                  <img
                    src={preset.thumbnail}
                    alt={preset.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8C7A5B]"></div>
                  )}
                </div>
                <span
                  className={`text-[10px] uppercase font-sans tracking-wider transition-colors ${
                    isActive ? 'text-[#1A1A1A] font-bold' : 'text-[#1A1A1A]/60 group-hover:text-[#1A1A1A]'
                  }`}
                >
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Nút Điều Hướng Tiếp Tục */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <button
          id="filters-create-strip-btn"
          onClick={() => onNavigate('gallery')}
          className="w-full sm:w-auto px-8 py-3.5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#8C7A5B] transition-all active:scale-95 shadow-md flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined text-[18px]">grid_view</span>
          <span>Ghép & Bố Cục Dải Ảnh (Kho Ảnh)</span>
        </button>

        <button
          id="filters-share-btn"
          onClick={() => onNavigate('share')}
          className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-[#1A1A1A]/30 text-[#1A1A1A] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#1A1A1A]/5 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          <span>Xuất Bản & Chia Sẻ</span>
        </button>
      </div>
    </div>
  );
};
