import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { AppScreen } from '../types';

interface BottomNavBarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onTriggerShutter?: () => void;
  isTakingPhoto?: boolean;
  shutterLabel?: string;
}

interface NavItemProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  mouseX: any;
  isHeroShutter?: boolean;
  isTakingPhoto?: boolean;
}

function NavItem({
  id,
  label,
  icon,
  isActive,
  onClick,
  mouseX,
  isHeroShutter = false,
  isTakingPhoto = false,
}: NavItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Tính toán khoảng cách con trỏ tới tâm nút để tạo hiệu ứng phóng to mượt mà (Dock Magnification)
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Đường cong phóng to khi rà chuột lại gần: nút thông thường phóng to 1.35x, nút chụp to sẵn 1.25x
  const scaleSync = useTransform(
    distance,
    [-120, -60, 0, 60, 120],
    [1, 1.15, isHeroShutter ? 1.25 : 1.35, 1.15, 1]
  );
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 240, damping: 18 });

  // Nâng nổi nút lên trên khi rê chuột gần
  const ySync = useTransform(
    distance,
    [-120, -60, 0, 60, 120],
    [0, -4, isHeroShutter ? -8 : -10, -4, 0]
  );
  const y = useSpring(ySync, { mass: 0.1, stiffness: 240, damping: 18 });

  return (
    <motion.button
      ref={ref}
      id={id}
      onClick={onClick}
      disabled={isTakingPhoto}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ scale, y }}
      whileTap={{ scale: 0.88 }}
      className={`relative flex flex-col items-center justify-center focus:outline-hidden select-none cursor-pointer group pointer-events-auto p-1 transition-all touch-none ${
        isHeroShutter ? '-top-2 sm:-top-3' : ''
      }`}
      aria-label={label}
    >
      {/*
        HIỆU ỨNG THIẾT KẾ:
        - Không có thanh nền bao quanh (trong suốt hoàn toàn để nhìn trọn camera).
        - Nút thường: Ban đầu KHÔNG viền, nền tròn tối giản gọn gàng.
        - Khi rà đến (Hover) hoặc Đang chọn (Active): Nổi to lên và xuất hiện viền tròn (Shutter Ring) rõ nét.
        - Riêng Nút Chụp: Luôn nằm giữa, TO SẴN và luôn có viền tròn màn trập chuyên nghiệp.
      */}
      <div
        className={`rounded-full flex items-center justify-center transition-all duration-200 ${
          isHeroShutter
            ? 'w-16 h-16 sm:w-18 sm:h-18 bg-[#F9F7F2] border-2 border-[#1A1A1A] ring-4 ring-[#8C7A5B]/35 shadow-[0_8px_25px_rgba(0,0,0,0.25)]'
            : isHovered || isActive
            ? 'w-12 h-12 sm:w-14 sm:h-14 bg-[#F9F7F2] border-2 border-[#1A1A1A] ring-3 ring-[#8C7A5B]/40 shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
            : 'w-11 h-11 sm:w-12 sm:h-12 bg-[#1A1A1A]/85 backdrop-blur-md border-0 ring-0 shadow-[0_3px_10px_rgba(0,0,0,0.15)]'
        } ${isTakingPhoto && isHeroShutter ? 'animate-pulse' : ''}`}
      >
        {/* Đĩa lõi bên trong nút */}
        <div
          className={`rounded-full flex items-center justify-center transition-all duration-200 ${
            isHeroShutter
              ? 'w-12 h-12 sm:w-13 sm:h-13 bg-[#1A1A1A] text-[#F9F7F2] group-hover:bg-[#8C7A5B] shadow-inner'
              : isHovered || isActive
              ? 'w-9 h-9 sm:w-10 sm:h-10 bg-[#1A1A1A] text-[#F9F7F2] shadow-xs'
              : 'w-full h-full bg-transparent text-[#F9F7F2]'
          }`}
        >
          {isTakingPhoto && isHeroShutter ? (
            <span className="material-symbols-outlined text-[20px] sm:text-[24px] animate-spin text-[#F9F7F2]">
              progress_activity
            </span>
          ) : (
            <span
              className={`material-symbols-outlined text-[20px] sm:text-[22px] transition-transform duration-200 ${
                isHeroShutter ? 'text-[24px] sm:text-[26px]' : ''
              } ${isHovered ? 'scale-110' : ''}`}
            >
              {icon}
            </span>
          )}
        </div>
      </div>

      {/* Nhãn chữ nổi gọn gàng có bóng đổ viền mờ để luôn đọc được trên mọi nền ảnh camera */}
      <span
        className={`mt-1 text-[8px] sm:text-[9px] font-sans uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-150 px-2 py-0.5 rounded-full ${
          isHovered || isActive
            ? 'bg-[#1A1A1A] text-[#F9F7F2] font-bold shadow-xs'
            : 'bg-black/50 backdrop-blur-xs text-[#F9F7F2]/90 font-medium'
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  onTriggerShutter,
  isTakingPhoto = false,
  shutterLabel,
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <nav
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="fixed bottom-0 left-0 right-0 w-full z-50 select-none pb-3 sm:pb-4 pointer-events-none flex justify-center items-end"
    >
      {/*
        DOCK RÚT GỌN CHỈ CÒN 1 NÚT: CHỤP ẢNH — Phông Nền & Chia Sẻ đã được gỡ khỏi dock:
        Chia Sẻ chuyển lên góc trên (In Nhanh / đồng hồ phiên tùy chế độ, xem TopAppBar),
        Phông Nền không còn cần thiết sau khi bỏ thanh cuộn phông nền/khung ảnh trên khung camera.
      */}
      <div className="w-full max-w-md flex justify-center items-end px-4 sm:px-8 pointer-events-none">
        <NavItem
          id="nav-shutter-btn"
          label={shutterLabel || 'CHỤP ẢNH'}
          icon="photo_camera"
          isActive={currentScreen === 'camera'}
          onClick={() => {
            if (currentScreen !== 'camera') {
              onNavigate('camera');
            } else if (onTriggerShutter) {
              onTriggerShutter();
            }
          }}
          mouseX={mouseX}
          isHeroShutter={true}
          isTakingPhoto={isTakingPhoto}
        />
      </div>
    </nav>
  );
};
