/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, CapturedPhoto, SlotPreviewMode, CaptureTriggerMode, EventConfig, StripLayout, FrameColor, FrameStyle } from './types';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { CameraScreen } from './components/CameraScreen';
import { GalleryScreen } from './components/GalleryScreen';
import { ShareScreen } from './components/ShareScreen';
import { LayoutSelectionScreen } from './components/LayoutSelectionScreen';
import { IdleScreen, DEFAULT_EVENT_CONFIG } from './components/IdleScreen';
import { AdminDashboardModal, AdminTab } from './components/AdminDashboardModal';
import { FullscreenToggleButton } from './components/FullscreenToggleButton';
import { SAMPLE_PHOTO_FRIENDS, SAMPLE_PHOTO_SOLO, SAMPLE_PHOTO_DUO, LAYOUT_OPTIONS, DEFAULT_CAMERA_CALIBRATION } from './constants/filters';
import { AnalyticsStats } from './types';
import { Clock } from 'lucide-react';
import { usePhoneCameraPairing } from './hooks/usePhoneCameraPairing';

const STORAGE_KEY = 'photobooth_photos_v1';
const EVENT_CONFIG_KEY = 'photobooth_event_config_v1';
const ANALYTICS_KEY = 'photobooth_analytics_v1';
const GALLERY_SESSION_KEY = 'photobooth_gallery_session_v1';

const DEFAULT_ANALYTICS: AnalyticsStats = {
  totalSessions: 18,
  totalPhotosCaptured: 42,
  totalStripsExported: 15,
  totalQrShares: 28,
  totalPrints: 12,
  popularLayouts: {
    'strip-3': 8,
    'strip-4': 5,
    'grid-4': 3,
    'single-col-3': 2,
  },
  popularFilters: {
    'korean-clean': 14,
    'warm-sunset': 9,
    'vintage-film': 7,
    'bw-classic': 6,
    'cinematic-teal': 4,
    'original': 2,
  },
  hourlyActivity: {
    '17': 2,
    '18': 5,
    '19': 8,
    '20': 3,
  },
  sessionHistory: [
    { id: 'sess_1', timestamp: Date.now() - 1000 * 60 * 30, photoCount: 3, layout: 'strip-3', filter: 'korean-clean' },
    { id: 'sess_2', timestamp: Date.now() - 1000 * 60 * 65, photoCount: 4, layout: 'strip-4', filter: 'warm-sunset' },
    { id: 'sess_3', timestamp: Date.now() - 1000 * 60 * 120, photoCount: 3, layout: 'strip-3', filter: 'vintage-film' },
  ],
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('idle');
  const [selectedLayout, setSelectedLayout] = useState<StripLayout>('strip-3');
  const [selectedFrameColor, setSelectedFrameColor] = useState<FrameColor>('white');
  const [selectedFrameStyle, setSelectedFrameStyle] = useState<FrameStyle>('classic');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<'single' | 'strip-3' | 'strip-4'>('strip-3');
  const [previewMode, setPreviewMode] = useState<SlotPreviewMode>('bottom-slots');
  const [captureTriggerMode, setCaptureTriggerMode] = useState<CaptureTriggerMode>('auto');
  const [shutterLabel, setShutterLabel] = useState<string>('CHỤP ẢNH');
  const [flashEnabled, setFlashEnabled] = useState<boolean>(true);
  const [gridVisible, setGridVisible] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(5);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  // Camera cụ thể được Admin chọn trong Cài Đặt > Camera & Thiết Bị (null = tự động theo cameraFacing)
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  // Ghép nối camera điện thoại qua Wifi (Cài Đặt > Camera & Thiết Bị > Ghép Camera Điện Thoại)
  const phoneCameraPairing = usePhoneCameraPairing();
  const [recordVideoEnabled, setRecordVideoEnabled] = useState<boolean>(true);
  const [recentSessionVideoUrl, setRecentSessionVideoUrl] = useState<string | null>(null);
  // Độ sáng camera (điều khiển qua 2 thanh trượt trong bảng "Tùy Chỉnh" ở logo, giao diện chụp ảnh)
  const [brightness, setBrightness] = useState<number>(100);

  // Cấu hình sự kiện & Màn hình chờ (Idle Screen)
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    try {
      const saved = localStorage.getItem(EVENT_CONFIG_KEY);
      if (saved) {
        // Ép kiểu Partial<EventConfig> ở đây: JSON.parse() trả về `any`, nếu không ép kiểu thì việc
        // spread nó vào object literal bên dưới sẽ làm TypeScript suy luận toàn bộ literal thành `any`,
        // khiến tsc không còn kiểm tra được các chỗ dùng eventConfig.* trong cả file này nữa.
        return { ...DEFAULT_EVENT_CONFIG, ...(JSON.parse(saved) as Partial<EventConfig>) };
      }
    } catch {
      // Storage access issue
    }
    return DEFAULT_EVENT_CONFIG;
  });

  // Admin Dashboard Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab | null>(null);

  // Thống kê sử dụng (Analytics)
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats>(() => {
    try {
      const saved = localStorage.getItem(ANALYTICS_KEY);
      if (saved) {
        return { ...DEFAULT_ANALYTICS, ...JSON.parse(saved) };
      }
    } catch {
      // Storage access issue
    }
    return DEFAULT_ANALYTICS;
  });

  // Lưu cấu hình sự kiện — đổi tiêu đề sự kiện (tên sự kiện / tên nhân vật chính) ở chế độ Sự Kiện
  // hoặc Chụp Tự Do coi như bắt đầu "sự kiện mới": tự động ẩn ảnh cũ khỏi Thư Viện (bảo mật). Riêng
  // Photobooth có mốc phiên riêng theo đồng hồ (xem handleStartCaptureFromLayout) nên bỏ qua ở đây.
  const handleUpdateEventConfig = (newConfig: EventConfig) => {
    const titleChanged =
      newConfig.eventName !== eventConfig.eventName ||
      newConfig.eventMainSubject !== eventConfig.eventMainSubject;
    if (titleChanged && (newConfig.captureMode === 'event' || newConfig.captureMode === 'free')) {
      handleHideGalleryNow();
    }
    setEventConfig(newConfig);
    try {
      localStorage.setItem(EVENT_CONFIG_KEY, JSON.stringify(newConfig));
    } catch {
      // Storage quota or iframe limit
    }
  };

  // Cập nhật thống kê & lưu
  const handleUpdateAnalytics = (updater: (prev: AnalyticsStats) => AnalyticsStats) => {
    setAnalyticsStats((prev) => {
      const updated = updater(prev);
      try {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(updated));
      } catch {
        // storage quota
      }
      return updated;
    });
  };

  // Reset Analytics
  const handleResetAnalytics = () => {
    const fresh: AnalyticsStats = {
      totalSessions: 0,
      totalPhotosCaptured: 0,
      totalStripsExported: 0,
      totalQrShares: 0,
      totalPrints: 0,
      popularLayouts: {},
      popularFilters: {},
      hourlyActivity: {},
      sessionHistory: [],
    };
    setAnalyticsStats(fresh);
    try {
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(fresh));
    } catch {}
  };

  // Xóa toàn bộ ảnh
  const handleResetAllPhotos = () => {
    setCapturedPhotos([]);
    setActivePhoto(null);
    setRecentSessionPhotos([]);
    setRecentSessionVideoUrl(null);
    setGallerySessionStartedAt(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GALLERY_SESSION_KEY);
    } catch {}
  };

  // Kiosk Lock Security Event Listeners (Chống khách bấm chuột phải, F12, Ctrl+U, v.v...)
  useEffect(() => {
    const isKioskLock = eventConfig.security?.enableKioskLock;
    if (!isKioskLock) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Chặn F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Esc nếu đang trong chế độ Kiosk Lock
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [eventConfig.security?.enableKioskLock]);

  const handleFlipCamera = () => {
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleToggleFlash = () => {
    setFlashEnabled((prev) => !prev);
  };

  const handleToggleGrid = () => {
    setGridVisible((prev) => !prev);
  };

  const handleToggleRecordVideo = () => {
    setRecordVideoEnabled((prev) => !prev);
  };

  // Initial photos seed
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // LocalStorage access issue
    }

    return [
      {
        id: 'photo_seed_1',
        dataUrl: SAMPLE_PHOTO_FRIENDS,
        timestamp: Date.now() - 3600000,
        filterId: 'bw',
        filterIntensity: 85,
        label: 'Studio Friends 1',
        publicConsent: true,
      },
      {
        id: 'photo_seed_2',
        dataUrl: SAMPLE_PHOTO_SOLO,
        timestamp: Date.now() - 7200000,
        filterId: 'vintage',
        filterIntensity: 75,
        label: 'Solo Portrait',
        publicConsent: true,
      },
      {
        id: 'photo_seed_3',
        dataUrl: SAMPLE_PHOTO_DUO,
        timestamp: Date.now() - 10800000,
        filterId: 'cine',
        filterIntensity: 70,
        label: 'Studio Duo',
        publicConsent: true,
      },
    ];
  });

  const [activePhoto, setActivePhoto] = useState<CapturedPhoto | null>(capturedPhotos[0] || null);
  const [recentSessionPhotos, setRecentSessionPhotos] = useState<CapturedPhoto[]>([capturedPhotos[0]]);

  // Mốc "phiên hiện tại" cho việc ẨN ẢNH CŨ khỏi Thư Viện (bảo mật cho khách trước) — ảnh chụp
  // TRƯỚC mốc này bị ẩn khỏi các màn khách thường thấy, nhưng KHÔNG bị xóa, vẫn còn nguyên trong bộ
  // nhớ máy và Admin luôn xem/khôi phục lại được qua mục "Lịch Sử Đầy Đủ". 0 = chưa từng ẩn gì.
  const [gallerySessionStartedAt, setGallerySessionStartedAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GALLERY_SESSION_KEY);
      if (saved) return Number(saved) || 0;
    } catch {
      // Storage access issue
    }
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem(GALLERY_SESSION_KEY, String(gallerySessionStartedAt));
    } catch {
      // Storage quota or iframe limit
    }
  }, [gallerySessionStartedAt]);

  // Ẩn toàn bộ ảnh cũ ngay lập tức — dùng cho: (a) nút thủ công trong Admin, (b) tự động khi bắt
  // đầu phiên Photobooth mới (xem handleStartCaptureFromLayout), (c) tự động khi đổi tiêu đề sự
  // kiện ở chế độ Sự Kiện/Chụp Tự Do (xem handleUpdateEventConfig).
  const handleHideGalleryNow = React.useCallback(() => {
    setGallerySessionStartedAt(Date.now());
  }, []);

  // Khôi phục lại 1 ảnh cũ cụ thể vào Thư Viện — dùng trong Admin, mục Lịch Sử Đầy Đủ.
  const handleRestorePhoto = React.useCallback((id: string) => {
    setCapturedPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, forceVisible: true } : p)));
  }, []);

  // Danh sách ảnh mà khách thường (Thư Viện, Chia Sẻ) được phép thấy — lọc bớt ảnh cũ theo mốc
  // phiên ở trên. Admin vẫn dùng `capturedPhotos` gốc (đầy đủ, không lọc) cho mục Lịch Sử Đầy Đủ.
  const visibleCapturedPhotos = React.useMemo(
    () => capturedPhotos.filter((p) => p.forceVisible || p.timestamp >= gallerySessionStartedAt),
    [capturedPhotos, gallerySessionStartedAt]
  );
  const [currentFilterId, setCurrentFilterId] = useState<string>('original');
  const [currentFilterIntensity, setCurrentFilterIntensity] = useState<number>(0);

  // ==========================================
  // CƠ CHẾ "SELF-HEALING" TỰ ĐỘNG QUAY VỀ MÀN HÌNH CHỜ (IDLE TIMEOUT)
  // ==========================================
  const lastActivityTimeRef = useRef<number>(Date.now());
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);

  // Cập nhật mốc hoạt động mới nhất
  const resetActivity = React.useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setIdleWarningSeconds(null);
  }, []);

  // Lắng nghe sự kiện tương tác của người dùng toàn màn hình
  useEffect(() => {
    const handleUserInteraction = () => {
      resetActivity();
    };

    window.addEventListener('mousedown', handleUserInteraction, { passive: true });
    window.addEventListener('mousemove', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleUserInteraction);
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
    };
  }, [resetActivity]);

  // Bộ đếm kiểm tra Idle Timeout định kỳ mỗi 1 giây
  useEffect(() => {
    if (currentScreen === 'idle' || eventConfig.idleTimeoutSeconds <= 0) {
      setIdleWarningSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);
      const remaining = eventConfig.idleTimeoutSeconds - elapsed;

      if (remaining <= 0) {
        // Hết thời gian chờ: Tự động reset phiên và quay về màn hình chờ
        setCurrentScreen('idle');
        setIdleWarningSeconds(null);
        setRecentSessionVideoUrl(null);
      } else if (remaining <= 10) {
        // Cảnh báo 10 giây cuối để người dùng có thể chạm tiếp tục
        setIdleWarningSeconds(remaining);
      } else {
        setIdleWarningSeconds(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScreen, eventConfig.idleTimeoutSeconds]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capturedPhotos));
    } catch {
      // Storage quota or iframe limit
    }
  }, [capturedPhotos]);

  // Handle Photo Captured during camera session
  const handlePhotoCaptured = React.useCallback((newPhoto: CapturedPhoto, isPartOfBurst = false) => {
    resetActivity();
    setCapturedPhotos((prev) => [newPhoto, ...prev]);
    setActivePhoto(newPhoto);

    if (!isPartOfBurst) {
      setRecentSessionPhotos([newPhoto]);
    }
  }, [resetActivity]);

  // Handle Complete Session (e.g. 3-shot or 4-shot burst finished, with optional BTS video)
  const handleSessionComplete = React.useCallback((sessionPhotos: CapturedPhoto[], videoUrl?: string | null) => {
    resetActivity();
    setRecentSessionPhotos(sessionPhotos);
    setRecentSessionVideoUrl(videoUrl || null);
    if (sessionPhotos.length > 0) {
      setActivePhoto(sessionPhotos[0]);
    }
  }, [resetActivity]);

  // Select filter from carousel
  const handleSelectFilter = React.useCallback((filterId: string, defaultIntensity?: number) => {
    resetActivity();
    setCurrentFilterId(filterId);
    if (defaultIntensity !== undefined) {
      setCurrentFilterIntensity(defaultIntensity);
    }
  }, [resetActivity]);

  // Update Photo Filter
  const handleUpdatePhotoFilter = React.useCallback((photoId: string, filterId: string, intensity: number) => {
    resetActivity();
    setCurrentFilterId(filterId);
    setCurrentFilterIntensity(intensity);

    setCapturedPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, filterId, filterIntensity: intensity } : p))
    );

    setRecentSessionPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, filterId, filterIntensity: intensity } : p))
    );

    setActivePhoto((prev) => (prev && prev.id === photoId ? { ...prev, filterId, filterIntensity: intensity } : prev));
  }, [resetActivity]);

  // Apply Filter to all recent photos
  const handleApplyFilterToAll = React.useCallback((filterId: string, intensity: number) => {
    resetActivity();
    setCurrentFilterId(filterId);
    setCurrentFilterIntensity(intensity);

    setCapturedPhotos((prev) =>
      prev.map((p) => ({ ...p, filterId, filterIntensity: intensity }))
    );

    setRecentSessionPhotos((prev) =>
      prev.map((p) => ({ ...p, filterId, filterIntensity: intensity }))
    );
  }, [resetActivity]);

  // Cập nhật quyền riêng tư hiển thị ảnh trên màn hình chờ
  const handleUpdateConsent = React.useCallback((photoIds: string[], consent: boolean) => {
    resetActivity();
    setCapturedPhotos((prev) =>
      prev.map((p) => (photoIds.includes(p.id) ? { ...p, publicConsent: consent } : p))
    );
  }, [resetActivity]);

  // Delete photo from library
  const handleDeletePhoto = React.useCallback((id: string) => {
    resetActivity();
    setCapturedPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      setActivePhoto((current) => (current?.id === id ? remaining[0] || null : current));
      return remaining;
    });
    setRecentSessionPhotos((prev) => prev.filter((p) => p.id !== id));
  }, [resetActivity]);

  // Reset sample photos
  const handleResetSamples = React.useCallback(() => {
    const fresh: CapturedPhoto[] = [
      {
        id: 'photo_seed_1',
        dataUrl: SAMPLE_PHOTO_FRIENDS,
        timestamp: Date.now(),
        filterId: 'bw',
        filterIntensity: 85,
        label: 'Studio Friends 1',
        publicConsent: true,
      },
      {
        id: 'photo_seed_2',
        dataUrl: SAMPLE_PHOTO_SOLO,
        timestamp: Date.now(),
        filterId: 'vintage',
        filterIntensity: 75,
        label: 'Solo Portrait',
        publicConsent: true,
      },
      {
        id: 'photo_seed_3',
        dataUrl: SAMPLE_PHOTO_DUO,
        timestamp: Date.now(),
        filterId: 'cine',
        filterIntensity: 70,
        label: 'Studio Duo',
        publicConsent: true,
      },
    ];
    setCapturedPhotos(fresh);
    setRecentSessionPhotos(fresh);
    setActivePhoto(fresh[0]);
  }, []);

  const shutterTriggerRef = React.useRef<(() => void) | null>(null);

  const handleRegisterShutter = React.useCallback((triggerFn: () => void) => {
    shutterTriggerRef.current = triggerFn;
  }, []);

  const handleTriggerShutter = React.useCallback(() => {
    resetActivity();
    if (currentScreen === 'camera' && shutterTriggerRef.current) {
      shutterTriggerRef.current();
    }
  }, [currentScreen, resetActivity]);

  // Trigger "In Nhanh" (Chế Độ Sự Kiện) — đăng ký từ CameraScreen, kích hoạt từ nút góc trên phải
  // trong TopAppBar (qua logo), theo đúng mẫu đã dùng cho nút chụp nổi ở BottomNavBar.
  const quickPrintTriggerRef = React.useRef<(() => void) | null>(null);

  const handleRegisterQuickPrint = React.useCallback((triggerFn: () => void) => {
    quickPrintTriggerRef.current = triggerFn;
  }, []);

  const handleTriggerQuickPrint = React.useCallback(() => {
    resetActivity();
    if (currentScreen === 'camera' && quickPrintTriggerRef.current) {
      quickPrintTriggerRef.current();
    }
  }, [currentScreen, resetActivity]);

  // Số ảnh đang có ở khung xem trước hiện tại (CameraScreen báo ra) — dùng để bật/tắt nút In Nhanh
  const [burstPhotoCountInProgress, setBurstPhotoCountInProgress] = useState<number>(0);

  // Trigger "In" ở giao diện Thư Viện (góc trên phải, đối xứng nút Chụp Ảnh bên trái) — đăng ký từ
  // GalleryScreen, theo đúng mẫu shutter/In Nhanh.
  const galleryPrintTriggerRef = React.useRef<(() => void) | null>(null);

  const handleRegisterGalleryPrint = React.useCallback((triggerFn: () => void) => {
    galleryPrintTriggerRef.current = triggerFn;
  }, []);

  const handleTriggerGalleryPrint = React.useCallback(() => {
    resetActivity();
    if (currentScreen === 'gallery' && galleryPrintTriggerRef.current) {
      galleryPrintTriggerRef.current();
    }
  }, [currentScreen, resetActivity]);

  // Đã gán đủ ô hậu kỳ ở Thư Viện chưa (GalleryScreen báo ra) — dùng để bật/tắt nút "In"
  const [galleryIsComplete, setGalleryIsComplete] = useState<boolean>(false);

  // Chế độ Biên Tập / Xuất Bản của màn Chia Sẻ — nâng lên đây vì cả TopAppBar (hiển thị + điều
  // khiển nút chuyển đổi góc trên phải) lẫn ShareScreen (đọc để hiển thị đúng nội dung) đều cần.
  const [shareActiveMode, setShareActiveMode] = useState<'edit' | 'export'>('edit');
  // Mỗi lần vào lại màn Chia Sẻ (dù từ In Nhanh hay từ nút "In" ở Thư Viện) đều bắt đầu ở Biên Tập.
  useEffect(() => {
    if (currentScreen === 'share') {
      setShareActiveMode('edit');
    }
  }, [currentScreen]);

  // ==========================================
  // ĐỒNG HỒ ĐẾM NGƯỢC PHIÊN THUÊ MÁY (CHẾ ĐỘ PHOTOBOOTH / MUA GIỜ)
  // ==========================================
  const photoboothSessionStartRef = React.useRef<number | null>(null);
  const [photoboothRemainingSeconds, setPhotoboothRemainingSeconds] = useState<number | null>(null);

  // Khi quay về màn hình chờ (do khách chụp xong, hết giờ, hay Idle Timeout) thì luôn hủy phiên đếm giờ.
  useEffect(() => {
    if (currentScreen === 'idle') {
      photoboothSessionStartRef.current = null;
      setPhotoboothRemainingSeconds(null);
    }
  }, [currentScreen]);

  // Bộ đếm đồng hồ phiên: 1 interval chạy suốt vòng đời app, chỉ thực sự đếm khi có phiên Photobooth
  // đang mở (photoboothSessionStartRef khác null); hết giờ thì tự quay về màn chờ.
  useEffect(() => {
    const interval = setInterval(() => {
      if (photoboothSessionStartRef.current === null) return;
      const duration = eventConfig.photoboothSessionDurationSeconds ?? 300;
      const elapsed = Math.floor((Date.now() - photoboothSessionStartRef.current) / 1000);
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        photoboothSessionStartRef.current = null;
        setPhotoboothRemainingSeconds(null);
        setCurrentScreen('idle');
      } else {
        setPhotoboothRemainingSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [eventConfig.photoboothSessionDurationSeconds]);

  // Bắt đầu phiên chụp từ Màn hình chờ, theo 1 trong 3 chế độ chụp:
  // - 'free' (Chụp Tự Do): Vào thẳng máy ảnh, tự do chụp không giới hạn, sau đó qua Thư Viện tự chọn ảnh.
  // - 'event' / 'photobooth': Vào màn hình Chọn Bố Cục trước như thường lệ.
  //   Riêng 'photobooth' (Mua Giờ) chỉ thực sự khởi động đồng hồ đếm ngược khi khách bấm nút tròn
  //   "Bắt Đầu" ở màn Chọn Bố Cục (xem handleStartCaptureFromLayout), không phải ngay khi rời màn chờ.
  const handleStartFromIdle = () => {
    resetActivity();
    if (eventConfig.captureMode === 'free') {
      setCurrentScreen('camera');
    } else {
      setCurrentScreen('layout');
    }
  };

  // Bắt đầu chụp ảnh sau khi chọn bố cục — đây cũng là mốc "phiên mới" cho chế độ Photobooth: vừa
  // khởi động đồng hồ đếm ngược thời lượng thuê máy, vừa đặt lại mốc ẩn ảnh (khách mới không thấy
  // ảnh của khách trước nữa), theo đúng lúc khách thực sự bấm bắt đầu chứ không phải lúc rời màn chờ.
  const handleStartCaptureFromLayout = (layoutId: StripLayout) => {
    resetActivity();
    setSelectedLayout(layoutId);
    const layoutConfig = LAYOUT_OPTIONS.find((l) => l.id === layoutId);
    if (layoutConfig) {
      if (layoutConfig.photoCount === 1) {
        setSessionMode('single');
      } else if (layoutConfig.photoCount === 3) {
        setSessionMode('strip-3');
      } else {
        setSessionMode('strip-4');
      }
    }
    if (eventConfig.captureMode === 'photobooth') {
      photoboothSessionStartRef.current = Date.now();
      setPhotoboothRemainingSeconds(eventConfig.photoboothSessionDurationSeconds ?? 300);
      handleHideGalleryNow();
    }
    setCurrentScreen('camera');
  };

  // Điều hướng thông minh
  const handleNavigate = (screen: AppScreen) => {
    resetActivity();
    if (screen === 'filters') {
      setCurrentScreen('camera');
    } else {
      setCurrentScreen(screen);
    }
  };

  // Gán 1 lượt chụp (nhóm ảnh) từ Thư Viện làm nguồn cho màn Chia Sẻ, để khách có thể
  // quay lại ghép dải ảnh từ 1 lượt chụp cũ hơn thay vì chỉ lượt gần nhất.
  const handleUseSessionForShare = React.useCallback((photos: CapturedPhoto[]) => {
    resetActivity();
    setRecentSessionPhotos(photos);
    setRecentSessionVideoUrl(null);
  }, [resetActivity]);

  // Đồng bộ sessionMode khi chọn bố cục
  const handleSelectLayout = (layoutId: StripLayout) => {
    setSelectedLayout(layoutId);
    const layoutConfig = LAYOUT_OPTIONS.find((l) => l.id === layoutId);
    if (layoutConfig) {
      if (layoutConfig.photoCount === 1) {
        setSessionMode('single');
      } else if (layoutConfig.photoCount === 3) {
        setSessionMode('strip-3');
      } else {
        setSessionMode('strip-4');
      }
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-[#F9F7F2] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#1A1A1A] selection:text-white select-none">
      {/* MÀN HÌNH CHỜ (IDLE / ATTRACT SCREEN) */}
      {currentScreen === 'idle' && (
        <IdleScreen
          onStartSession={handleStartFromIdle}
          eventConfig={eventConfig}
          onUpdateEventConfig={handleUpdateEventConfig}
          recentPhotos={capturedPhotos}
          soundEnabled={soundEnabled}
          onOpenAdminDashboard={() => {
            setAdminInitialTab(null);
            setIsAdminModalOpen(true);
          }}
        />
      )}

      {/* Top Application Bar (Chỉ hiển thị khi đang trong luồng sử dụng) */}
      {currentScreen !== 'idle' && (
        <TopAppBar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          recordVideoEnabled={recordVideoEnabled}
          onToggleRecordVideo={handleToggleRecordVideo}
          onResetSamples={handleResetSamples}
          isLiveStream={isLiveStream}
          onToggleLiveStream={() => setIsLiveStream(!isLiveStream)}
          capturedPhotos={visibleCapturedPhotos}
          flashEnabled={flashEnabled}
          onToggleFlash={handleToggleFlash}
          gridVisible={gridVisible}
          onToggleGrid={handleToggleGrid}
          timerSeconds={timerSeconds}
          onSetTimerSeconds={setTimerSeconds}
          sessionMode={sessionMode}
          onSetSessionMode={setSessionMode}
          previewMode={previewMode}
          onSetPreviewMode={setPreviewMode}
          captureTriggerMode={captureTriggerMode}
          onSetCaptureTriggerMode={setCaptureTriggerMode}
          onFlipCamera={handleFlipCamera}
          currentFilterId={currentFilterId}
          currentFilterIntensity={currentFilterIntensity}
          onSelectFilter={handleSelectFilter}
          onChangeIntensity={setCurrentFilterIntensity}
          brightness={brightness}
          onChangeBrightness={setBrightness}
          captureMode={eventConfig.captureMode}
          burstPhotoCount={burstPhotoCountInProgress}
          onTriggerQuickPrint={handleTriggerQuickPrint}
          photoboothRemainingSeconds={photoboothRemainingSeconds}
          onTriggerGalleryPrint={handleTriggerGalleryPrint}
          galleryPrintReady={galleryIsComplete}
          shareActiveMode={shareActiveMode}
          onSetShareActiveMode={setShareActiveMode}
          onOpenAdminDashboard={() => {
            setAdminInitialTab(null);
            setIsAdminModalOpen(true);
          }}
        />
      )}

      {/* Main View Area */}
      {currentScreen !== 'idle' && (
        <main className="flex-1 w-full h-full overflow-hidden relative">
          {/* MÀN HÌNH CHỌN BỐ CỤC (LAYOUT SELECTION) */}
          {currentScreen === 'layout' && (
            <div className="w-full h-full overflow-hidden">
              <LayoutSelectionScreen
                onNavigate={handleNavigate}
                selectedLayout={selectedLayout}
                onSelectLayout={setSelectedLayout}
                onStartCapture={handleStartCaptureFromLayout}
                eventConfig={eventConfig}
                soundEnabled={soundEnabled}
              />
            </div>
          )}

          {(currentScreen === 'camera' || currentScreen === 'filters') && (
            <div className="w-full h-full overflow-hidden">
              <CameraScreen
                onNavigate={handleNavigate}
                onPhotoCaptured={handlePhotoCaptured}
                onSessionComplete={handleSessionComplete}
                soundEnabled={soundEnabled}
                recordVideoEnabled={recordVideoEnabled}
                isLiveStream={isLiveStream}
                onToggleLiveStream={() => setIsLiveStream(!isLiveStream)}
                sessionMode={sessionMode}
                selectedLayout={selectedLayout}
                onSelectLayout={handleSelectLayout}
                onSetSessionMode={setSessionMode}
                selectedFrameColor={selectedFrameColor}
                onSelectFrameColor={setSelectedFrameColor}
                selectedFrameStyle={selectedFrameStyle}
                onSelectFrameStyle={setSelectedFrameStyle}
                previewMode={previewMode}
                onSetPreviewMode={setPreviewMode}
                captureTriggerMode={captureTriggerMode}
                onSetCaptureTriggerMode={setCaptureTriggerMode}
                flashEnabled={flashEnabled}
                onToggleFlash={handleToggleFlash}
                gridVisible={gridVisible}
                onToggleGrid={handleToggleGrid}
                timerSeconds={timerSeconds}
                onSetTimerSeconds={setTimerSeconds}
                cameraFacing={cameraFacing}
                onFlipCamera={handleFlipCamera}
                selectedCameraId={selectedCameraId}
                externalStream={phoneCameraPairing.remoteStream}
                onRegisterShutterTrigger={handleRegisterShutter}
                onUpdateShutterLabel={setShutterLabel}
                currentFilterId={currentFilterId}
                currentFilterIntensity={currentFilterIntensity}
                onSelectFilter={handleSelectFilter}
                onChangeIntensity={setCurrentFilterIntensity}
                brightness={brightness}
                onChangeBrightness={setBrightness}
                isFreeCapture={eventConfig.captureMode === 'free'}
                captureMode={eventConfig.captureMode}
                onRegisterQuickPrintTrigger={handleRegisterQuickPrint}
                onUpdateBurstPhotoCount={setBurstPhotoCountInProgress}
                cameraCalibration={eventConfig.cameraCalibration ?? DEFAULT_CAMERA_CALIBRATION}
              />
            </div>
          )}

          {currentScreen === 'gallery' && (
            <div className="w-full h-full pt-14 sm:pt-16 pb-6 sm:pb-8 overflow-y-auto overflow-x-hidden overscroll-contain">
              <GalleryScreen
                onNavigate={handleNavigate}
                capturedPhotos={visibleCapturedPhotos}
                onDeletePhoto={handleDeletePhoto}
                selectedLayout={selectedLayout}
                onConfirmSelection={handleUseSessionForShare}
                onRegisterPrintTrigger={handleRegisterGalleryPrint}
                onUpdateCompletionStatus={setGalleryIsComplete}
                captureMode={eventConfig.captureMode}
                onSelectLayout={handleSelectLayout}
              />
            </div>
          )}

          {currentScreen === 'share' && (
            <div className="w-full h-full pt-14 sm:pt-16 overflow-hidden">
              <ShareScreen
                onNavigate={handleNavigate}
                capturedPhotos={recentSessionPhotos.length > 0 ? recentSessionPhotos : visibleCapturedPhotos}
                allLibraryPhotos={visibleCapturedPhotos}
                currentFilterId={currentFilterId}
                currentFilterIntensity={currentFilterIntensity}
                initialLayout={selectedLayout}
                onLayoutChange={setSelectedLayout}
                eventConfig={eventConfig}
                sessionVideoUrl={recentSessionVideoUrl}
                onUpdatePhotoFilter={handleUpdatePhotoFilter}
                onApplyFilterToAll={handleApplyFilterToAll}
                onUpdateConsent={handleUpdateConsent}
                activeMode={shareActiveMode}
                onSetActiveMode={setShareActiveMode}
              />
            </div>
          )}

          {/* Self-Healing Countdown Toast Bar (Khi chuẩn bị quay về màn hình chờ) */}
          {idleWarningSeconds !== null && (
            <div
              id="idle-warning-toast"
              onClick={resetActivity}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-black/90 text-white backdrop-blur-md border border-amber-400/60 shadow-2xl flex items-center gap-3 animate-bounce cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-medium">
                Không có thao tác. Tự động về màn hình chờ sau{' '}
                <strong className="text-amber-300 font-bold text-sm">{idleWarningSeconds}s</strong>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetActivity();
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[10.5px] font-bold uppercase tracking-wider rounded-full shadow-xs transition-colors"
              >
                Tiếp Tục
              </button>
            </div>
          )}
        </main>
      )}

      {/* Bottom Navigation Dock - Hidden on idle, layout selection, share, and gallery screens
          (Thư Viện không cần nút chụp tròn nữa — nút "In" đã chuyển lên góc trên phải) */}
      {currentScreen !== 'idle' && currentScreen !== 'share' && currentScreen !== 'layout' && currentScreen !== 'gallery' && (
        <BottomNavBar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onTriggerShutter={handleTriggerShutter}
          shutterLabel={shutterLabel}
        />
      )}

      {/* BẢNG ĐIỀU KHIỂN TẬP TRUNG QUẢN TRỊ VIÊN & KIOSK (ADMIN DASHBOARD MODAL) */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        initialTab={adminInitialTab}
        eventConfig={eventConfig}
        onUpdateEventConfig={handleUpdateEventConfig}
        capturedPhotos={capturedPhotos}
        onResetPhotos={handleResetAllPhotos}
        gallerySessionStartedAt={gallerySessionStartedAt}
        onHideGalleryNow={handleHideGalleryNow}
        onRestorePhoto={handleRestorePhoto}
        analyticsStats={analyticsStats}
        onResetAnalytics={handleResetAnalytics}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        flashEnabled={flashEnabled}
        onToggleFlash={handleToggleFlash}
        gridVisible={gridVisible}
        onToggleGrid={handleToggleGrid}
        recordVideoEnabled={recordVideoEnabled}
        onToggleRecordVideo={handleToggleRecordVideo}
        previewMode={previewMode}
        onSetPreviewMode={setPreviewMode}
        selectedCameraId={selectedCameraId}
        onSelectCameraId={setSelectedCameraId}
        phonePairingStatus={phoneCameraPairing.status}
        phonePairingCode={phoneCameraPairing.pairingCode}
        phonePairingError={phoneCameraPairing.errorMessage}
        phonePairingDeviceLabel={phoneCameraPairing.connectedDeviceLabel}
        onStartPhonePairing={phoneCameraPairing.startPairing}
        onStopPhonePairing={phoneCameraPairing.stopPairing}
      />

      {/* NÚT TOÀN MÀN HÌNH — nổi ở mọi màn hình, xem chi tiết trong FullscreenToggleButton.tsx.
          Đặt sau AdminDashboardModal trong cây JSX nhưng z-index thấp hơn (z-40 so với z-50 của
          modal) nên khi bảng Admin đang mở, nút này tự bị che đi, không lấn giao diện PIN. */}
      <FullscreenToggleButton visible={eventConfig.security?.enableFullScreenKiosk ?? true} />
    </div>
  );
}

