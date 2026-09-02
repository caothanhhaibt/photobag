import { useCallback, useEffect, useState } from 'react';

// Kiểu mở rộng tối thiểu cho các tiền tố trình duyệt cũ (Safari desktop dùng "webkit") — không có
// trong kiểu DOM chuẩn của TypeScript nên phải khai báo tay các hàm/thuộc tính này.
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

// Hook dùng chung cho nút "Toàn Màn Hình" — bật/tắt chế độ toàn màn hình thật của trình duyệt (ẩn cả
// thanh địa chỉ lẫn thanh tác vụ Windows/Android), phục vụ yêu cầu app chạy như 1 kiosk, không còn
// dấu vết đang mở trong trình duyệt.
//
// Lưu ý quan trọng: Safari trên iPad/iPhone KHÔNG hỗ trợ Fullscreen API cho phần tử tùy ý (chỉ hỗ trợ
// toàn màn hình cho thẻ <video>), nên `isSupported` sẽ trả về false trên iOS — nơi gọi hook này cần
// tự ẩn nút đi khi `isSupported === false`, và hướng dẫn khách dùng "Thêm Vào Màn Hình Chính" thay thế.
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as FullscreenDocument;
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  });

  const isSupported =
    typeof document !== 'undefined' &&
    !!(document.documentElement.requestFullscreen || (document.documentElement as FullscreenElement).webkitRequestFullscreen);

  useEffect(() => {
    const handleChange = () => {
      const doc = document as FullscreenDocument;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement as FullscreenElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch {
      // Trình duyệt từ chối (thường do không phải thao tác bấm trực tiếp của người dùng) — bỏ qua,
      // nút vẫn còn đó để khách bấm lại.
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Bỏ qua — có thể trình duyệt đã tự thoát toàn màn hình trước đó (vd: khách bấm Esc).
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      void exitFullscreen();
    } else {
      void enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, isSupported, toggleFullscreen };
}
