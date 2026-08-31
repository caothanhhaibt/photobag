import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // basicSsl: bật HTTPS cho server dev bằng chứng chỉ tự tạo — bắt buộc phải có để điện thoại
    // (đặc biệt Safari trên iPhone) cho phép trang web dùng camera khi truy cập qua địa chỉ IP
    // trong mạng Wifi nội bộ (http:// thường sẽ bị trình duyệt điện thoại chặn quyền camera).
    plugins: [react(), tailwindcss(), basicSsl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
