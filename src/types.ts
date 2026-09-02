export type AppScreen = 'idle' | 'layout' | 'camera' | 'filters' | 'gallery' | 'share';

export type EventTheme = 'wedding' | 'birthday' | 'corporate' | 'neon' | 'korean' | 'vintage';

// 3 chế độ vận hành máy — chỉ được bật đúng 1 chế độ tại một thời điểm, độc lập hoàn toàn với
// công tắc "chế độ tiêu đề sự kiện" (enableEventTitleMode) vì đó chỉ là hiệu ứng hiển thị màn hình chờ.
// - 'event': Chế Độ Sự Kiện — khách đông, mỗi nhóm chụp 1 lượt, có nút "In Nhanh" lấy thẳng ảnh
//   ở khung xem trước vào hậu kỳ, bỏ qua bước chọn ảnh ở Thư Viện.
// - 'photobooth': Photobooth / Mua Giờ — chế độ mặc định, khách thuê máy theo phiên có giới hạn
//   thời gian (cấu hình ở photoboothSessionDurationSeconds), hiện đồng hồ đếm ngược.
// - 'free': Chụp Tự Do — dành cho test hoặc khách thuê máy thời lượng lớn, không giới hạn.
export type CaptureMode = 'event' | 'photobooth' | 'free';

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
  // Hiện/ẩn nút nổi "Toàn Màn Hình" cho khách thấy ở mọi màn hình (mặc định BẬT — undefined cũng
  // coi như true, xem FullscreenToggleButton.tsx). Tắt đi thì nút biến mất khỏi giao diện khách,
  // nhân viên vẫn bật lại được bất cứ lúc nào ngay tại đây.
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
  captureMode: CaptureMode; // 3 chế độ chụp (xem định nghĩa CaptureMode) — mặc định 'photobooth'
  photoboothSessionDurationSeconds?: number; // Thời lượng 1 phiên thuê máy cho chế độ 'photobooth' (giây), mặc định 300 (5 phút)
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
  // Ảnh cũ (chụp trước mốc "phiên hiện tại") mặc định bị ẩn khỏi Thư Viện để bảo mật cho khách
  // trước — nhưng nếu Admin chọn "Khôi Phục" trong mục Lịch Sử Đầy Đủ thì ảnh này luôn hiện lại,
  // bất kể mốc phiên là gì.
  forceVisible?: boolean;
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

// Một sticker (nhãn dán) được khách kéo thả lên tờ ảnh xem trước — vị trí/cỡ/góc xoay lưu theo
// TỈ LỆ PHẦN TRĂM (0-100) so với khung xem trước, để vẽ đúng lại vào canvas in 300 DPI dù kích
// thước hiển thị trên màn hình và trên canvas xuất ra khác nhau.
export interface PlacedSticker {
  id: string;
  emoji: string;
  xPercent: number; // Tâm sticker, 0-100 theo chiều ngang khung xem trước
  yPercent: number; // Tâm sticker, 0-100 theo chiều dọc khung xem trước
  scale: number; // 1 = cỡ mặc định
  rotation: number; // độ, 0-360
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
