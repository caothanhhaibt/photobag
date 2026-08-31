import React, { useRef, useEffect, useCallback } from 'react';
import { FILTER_PRESETS } from '../constants/filters';
import { FilterPreset } from '../types';

interface HorizontalFilterCarouselProps {
  currentFilterId: string;
  currentFilterIntensity: number;
  onSelectFilter: (filterId: string, defaultIntensity?: number) => void;
  onChangeIntensity: (intensity: number) => void;
}

const REPEAT_SETS = 11; // 11 vòng lặp để tạo cảm giác lướt vô cực hoàn hảo
const MIDDLE_SET = Math.floor(REPEAT_SETS / 2); // Bộ giữa (set 5)

// Tạo danh sách mở rộng vô cực
const INFINITE_PRESETS: { preset: FilterPreset; globalIndex: number; originalIndex: number; uniqueKey: string }[] = [];
for (let set = 0; set < REPEAT_SETS; set++) {
  FILTER_PRESETS.forEach((preset, origIdx) => {
    INFINITE_PRESETS.push({
      preset,
      globalIndex: set * FILTER_PRESETS.length + origIdx,
      originalIndex: origIdx,
      uniqueKey: `preset-set-${set}-${preset.id}`,
    });
  });
}

export const HorizontalFilterCarousel: React.FC<HorizontalFilterCarouselProps> = ({
  currentFilterId,
  onSelectFilter,
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
  // Khi cuộn quá gần rìa trái (set < 2) hoặc rìa phải (set > REPEAT_SETS - 3),
  // dịch chuyển tức thì scrollLeft về bộ giữa tương ứng mà mắt thường không nhận ra giật lag.
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

    const setSize = FILTER_PRESETS.length;
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

    const originalIndex = closestIndex % FILTER_PRESETS.length;
    const closestPreset = FILTER_PRESETS[originalIndex];

    // Kích hoạt bộ lọc khi nằm trong vùng trung tâm (<= 75px)
    if (closestPreset && closestPreset.id !== currentFilterId && minDistance < 75) {
      onSelectFilter(closestPreset.id, closestPreset.defaultIntensity);
    }

    normalizeInfiniteBoundary();
  }, [currentFilterId, onSelectFilter, normalizeInfiniteBoundary]);

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

        const originalIndex = closestIndex % FILTER_PRESETS.length;
        const targetPreset = FILTER_PRESETS[originalIndex];
        if (targetPreset) {
          onSelectFilter(targetPreset.id, targetPreset.defaultIntensity);
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

    // Giữ con trỏ chuột
    container.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.35; // Tăng tốc độ lướt mượt mà

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
      // Ignored if capture lost
    }

    // Tự động căn giữa thẻ gần nhất khi thả chuột
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

    const originalIndex = closestIndex % FILTER_PRESETS.length;
    const targetPreset = FILTER_PRESETS[originalIndex];
    if (targetPreset) {
      onSelectFilter(targetPreset.id, targetPreset.defaultIntensity);
      scrollToGlobalIndex(closestIndex, true);
    }
  };

  // Chuyển đổi con lăn chuột (Wheel) thành cuộn ngang vô cực
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      container.scrollLeft += e.deltaY * 0.85;
      updateCenterDetection();
    }
  };

  // Nút chuyển nhanh sang bộ lọc Kế tiếp / Trước đó (Lặp Vô Cực - Không Bao Giờ Bị Khóa)
  const handleStepFilter = (direction: 'prev' | 'next') => {
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
      ((nextGlobalIndex % FILTER_PRESETS.length) + FILTER_PRESETS.length) % FILTER_PRESETS.length;
    const nextPreset = FILTER_PRESETS[nextOriginalIndex];

    if (nextPreset) {
      onSelectFilter(nextPreset.id, nextPreset.defaultIntensity);
      scrollToGlobalIndex(nextGlobalIndex, true);
    }
  };

  // Khởi tạo ban đầu: Căn giữa bộ lọc được chọn ở tập trung tâm (MIDDLE_SET)
  useEffect(() => {
    const targetOriginalIndex = FILTER_PRESETS.findIndex((p) => p.id === currentFilterId);
    const initialIndex =
      targetOriginalIndex !== -1
        ? MIDDLE_SET * FILTER_PRESETS.length + targetOriginalIndex
        : MIDDLE_SET * FILTER_PRESETS.length;

    const timer = setTimeout(() => {
      scrollToGlobalIndex(initialIndex, false);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      id="horizontal-filter-carousel-drawer"
      className="w-full bg-transparent py-1 z-30 transition-all select-none animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none"
    >
      {/* Dải Thẻ Cuộn Ngang Vô Cực (Hỗ trợ Kéo Chuột, Vuốt Cảm Ứng, Con Lăn Chuột, Tự Động Phóng To Ở Tâm) */}
      <div className="relative w-full">
        {/* Điểm tâm đánh dấu vị trí trung tâm thẳng hàng nút chụp */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 pointer-events-none z-20 flex flex-col items-center">
          <div className="w-2.5 h-2.5 bg-[#8C7A5B] rounded-full shadow-[0_0_10px_#8C7A5B] ring-2 ring-white"></div>
        </div>

        {/* Nút Mũi Tên Trái Nhanh (Vô cực) */}
        <button
          onClick={() => handleStepFilter('prev')}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-25 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all shadow-lg active:scale-90 opacity-85 hover:opacity-100 cursor-pointer"
          title="Bộ lọc trước (Vô cực)"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        {/* Nút Mũi Tên Phải Nhanh (Vô cực) */}
        <button
          onClick={() => handleStepFilter('next')}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-25 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all shadow-lg active:scale-90 opacity-85 hover:opacity-100 cursor-pointer"
          title="Bộ lọc kế tiếp (Vô cực)"
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
          {INFINITE_PRESETS.map((item) => {
            const isCenterActive = currentFilterId === item.preset.id;
            return (
              <div
                key={item.uniqueKey}
                onClick={() => {
                  if (!hasMovedRef.current) {
                    onSelectFilter(item.preset.id, item.preset.defaultIntensity);
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
                {/* Khung Ảnh Thumbnail Phóng To (Kích thước lớn 128px, khung kính nghệ thuật) */}
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 p-1.5 rounded-sm bg-white/90 backdrop-blur-sm transition-all duration-200 flex items-center justify-center ${
                    isCenterActive
                      ? 'border-2 border-white shadow-[0_8px_32px_rgba(0,0,0,0.85)] ring-3 ring-[#8C7A5B]'
                      : 'border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.45)]'
                  }`}
                >
                  <div className="w-full h-full relative overflow-hidden bg-[#1A1A1A] rounded-xs pointer-events-none">
                    <img
                      src={item.preset.thumbnail}
                      alt={item.preset.name}
                      draggable={false}
                      className="w-full h-full object-cover select-none"
                    />
                    {isCenterActive && (
                      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#8C7A5B] shadow-sm ring-1.5 ring-white"></div>
                    )}
                  </div>
                </div>

                {/* Tên Bộ Lọc Phía Dưới Khung Ảnh */}
                <span
                  className={`mt-2 text-[9.5px] sm:text-[10.5px] font-sans uppercase tracking-wider text-center leading-tight transition-all line-clamp-2 px-2.5 py-0.5 rounded-full pointer-events-none ${
                    isCenterActive
                      ? 'bg-black/80 backdrop-blur-xs text-[#F9F7F2] font-bold shadow-md border border-white/25 scale-105'
                      : 'bg-black/50 backdrop-blur-xs text-[#F9F7F2]/80 font-medium'
                  }`}
                >
                  {item.preset.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
