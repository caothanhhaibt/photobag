import React, { useRef, useEffect, useCallback } from 'react';
import { LAYOUT_OPTIONS, LayoutOption } from '../constants/filters';
import { StripLayout } from '../types';
import { LayoutIllustration } from './VisualPreviews';

interface HorizontalLayoutCarouselProps {
  selectedLayout: StripLayout;
  onSelectLayout: (layoutId: StripLayout) => void;
}

const REPEAT_SETS = 11; // 11 vòng lặp để tạo cảm giác lướt vô cực tương tự bộ lọc
const MIDDLE_SET = Math.floor(REPEAT_SETS / 2); // Bộ giữa (set 5)

// Tạo danh sách mở rộng vô cực cho các bố cục
const INFINITE_LAYOUTS: { layout: LayoutOption; globalIndex: number; originalIndex: number; uniqueKey: string }[] = [];
for (let set = 0; set < REPEAT_SETS; set++) {
  LAYOUT_OPTIONS.forEach((layout, origIdx) => {
    INFINITE_LAYOUTS.push({
      layout,
      globalIndex: set * LAYOUT_OPTIONS.length + origIdx,
      originalIndex: origIdx,
      uniqueKey: `layout-set-${set}-${layout.id}`,
    });
  });
}

export const HorizontalLayoutCarousel: React.FC<HorizontalLayoutCarouselProps> = ({
  selectedLayout,
  onSelectLayout,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const snapTimeoutRef = useRef<number | null>(null);
  const isNormalizingRef = useRef(false);

  // Cuộn mượt đến phần tử toàn cục cụ thể và căn chính giữa tâm
  const scrollToGlobalIndex = useCallback((globalIndex: number, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container || !container.children[globalIndex]) return;

    const itemEl = container.children[globalIndex] as HTMLElement;
    const containerWidth = container.offsetWidth;
    const itemLeft = itemEl.offsetLeft;
    const itemWidth = itemEl.offsetWidth;

    const targetScrollLeft = itemLeft - containerWidth / 2 + itemWidth / 2;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Tái định vị vô cực (Infinite Looping Normalization)
  const normalizeInfiniteBoundary = useCallback(() => {
    if (isNormalizingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerCenter = container.scrollLeft + containerWidth / 2;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const itemCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const setSize = LAYOUT_OPTIONS.length;
    const currentSet = Math.floor(closestIndex / setSize);

    // Nếu cách quá xa bộ trung tâm (gần mép đầu hoặc mép cuối)
    if (currentSet <= 1 || currentSet >= REPEAT_SETS - 2) {
      isNormalizingRef.current = true;
      const originalIdx = closestIndex % setSize;
      const targetGlobalIndex = MIDDLE_SET * setSize + originalIdx;

      const currentItem = children[closestIndex];
      const targetItem = children[targetGlobalIndex];

      if (currentItem && targetItem) {
        const offsetDiff = targetItem.offsetLeft - currentItem.offsetLeft;
        container.scrollLeft += offsetDiff;
        if (isDraggingRef.current) {
          scrollLeftRef.current += offsetDiff;
        }
      }
      setTimeout(() => {
        isNormalizingRef.current = false;
      }, 50);
    }
  }, []);

  // Cập nhật vị trí và tính toán khoảng cách trung tâm theo thời gian thực
  const updateCenterDetection = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerCenter = container.scrollLeft + containerWidth / 2;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const itemCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const originalIndex = closestIndex % LAYOUT_OPTIONS.length;
    const closestLayout = LAYOUT_OPTIONS[originalIndex];

    // Kích hoạt bố cục khi nằm trong vùng trung tâm (<= 75px)
    if (closestLayout && closestLayout.id !== selectedLayout && minDistance < 75) {
      onSelectLayout(closestLayout.id);
    }

    normalizeInfiniteBoundary();
  }, [selectedLayout, onSelectLayout, normalizeInfiniteBoundary]);

  // Xử lý sự kiện cuộn
  const handleScroll = () => {
    updateCenterDetection();

    // Hẹn giờ tự động hít (snap) về tâm chuẩn xác sau khi người dùng dừng lướt
    if (snapTimeoutRef.current) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    if (!isDraggingRef.current) {
      snapTimeoutRef.current = window.setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const containerWidth = container.offsetWidth;
        const containerCenter = container.scrollLeft + containerWidth / 2;
        const children = Array.from(container.children) as HTMLElement[];

        let closestIndex = 0;
        let minDistance = Infinity;

        children.forEach((child, index) => {
          const itemCenter = child.offsetLeft + child.offsetWidth / 2;
          const distance = Math.abs(containerCenter - itemCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        const originalIndex = closestIndex % LAYOUT_OPTIONS.length;
        const targetLayout = LAYOUT_OPTIONS[originalIndex];
        if (targetLayout) {
          onSelectLayout(targetLayout.id);
          scrollToGlobalIndex(closestIndex, true);
        }
      }, 160);
    }
  };

  // Hỗ trợ KÉO CHUỘT (Drag-to-scroll trên Desktop)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;

    container.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;

    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }

    container.scrollLeft = scrollLeftRef.current - walk;
    updateCenterDetection();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const container = scrollContainerRef.current;
    if (!container) return;

    try {
      container.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    // Căn giữa thẻ gần nhất khi thả chuột
    const containerWidth = container.offsetWidth;
    const containerCenter = container.scrollLeft + containerWidth / 2;
    const children = Array.from(container.children) as HTMLElement[];

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const itemCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const originalIndex = closestIndex % LAYOUT_OPTIONS.length;
    const targetLayout = LAYOUT_OPTIONS[originalIndex];
    if (targetLayout) {
      onSelectLayout(targetLayout.id);
      scrollToGlobalIndex(closestIndex, true);
    }
  };

  // Con lăn chuột (Wheel)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      container.scrollLeft += e.deltaY * 0.85;
      updateCenterDetection();
    }
  };

  // Nút mũi tên Trước / Sau
  const handleStepLayout = (direction: 'prev' | 'next') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerCenter = container.scrollLeft + containerWidth / 2;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const itemCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const nextGlobalIndex = direction === 'next' ? closestIndex + 1 : closestIndex - 1;
    const nextOriginalIndex =
      ((nextGlobalIndex % LAYOUT_OPTIONS.length) + LAYOUT_OPTIONS.length) % LAYOUT_OPTIONS.length;
    const nextLayout = LAYOUT_OPTIONS[nextOriginalIndex];

    if (nextLayout) {
      onSelectLayout(nextLayout.id);
      scrollToGlobalIndex(nextGlobalIndex, true);
    }
  };

  // Khởi tạo ban đầu
  useEffect(() => {
    const targetOriginalIndex = LAYOUT_OPTIONS.findIndex((l) => l.id === selectedLayout);
    const initialIndex =
      targetOriginalIndex !== -1
        ? MIDDLE_SET * LAYOUT_OPTIONS.length + targetOriginalIndex
        : MIDDLE_SET * LAYOUT_OPTIONS.length;

    const timer = setTimeout(() => {
      scrollToGlobalIndex(initialIndex, false);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      id="horizontal-layout-carousel-drawer"
      className="w-full bg-transparent py-1 z-30 transition-all select-none animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none"
    >
      {/* Dải Thẻ Cuộn Ngang Vô Cực Cho Bố Cục (Tương tự dải bộ lọc) */}
      <div className="relative w-full">
        {/* Điểm tâm đánh dấu vị trí trung tâm thẳng hàng nút chụp */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 pointer-events-none z-20 flex flex-col items-center">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3B82F6] ring-2 ring-white"></div>
        </div>

        {/* Nút Mũi Tên Trái Nhanh */}
        <button
          onClick={() => handleStepLayout('prev')}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-25 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all shadow-lg active:scale-90 opacity-85 hover:opacity-100 cursor-pointer"
          title="Bố cục trước"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        {/* Nút Mũi Tên Phải Nhanh */}
        <button
          onClick={() => handleStepLayout('next')}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-25 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all shadow-lg active:scale-90 opacity-85 hover:opacity-100 cursor-pointer"
          title="Bố cục kế tiếp"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>

        {/* VÙNG CUỘN / KÉO CHUỘT / VUỐT CẢM ỨNG VÔ CỰC */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-3 px-[calc(50%-63px)] snap-x snap-mandatory touch-pan-x pointer-events-auto cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {INFINITE_LAYOUTS.map((item) => {
            const isCenterActive = selectedLayout === item.layout.id;
            return (
              <div
                key={item.uniqueKey}
                onClick={() => {
                  if (!hasMovedRef.current) {
                    onSelectLayout(item.layout.id);
                    scrollToGlobalIndex(item.globalIndex, true);
                  }
                }}
                className={`shrink-0 flex flex-col items-center cursor-pointer snap-center transition-all duration-200 ${
                  isCenterActive
                    ? 'scale-115 sm:scale-120 z-10'
                    : 'scale-90 opacity-65 hover:opacity-95 hover:scale-95'
                }`}
                style={{ width: '126px' }}
              >
                {/* Khung Minh Họa Bố Cục Phóng To (Kích thước lớn 128px) */}
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 p-1.5 rounded-xl bg-white/95 backdrop-blur-md transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden ${
                    isCenterActive
                      ? 'border-2 border-white shadow-[0_8px_32px_rgba(0,0,0,0.85)] ring-3 ring-blue-500 scale-100'
                      : 'border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.45)]'
                  }`}
                >
                  {/* Badge số ảnh */}
                  <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                    isCenterActive ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {item.layout.photoCount} ảnh
                  </span>

                  {/* Minh họa Layout */}
                  <div className="w-full flex-1 flex items-center justify-center transform scale-90">
                    <LayoutIllustration layoutId={item.layout.id} isSelected={isCenterActive} />
                  </div>

                  {/* Tỷ lệ khổ in */}
                  <span className="text-[7.5px] font-mono text-neutral-500 font-semibold mt-0.5">
                    {item.layout.aspectRatio === '4/6' ? '4x6 in (10x15cm)' : item.layout.aspectRatio === '6/4' ? '6x4 in (Ngang)' : '2x6 in (Thẻ)'}
                  </span>
                </div>

                {/* Tên Bố Cục Phía Dưới */}
                <span
                  className={`mt-2 text-[9.5px] sm:text-[10.5px] font-sans uppercase tracking-wider text-center leading-tight transition-all line-clamp-2 px-2.5 py-0.5 rounded-full pointer-events-none ${
                    isCenterActive
                      ? 'bg-blue-600/90 backdrop-blur-xs text-white font-bold shadow-md border border-white/25 scale-105'
                      : 'bg-black/50 backdrop-blur-xs text-[#F9F7F2]/80 font-medium'
                  }`}
                >
                  {item.layout.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
