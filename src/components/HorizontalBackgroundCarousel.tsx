import React, { useRef, useEffect, useCallback } from 'react';
import { FrameColor, FrameStyle } from '../types';
import { FRAME_COLORS, FRAME_STYLE_OPTIONS, FrameStyleOption } from '../constants/filters';
import { Sparkles, Palette, Check } from 'lucide-react';

export interface BackgroundPresetOption {
  id: string;
  type: 'color' | 'style';
  colorId?: FrameColor;
  styleId?: FrameStyle;
  name: string;
  shortName: string;
  tag: string;
  previewBg: string;
  textColor: string;
  borderHex: string;
  icon: string;
  description: string;
}

export const BACKGROUND_PRESETS: BackgroundPresetOption[] = [
  // 1. MÀU NỀN TRẮNG KEM STUDIO
  {
    id: 'color-white',
    type: 'color',
    colorId: 'white',
    styleId: 'classic',
    name: 'Trắng Kem Studio',
    shortName: 'Trắng Kem',
    tag: 'THANH LỊCH',
    previewBg: 'bg-[#F9F7F2]',
    textColor: '#1A1A1A',
    borderHex: '#D4CEBC',
    icon: 'palette',
    description: 'Tone trắng kem ấm thanh lịch chuẩn phong cách Hàn Quốc.',
  },
  // 2. MÀU NỀN THAN CHÌ
  {
    id: 'color-charcoal',
    type: 'color',
    colorId: 'charcoal',
    styleId: 'classic',
    name: 'Than Chì Tối Giản',
    shortName: 'Than Chì',
    tag: 'NOIR FILM',
    previewBg: 'bg-[#1A1A1A]',
    textColor: '#F9F7F2',
    borderHex: '#3A3A3A',
    icon: 'palette',
    description: 'Màu xám than chì sâu lắng, tôn sáng chủ thể khi chụp.',
  },
  // 3. MÀU NỀN HỒNG PHẤN
  {
    id: 'color-pastel-pink',
    type: 'color',
    colorId: 'pastel-pink',
    styleId: 'classic',
    name: 'Hồng Phấn Cổ Điển',
    shortName: 'Hồng Phấn',
    tag: 'SWEET',
    previewBg: 'bg-[#F4ECE6]',
    textColor: '#4A342B',
    borderHex: '#E2D3CA',
    icon: 'palette',
    description: 'Tone hồng pastel nhẹ nhàng dành cho cặp đôi và bạn bè.',
  },
  // 4. MÀU NỀN VÀNG ĐẤT MỸ THUẬT
  {
    id: 'color-slate',
    type: 'color',
    colorId: 'slate',
    styleId: 'classic',
    name: 'Vàng Đất Mỹ Thuật',
    shortName: 'Vàng Đất',
    tag: 'VINTAGE',
    previewBg: 'bg-[#EBE5D8]',
    textColor: '#3D3425',
    borderHex: '#C5BAA5',
    icon: 'palette',
    description: 'Sắc vàng cát ấm áp, mộc mạc đậm chất film cổ.',
  },
  // 5. MÀU NỀN VẢI LANH ẤM
  {
    id: 'color-cream',
    type: 'color',
    colorId: 'cream',
    styleId: 'classic',
    name: 'Vải Lanh Ấm Áp',
    shortName: 'Vải Lanh',
    tag: 'COZY',
    previewBg: 'bg-[#EFEEE8]',
    textColor: '#1A1A1A',
    borderHex: '#D6D3C8',
    icon: 'palette',
    description: 'Màu sợi lanh dệt tự nhiên, trung tính hiện đại.',
  },
  // 6. MÀU NỀN ĐEN GỖ MUN
  {
    id: 'color-black',
    type: 'color',
    colorId: 'black',
    styleId: 'classic',
    name: 'Đen Gỗ Mun',
    shortName: 'Đen Mun',
    tag: 'LUXURY',
    previewBg: 'bg-[#111111]',
    textColor: '#F9F7F2',
    borderHex: '#262626',
    icon: 'palette',
    description: 'Đen huyền bí sang trọng làm nổi bật từng góc cạnh.',
  },

  // 7. KHUNG PHIM ĐIỆN ẢNH 35MM
  {
    id: 'style-cinema-film',
    type: 'style',
    styleId: 'cinema-film',
    colorId: 'black',
    name: 'Phim Điện Ảnh 35mm',
    shortName: 'Phim 35mm',
    tag: 'CINEMA',
    previewBg: 'bg-[#0F0F0F]',
    textColor: '#E0C068',
    borderHex: '#333333',
    icon: 'film',
    description: 'Đục lỗ bánh răng phim 35mm hai bên cùng mã số Kodak.',
  },
  // 8. POLAROID / INSTAX
  {
    id: 'style-polaroid',
    type: 'style',
    styleId: 'polaroid',
    colorId: 'white',
    name: 'Polaroid Cổ Điển',
    shortName: 'Polaroid',
    tag: 'INSTAX',
    previewBg: 'bg-[#FFFFFF]',
    textColor: '#333333',
    borderHex: '#E5E5E5',
    icon: 'camera',
    description: 'Viền đáy dày kinh điển in ảnh lấy liền Polaroid.',
  },
  // 9. BÌA TẠP CHÍ VOGUE
  {
    id: 'style-magazine',
    type: 'style',
    styleId: 'magazine',
    colorId: 'charcoal',
    name: 'Bìa Tạp Chí Vogue',
    shortName: 'Tạp Chí',
    tag: 'EDITORIAL',
    previewBg: 'bg-[#1A1A1A]',
    textColor: '#FFFFFF',
    borderHex: '#444444',
    icon: 'book-open',
    description: 'Phong cách bìa tạp chí thời trang nghệ thuật quốc tế.',
  },
  // 10. VÉ XEM PHIM RETRO
  {
    id: 'style-movie-ticket',
    type: 'style',
    styleId: 'movie-ticket',
    colorId: 'white',
    name: 'Cuống Vé Xem Phim',
    shortName: 'Cuống Vé',
    tag: 'VINTAGE',
    previewBg: 'bg-[#FFFDF7]',
    textColor: '#1A1A1A',
    borderHex: '#DDD5C7',
    icon: 'ticket',
    description: 'Vết khuyết cuống vé, mã vạch Barcode và hóa đơn kỷ niệm.',
  },
  // 11. ĐĨA NHẠC VINYL
  {
    id: 'style-vinyl-cd',
    type: 'style',
    styleId: 'vinyl-cd',
    colorId: 'charcoal',
    name: 'Đĩa Than Vinyl CD',
    shortName: 'Đĩa Than',
    tag: 'MUSIC',
    previewBg: 'bg-[#2B2623]',
    textColor: '#F3ECE4',
    borderHex: '#4A3E38',
    icon: 'disc',
    description: 'Rãnh đĩa than vinyl tròn bóng bẩy cùng danh sách bài hát.',
  },
  // 12. ANIME LỆNH TRUY NÃ
  {
    id: 'style-onepiece-wanted',
    type: 'style',
    styleId: 'onepiece-wanted',
    colorId: 'slate',
    name: 'Lệnh Truy Nã Wanted',
    shortName: 'Truy Nã',
    tag: 'ANIME HOT',
    previewBg: 'bg-[#E5C38F]',
    textColor: '#4A2E18',
    borderHex: '#B8935C',
    icon: 'skull',
    description: 'Giấy da cổ điển WANTED DEAD OR ALIVE với tiền thưởng Berries.',
  },
];

interface HorizontalBackgroundCarouselProps {
  selectedFrameColor?: FrameColor;
  selectedFrameStyle?: FrameStyle;
  onSelectBackground: (color: FrameColor, style: FrameStyle) => void;
}

const REPEAT_SETS = 11; // 11 vòng lặp để tạo cảm giác lướt vô cực
const MIDDLE_SET = Math.floor(REPEAT_SETS / 2); // Set 5

const INFINITE_PRESETS: { preset: BackgroundPresetOption; globalIndex: number; originalIndex: number; uniqueKey: string }[] = [];
for (let set = 0; set < REPEAT_SETS; set++) {
  BACKGROUND_PRESETS.forEach((preset, origIdx) => {
    INFINITE_PRESETS.push({
      preset,
      globalIndex: set * BACKGROUND_PRESETS.length + origIdx,
      originalIndex: origIdx,
      uniqueKey: `bg-set-${set}-${preset.id}`,
    });
  });
}

export const HorizontalBackgroundCarousel: React.FC<HorizontalBackgroundCarouselProps> = ({
  selectedFrameColor = 'white',
  selectedFrameStyle = 'classic',
  onSelectBackground,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const snapTimeoutRef = useRef<number | null>(null);
  const isNormalizingRef = useRef(false);

  // Tìm preset hiện tại
  const currentActivePreset = BACKGROUND_PRESETS.find((p) => {
    if (selectedFrameStyle && selectedFrameStyle !== 'classic') {
      return p.styleId === selectedFrameStyle;
    }
    return p.colorId === selectedFrameColor && p.styleId === 'classic';
  }) || BACKGROUND_PRESETS[0];

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

    const setSize = BACKGROUND_PRESETS.length;
    const currentSet = Math.floor(closestIndex / setSize);

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

    const originalIndex = closestIndex % BACKGROUND_PRESETS.length;
    const closestPreset = BACKGROUND_PRESETS[originalIndex];

    if (closestPreset && minDistance < 70) {
      const isMatched =
        closestPreset.styleId === selectedFrameStyle &&
        (closestPreset.styleId !== 'classic' || closestPreset.colorId === selectedFrameColor);

      if (!isMatched) {
        onSelectBackground(closestPreset.colorId || 'white', closestPreset.styleId || 'classic');
      }
    }

    normalizeInfiniteBoundary();
  }, [selectedFrameColor, selectedFrameStyle, onSelectBackground, normalizeInfiniteBoundary]);

  const handleScroll = () => {
    updateCenterDetection();

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

        scrollToGlobalIndex(closestIndex, true);
      }, 120);
    }
  };

  // Khởi tạo vị trí ban đầu tại set giữa
  useEffect(() => {
    const origIndex = BACKGROUND_PRESETS.findIndex((p) => p.id === currentActivePreset.id);
    const safeOrigIndex = origIndex >= 0 ? origIndex : 0;
    const targetGlobalIndex = MIDDLE_SET * BACKGROUND_PRESETS.length + safeOrigIndex;

    const timer = setTimeout(() => {
      scrollToGlobalIndex(targetGlobalIndex, false);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Xử lý kéo thả vuốt tay mượt mà
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
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

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

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

    scrollToGlobalIndex(closestIndex, true);
  };

  // Chạm vào 1 item để chọn và căn tâm
  const handleItemClick = (preset: BackgroundPresetOption, globalIndex: number) => {
    if (hasMovedRef.current) return;
    onSelectBackground(preset.colorId || 'white', preset.styleId || 'classic');
    scrollToGlobalIndex(globalIndex, true);
  };

  return (
    <div className="w-full flex flex-col items-center select-none animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      {/* Dải Cuộn Vô Cực Ngang */}
      <div className="relative w-full max-w-2xl px-4 flex items-center justify-center">
        {/* Vạch Chỉ Tâm (Center Indicator) */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-24 sm:w-26 border-x border-[#E5C38F]/40 bg-[#E5C38F]/5 pointer-events-none rounded-xl z-10 shadow-[0_0_15px_rgba(229,195,143,0.15)]" />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none py-1.5 px-[42%] sm:px-[45%] cursor-grab active:cursor-grabbing w-full touch-pan-x"
          style={{ scrollBehavior: 'auto' }}
        >
          {INFINITE_PRESETS.map((item) => {
            const isSelected = item.preset.id === currentActivePreset.id;

            return (
              <div
                key={item.uniqueKey}
                onClick={() => handleItemClick(item.preset, item.globalIndex)}
                className={`shrink-0 flex flex-col items-center justify-between p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'w-20 sm:w-22 h-20 sm:h-22 bg-[#1A1A1A]/95 border-2 border-[#E5C38F] shadow-[0_0_15px_rgba(229,195,143,0.35)] scale-100 z-20 ring-1 ring-[#E5C38F]/50'
                    : 'w-16 sm:w-18 h-18 sm:h-20 bg-black/60 border border-white/20 opacity-50 hover:opacity-85'
                }`}
              >
                {/* Khối xem trước màu / họa tiết */}
                <div
                  className={`w-full h-9 sm:h-10 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all shadow-inner ${item.preset.previewBg}`}
                  style={{ borderColor: item.preset.borderHex }}
                >
                  {/* Icon phong cách */}
                  <span
                    className="material-symbols-outlined text-[16px] sm:text-[18px] drop-shadow-xs"
                    style={{ color: item.preset.textColor }}
                  >
                    {item.preset.icon}
                  </span>

                  {isSelected && (
                    <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Nhãn Tên & Tag */}
                <div className="w-full flex flex-col items-center text-center mt-0.5">
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-sans font-bold leading-tight truncate max-w-full ${
                      isSelected ? 'text-[#F9F7F2]' : 'text-white/80'
                    }`}
                  >
                    {item.preset.shortName}
                  </span>
                  <span
                    className={`text-[6.5px] sm:text-[7.5px] font-mono tracking-widest uppercase mt-0.5 ${
                      isSelected ? 'text-[#E5C38F] font-bold' : 'text-white/40'
                    }`}
                  >
                    {item.preset.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
