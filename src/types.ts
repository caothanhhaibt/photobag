export type AppScreen = 'idle' | 'layout' | 'camera' | 'filters' | 'gallery' | 'share';

export type EventTheme = 'wedding' | 'birthday' | 'corporate' | 'neon' | 'korean' | 'vintage';

export interface AnalyticsStats {
  totalSessions: number;
  totalPhotosCaptured: number;
  totalStripsExported: number;
  totalQrShares: number;
  totalPrints: number;
  popularLayouts: Record<string, number>;
  popularFilters: Record<string, number>;
  hourlyActivity: Record<string, number>; // "19": 5, "20": 12
  sessionHistory: {
    id: string;
    timestamp: number;
    photoCount: number;
    layout?: string;
    filter?: string;
  }[];
}

export interface KioskSecurityConfig {
  adminPin: string; // Default: '1234'
  enableKioskLock: boolean; // Vô hiệu hóa chuột phải, phím F12, phím Esc
  enableFullScreenKiosk: boolean;
  hideAdminGearButton: boolean; // Ẩn nút cài đặt trên màn hình (mở bằng chạm 3 lần logo)
  autoResetAfterShareSeconds: number; // Tự động về màn hình chờ sau khi in/chia sẻ (VD: 30s)
}

// Nơi lưu ảnh/video trên đám mây (Cloudflare R2, qua 1 Worker trung gian) để mã QR ở màn Chia Sẻ
// trỏ tới đúng link tải ảnh thật của khách — mỗi máy/mỗi chủ cửa hàng có thể tự nhập tài khoản
// lưu trữ riêng của mình (đổi được bất cứ lúc nào, ví dụ khi tài khoản cũ đầy dung lượng, hoặc khi
// bán đứt app cho chủ cửa hàng khác tự vận hành độc lập).
export interface CloudStorageConfig {
  workerUrl?: string; // Địa chỉ Cloudflare Worker nhận & lưu ảnh, vd: https://ten-worker.ten-tai-khoan.workers.dev
  uploadToken?: string; // Mã bí mật xác thực với Worker (phải khớp với UPLOAD_TOKEN đã đặt trên Worker)
}

export interface EventConfig {
  eventName: string;
  eventCategory?: string; // Loại sự kiện (VD: HAPPY WEDDING, HAPPY BIRTHDAY)
  eventMainSubject?: string; // Tên nhân vật chính (VD: MINH & TRANG)
  eventTagline?: string; // Dòng chữ nghệ thuật phía trên (VD: Save the Date • 29/08/2026)
  eventSubtitle: string;
  eventDate: string;
  eventLogoUrl?: string; // Ảnh nhân vật / Logo sự kiện / Logo công ty
  theme: EventTheme;
  showRecentPhotos: boolean;
  idleTimeoutSeconds: number; // 0 = disabled, 30, 45, 60, 90, 120
  customInstructions: string;
  requireConsentForFeed: boolean;
  enableEventTitleMode: boolean; // Bật chế độ tiêu đề sự kiện (luân phiên Logo <-> Tiêu đề)
  titleAlternateIntervalSeconds: number; // Mặc định 60 giây
  titleSize?: 'sm' | 'md' | 'lg' | 'xl'; // Kích thước chữ tiêu đề: Nhỏ (sm), Vừa (md), Lớn (lg), Cực Đại (xl)
  showLogoBorder?: boolean; // Bật / Tắt khung viền bao quanh ảnh (mặc định bật)
  enableFreeCaptureMode?: boolean; // Bật chế độ chụp tự do (chụp thoải mái, sau đó mới chọn bố cục & chọn ảnh trong tab chia sẻ)
  security?: KioskSecurityConfig;
  cloudStorage?: CloudStorageConfig;
}

export interface FilterPreset {
  id: string;
  name: string;
  thumbnail: string;
  filterCss: (intensity: number) => string;
  overlayColor?: string;
  blendMode?: string;
  description: string;
  defaultIntensity: number;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  filterId: string;
  filterIntensity: number;
  width?: number;
  height?: number;
  label?: string;
  publicConsent?: boolean;
}

export type StripLayout =
  | 'double-2-vert'
  | 'double-3-vert'
  | 'double-4-vert'
  | 'double-2-horiz'
  | 'double-3-horiz'
  | 'double-4-horiz'
  | 'single-col-2'
  | 'single-col-3'
  | 'single-col-4'
  | 'single-2'
  | 'single-1'
  | 'layout-f'
  | 'layout-g'
  | 'layout-h'
  | 'layout-i'
  | 'layout-j'
  | 'layout-k'
  | 'layout-m'
  | 'featured-1-2'
  | 'strip-3'
  | 'strip-4'
  | 'grid-4'
  | 'single-polaroid';

export interface SlotCustomization {
  photoId: string;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  filterId?: string;
  filterIntensity?: number;
}

export type FrameStyle =
  | 'classic'
  | 'instagram'
  | 'magazine'
  | 'onepiece-wanted'
  | 'cinema-film'
  | 'movie-ticket'
  | 'polaroid'
  | 'vinyl-cd'
  | 'nutrition-label'
  | 'scrapbook'
  | 'concert-ticket'
  | 'vinyl-foldcard'
  | 'branded-foldcard'
  | 'train-ticket';

export type SlotPreviewMode = 'none' | 'bottom-slots' | 'paper-strip';

export type CaptureTriggerMode = 'auto' | 'manual';

export type FrameColor = 'white' | 'cream' | 'charcoal' | 'black' | 'pastel-pink' | 'slate';

export interface CapturedSession {
  photos: CapturedPhoto[];
  videoUrl?: string | null;
  timestamp: number;
}

export interface PhotoStrip {
  id: string;
  photoIds: string[];
  layout: StripLayout;
  frameColor: FrameColor;
  frameStyle?: FrameStyle;
  customTitle: string;
  subtitle?: string;
  dateStr: string;
  createdAt: number;
  filterId?: string;
  filterIntensity?: number;
}

export interface CameraState {
  timerSeconds: 0 | 3 | 5 | 10;
  gridVisible: boolean;
  flashEnabled: boolean;
  soundEnabled: boolean;
  facingMode: 'user' | 'environment';
  mode: 'single' | 'strip-3' | 'strip-4';
  isLiveStream: boolean;
}
