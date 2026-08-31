import React, { useRef } from 'react';

interface VerticalSliderProps {
  id: string;
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  accentColor?: string;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  id,
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  onChange,
  accentColor = '#8C7A5B',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Tính phần trăm fill (0% -> 100%)
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    updateValueFromPointer(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateValueFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const updateValueFromPointer = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const height = rect.height;
    // Đi từ dưới lên trên (dưới là min, trên là max)
    const offsetY = rect.bottom - clientY;
    const clampedY = Math.max(0, Math.min(height, offsetY));
    const ratio = clampedY / height;

    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    const finalVal = Math.max(min, Math.min(max, steppedVal));

    onChange(finalVal);
  };

  return (
    <div
      id={id}
      className="pointer-events-auto flex flex-col items-center select-none transition-all group py-1"
    >
      {/* Icon đầu - mờ tinh tế có bóng đổ nhẹ */}
      <span className="material-symbols-outlined text-[14px] sm:text-[15px] text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mb-1 group-hover:text-white transition-colors">
        {icon}
      </span>

      {/* Rãnh trượt dọc Mảnh & Mờ Trong Suốt (Thanh 4px siêu mảnh) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-7 sm:w-8 h-20 sm:h-24 flex items-center justify-center cursor-pointer touch-none"
        title={`${label}: ${value}${unit}`}
      >
        {/* Rãnh thực tế mảnh 3.5px, mờ trong suốt, không viền */}
        <div className="w-1 sm:w-1.5 h-full bg-white/25 hover:bg-white/35 rounded-full overflow-visible relative backdrop-blur-xs shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          {/* Phần fill màu sáng lên từ dưới lên */}
          <div
            className="w-full rounded-full transition-all duration-75 absolute bottom-0 left-0"
            style={{
              height: `${percentage}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          >
            {/* Nút tròn định vị con trượt nhỏ gọn */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.7)] border border-black/15 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Giá trị số - mờ nhẹ & có bóng đổ để nổi trên nền camera */}
      <span className="mt-1 text-[8.5px] sm:text-[9px] font-mono font-bold text-white/85 tracking-tighter drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {value}{unit}
      </span>

      {/* Tên nhãn */}
      <span className="text-[7.5px] sm:text-[8px] font-sans uppercase tracking-widest text-white/60 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </span>
    </div>
  );
};
