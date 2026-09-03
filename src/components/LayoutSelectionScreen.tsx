import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, StripLayout, EventConfig } from '../types';
import { LAYOUT_OPTIONS } from '../constants/filters';
import { LayoutIllustration } from './VisualPreviews';
import { playSuccessChime } from '../utils/audio';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Rows,
  Heart,
  Bookmark,
  Grid2X2,
  Check,
} from 'lucide-react';

interface LayoutSelectionScreenProps {
  onNavigate: (screen: AppScreen) => void;
  selectedLayout: StripLayout;
  onSelectLayout: (layout: StripLayout) => void;
  onStartCapture: (layout: StripLayout) => void;
  eventConfig: EventConfig;
  soundEnabled: boolean;
}

interface LayoutGroup {
  id: string;
  title: string;
  icon: React.ElementType;
}

const LAYOUT_GROUPS: LayoutGroup[] = [
  {
    id: 'classic-strip',
    title: 'Dải Thẻ Đơn',
    icon: Bookmark,
  },
  {
    id: 'double-vert',
    title: 'Bưu Thiếp Dọc',
    icon: Columns,
  },
  {
    id: 'double-horiz',
    title: 'Bưu Thiếp Ngang',
    icon: Rows,
  },
  {
    id: 'single-col',
    title: 'Cột Đơn + Vùng Lời Chúc',
    icon: Heart,
  },
  {
    id: 'editorial',
    title: 'Tạp Chí & Kỷ Niệm',
    icon: Grid2X2,
  },
];

export const LayoutSelectionScreen: React.FC<LayoutSelectionScreenProps> = ({
  onNavigate,
  selectedLayout,
  onSelectLayout,
  onStartCapture,
  eventConfig,
  soundEnabled,
}) => {
  // Mặc định luôn bắt đầu từ nhóm Dải Thẻ Đơn (index 0)
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

  // Khi selectedLayout thay đổi từ bên ngoài, cập nhật activeGroupIndex tương ứng nếu có
  useEffect(() => {
    const layout = LAYOUT_OPTIONS.find((l) => l.id === selectedLayout);
    if (layout) {
      const idx = LAYOUT_GROUPS.findIndex((g) => g.id === layout.category);
      if (idx >= 0 && idx !== activeGroupIndex) {
        setActiveGroupIndex(idx);
      }
    }
  }, [selectedLayout]);

  const currentGroup = LAYOUT_GROUPS[activeGroupIndex] || LAYOUT_GROUPS[0];
  const currentGroupLayouts = LAYOUT_OPTIONS.filter((l) => l.category === currentGroup.id);

  const goToGroup = (index: number) => {
    if (index === activeGroupIndex) return;
    setDirection(index > activeGroupIndex ? 1 : -1);
    setActiveGroupIndex(index);
  };

  // Chuyển nhóm vòng lặp vô cực (Infinite Loop)
  const nextGroup = () => {
    setDirection(1);
    setActiveGroupIndex((prev) => (prev + 1) % LAYOUT_GROUPS.length);
  };

  const prevGroup = () => {
    setDirection(-1);
    setActiveGroupIndex((prev) => (prev - 1 + LAYOUT_GROUPS.length) % LAYOUT_GROUPS.length);
  };

  // Xử lý vuốt kéo cử chỉ vô cực (Swipe / Drag Gesture)
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -300) {
      nextGroup();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 300) {
      prevGroup();
    }
  };

  // Hỗ trợ thêm touch start/end cho màn hình cảm ứng
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (deltaX < -50) {
      nextGroup();
    } else if (deltaX > 50) {
      prevGroup();
    }
    touchStartXRef.current = null;
  };

  const handleStart = (layoutId: StripLayout) => {
    if (soundEnabled) {
      playSuccessChime();
    }
    onStartCapture(layoutId);
  };

  const GroupIcon = currentGroup.icon;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full flex flex-col bg-[#F9F7F2] text-[#1A1A1A] select-none overflow-y-auto overflow-x-hidden pt-16 sm:pt-20 pb-36 px-4 sm:px-8 md:px-12"
    >
      {/* 1. Header Section */}
      <div className="w-full max-w-6xl mx-auto border-b border-[#1A1A1A]/10 pb-3 sm:pb-4 flex items-center justify-between gap-4">
        <h1 className="font-editorial-serif text-2xl sm:text-3xl md:text-4xl font-normal text-neutral-900 tracking-tight">
          Chọn Kiểu Bố Cục
        </h1>

        {/* Phone-Style Pagination Dots (Chuyển trang vô cực, không viền ngoài) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {LAYOUT_GROUPS.map((group, idx) => {
            const isActive = idx === activeGroupIndex;
            return (
              <button
                key={group.id}
                onClick={() => goToGroup(idx)}
                aria-label={`Chuyển đến ${group.title}`}
                className="p-1 cursor-pointer flex items-center justify-center focus:outline-none transition-transform active:scale-90"
              >
                <div
                  className={`transition-all duration-300 rounded-full ${
                    isActive
                      ? 'w-6 sm:w-7 h-2 sm:h-2.5 bg-[#2563EB] shadow-xs shadow-blue-500/40'
                      : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Group Title Banner with Infinite Prev/Next Controls */}
      <div className="w-full max-w-6xl mx-auto mt-4 sm:mt-5 flex items-center justify-between gap-3 bg-white/70 backdrop-blur-xs border border-[#DDD6C8] rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
            <GroupIcon className="w-5 h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900">
            {currentGroup.title}
          </h2>
        </div>

        {/* Prev / Next Page Chevrons (Vòng lặp vô cực) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={prevGroup}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white hover:bg-neutral-100 border border-[#DDD6C8] text-neutral-700 shadow-2xs active:scale-95"
            title="Nhóm trước (Vuốt phải)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextGroup}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white hover:bg-neutral-100 border border-[#DDD6C8] text-neutral-700 shadow-2xs active:scale-95"
            title="Nhóm tiếp theo (Vuốt trái)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Layout Grid with Swipe/Drag & Enlarged Wireframes */}
      <div className="w-full max-w-6xl mx-auto mt-4 sm:mt-5 flex-1 min-h-[340px] touch-pan-y">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentGroup.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 cursor-grab active:cursor-grabbing"
          >
            {currentGroupLayouts.map((item) => {
              const isSelected = selectedLayout === item.id;
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectLayout(item.id)}
                  onDoubleClick={() => handleStart(item.id)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer relative group min-h-[220px] sm:min-h-[250px] overflow-hidden ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#2563EB] shadow-xl shadow-blue-500/15 ring-2 ring-[#2563EB]/20'
                      : 'bg-white border-[#E2DCD2] hover:border-neutral-400 hover:shadow-md hover:bg-neutral-50/60'
                  }`}
                >
                  {/* Selected Check Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-[#2563EB] text-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200 z-10">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Sơ đồ mô phỏng ô ảnh (Phóng to vừa vặn, giảm khoảng trắng thừa) */}
                  <div className="w-full h-44 sm:h-52 flex items-center justify-center py-2 relative">
                    <div className="transition-transform duration-300 group-hover:scale-105 transform scale-[1.45] sm:scale-[1.6] origin-center pointer-events-none">
                      <LayoutIllustration layoutId={item.id} isSelected={isSelected} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. Bottom Sticky Shutter Action (Nút Chụp Ảnh Chuẩn Chuyên Nghiệp) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-4 pt-2 flex justify-center items-center pointer-events-none">
        <motion.button
          id="start-capture-hero-shutter-btn"
          onClick={() => handleStart(selectedLayout)}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="pointer-events-auto relative flex flex-col items-center justify-center focus:outline-hidden select-none cursor-pointer group"
          aria-label="Bắt Đầu"
        >
          {/* Vòng ngoài kép Shutter Ring */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#F9F7F2] border-2 border-[#1A1A1A] ring-4 ring-[#8C7A5B]/35 shadow-[0_8px_25px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all duration-200 group-hover:ring-[#2563EB]/40 group-hover:border-[#2563EB]">
            {/* Đĩa lõi màn trập — icon "play" thể hiện đúng ý nghĩa "bắt đầu" (khởi động phiên/đồng
                hồ) thay vì "chụp ảnh" (việc chụp thật sự diễn ra ở màn Camera sau đó). */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#1A1A1A] group-hover:bg-[#2563EB] text-[#F9F7F2] flex items-center justify-center shadow-inner transition-colors duration-200">
              <span className="material-symbols-outlined text-[24px] sm:text-[28px] transition-transform duration-200 group-hover:scale-110">
                play_circle
              </span>
            </div>
          </div>

          {/* Nhãn chữ nổi BẮT ĐẦU */}
          <span className="mt-1 text-[9px] sm:text-[10px] font-sans uppercase tracking-[0.2em] whitespace-nowrap px-2.5 py-0.5 rounded-full bg-[#1A1A1A] text-[#F9F7F2] font-bold shadow-xs group-hover:bg-[#2563EB] transition-colors">
            BẮT ĐẦU
          </span>
        </motion.button>
      </div>
    </div>
  );
};
