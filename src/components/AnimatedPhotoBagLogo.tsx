import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface AnimatedPhotoBagLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showRibbon?: boolean;
  showSlogan?: boolean;
  isDarkTheme?: boolean;
  textColor?: string;
  subtextColor?: string;
  onClick?: () => void;
  className?: string;
}

export const AnimatedPhotoBagLogo: React.FC<AnimatedPhotoBagLogoProps> = ({
  size = 'lg',
  showText = true,
  showRibbon = true,
  showSlogan = true,
  isDarkTheme = false,
  textColor,
  subtextColor,
  onClick,
  className = '',
}) => {
  // Sizing dimensions for the Bag SVG
  const sizeMap = {
    sm: 'w-8 h-8 sm:w-10 sm:h-10',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40',
    xl: 'w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48',
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-6xl md:text-7xl',
    xl: 'text-5xl sm:text-7xl md:text-8xl',
  };

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center select-none group cursor-pointer transition-all duration-300 ${className}`}
    >
      {/* 1. ANIMATED RANDOSERU CAMERA BAG EMBLEM */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient Soft Glow Behind Logo */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-blue-500/20 via-sky-400/25 to-indigo-500/20 blur-2xl pointer-events-none -z-10"
        />

        {/* Floating / Levitating Bag Container */}
        <motion.div
          animate={{
            y: [-7, 7, -7],
            rotate: [-1.8, 1.8, -1.8],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{
            scale: 1.08,
            rotate: 0,
            transition: { type: 'spring', stiffness: 350, damping: 15 },
          }}
          whileTap={{ scale: 0.94 }}
          className={`relative ${sizeMap[size]} drop-shadow-[0_16px_36px_rgba(0,0,0,0.22)]`}
        >
          {/* Main Japanese Randoseru Camera Bag SVG */}
          <svg
            viewBox="0 0 54 54"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Lens Shimmer Gradient */}
              <linearGradient id="lensGleam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
              </linearGradient>

              {/* Shutter Glow */}
              <radialGradient id="flashGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Quai đeo vai phía sau */}
            <path
              d="M 13 18 C 13 6, 41 6, 41 18"
              stroke="#E2E8F0"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 14 18 C 14 7.5, 40 7.5, 40 18"
              stroke="#3B82F6"
              strokeWidth="1"
              strokeLinecap="round"
              fill="none"
            />

            {/* Quai xách đỉnh cặp */}
            <path
              d="M 20 13 C 20 7.5, 34 7.5, 34 13"
              stroke="#1D4ED8"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 22 13 C 22 9.5, 32 9.5, 32 13"
              stroke="#93C5FD"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Thân cặp học sinh Randoseru Nhật Bản */}
            <rect
              x="8"
              y="14"
              width="38"
              height="34"
              rx="8"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="2.2"
            />

            {/* Đường viền chỉ may & gân hông cặp */}
            <path
              d="M 11 20 L 11 43"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="1.5 2"
            />
            <path
              d="M 43 20 L 43 43"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="1.5 2"
            />

            {/* Nắp gập đặc trưng cặp Randoseru */}
            <path
              d="M 8 18 C 8 13.5, 46 13.5, 46 18 L 45 28 C 45 32, 38 34, 27 34 C 16 34, 9 32, 9 28 Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="2"
            />
            {/* Chi tiết bóng sáng trên nắp */}
            <path
              d="M 11 18 C 11 15.5, 43 15.5, 43 18 L 42.5 25 C 42.5 27, 36 29, 27 29 C 18 29, 11.5 27, 11.5 25 Z"
              fill="#3B82F6"
              opacity="0.9"
            />

            {/* Khóa cài kim loại */}
            <rect
              x="24.5"
              y="32.5"
              width="5"
              height="3.5"
              rx="1"
              fill="#E2E8F0"
              stroke="#0F172A"
              strokeWidth="1"
            />
            <circle cx="27" cy="34.2" r="0.8" fill="#3B82F6" />

            {/* Móc treo kim loại 2 bên */}
            <rect
              x="5.8"
              y="24"
              width="2.4"
              height="4.5"
              rx="1"
              fill="#94A3B8"
              stroke="#0F172A"
              strokeWidth="0.8"
            />
            <rect
              x="45.8"
              y="24"
              width="2.4"
              height="4.5"
              rx="1"
              fill="#94A3B8"
              stroke="#0F172A"
              strokeWidth="0.8"
            />

            {/* Cụm máy ảnh chính */}
            <rect x="14" y="27" width="26" height="18" rx="4" fill="#0F172A" />
            <rect x="15" y="28" width="24" height="16" rx="3" fill="#1E293B" />

            {/* Nút chụp đỏ với hiệu ứng click định kỳ */}
            <rect x="18" y="26.2" width="18" height="2" rx="0.8" fill="#94A3B8" />
            <motion.circle
              cx="20.5"
              cy="25.6"
              r="1.3"
              fill="#EF4444"
              animate={{
                scale: [1, 0.7, 1],
                y: [0, 0.6, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: 'easeInOut',
              }}
            />

            {/* Đèn Flash với hiệu ứng lóe sáng / sparkle định kỳ */}
            <rect
              x="33"
              y="29.5"
              width="4.5"
              height="3"
              rx="0.8"
              fill="#FBBF24"
              stroke="#0F172A"
              strokeWidth="0.8"
            />
            <motion.circle
              cx="35.25"
              cy="31"
              r="2.5"
              fill="url(#flashGlow)"
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0.6, 2.2, 0.6],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 1.5,
                times: [0, 0.15, 0.4],
                ease: 'easeOut',
              }}
            />

            {/* Ống kính máy ảnh trung tâm */}
            <circle cx="27" cy="36.5" r="6.5" fill="#0F172A" stroke="#60A5FA" strokeWidth="1.8" />
            <circle cx="27" cy="36.5" r="4.2" fill="#1D4ED8" />

            {/* Tròng kính trong rung động nhẹ như Focus Camera */}
            <motion.circle
              cx="27"
              cy="36.5"
              r="2.8"
              fill="#38BDF8"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.85, 1, 0.85],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Đốm sáng phản chiếu chuyển động trên ống kính */}
            <motion.circle
              cx="25.5"
              cy="35"
              r="1"
              fill="#FFFFFF"
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Vệt phản chiếu ánh sáng lướt qua ống kính */}
            <motion.path
              d="M 23 33 L 31 40"
              stroke="#FFFFFF"
              strokeWidth="0.6"
              strokeLinecap="round"
              opacity="0.6"
              animate={{
                opacity: [0.2, 0.7, 0.2],
                pathLength: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </svg>
        </motion.div>

        {/* Dynamic Floor Shadow beneath floating bag */}
        <motion.div
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.35, 0.18, 0.35],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-16 sm:w-24 md:w-28 h-2 sm:h-3 rounded-full bg-black/30 blur-xs mt-1"
        />
      </div>

      {/* 2. BRAND NAME: PhotoBag + LIVE BADGE */}
      {showText && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex items-center justify-center gap-2 sm:gap-3 leading-none mt-3 sm:mt-4"
        >
          <span
            className={`${textSizes[size]} font-extrabold tracking-tight font-sans transition-all duration-300 drop-shadow-sm`}
            style={{ color: textColor || (isDarkTheme ? '#FFFFFF' : '#1A1A1A') }}
          >
            Photo
          </span>
          <span
            className={`${textSizes[size]} font-extrabold tracking-tight font-sans text-[#2563EB] drop-shadow-sm relative`}
          >
            Bag
            {/* Sparkle on the letter g */}
            <motion.span
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 90, 180],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
              className="absolute -top-1 -right-3 text-amber-400 text-xs sm:text-sm pointer-events-none"
            >
              ✦
            </motion.span>
          </span>

          {/* Pulsing LIVE Beacon Badge */}
          <motion.div
            animate={{ y: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[#FFD166] shadow-md ml-1 sm:ml-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD166]"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider leading-none">
              LIVE
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* 3. OFFICIAL BANNER RIBBON: SMILE • SNAP • SHARE */}
      {showRibbon && (
        <motion.div
          animate={{
            rotate: [-0.6, 0.6, -0.6],
            scale: [1, 1.015, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mt-3.5 sm:mt-4 px-5 sm:px-8 py-1.5 sm:py-2 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white rounded-full border border-white/40 shadow-lg flex items-center justify-center gap-2 sm:gap-3 transition-transform hover:scale-105"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
          </motion.div>
          <span className="text-xs sm:text-sm md:text-base font-sans font-extrabold tracking-[0.22em] uppercase whitespace-nowrap drop-shadow-xs">
            SMILE • SNAP • SHARE
          </span>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
          </motion.div>
        </motion.div>
      )}

      {/* 4. Brand Slogan */}
      {showSlogan && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-2.5 sm:mt-3 text-xs sm:text-base max-w-xl font-light tracking-wide transition-colors duration-300 text-center"
          style={{ color: subtextColor || '#736B5E' }}
        >
          Bắt trọn khoảnh khắc - Lưu giữ kỷ niệm
        </motion.p>
      )}
    </div>
  );
};
