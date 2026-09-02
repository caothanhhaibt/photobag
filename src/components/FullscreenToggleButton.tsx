import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';

// Nút nổi "Toàn Màn Hình" — hiện ở MỌI màn hình (kể cả Màn Hình Chờ) để nhân viên bấm 1 lần lúc mở
// máy là màn hình phóng to hết cỡ, ẩn cả thanh địa chỉ trình duyệt lẫn thanh tác vụ Windows/Android,
// phục vụ nhu cầu chạy như 1 kiosk (kiểu app karaoke), không còn dấu vết đang mở trong trình duyệt.
//
// Tự ẩn đi trên iPad/iPhone (Safari) vì trình duyệt đó không hỗ trợ toàn màn hình cho cả trang web —
// trên iPad cần dùng "Thêm Vào Màn Hình Chính" thay thế (xem hướng dẫn đi kèm khi giao file).
interface FullscreenToggleButtonProps {
  // Công tắc từ Admin → Bảo Mật & Mã PIN ("Hiện Nút Toàn Màn Hình Cho Khách"). Mặc định true (chưa
  // từng vào Admin chỉnh thì undefined cũng coi như true) — Admin tắt đi là nút biến mất khỏi màn
  // hình khách, không liên quan gì tới việc trình duyệt có hỗ trợ toàn màn hình hay không.
  visible?: boolean;
}

export const FullscreenToggleButton: React.FC<FullscreenToggleButtonProps> = ({ visible = true }) => {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  if (!isSupported || !visible) return null;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình (ẩn thanh trình duyệt)'}
      aria-label={isFullscreen ? 'Thoát Toàn Màn Hình' : 'Bật Toàn Màn Hình'}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/35 hover:bg-black/60 active:scale-90 backdrop-blur-md border border-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      ) : (
        <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      )}
    </button>
  );
};
