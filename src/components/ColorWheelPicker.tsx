import React, { useCallback, useRef } from 'react';
import { ColorWheelValue } from '../types';

interface ColorWheelPickerProps {
  label: string;
  value: ColorWheelValue;
  onChange: (value: ColorWheelValue) => void;
  size?: number;
}

/**
 * Bánh xe màu kéo tay kiểu Blackmagic/DaVinci Resolve (Lift/Gamma/Gain) — dùng riêng cho ĐÚNG 1
 * vùng tông (Vùng Tối / Vùng Trung / Vùng Sáng). Kéo chấm tròn ra khỏi tâm để đẩy màu ngả theo
 * hướng kéo — góc kéo quyết định màu (vd kéo sang phải = ấm/cam, sang trái = lạnh/xanh), khoảng
 * cách tới tâm quyết định độ mạnh. Thanh trượt dọc bên dưới chỉnh riêng độ sáng (luminance) CHỈ của
 * vùng tông này — tách biệt hoàn toàn với việc đẩy màu ở bánh xe.
 * Xem applyColorWheelGrading (utils/canvas.ts) để biết công thức áp x/y/luminance này lên ảnh thật.
 */
export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({ label, value, onChange, size = 96 }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      let x = (clientX - cx) / radius;
      let yRaw = (clientY - cy) / radius;
      const dist = Math.sqrt(x * x + yRaw * yRaw);
      if (dist > 1) {
        x /= dist;
        yRaw /= dist;
      }
      // Trục Y màn hình hướng xuống — đảo dấu để "kéo lên" ứng với y dương, giống quy ước DaVinci.
      onChange({ ...value, x, y: -yRaw });
    },
    [onChange, value]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    updateFromPointer(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const handleDoubleClick = () => {
    onChange({ ...value, x: 0, y: 0 });
  };

  const puckX = value.x * 50; // % lệch khỏi tâm bên trong bánh xe
  const puckY = -value.y * 50;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 text-center">{label}</span>
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="relative rounded-full cursor-grab active:cursor-grabbing touch-none select-none border border-black/10 shadow-inner shrink-0"
        style={{
          width: size,
          height: size,
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 55%), conic-gradient(from 90deg, #ff5c5c, #ffd15c, #a6ff5c, #5cffb3, #5cc9ff, #5c6bff, #b95cff, #ff5cd1, #ff5c5c)',
        }}
        title="Kéo để đẩy màu ngả — bấm đúp để về giữa (không chỉnh màu)"
      >
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-800 shadow pointer-events-none"
          style={{
            left: `calc(50% + ${puckX}%)`,
            top: `calc(50% + ${puckY}%)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      <input
        type="range"
        min={-50}
        max={50}
        value={value.luminance}
        onChange={(e) => onChange({ ...value, luminance: Number(e.target.value) })}
        className="w-full h-1 bg-neutral-200 appearance-none cursor-pointer accent-teal-600 rounded-full"
        title="Độ sáng riêng của vùng tông này"
      />
      <span className="text-[9px] font-mono text-neutral-400">
        {value.luminance > 0 ? `+${value.luminance}` : value.luminance}
      </span>
    </div>
  );
};
