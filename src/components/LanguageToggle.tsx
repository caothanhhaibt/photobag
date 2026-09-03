import React from 'react';
import { Language } from '../i18n/translations';

interface LanguageToggleProps {
  language: Language;
  onChangeLanguage: (language: Language) => void;
  className?: string;
}

// Nút chuyển đổi VI / EN nhỏ gọn — dùng lại ở nhiều màn (IdleScreen, TopAppBar) để khách có thể đổi
// ngôn ngữ bất kỳ lúc nào trong suốt phiên chụp, không chỉ ở màn hình chờ.
export const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, onChangeLanguage, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center rounded-full bg-black/10 backdrop-blur-xs p-0.5 select-none ${className}`}
      role="group"
      aria-label="VI / EN"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeLanguage('vi');
        }}
        className={`px-2 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer ${
          language === 'vi' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-current opacity-60 hover:opacity-90'
        }`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeLanguage('en');
        }}
        className={`px-2 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer ${
          language === 'en' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-current opacity-60 hover:opacity-90'
        }`}
      >
        EN
      </button>
    </div>
  );
};
