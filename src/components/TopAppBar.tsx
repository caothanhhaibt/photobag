import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  Grid,
  Zap,
  ZapOff,
  Timer,
  LayoutGrid,
  Sparkles,
  Layers,
  FileText,
  EyeOff,
  Radio,
  PlayCircle,
  Touchpad,
  Video,
  Film,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { AppScreen, CapturedPhoto, SlotPreviewMode, CaptureTriggerMode } from '../types';
import { FILTER_PRESETS } from '../constants/filters';

interface TopAppBarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  recordVideoEnabled?: boolean;
  onToggleRecordVideo?: () => void;
  onFlipCamera?: () => void;
  onResetSamples?: () => void;
  isLiveStream?: boolean;
  onToggleLiveStream?: () => void;
  capturedPhotos?: CapturedPhoto[];
  flashEnabled?: boolean;
  onToggleFlash?: () => void;
  gridVisible?: boolean;
  onToggleGrid?: () => void;
  timerSeconds?: 0 | 3 | 5 | 10;
  onSetTimerSeconds?: (seconds: 0 | 3 | 5 | 10) => void;
  sessionMode?: 'single' | 'strip-3' | 'strip-4';
  onSetSessionMode?: (mode: 'single' | 'strip-3' | 'strip-4') => void;
  previewMode?: SlotPreviewMode;
  onSetPreviewMode?: (mode: SlotPreviewMode) => void;
  captureTriggerMode?: CaptureTriggerMode;
  onSetCaptureTriggerMode?: (mode: CaptureTriggerMode) => void;
  currentFilterId?: string;
  currentFilterIntensity?: number;
  onSelectFilter?: (filterId: string, defaultIntensity?: number) => void;
  onOpenAdminDashboard?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentScreen,
  onNavigate,
  soundEnabled,
  onToggleSound,
  recordVideoEnabled = true,
  onToggleRecordVideo,
  onFlipCamera,
  onResetSamples,
  isLiveStream = true,
  onToggleLiveStream,
  capturedPhotos = [],
  flashEnabled = true,
  onToggleFlash,
  gridVisible = false,
  onToggleGrid,
  timerSeconds = 5,
  onSetTimerSeconds,
  sessionMode = 'strip-3',
  onSetSessionMode,
  previewMode = 'bottom-slots',
  onSetPreviewMode,
  captureTriggerMode = 'auto',
  onSetCaptureTriggerMode,
  currentFilterId = 'original',
  onSelectFilter,
  onOpenAdminDashboard,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Đóng bảng cài đặt khi bấm ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleGallery = () => {
    if (currentScreen === 'gallery') {
      onNavigate('camera');
    } else {
      onNavigate('gallery');
    }
  };

  // Lấy 3 ảnh mới nhất để hiển thị chồng lên nhau
  const latestPhotos = capturedPhotos.slice(0, 3);
  const photoCount = capturedPhotos.length;

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 pointer-events-none bg-transparent border-0 flex justify-between items-center px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 select-none">
      {/* 1. GÓC TRÁI: THƯ VIỆN CÁC ẢNH ĐÃ CHỤP XẾP CHỒNG HOẶC NÚT QUAY LẠI */}
      <div className="flex items-center min-w-[40px]">
        {currentScreen === 'layout' ? null : currentScreen !== 'camera' ? (
          <button
            id="top-bar-back-to-camera-btn"
            onClick={() => onNavigate('camera')}
            className="pointer-events-auto group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/25 text-[#F9F7F2] transition-all active:scale-95 duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)] cursor-pointer"
            title="Quay lại chụp ảnh"
          >
            <span className="material-symbols-outlined text-[17px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-widest font-bold">
              Chụp Ảnh
            </span>
          </button>
        ) : (
          <div
            id="top-bar-photo-stack-gallery"
            onClick={handleToggleGallery}
            className="pointer-events-auto group cursor-pointer relative flex items-center transition-all duration-300 active:scale-95"
            title={`Mở Thư Viện Kỷ Niệm (${photoCount} ảnh)`}
          >
            {/* Chồng 3 bức ảnh Polaroid xếp nghiêng nghệ thuật (Không hộp nền) */}
            <div className="relative w-11 sm:w-13 h-11 sm:h-13">
              {/* Tấm 3: Nằm dưới cùng, nghiêng sang trái */}
              <div className="absolute inset-0 w-full h-full rounded-sm bg-white p-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.4)] -rotate-12 scale-90 transition-transform duration-300 group-hover:-rotate-16 group-hover:-translate-x-1">
                <div className="w-full h-full bg-[#333] overflow-hidden rounded-xs">
                  {latestPhotos[2]?.dataUrl ? (
                    <img
                      src={latestPhotos[2].dataUrl}
                      alt="Thumbnail 3"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center opacity-60">
                      <span className="material-symbols-outlined text-[10px] text-white/50">image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tấm 2: Nằm giữa, nghiêng sang phải */}
              <div className="absolute inset-0 w-full h-full rounded-sm bg-white p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.45)] rotate-6 scale-95 transition-transform duration-300 group-hover:rotate-10 group-hover:translate-x-1">
                <div className="w-full h-full bg-[#222] overflow-hidden rounded-xs">
                  {latestPhotos[1]?.dataUrl ? (
                    <img
                      src={latestPhotos[1].dataUrl}
                      alt="Thumbnail 2"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#3A3A3A] flex items-center justify-center opacity-70">
                      <span className="material-symbols-outlined text-[10px] text-white/50">image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tấm 1: Nằm trên cùng, nghiêng nhẹ góc tự nhiên */}
              <div className="absolute inset-0 w-full h-full rounded-sm bg-white p-0.5 shadow-[0_6px_16px_rgba(0,0,0,0.6)] -rotate-2 scale-100 transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full bg-[#111] overflow-hidden rounded-xs relative">
                  {latestPhotos[0]?.dataUrl ? (
                    <img
                      src={latestPhotos[0].dataUrl}
                      alt="Thumbnail 1"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#444] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[12px] text-white">photo_camera</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Huy hiệu số lượng ảnh chụp (Badge nhỏ xinh xắn) */}
              {photoCount > 0 && (
                <div className="absolute -bottom-1 -right-1 z-10 px-1.5 py-0.2 bg-[#8C7A5B] text-white text-[8.5px] font-mono font-bold rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.5)] border border-white flex items-center justify-center min-w-4.5">
                  {photoCount}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. TRUNG TÂM: ICON CHIẾC CẶP GẮN MÁY ẢNH & TÊN APP PHOTOBAG */}
      <div
        onClick={() => onNavigate('camera')}
        className="pointer-events-auto cursor-pointer flex items-center gap-2 sm:gap-2.5 transition-transform duration-200 active:scale-95 group"
      >
        {/* Icon Chiếc Cặp Học Sinh Nhật Bản (Randoseru Trắng Nắp Xanh) Gắn Máy Ảnh */}
        <div className="relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Quai đeo vai phía sau (màu trắng viền xanh) */}
            <path d="M 13 18 C 13 6, 41 6, 41 18" stroke="#E2E8F0" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <path d="M 14 18 C 14 7.5, 40 7.5, 40 18" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" fill="none" />
            
            {/* Quai xách đỉnh cặp (Quai Randoseru chuẩn Nhật) */}
            <path d="M 20 13 C 20 7.5, 34 7.5, 34 13" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 22 13 C 22 9.5, 32 9.5, 32 13" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            
            {/* Thân cặp học sinh Randoseru Nhật Bản (Màu trắng kem cao cấp) */}
            <rect x="8" y="14" width="38" height="34" rx="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" />
            
            {/* Đường viền chỉ may & gân hông cặp */}
            <path d="M 11 20 L 11 43" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
            <path d="M 43 20 L 43 43" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
            
            {/* Nắp gập đặc trưng của cặp Randoseru Nhật Bản (Màu xanh dương rực rỡ) */}
            <path
              d="M 8 18 C 8 13.5, 46 13.5, 46 18 L 45 28 C 45 32, 38 34, 27 34 C 16 34, 9 32, 9 28 Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="2"
            />
            {/* Chi tiết bóng sáng & nẹp chỉ trên nắp xanh */}
            <path
              d="M 11 18 C 11 15.5, 43 15.5, 43 18 L 42.5 25 C 42.5 27, 36 29, 27 29 C 18 29, 11.5 27, 11.5 25 Z"
              fill="#3B82F6"
              opacity="0.9"
            />
            
            {/* Khóa cài kim loại mạ bạc dưới nắp cặp */}
            <rect x="24.5" y="32.5" width="5" height="3.5" rx="1" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1" />
            <circle cx="27" cy="34.2" r="0.8" fill="#3B82F6" />
            
            {/* Móc treo kim loại 2 bên sườn cặp (Đặc trưng cặp Nhật) */}
            <rect x="5.8" y="24" width="2.4" height="4.5" rx="1" fill="#94A3B8" stroke="#0F172A" strokeWidth="0.8" />
            <rect x="45.8" y="24" width="2.4" height="4.5" rx="1" fill="#94A3B8" stroke="#0F172A" strokeWidth="0.8" />
            
            {/* CỤM MÁY ẢNH GẮN Ở MẶT TRƯỚC CHIẾC CẶP (Vị trí trung tâm thanh lịch) */}
            <rect x="14" y="27" width="26" height="18" rx="4" fill="#0F172A" />
            <rect x="15" y="28" width="24" height="16" rx="3" fill="#1E293B" />
            
            {/* Đỉnh gờ máy ảnh & nút chụp đỏ */}
            <rect x="18" y="26.2" width="18" height="2" rx="0.8" fill="#94A3B8" />
            <circle cx="20.5" cy="25.6" r="1.3" fill="#EF4444" />
            
            {/* Kính ngắm & Đèn Flash màu vàng */}
            <rect x="33" y="29.5" width="4.5" height="3" rx="0.8" fill="#FBBF24" stroke="#0F172A" strokeWidth="0.8" />
            
            {/* Ống kính máy ảnh trung tâm */}
            <circle cx="27" cy="36.5" r="6.5" fill="#0F172A" stroke="#60A5FA" strokeWidth="1.8" />
            <circle cx="27" cy="36.5" r="4.2" fill="#1D4ED8" />
            <circle cx="27" cy="36.5" r="2.2" fill="#38BDF8" />
            <circle cx="25.5" cy="35" r="0.9" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Tên App PhotoBag & Dòng Slogan */}
        <div className="flex flex-col">
          <div className="flex items-center leading-none gap-1.5">
            <span className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-sans">
              Photo
            </span>
            <span className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-[#3B82F6] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-sans ml-0.5">
              Bag
            </span>
            {/* Chấm LIVE nhấp nháy bên phải logo */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-xs border border-white/20 text-[#FFD166] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166] inline-block animate-pulse"></span>
              <span className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-wider leading-none">LIVE</span>
            </span>
          </div>
          {/* Tagline Ribbon nổi */}
          <div className="mt-0.5 px-2 py-0.2 bg-[#2563EB]/90 backdrop-blur-xs rounded-full border border-white/20 shadow-xs flex items-center justify-center">
            <span className="text-[7px] sm:text-[7.5px] font-sans font-bold tracking-[0.18em] text-white uppercase whitespace-nowrap">
              SMILE • SNAP • SHARE
            </span>
          </div>
        </div>
      </div>

      {/* 3. GÓC PHẢI: NÚT TRÒN MỞ BẢNG CHỨC NĂNG PHỤ */}
      <div className="relative pointer-events-auto" ref={settingsRef}>
        <button
          id="top-bar-settings-dropdown-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.35)] border ${
            settingsOpen
              ? 'bg-[#E86A7C] text-white border-white scale-105'
              : 'bg-black/60 hover:bg-black/85 backdrop-blur-md text-[#F9F7F2] border-white/25 hover:border-white/40'
          }`}
          title="Tùy chỉnh chức năng phụ"
          aria-label="Cài đặt & chức năng phụ"
        >
          <span className="material-symbols-outlined text-[20px] sm:text-[22px] transition-transform duration-200">
            {settingsOpen ? 'close' : 'tune'}
          </span>
        </button>

        {/* BẢNG ĐIỀU KHIỂN CHỨC NĂNG PHỤ (FLOATING SETTINGS DRAWER / POPOVER) - GIAO DIỆN NỀN SÁNG CAO CẤP */}
        {settingsOpen && (
          <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-[#F9F7F2]/95 backdrop-blur-2xl border border-black/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] py-3 px-3 z-50 text-[#1A1A1A] animate-in fade-in zoom-in-95 duration-200 select-none">
            {/* Header bảng */}
            <div className="flex items-center justify-between px-2 pb-2.5 border-b border-black/10 mb-2.5">
              <div className="flex items-center text-[#1A1A1A]">
                <span className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">
                  Tùy Chỉnh
                </span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 text-black/60 flex items-center justify-center cursor-pointer text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Danh sách các chức năng phụ */}
            <div className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Mục 1: Chế Độ Khung Xem Trước (Preview Slots) */}
              {onSetPreviewMode && (
                <div className="bg-black/5 rounded-xl p-2.5 border border-black/5">
                  <div className="flex items-center mb-1.5">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-black/75 flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 text-[#3B82F6]" /> Khung Xem Trước:
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onSetPreviewMode('none')}
                      className={`py-1.5 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer font-medium ${
                        previewMode === 'none'
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'bg-black/5 text-black/70 hover:bg-black/10'
                      }`}
                    >
                      Tắt
                    </button>
                    <button
                      onClick={() => onSetPreviewMode('bottom-slots')}
                      className={`py-1.5 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer font-medium ${
                        previewMode === 'bottom-slots'
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'bg-black/5 text-black/70 hover:bg-black/10'
                      }`}
                    >
                      Ô Dưới
                    </button>
                    <button
                      onClick={() => onSetPreviewMode('paper-strip')}
                      className={`py-1.5 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer font-medium ${
                        previewMode === 'paper-strip'
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'bg-black/5 text-black/70 hover:bg-black/10'
                      }`}
                    >
                      Giấy In
                    </button>
                  </div>
                </div>
              )}

              {/* Mục 1.5: Cài đặt sẵn Bộ lọc ảnh */}
              {onSelectFilter && (
                <div className="bg-black/5 rounded-xl p-2.5 border border-black/5">
                  <div className="flex items-center mb-1.5">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-black/75 flex items-center gap-1.5 font-bold">
                      <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" /> Bộ Lọc Mặc Định:
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {FILTER_PRESETS.map((filter) => {
                      const isSel = currentFilterId === filter.id;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => onSelectFilter(filter.id, filter.defaultIntensity)}
                          className={`py-1 px-1 text-[8.5px] font-sans rounded-md transition-all cursor-pointer truncate font-medium text-center ${
                            isSel
                              ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                              : 'bg-black/5 text-black/70 hover:bg-black/10'
                          }`}
                        >
                          <span className="truncate w-full text-center">{filter.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mục 2: Cách thức chụp (Liên tiếp VS Từng tấm) */}
              {onSetCaptureTriggerMode && (
                <div className="bg-black/5 rounded-xl p-2.5 border border-black/5">
                  <div className="flex items-center mb-1.5">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-black/75 flex items-center gap-1.5 font-bold">
                      <Radio className="w-3.5 h-3.5 text-[#3B82F6]" /> Cách Thức Chụp:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onSetCaptureTriggerMode('auto')}
                      className={`py-2 px-2 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center font-medium ${
                        captureTriggerMode === 'auto'
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'bg-black/5 text-black/70 hover:bg-black/10'
                      }`}
                    >
                      Liên Tiếp
                    </button>
                    <button
                      onClick={() => onSetCaptureTriggerMode('manual')}
                      className={`py-2 px-2 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center font-medium ${
                        captureTriggerMode === 'manual'
                          ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                          : 'bg-black/5 text-black/70 hover:bg-black/10'
                      }`}
                    >
                      Từng Tấm
                    </button>
                  </div>
                </div>
              )}

              {/* Mục 3: Hẹn giờ đếm ngược */}
              {onSetTimerSeconds && (
                <div className="bg-black/5 rounded-xl p-2.5 border border-black/5">
                  <div className="flex items-center mb-1.5">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-black/75 flex items-center gap-1.5 font-bold">
                      <Timer className="w-3.5 h-3.5 text-[#3B82F6]" /> Hẹn Giờ:
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {([0, 3, 5, 10] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => onSetTimerSeconds(sec)}
                        className={`py-1.5 text-[10px] font-sans uppercase tracking-wider rounded-lg transition-all cursor-pointer font-medium ${
                          timerSeconds === sec
                            ? 'bg-[#2563EB] text-white font-bold shadow-xs'
                            : 'bg-black/5 text-black/70 hover:bg-black/10'
                        }`}
                      >
                        {sec === 0 ? 'Tắt' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mục 3 & 4: Đèn Flash & Lưới Bố Cục (Ngang) */}
              <div className="grid grid-cols-2 gap-2">
                {onToggleFlash && (
                  <button
                    onClick={onToggleFlash}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer font-medium ${
                      flashEnabled
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-800 font-bold shadow-xs'
                        : 'bg-black/5 border-black/5 text-black/70 hover:bg-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {flashEnabled ? (
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <ZapOff className="w-3.5 h-3.5 opacity-50" />
                      )}
                      <span className="text-[10px] font-sans uppercase tracking-wider">Flash</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase">{flashEnabled ? 'BẬT' : 'TẮT'}</span>
                  </button>
                )}

                {onToggleGrid && (
                  <button
                    onClick={onToggleGrid}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer font-medium ${
                      gridVisible
                        ? 'bg-[#2563EB]/15 border-[#2563EB]/40 text-[#2563EB] font-bold shadow-xs'
                        : 'bg-black/5 border-black/5 text-black/70 hover:bg-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span className="text-[10px] font-sans uppercase tracking-wider">Lưới 1/3</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase">{gridVisible ? 'BẬT' : 'TẮT'}</span>
                  </button>
                )}
              </div>

              {/* Mục 5: Bật Màn Hình Chờ (Idle Screen) */}
              <button
                onClick={() => {
                  onNavigate('idle');
                  setSettingsOpen(false);
                }}
                className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-300/60 rounded-xl text-left text-[11px] font-sans uppercase tracking-wider text-amber-900 flex items-center justify-between transition-all cursor-pointer shadow-xs"
              >
                <span className="font-bold text-[10.5px] text-amber-900">Màn Hình Chờ</span>
                <span className="text-[9px] font-bold uppercase bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md border border-amber-400/40">
                  Bật Ngay
                </span>
              </button>

              {/* Mục 6: Quay Video Quá Trình */}
              {onToggleRecordVideo && (
                <button
                  onClick={onToggleRecordVideo}
                  className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    recordVideoEnabled
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-xs'
                      : 'bg-black/5 border-black/5 text-black/70 hover:bg-black/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${recordVideoEnabled ? 'bg-rose-500 text-white' : 'bg-black/10 text-black/60'}`}>
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10.5px] font-bold font-sans uppercase tracking-wider text-[#1A1A1A]">
                      Quay Video Quá Trình
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    recordVideoEnabled ? 'bg-rose-500 text-white' : 'bg-black/10 text-black/50'
                  }`}>
                    {recordVideoEnabled ? 'BẬT' : 'TẮT'}
                  </span>
                </button>
              )}

              {/* Mục 6: Đổi Camera Trước / Sau */}
              {onFlipCamera && (
                <button
                  onClick={onFlipCamera}
                  className="w-full px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/5 rounded-xl text-left text-[10.5px] font-sans uppercase tracking-wider text-black/75 flex items-center justify-between transition-colors cursor-pointer font-bold"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="text-[#1A1A1A]">Đổi Camera (Trước / Sau)</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-black/40" />
                </button>
              )}

              {/* Mục 7: Nguồn Ống Kính Webcam / Mẫu */}
              {onToggleLiveStream && (
                <button
                  onClick={onToggleLiveStream}
                  className="w-full px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/5 rounded-xl text-left text-[10.5px] font-sans uppercase tracking-wider text-black/75 flex items-center justify-between transition-colors cursor-pointer font-bold"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="text-[#1A1A1A]">Nguồn Ống Kính</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-[#E86A7C] uppercase">
                    {isLiveStream ? 'Webcam Live' : 'Ảnh Mẫu'}
                  </span>
                </button>
              )}

              {/* Mục 8: Âm thanh màn trập */}
              <button
                onClick={onToggleSound}
                className="w-full px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/5 rounded-xl text-left text-[10.5px] font-sans uppercase tracking-wider text-black/75 flex items-center justify-between transition-colors cursor-pointer font-bold"
              >
                <span className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 opacity-50" />
                  )}
                  <span className="text-[#1A1A1A]">Âm Thanh Màn Trập</span>
                </span>
                <span className="text-[9px] font-bold uppercase text-black/60">
                  {soundEnabled ? 'BẬT' : 'TẮT'}
                </span>
              </button>

              {/* Mục 8: Đặt Lại Ảnh Mẫu Ban Đầu */}
              {onResetSamples && (
                <button
                  onClick={() => {
                    onResetSamples();
                    setSettingsOpen(false);
                  }}
                  className="w-full px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/5 rounded-xl text-left text-[10px] font-sans uppercase tracking-wider text-black/60 hover:text-black flex items-center gap-2 transition-colors cursor-pointer mt-1 font-bold"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#8C7A5B]" />
                  Đặt Lại Dữ Liệu Ảnh Mẫu Ban Đầu
                </button>
              )}

              {/* Mục 9: Quản Trị Viên & Kiosk Dashboard (Bảo mật bằng PIN) */}
              {onOpenAdminDashboard && (
                <button
                  onClick={() => {
                    onOpenAdminDashboard();
                    setSettingsOpen(false);
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/40 rounded-xl text-left text-[10.5px] font-sans uppercase tracking-wider text-amber-900 flex items-center justify-between transition-all cursor-pointer mt-2 font-bold shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Quản Trị Viên (Admin)</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-md">
                    PIN
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
