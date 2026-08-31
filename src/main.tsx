import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {PhoneCameraSender} from './components/PhoneCameraSender.tsx';
import './index.css';

// Nếu link mở có dạng ...?camera=123456 (từ QR/link ghép nối camera điện thoại) thì hiển thị
// trang gửi camera gọn nhẹ thay vì toàn bộ app chụp ảnh chính.
const isPhoneCameraSenderMode = new URLSearchParams(window.location.search).has('camera');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPhoneCameraSenderMode ? <PhoneCameraSender /> : <App />}
  </StrictMode>,
);
