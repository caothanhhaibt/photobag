import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Sparkles,
  Heart,
  Cake,
  Building2,
  Zap,
  Palette,
  Settings,
  X,
  Check,
  Clock,
  ShieldCheck,
  Flame,
  Maximize2,
  ChevronRight,
  HelpCircle,
  Eye,
  Sliders,
  Film,
  Upload,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  Smile,
} from 'lucide-react';
import { CapturedPhoto, EventConfig, EventTheme } from '../types';
import { FILTER_PRESETS } from '../constants/filters';
import { AnimatedPhotoBagLogo } from './AnimatedPhotoBagLogo';
import { motion } from 'motion/react';

interface IdleScreenProps {
  onStartSession: () => void;
  eventConfig: EventConfig;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  recentPhotos: CapturedPhoto[];
  soundEnabled: boolean;
  onOpenAdminDashboard?: () => void;
}

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: 'HAPPY WEDDING MINH & TRANG',
  eventCategory: 'HAPPY WEDDING',
  eventMainSubject: 'MINH & TRANG',
  eventTagline: 'Save the Date • 29/08/2026',
  eventSubtitle: 'Lưu giữ nụ cười hạnh phúc & trọn vẹn yêu thương',
  eventDate: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  eventLogoUrl: '',
  theme: 'korean',
  showRecentPhotos: true,
  idleTimeoutSeconds: 60,
  customInstructions: 'Chạm bất kỳ đâu để bắt đầu chụp ảnh',
  requireConsentForFeed: false,
  enableEventTitleMode: true, // Mặc định bật chế độ luân phiên nếu có sự kiện
  titleAlternateIntervalSeconds: 60, // 60s luân phiên 1 lần
  titleSize: 'md', // Mặc định kích thước vừa (md)
  showLogoBorder: true, // Mặc định bật khung viền
  captureMode: 'photobooth', // Mặc định: Photobooth / Mua Giờ
  photoboothSessionDurationSeconds: 300, // Mặc định 5 phút / phiên
  security: {
    adminPin: '1234',
    enableKioskLock: true,
    enableFullScreenKiosk: true,
    hideAdminGearButton: false,
    autoResetAfterShareSeconds: 45,
  },
};

// Cấu hình tỷ lệ kích thước chữ tiêu đề linh hoạt (Nhỏ / Vừa / Lớn / Cực Đại)
const TITLE_SIZE_CONFIG: Record<
  'sm' | 'md' | 'lg' | 'xl',
  {
    tagline: string;
    category: string;
    mainSubject: string;
    subtitle: string;
  }
> = {
  sm: {
    tagline: 'text-sm sm:text-lg md:text-xl',
    category: 'text-base sm:text-xl md:text-2xl lg:text-3xl',
    mainSubject: 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl',
    subtitle: 'text-xs sm:text-base md:text-lg',
  },
  md: {
    tagline: 'text-base sm:text-xl md:text-2xl',
    category: 'text-lg sm:text-2xl md:text-3xl lg:text-4xl',
    mainSubject: 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl',
    subtitle: 'text-sm sm:text-lg md:text-xl',
  },
  lg: {
    tagline: 'text-lg sm:text-2xl md:text-3xl',
    category: 'text-xl sm:text-3xl md:text-4xl lg:text-5xl',
    mainSubject: 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl',
    subtitle: 'text-base sm:text-xl md:text-2xl',
  },
  xl: {
    tagline: 'text-xl sm:text-3xl md:text-4xl',
    category: 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl',
    mainSubject: 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl',
    subtitle: 'text-lg sm:text-2xl md:text-3xl',
  },
};

// Preset images for Event Emblem / Logo
const PRESET_EVENT_IMAGES = [
  {
    label: 'Ảnh Cưới Cặp Đôi',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80',
    icon: '💍',
  },
  {
    label: 'Nhẫn Cưới Kim Cương',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&auto=format&fit=crop&q=80',
    icon: '💎',
  },
  {
    label: 'Bong Bóng Sinh Nhật',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&auto=format&fit=crop&q=80',
    icon: '🎈',
  },
  {
    label: 'Logo Sự Kiện / Công Ty',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    icon: '🏢',
  },
];

// Helper phân tách thông minh Loại Sự Kiện (Dòng 1) và Tên Nhân Vật Chính (Dòng 2)
function parseEventTitle(config: EventConfig) {
  if (config.eventCategory && config.eventMainSubject) {
    return {
      category: config.eventCategory.trim(),
      mainSubject: config.eventMainSubject.trim(),
    };
  }

  const raw = config.eventName || 'HAPPY WEDDING MINH & TRANG';
  if (raw.includes('\n')) {
    const parts = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    return {
      category: parts[0] || '',
      mainSubject: parts.slice(1).join(' ') || '',
    };
  }

  const prefixes = [
    'HAPPY WEDDING',
    'LỄ THÀNH HÔN',
    'LỄ ĐÍNH HÔN',
    'LỄ VU QUY',
    'HAPPY BIRTHDAY',
    'YEAR END PARTY',
    'ANNUAL GALA',
    'GRAND OPENING',
    'CELEBRATION OF',
    'SINH NHẬT',
    'KỶ NIỆM NGÀY CƯỚI',
    'WEDDING',
  ];

  for (const prefix of prefixes) {
    if (raw.toUpperCase().startsWith(prefix)) {
      const remainder = raw.slice(prefix.length).trim().replace(/^[-:•\s]+/, '');
      if (remainder) {
        return {
          category: prefix,
          mainSubject: remainder,
        };
      }
    }
  }

  const words = raw.split(' ');
  if (words.length >= 3) {
    return {
      category: words.slice(0, 2).join(' '),
      mainSubject: words.slice(2).join(' '),
    };
  }

  return {
    category: '',
    mainSubject: raw,
  };
}

const THEME_STYLES: Record<
  EventTheme,
  {
    name: string;
    bgGradient: string;
    ambientGlow: string;
    accentColor: string;
    textColor: string;
    subtextColor: string;
    badgeBg: string;
    cardBorder: string;
    icon: any;
  }
> = {
  korean: {
    name: 'Hàn Quốc Tối Giản',
    bgGradient: 'from-[#FAF7F2] via-[#F3EFE6] to-[#EAE3D2]',
    ambientGlow: 'radial-gradient(circle at 50% 40%, rgba(254, 215, 226, 0.45) 0%, rgba(224, 231, 255, 0.3) 50%, transparent 80%)',
    accentColor: '#1A1A1A',
    textColor: '#1A1A1A',
    subtextColor: '#736B5E',
    badgeBg: 'bg-white/80 border-[#E2DACB] text-[#4A443A]',
    cardBorder: 'border-[#EAE3D2] shadow-[0_12px_32px_rgba(40,30,20,0.08)]',
    icon: Smile,
  },
  wedding: {
    name: 'Đám Cưới Lãng Mạn',
    bgGradient: 'from-[#FFFBF5] via-[#FFF1E6] to-[#FCE7F3]',
    ambientGlow: 'radial-gradient(circle at 50% 35%, rgba(251, 207, 232, 0.6) 0%, rgba(254, 243, 199, 0.4) 50%, transparent 75%)',
    accentColor: '#9D174D',
    textColor: '#831843',
    subtextColor: '#9F1239',
    badgeBg: 'bg-rose-50/90 border-rose-200 text-rose-800',
    cardBorder: 'border-rose-100 shadow-[0_12px_32px_rgba(244,63,94,0.12)]',
    icon: Heart,
  },
  birthday: {
    name: 'Sinh Nhật Vui Vẻ',
    bgGradient: 'from-[#FFF7ED] via-[#FEF3C7] to-[#ECFCCB]',
    ambientGlow: 'radial-gradient(circle at 50% 40%, rgba(253, 224, 71, 0.5) 0%, rgba(249, 115, 22, 0.25) 50%, transparent 75%)',
    accentColor: '#C2410C',
    textColor: '#7C2D12',
    subtextColor: '#9A3412',
    badgeBg: 'bg-amber-100/90 border-amber-300 text-amber-900',
    cardBorder: 'border-amber-200 shadow-[0_12px_32px_rgba(234,88,12,0.12)]',
    icon: Cake,
  },
  corporate: {
    name: 'Doanh Nghiệp Sang Trọng',
    bgGradient: 'from-[#0F172A] via-[#1E293B] to-[#090D16]',
    ambientGlow: 'radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 80%)',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    subtextColor: '#94A3B8',
    badgeBg: 'bg-slate-800/80 border-slate-700 text-sky-300',
    cardBorder: 'border-slate-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.6)]',
    icon: Building2,
  },
  neon: {
    name: 'Party Neon & Y2K',
    bgGradient: 'from-[#0D0221] via-[#19053B] to-[#050014]',
    ambientGlow: 'radial-gradient(circle at 50% 45%, rgba(217, 70, 239, 0.35) 0%, rgba(6, 182, 212, 0.2) 60%, transparent 80%)',
    accentColor: '#F43F5E',
    textColor: '#FFFFFF',
    subtextColor: '#E2E8F0',
    badgeBg: 'bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300',
    cardBorder: 'border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.3)]',
    icon: Zap,
  },
  vintage: {
    name: 'Phim Cổ Điển Vintage',
    bgGradient: 'from-[#2C241D] via-[#3E332A] to-[#1C1611]',
    ambientGlow: 'radial-gradient(circle at 50% 40%, rgba(217, 119, 6, 0.3) 0%, rgba(180, 83, 9, 0.15) 60%, transparent 80%)',
    accentColor: '#FBBF24',
    textColor: '#FDF6E2',
    subtextColor: '#D5C3A5',
    badgeBg: 'bg-amber-950/80 border-amber-700/50 text-amber-200',
    cardBorder: 'border-amber-800/40 shadow-[0_16px_40px_rgba(0,0,0,0.5)]',
    icon: Film,
  },
};

export const IdleScreen: React.FC<IdleScreenProps> = ({
  onStartSession,
  eventConfig,
  onUpdateEventConfig,
  recentPhotos,
  soundEnabled,
  onOpenAdminDashboard,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState<EventConfig>(eventConfig);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [displayHeroMode, setDisplayHeroMode] = useState<'brand' | 'event'>('event');
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Triple-tap counter for secret admin access
  const logoTapCountRef = useRef<number>(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    logoTapCountRef.current += 1;

    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }

    if (logoTapCountRef.current >= 3) {
      // Chạm 3 lần mở bảng Admin
      logoTapCountRef.current = 0;
      if (onOpenAdminDashboard) {
        onOpenAdminDashboard();
      } else {
        setShowConfigModal(true);
      }
      return;
    }

    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
    }, 600);

    // Chạm 1 lần để chuyển đổi Logo / Tiêu đề sự kiện
    if (eventConfig.enableEventTitleMode) {
      setDisplayHeroMode((prev) => (prev === 'brand' ? 'event' : 'brand'));
    }
  };

  // Sync temp config when eventConfig prop updates
  useEffect(() => {
    setTempConfig(eventConfig);
  }, [eventConfig]);

  const currentTheme = THEME_STYLES[eventConfig.theme] || THEME_STYLES.korean;
  const isDarkTheme = eventConfig.theme === 'corporate' || eventConfig.theme === 'neon' || eventConfig.theme === 'vintage';

  // LUÂN PHIÊN: Tiêu đề sự kiện là CHÍNH (30s/60s/90s/120s), Logo PhotoBag chỉ xuất hiện điểm xuyết trong 5 GIÂY
  useEffect(() => {
    // Nếu tắt chế độ tiêu đề sự kiện: Luôn luôn hiển thị Logo thương hiệu PhotoBag
    if (!eventConfig.enableEventTitleMode) {
      setDisplayHeroMode('brand');
      return;
    }

    // Khi bật chế độ sự kiện: Mặc định ưu tiên Tiêu đề sự kiện làm màn hình chính
    setDisplayHeroMode('event');

    const eventDuration = (eventConfig.titleAlternateIntervalSeconds || 60) * 1000;
    const logoDuration = 5000; // Logo chỉ hiện trong 5s theo yêu cầu

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const showEventScreen = () => {
      if (!isMounted) return;
      setDisplayHeroMode('event');
      timerId = setTimeout(showLogoScreen, eventDuration);
    };

    const showLogoScreen = () => {
      if (!isMounted) return;
      setDisplayHeroMode('brand');
      timerId = setTimeout(showEventScreen, logoDuration);
    };

    // Bắt đầu chu kỳ: Tiêu đề sự kiện hiển thị trước trong eventDuration
    timerId = setTimeout(showLogoScreen, eventDuration);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [eventConfig.enableEventTitleMode, eventConfig.titleAlternateIntervalSeconds]);

  // Filter public photos for live feed
  const displayPhotos = eventConfig.showRecentPhotos
    ? recentPhotos.filter((p) => (eventConfig.requireConsentForFeed ? p.publicConsent === true : true))
    : [];

  // Auto carousel rotation for live feed slideshow (smooth non-blocking loop)
  useEffect(() => {
    if (displayPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setActivePhotoIdx((prev) => (prev + 1) % displayPhotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [displayPhotos.length]);

  const handleScreenClick = (e: React.MouseEvent) => {
    // If clicking inside config modal, photo zoom, or buttons, do not trigger start
    if (showConfigModal || previewPhoto) return;
    onStartSession();
  };

  const handleSaveConfig = () => {
    onUpdateEventConfig(tempConfig);
    setShowConfigModal(false);
  };

  // Handle uploading custom logo/photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setTempConfig((prev) => ({
        ...prev,
        eventLogoUrl: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="idle-attract-screen"
      onClick={handleScreenClick}
      className={`fixed inset-0 w-full h-[100dvh] overflow-hidden bg-gradient-to-b ${currentTheme.bgGradient} flex flex-col justify-between items-center select-none cursor-pointer z-40 transition-colors duration-700`}
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: currentTheme.ambientGlow }}
      />

      {/* Subtle Floating Sparkles / Particles Background Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-white/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full bg-white/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* TOP HEADER: Small Borderless PhotoBag Logo (Top Left) & Admin Gear Button (Top Right) */}
      <header className="relative w-full z-10 flex justify-between items-start p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* SMALL APP LOGO IN TOP LEFT - BORDERLESS (Only visible in Event Mode, fades out in Brand Mode) */}
        <div className="flex items-center">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogoTap}
            className={`inline-flex items-center gap-2.5 transition-all duration-700 cursor-pointer hover:opacity-90 drop-shadow-xs ${
              displayHeroMode === 'brand'
                ? 'opacity-0 pointer-events-none -translate-x-4 scale-90'
                : 'opacity-100 translate-x-0 scale-100'
            }`}
            title="PhotoBag Studio (Chạm 1 lần đổi giao diện • Chạm 3 lần mở Admin)"
          >
            {/* Mini Randoseru Camera Icon with gentle breathing float */}
            <motion.div
              animate={{
                y: [-2, 2, -2],
                rotate: [-1.5, 1.5, -1.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 relative flex-shrink-0 drop-shadow-sm"
            >
              <svg viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M 13 18 C 13 6, 41 6, 41 18" stroke="#CBD5E1" strokeWidth="3" fill="none" />
                <rect x="8" y="14" width="38" height="34" rx="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
                <path d="M 8 18 C 8 13.5, 46 13.5, 46 18 L 45 28 C 45 32, 38 34, 27 34 C 16 34, 9 32, 9 28 Z" fill="#2563EB" stroke="#0F172A" strokeWidth="2" />
                <circle cx="27" cy="36.5" r="5" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="1.5" />
                <circle cx="27" cy="36.5" r="2" fill="#38BDF8" />
              </svg>
            </motion.div>
            <div className="flex items-center gap-1.5 leading-none">
              <span
                className="font-sans font-black text-sm sm:text-base tracking-tight"
                style={{ color: currentTheme.textColor }}
              >
                Photo<span className="text-[#2563EB]">Bag</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
            </div>
          </motion.div>
        </div>

        {/* Admin Event Settings Button (Hidden if hideAdminGearButton is set) */}
        {!(eventConfig.security?.hideAdminGearButton) && (
          <button
            id="idle-config-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenAdminDashboard) {
                onOpenAdminDashboard();
              } else {
                setShowConfigModal(true);
              }
            }}
            className={`p-2.5 sm:p-3 rounded-full backdrop-blur-md border transition-all active:scale-90 hover:scale-105 shadow-sm cursor-pointer ${
              isDarkTheme
                ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white/90'
                : 'bg-black/5 hover:bg-black/10 border-black/10 text-[#1A1A1A]'
            }`}
            title="Cài đặt Quản Trị Viên & Kiosk"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* CENTER HERO: Official PhotoBag Logo Emblem OR Custom Event Title with Auto-Rotation */}
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center my-auto">
        {/* HERO CONTENT: EITHER BRAND LOGO (ZOOM IN FROM ORIGIN) OR EVENT TITLE */}
        <div className="min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center transition-all duration-700 w-full">
          {displayHeroMode === 'brand' ? (
            /* ================= VIEW 1: OFFICIAL BRAND LOGO (EXPANDS TO CENTER STAGE WITH RICH ANIMATIONS) ================= */
            <AnimatedPhotoBagLogo
              size="lg"
              isDarkTheme={isDarkTheme}
              textColor={isDarkTheme ? '#FFFFFF' : '#1A1A1A'}
              subtextColor={currentTheme.subtextColor}
            />
          ) : (
            /* ================= VIEW 2: CUSTOM EVENT TITLE & SUBTITLE WITH ARTISTIC TAGLINE & SQUARE LOGO/PHOTO BELOW ================= */
            <div className="flex flex-col items-center group cursor-pointer transition-all duration-700 transform scale-100 opacity-100 animate-in fade-in max-w-4xl px-2">
              {(() => {
                const sizeStyle = TITLE_SIZE_CONFIG[eventConfig.titleSize || 'md'] || TITLE_SIZE_CONFIG.md;
                const { category, mainSubject } = parseEventTitle(eventConfig);

                return (
                  <>
                    {/* 1. DÒNG CHỮ NGHỆ THUẬT PHÍA TRÊN (SAVE THE DATE • NGÀY TỔ CHỨC) - CHỮ NGHIÊNG NGHỆ THUẬT */}
                    <p
                      className={`font-serif italic font-light tracking-wide sm:tracking-widest drop-shadow-xs mb-1.5 sm:mb-2 opacity-90 transition-all text-center ${sizeStyle.tagline}`}
                      style={{ color: currentTheme.textColor }}
                    >
                      {eventConfig.eventTagline || (eventConfig.eventDate ? `Save the Date • ${eventConfig.eventDate}` : 'Save the Date')}
                    </p>

                    {/* 2. Dòng 1: Loại sự kiện (e.g. HAPPY WEDDING, HAPPY BIRTHDAY, YEAR END PARTY) */}
                    {category && (
                      <span
                        className={`font-serif font-semibold tracking-[0.25em] sm:tracking-[0.3em] uppercase transition-all duration-300 opacity-90 leading-tight mb-1.5 sm:mb-2 text-center ${sizeStyle.category}`}
                        style={{ color: currentTheme.textColor }}
                      >
                        {category}
                      </span>
                    )}

                    {/* 3. Dòng 2: Tên nhân vật / Đối tượng chính (e.g. MINH & TRANG) */}
                    <h1
                      className={`font-serif font-extrabold tracking-tight uppercase transition-all duration-300 drop-shadow-sm leading-tight text-center ${sizeStyle.mainSubject}`}
                      style={{ color: currentTheme.textColor }}
                    >
                      {mainSubject || eventConfig.eventName}
                    </h1>

                    {/* 4. LOGO SỰ KIỆN / CÔNG TY / NHÂN VẬT (CÓ THỂ BẬT/TẮT KHUNG VUÔNG MẢNH OFFSET) */}
                    {eventConfig.eventLogoUrl && (
                      <div className="mt-3.5 sm:mt-5 mb-1.5 relative group">
                        {(eventConfig.showLogoBorder ?? true) ? (
                          /* Khung viền ngoài vuông mảnh hở nhẹ (offset) đồng bộ màu với chữ tiêu đề */
                          <div
                            className="p-1 sm:p-1.5 border shadow-xl transition-all duration-300 group-hover:scale-105"
                            style={{ borderColor: currentTheme.textColor }}
                          >
                            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 aspect-square overflow-hidden bg-black/5">
                              <img
                                src={eventConfig.eventLogoUrl}
                                alt="Event Emblem"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Hiển thị ảnh trực tiếp không khung viền */
                          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 aspect-square overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-105">
                            <img
                              src={eventConfig.eventLogoUrl}
                              alt="Event Emblem"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. Event Subtitle */}
                    {eventConfig.eventSubtitle && (
                      <p
                        className={`mt-3 sm:mt-4 max-w-2xl font-light tracking-wide transition-colors duration-300 text-center ${sizeStyle.subtitle}`}
                        style={{ color: currentTheme.subtextColor }}
                      >
                        {eventConfig.eventSubtitle}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: CTA Prompt & Live Recent Photo Feed */}
      <footer className="relative w-full z-10 pb-5 sm:pb-7 pt-1 px-4 max-w-7xl mx-auto flex flex-col items-center gap-3 sm:gap-4">
        {/* ICON CAMERA NHẤP NHÁY BÊN TRÁI + DÒNG CHỮ CHẠM VÀO BẤT KỲ ĐÂU (KHÔNG VIỀN BAO) */}
        <div className="flex items-center gap-2.5 sm:gap-3 py-1 cursor-pointer group hover:scale-105 active:scale-95 transition-transform duration-300">
          {/* Biểu tượng camera nhỏ nhấp nháy phía ngoài bên trái đầu dòng chữ */}
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
              isDarkTheme
                ? 'bg-white text-[#0F172A] shadow-[0_0_15px_rgba(255,255,255,0.45)]'
                : 'bg-[#1A1A1A] text-white shadow-md'
            } animate-pulse flex-shrink-0`}
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          {/* Dòng chữ chạm vào bất kỳ đâu */}
          <span
            className="text-xs sm:text-sm md:text-base font-extrabold tracking-wider sm:tracking-widest uppercase select-none whitespace-nowrap drop-shadow-xs transition-colors"
            style={{ color: currentTheme.textColor }}
          >
            {eventConfig.customInstructions || (eventConfig.captureMode === 'free' ? 'CHẠM BẤT KỲ ĐÂU ĐỂ CHỤP ẢNH TỰ DO' : 'CHẠM BẤT KỲ ĐÂU ĐỂ BẮT ĐẦU CHỤP ẢNH')}
          </span>
        </div>

        {displayPhotos.length > 0 && (
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* Slideshow Photo Preview Cards (Tilt Polaroid style) */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 overflow-hidden py-1">
              {displayPhotos.slice(0, 4).map((photo, idx) => {
                const preset = FILTER_PRESETS.find((p) => p.id === photo.filterId);
                const isCurrent = idx === activePhotoIdx % Math.min(displayPhotos.length, 4);

                return (
                  <div
                    key={photo.id || idx}
                    onClick={(e) => {
                      // 5. CHẠM VÀO VÙNG ẢNH ĐỂ PHÓNG TO X2 XEM CHO RÕ (KHÔNG TRIGGER CHỤP ẢNH)
                      e.stopPropagation();
                      setPreviewPhoto(photo);
                    }}
                    className={`relative rounded-xl overflow-hidden bg-white p-1.5 sm:p-2 transition-all duration-500 transform cursor-pointer ${
                      isCurrent
                        ? 'scale-105 sm:scale-110 z-10 -rotate-1 shadow-2xl ring-2 ring-emerald-400/80'
                        : 'scale-95 opacity-75 hover:opacity-100 hover:scale-100 rotate-1 shadow-md'
                    } ${currentTheme.cardBorder}`}
                    style={{
                      width: '72px',
                      height: '96px',
                    }}
                    title="Chạm để phóng to xem ảnh"
                  >
                    <div className="w-full h-full rounded-lg overflow-hidden bg-[#1A1A1A] relative group">
                      <img
                        src={photo.dataUrl}
                        alt="Event Moment"
                        className="w-full h-full object-cover"
                        style={{
                          filter: preset ? preset.filterCss(photo.filterIntensity) : 'none',
                        }}
                      />
                      {preset?.overlayColor && photo.filterIntensity > 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: preset.overlayColor,
                            mixBlendMode: (preset.blendMode as any) || 'overlay',
                            opacity: (photo.filterIntensity / 100) * 0.8,
                          }}
                        />
                      )}
                      {/* Zoom Indicator on Hover */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </footer>

      {/* ================= 5. MODAL PHÓNG TO X2 ẢNH ĐÃ CHỤP (LIGHTBOX MODAL) ================= */}
      {previewPhoto && (
        <div
          id="photo-zoom-modal"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewPhoto(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xs sm:max-w-sm w-full bg-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-white/30 flex flex-col items-center animate-in zoom-in-90 duration-300"
          >
            {/* Close Button */}
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-3 -right-3 sm:-top-3.5 sm:-right-3.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/80 text-white flex items-center justify-center border-2 border-white shadow-lg hover:bg-black transition-all hover:scale-110 active:scale-95 z-20"
              title="Đóng xem ảnh"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 2X Enlarged Photo Card */}
            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 relative shadow-inner">
              <img
                src={previewPhoto.dataUrl}
                alt="Enlarged Moment"
                className="w-full h-full object-cover"
                style={{
                  filter: (() => {
                    const preset = FILTER_PRESETS.find((p) => p.id === previewPhoto.filterId);
                    return preset ? preset.filterCss(previewPhoto.filterIntensity) : 'none';
                  })(),
                }}
              />
            </div>

            {/* Modal Info Footer */}
            <div className="w-full mt-3 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold text-neutral-800">Ảnh kỷ niệm sự kiện</p>
                <p className="text-[10px] text-neutral-500">
                  {new Date(previewPhoto.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • PhotoBag Studio
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewPhoto(null);
                  onStartSession();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Chụp Ảnh Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EVENT CONFIGURATION MODAL (FOR ADMIN / EVENT ORGANIZER) ================= */}
      {showConfigModal && (
        <div
          id="event-config-modal"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FAF7F2] text-[#1A1A1A] rounded-2xl w-full max-w-lg shadow-2xl border border-[#E5DFD3] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DFD3] bg-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#1A1A1A]" />
                <h3 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wide">
                  Cài Đặt Sự Kiện & Màn Hình Chờ
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Chế độ Chiếu Tiêu Đề Sự Kiện */}
              <div className="p-4 bg-white rounded-xl border border-[#DDD6C8] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Chế Độ Chiếu Tiêu Đề Sự Kiện
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.enableEventTitleMode ?? true}
                      onChange={(e) =>
                        setTempConfig({ ...tempConfig, enableEventTitleMode: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Interval selection if enabled */}
                {(tempConfig.enableEventTitleMode ?? true) && (
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-600">Thời gian chiếu Tiêu đề:</span>
                    <div className="flex gap-1.5">
                      {[
                        { label: '30s', val: 30 },
                        { label: '60s', val: 60 },
                        { label: '90s', val: 90 },
                        { label: '120s', val: 120 },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() =>
                            setTempConfig({ ...tempConfig, titleAlternateIntervalSeconds: opt.val })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            (tempConfig.titleAlternateIntervalSeconds || 60) === opt.val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Các trường thông tin chi tiết sự kiện - Chỉ hiển thị khi BẬT Chế Độ Chiếu Tiêu Đề Sự Kiện */}
              {(tempConfig.enableEventTitleMode ?? true) ? (
                <>
                  {/* 3. CHỖ CHỌN HÌNH (LOGO CTY / SỰ KIỆN / ẢNH CẶP ĐÔI / NHÂN VẬT) */}
                  <div className="p-4 bg-white rounded-xl border border-[#DDD6C8] shadow-xs space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ảnh Nhân Vật / Logo Sự Kiện</span>
                      </h4>
                      {tempConfig.eventLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setTempConfig({ ...tempConfig, eventLogoUrl: '' })}
                          className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa ảnh</span>
                        </button>
                      )}
                    </div>

                    {/* Current Image Preview & Upload Buttons */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 aspect-square bg-white border border-neutral-300 p-0.5 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs">
                        {tempConfig.eventLogoUrl ? (
                          <img
                            src={tempConfig.eventLogoUrl}
                            alt="Event Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải Ảnh Lên</span>
                        </button>
                      </div>
                    </div>

                    {/* Bật / Tắt Khung Viền Bao Ngoài */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-700">
                        Khung Viền Bao Ngoài
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.showLogoBorder ?? true}
                          onChange={(e) =>
                            setTempConfig({
                              ...tempConfig,
                              showLogoBorder: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Quick Presets for 1-Click Selection */}
                    <div className="pt-2 border-t border-neutral-100">
                      <span className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                        Hoặc chọn ảnh mẫu nhanh:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_EVENT_IMAGES.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTempConfig({ ...tempConfig, eventLogoUrl: preset.url })}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all text-left ${
                              tempConfig.eventLogoUrl === preset.url
                                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50'
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span className="truncate">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 1. BỐ CỤC TIÊU ĐỀ */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border border-[#DDD6C8] shadow-xs animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      Bố Cục Tiêu Đề
                    </h4>

                    {/* Kích Thước Chữ Tiêu Đề */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Kích Thước Tiêu Đề
                        </label>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-lg border border-neutral-200">
                        {[
                          { key: 'sm', label: 'Nhỏ (S)' },
                          { key: 'md', label: 'Vừa (M)' },
                          { key: 'lg', label: 'Lớn (L)' },
                          { key: 'xl', label: 'Cực Đại (XL)' },
                        ].map((sizeOpt) => (
                          <button
                            key={sizeOpt.key}
                            type="button"
                            onClick={() => setTempConfig({ ...tempConfig, titleSize: sizeOpt.key as any })}
                            className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all text-center ${
                              (tempConfig.titleSize || 'md') === sizeOpt.key
                                ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                            }`}
                          >
                            {sizeOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dòng Tiêu Đề Ngày Tổ Chức */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Tiêu Đề Ngày Tổ Chức
                      </label>
                      <input
                        type="text"
                        value={tempConfig.eventTagline ?? 'Save the Date • 29/08/2026'}
                        onChange={(e) => setTempConfig({ ...tempConfig, eventTagline: e.target.value })}
                        placeholder="VD: Save the Date • 29/08/2026 hoặc Our Special Day"
                        className="w-full px-3.5 py-2 bg-white border border-[#DDD6C8] rounded-lg text-sm italic font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    {/* Loại sự kiện */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Loại Sự Kiện
                      </label>
                      <input
                        type="text"
                        value={tempConfig.eventCategory ?? 'HAPPY WEDDING'}
                        onChange={(e) => {
                          const newCategory = e.target.value;
                          const mainSub = tempConfig.eventMainSubject ?? 'MINH & TRANG';
                          setTempConfig({
                            ...tempConfig,
                            eventCategory: newCategory,
                            eventName: `${newCategory}\n${mainSub}`,
                          });
                        }}
                        placeholder="VD: HAPPY WEDDING, HAPPY BIRTHDAY, YEAR END PARTY"
                        className="w-full px-3.5 py-2 bg-white border border-[#DDD6C8] rounded-lg text-sm font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    {/* Tên đối tượng chính */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Tên Đối Tượng Chính
                      </label>
                      <input
                        type="text"
                        value={tempConfig.eventMainSubject ?? 'MINH & TRANG'}
                        onChange={(e) => {
                          const newMainSub = e.target.value;
                          const cat = tempConfig.eventCategory ?? 'HAPPY WEDDING';
                          setTempConfig({
                            ...tempConfig,
                            eventMainSubject: newMainSub,
                            eventName: `${cat}\n${newMainSub}`,
                          });
                        }}
                        placeholder="VD: MINH & TRANG, HOÀNG & LINH, CÔNG TY XYZ"
                        className="w-full px-3.5 py-2 bg-white border border-[#DDD6C8] rounded-lg text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Event Subtitle */}
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                      Phụ Đề / Khẩu Hiệu Sự Kiện
                    </label>
                    <input
                      type="text"
                      value={tempConfig.eventSubtitle}
                      onChange={(e) => setTempConfig({ ...tempConfig, eventSubtitle: e.target.value })}
                      placeholder="VD: Bắt trọn khoảnh khắc • Lưu giữ kỷ niệm"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DDD6C8] rounded-xl text-sm font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </>
              ) : null}

              {/* Event Theme Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Chủ Đề & Phong Cách
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(THEME_STYLES) as EventTheme[]).map((themeKey) => {
                    const style = THEME_STYLES[themeKey];
                    const isSelected = tempConfig.theme === themeKey;
                    const Icon = style.icon;

                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setTempConfig({ ...tempConfig, theme: themeKey })}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                            : 'bg-white text-neutral-700 border-[#DDD6C8] hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-amber-200' : 'text-neutral-600'}`} />
                        <span className="text-xs font-bold">{style.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Idle Timeout Setting */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Thời Gian Tự Động Quay Về Màn Hình Chờ
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '30s', val: 30 },
                    { label: '60s', val: 60 },
                    { label: '90s', val: 90 },
                    { label: 'Tắt', val: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTempConfig({ ...tempConfig, idleTimeoutSeconds: opt.val })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        tempConfig.idleTimeoutSeconds === opt.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-neutral-700 border-[#DDD6C8] hover:bg-neutral-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Chế Độ Chụp Tự Do (Free Capture Mode) */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between gap-3">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                      Chế Độ Chụp Tự Do
                    </h4>
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9.5px] font-extrabold uppercase rounded-full">
                      Tự Do
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-900/80 leading-snug">
                    Chạm màn hình chờ sẽ vào thẳng máy ảnh chụp ảnh tự do không giới hạn, sau khi chụp xong mới chọn bố cục & chọn ảnh trong tab chia sẻ.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tempConfig.captureMode === 'free'}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        captureMode: e.target.checked ? 'free' : 'photobooth',
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle Live Photos Social Proof */}
              <div className="pt-2 border-t border-[#E5DFD3] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Trình Chiếu Ảnh Vừa Chụp
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Hiển thị các ảnh kỷ niệm gần nhất.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.showRecentPhotos}
                  onChange={(e) => setTempConfig({ ...tempConfig, showRecentPhotos: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Privacy Consent Setting */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Chỉ Chiếu Ảnh Có Sự Đồng Ý
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Chỉ hiển thị ảnh nếu khách tích chọn "Đồng ý hiển thị" khi xuất ảnh.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.requireConsentForFeed}
                  onChange={(e) => setTempConfig({ ...tempConfig, requireConsentForFeed: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-neutral-100 border-t border-[#E5DFD3] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cấu Hình</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
