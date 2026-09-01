import React from 'react';
import { StripLayout, FrameStyle } from '../types';
import {
  Scissors,
  Heart,
  MessageSquare,
  Bookmark,
  Sparkles,
  Film,
  Music,
  Ticket,
  Camera,
  BookOpen,
  Skull,
  AlignLeft,
  Tag,
  PenLine,
  QrCode,
  Disc3,
  Award,
  TrainFront,
  Barcode,
} from 'lucide-react';

interface LayoutIllustrationProps {
  layoutId: StripLayout;
  isSelected?: boolean;
}

export const LayoutIllustration: React.FC<LayoutIllustrationProps> = ({
  layoutId,
  isSelected = false,
}) => {
  const boxBg = isSelected ? 'bg-amber-400/90 border-amber-500' : 'bg-[#1A1A1A]/20 border-[#1A1A1A]/30';
  const paperBg = isSelected ? 'bg-amber-50' : 'bg-white';

  switch (layoutId) {
    // 1. DẢI ĐÔI DỌC 2 ẢNH (4x6)
    case 'double-2-vert':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex relative overflow-hidden`}>
          {/* Cột 1 */}
          <div className="flex-1 flex flex-col gap-0.8 pr-0.5 justify-center">
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>1</div>
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>2</div>
          </div>
          {/* Đường cắt đôi */}
          <div className="w-0 border-r border-dashed border-red-400 flex flex-col items-center justify-center relative">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-0.5 -left-1.2 transform rotate-90" />
          </div>
          {/* Cột 2 */}
          <div className="flex-1 flex flex-col gap-0.8 pl-0.5 justify-center">
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>3</div>
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>4</div>
          </div>
        </div>
      );

    // 2. DẢI ĐÔI DỌC 3 ẢNH (4x6) - Layout A/B
    case 'double-3-vert':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex relative overflow-hidden`}>
          {/* Cột 1 */}
          <div className="flex-1 flex flex-col gap-0.6 pr-0.5 justify-center">
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          </div>
          {/* Đường cắt đôi */}
          <div className="w-0 border-r border-dashed border-red-400 flex flex-col items-center justify-center relative">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-0.5 -left-1.2 transform rotate-90" />
          </div>
          {/* Cột 2 */}
          <div className="flex-1 flex flex-col gap-0.6 pl-0.5 justify-center">
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>5</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>6</div>
          </div>
        </div>
      );

    // 3. DẢI ĐÔI DỌC 4 ẢNH (4x6) - Layout C/D
    case 'double-4-vert':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex relative overflow-hidden`}>
          {/* Cột 1 */}
          <div className="flex-1 flex flex-col gap-0.5 pr-0.5 justify-center">
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
          </div>
          {/* Đường cắt đôi */}
          <div className="w-0 border-r border-dashed border-red-400 flex flex-col items-center justify-center relative">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-0.5 -left-1.2 transform rotate-90" />
          </div>
          {/* Cột 2 */}
          <div className="flex-1 flex flex-col gap-0.5 pl-0.5 justify-center">
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>5</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>6</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>7</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>8</div>
          </div>
        </div>
      );

    // 4. DẢI ĐÔI NGANG 2 ẢNH (6x4) - Layout L
    case 'double-2-horiz':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col relative overflow-hidden justify-between`}>
          {/* Hàng 1 */}
          <div className="flex gap-1 flex-1 pb-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          </div>
          {/* Đường cắt ngang */}
          <div className="h-0 border-b border-dashed border-red-400 relative my-0.5">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-1.5 left-1" />
          </div>
          {/* Hàng 2 */}
          <div className="flex gap-1 flex-1 pt-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
          </div>
        </div>
      );

    // 5. DẢI ĐÔI NGANG 3 ẢNH (6x4)
    case 'double-3-horiz':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col relative overflow-hidden justify-between`}>
          {/* Hàng 1 */}
          <div className="flex gap-0.8 flex-1 pb-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          </div>
          {/* Đường cắt ngang */}
          <div className="h-0 border-b border-dashed border-red-400 relative my-0.5">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-1.5 left-1" />
          </div>
          {/* Hàng 2 */}
          <div className="flex gap-0.8 flex-1 pt-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>5</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>6</div>
          </div>
        </div>
      );

    // 6. DẢI ĐÔI NGANG 4 ẢNH (6x4)
    case 'double-4-horiz':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col relative overflow-hidden justify-between`}>
          {/* Hàng 1 */}
          <div className="flex gap-0.6 flex-1 pb-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>1</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>2</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>3</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>4</div>
          </div>
          {/* Đường cắt ngang */}
          <div className="h-0 border-b border-dashed border-red-400 relative my-0.5">
            <Scissors className="w-2.5 h-2.5 text-red-500 absolute -top-1.5 left-1" />
          </div>
          {/* Hàng 2 */}
          <div className="flex gap-0.6 flex-1 pt-0.5">
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>5</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>6</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>7</div>
            <div className={`flex-1 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>8</div>
          </div>
        </div>
      );

    // 7. CỘT ĐƠN 2 ẢNH + VÙNG LƯU BÚT (4x6)
    case 'single-col-2':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex gap-1 justify-between`}>
          {/* Cột ảnh trái */}
          <div className="w-[45%] flex flex-col gap-1 justify-center">
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>1</div>
            <div className={`w-full h-8 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>2</div>
          </div>
          {/* Vùng ghi chú phải */}
          <div className="w-[50%] flex flex-col gap-1 justify-center py-1">
            <div className="text-[6px] font-bold text-amber-700 uppercase tracking-tighter">Lưu Bút ✍️</div>
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-3/4 h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-1/2 h-0.5 bg-gray-300 rounded-full" />
          </div>
        </div>
      );

    // 8. CỘT ĐƠN 3 ẢNH + VÙNG LƯU BÚT (4x6)
    case 'single-col-3':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex gap-1 justify-between`}>
          {/* Cột ảnh trái */}
          <div className="w-[45%] flex flex-col gap-0.6 justify-center">
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`w-full h-5.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          </div>
          {/* Vùng ghi chú phải */}
          <div className="w-[50%] flex flex-col gap-1 justify-center py-1">
            <div className="text-[6px] font-bold text-amber-700 uppercase tracking-tighter">Lời Chúc 💖</div>
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-3/4 h-0.5 bg-gray-300 rounded-full" />
          </div>
        </div>
      );

    // 9. CỘT ĐƠN 4 ẢNH + VÙNG LƯU BÚT (4x6)
    case 'single-col-4':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex gap-1 justify-between`}>
          {/* Cột ảnh trái */}
          <div className="w-[45%] flex flex-col gap-0.5 justify-center">
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
            <div className={`w-full h-4 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
          </div>
          {/* Vùng ghi chú phải */}
          <div className="w-[50%] flex flex-col gap-1 justify-center py-1">
            <div className="text-[6px] font-bold text-amber-700 uppercase tracking-tighter">Kỷ Niệm 💌</div>
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-full h-0.5 bg-gray-300 rounded-full" />
            <div className="w-2/3 h-0.5 bg-gray-300 rounded-full" />
          </div>
        </div>
      );

    // 10. LAYOUT J (6x4 Cột Trái 2 Ảnh + Vùng Chữ Lớn Phải)
    case 'layout-j':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex gap-1.5`}>
          <div className="w-[38%] flex flex-col gap-0.8 justify-center">
            <div className={`w-full h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`w-full h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-0.8 bg-amber-100/50 p-1 rounded-xs border border-amber-200">
            <div className="text-[6.5px] font-bold text-amber-800">Jane & Johnny</div>
            <div className="w-full h-0.5 bg-amber-300" />
            <div className="w-full h-0.5 bg-amber-300" />
            <div className="w-3/4 h-0.5 bg-amber-300" />
          </div>
        </div>
      );

    // 11. LAYOUT F (1 Lớn + 3 Nhỏ Dưới + Ô Chữ)
    case 'layout-f':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col gap-1 justify-between`}>
          <div className="flex gap-1 h-7">
            <div className={`w-1/2 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>1 (Lớn)</div>
            <div className="w-1/2 h-full bg-amber-100/60 rounded-xs border border-amber-300 p-0.5 flex flex-col justify-center gap-0.5">
              <span className="text-[5.5px] font-bold text-amber-900">Title & Note</span>
              <div className="w-full h-0.5 bg-amber-400" />
            </div>
          </div>
          <div className="flex gap-1 h-5.5">
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
          </div>
        </div>
      );

    // 12. LAYOUT G (Lưới 2x2 + 2 Dòng Tiêu Đề Riêng Dưới Mỗi Cột)
    case 'layout-g':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col justify-between`}>
          <div className="grid grid-cols-2 gap-1 flex-1">
            <div className="flex flex-col gap-0.5">
              <div className={`h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>1</div>
              <div className={`h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>2</div>
              <div className="text-[5px] text-center font-bold text-[#8C7A5B] bg-white border border-[#8C7A5B]/30 rounded-xs">Label A</div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className={`h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>3</div>
              <div className={`h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>4</div>
              <div className="text-[5px] text-center font-bold text-[#8C7A5B] bg-white border border-[#8C7A5B]/30 rounded-xs">Label B</div>
            </div>
          </div>
        </div>
      );

    // 13. LAYOUT H (2 Dọc Trái + 1 Lớn Phải + Ô Chữ Dưới)
    case 'layout-h':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex gap-1`}>
          <div className="w-[40%] flex flex-col gap-0.6 justify-center">
            <div className={`h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
            <div className={`h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          </div>
          <div className="w-[58%] flex flex-col gap-1">
            <div className={`h-7 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3 (Lớn)</div>
            <div className="flex-1 bg-amber-100/70 rounded-xs border border-amber-300 p-0.5 flex flex-col justify-center gap-0.5">
              <span className="text-[5.5px] font-bold text-amber-800">Jane & Johnny</span>
              <div className="w-full h-0.5 bg-amber-400" />
            </div>
          </div>
        </div>
      );

    // 14. LAYOUT I (1 Trên Trái, 1 Dưới Trái, 1 Dưới Phải, Ô Chữ Trên Phải)
    case 'layout-i':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 grid grid-cols-2 gap-1`}>
          <div className={`h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
          <div className="h-6 bg-amber-100/70 rounded-xs border border-amber-300 p-0.5 flex flex-col justify-center">
            <span className="text-[5px] font-bold text-amber-800">Quote / Date</span>
          </div>
          <div className={`h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          <div className={`h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
        </div>
      );

    // 15. LAYOUT K (2 Ảnh Ngang Ở Giữa)
    case 'layout-k':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col justify-between`}>
          <div className="text-[5.5px] font-bold text-center uppercase tracking-widest text-[#1A1A1A]">★ MEMORIES ★</div>
          <div className="flex gap-1 h-9 items-center">
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1 (Ngang)</div>
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2 (Ngang)</div>
          </div>
          <div className="text-[5px] text-center text-[#8C7A5B] font-mono">1-15-2019</div>
        </div>
      );

    // 16. LAYOUT E / SINGLE-2 (2 Ảnh Lớn Dọc 4x6)
    case 'single-2':
      return (
        <div className={`w-16 h-22 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col gap-1 justify-center`}>
          <div className={`w-full h-8.5 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>1 (Lớn)</div>
          <div className={`w-full h-8.5 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>2 (Lớn)</div>
          <div className="text-[5px] text-center text-[#8C7A5B] font-mono">Studio Memories</div>
        </div>
      );

    // 17. LAYOUT M (1 Ảnh Panorama Lớn)
    case 'layout-m':
      return (
        <div className={`w-22 h-16 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col justify-between`}>
          <div className={`w-full h-11 ${boxBg} rounded-xs border flex items-center justify-center text-[8px] font-bold`}>
            1 (Toàn Cảnh Panorama)
          </div>
          <div className="text-[5.5px] text-center font-bold uppercase tracking-wider text-[#1A1A1A]">Special Moment</div>
        </div>
      );

    // 18. FEATURED 1-2 (1 Lớn + 2 Nhỏ)
    case 'featured-1-2':
      return (
        <div className={`w-18 h-20 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col gap-1 justify-between`}>
          <div className={`w-full h-9 ${boxBg} rounded-xs border flex items-center justify-center text-[7px] font-bold`}>1 (Lớn)</div>
          <div className="flex gap-1 h-7">
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
            <div className={`flex-1 h-full ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          </div>
        </div>
      );

    // 19. DẢI THẺ ĐƠN 3 ẢNH (2x6 Bookmark)
    case 'strip-3':
      return (
        <div className={`w-10 h-24 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col gap-0.8 justify-center`}>
          <div className={`w-full h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
          <div className={`w-full h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          <div className={`w-full h-6 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          <div className="text-[4px] text-center text-[#8C7A5B] font-mono">2x6 Strip</div>
        </div>
      );

    // 20. DẢI THẺ ĐƠN 4 ẢNH (2x6 Bookmark)
    case 'strip-4':
      return (
        <div className={`w-10 h-24 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 flex flex-col gap-0.6 justify-center`}>
          <div className={`w-full h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>1</div>
          <div className={`w-full h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>2</div>
          <div className={`w-full h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>3</div>
          <div className={`w-full h-4.5 ${boxBg} rounded-xs border flex items-center justify-center text-[5.5px] font-bold`}>4</div>
          <div className="text-[4px] text-center text-[#8C7A5B] font-mono">4-Cuts</div>
        </div>
      );

    // 21. LƯỚI 4 VUÔNG (Grid 4)
    case 'grid-4':
    default:
      return (
        <div className={`w-18 h-18 ${paperBg} rounded-md border-2 ${isSelected ? 'border-amber-500 shadow-sm' : 'border-[#1A1A1A]/20'} p-1 grid grid-cols-2 gap-1`}>
          <div className={`h-6.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>1</div>
          <div className={`h-6.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>2</div>
          <div className={`h-6.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>3</div>
          <div className={`h-6.5 ${boxBg} rounded-xs border flex items-center justify-center text-[6px] font-bold`}>4</div>
        </div>
      );
  }
};

interface FrameStyleIllustrationProps {
  styleId: FrameStyle;
  isSelected?: boolean;
}

export const FrameStyleIllustration: React.FC<FrameStyleIllustrationProps> = ({
  styleId,
  isSelected = false,
}) => {
  switch (styleId) {
    // 1. CLASSIC MINIMAL STUDIO
    case 'classic':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#FAF8F5] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-[#1A1A1A]/15'} p-2 flex flex-col justify-between relative overflow-hidden`}>
          <div className="flex items-center justify-between text-[#8C7A5B]">
            <Sparkles className="w-3 h-3" />
            <span className="text-[7px] font-serif tracking-[0.2em] font-bold">STUDIO EDITORIAL</span>
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="w-full h-11 bg-white border border-[#8C7A5B]/30 rounded-xs shadow-inner flex items-center justify-center">
            <Camera className="w-4 h-4 text-[#8C7A5B]/50" />
          </div>
          <div className="text-center font-serif text-[7.5px] text-[#1A1A1A] font-medium tracking-widest">
            PHOTOBOOTH MEMORY
          </div>
        </div>
      );

    // 2. INSTAGRAM POST
    case 'instagram':
      return (
        <div className={`w-full h-24 rounded-lg bg-white border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-gray-200'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.3 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[5px] font-bold text-gray-700">ig</div>
            </div>
            <span className="text-[7.5px] font-bold text-gray-800 tracking-tight">photobooth.life</span>
          </div>
          {/* Photo frame */}
          <div className="w-full h-11 bg-gradient-to-br from-indigo-50 to-pink-50 rounded-xs border border-gray-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          </div>
          {/* Footer actions */}
          <div className="flex items-center justify-between text-gray-700 px-0.5">
            <div className="flex items-center gap-1.5">
              <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" />
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
            <Bookmark className="w-2.5 h-2.5 text-gray-600" />
          </div>
        </div>
      );

    // 3. VOGUE / MAGAZINE COVER
    case 'magazine':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#111111] text-white border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-neutral-800'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Masthead */}
          <div className="text-center font-serif text-[11px] font-black tracking-[0.25em] text-white leading-none">
            VOGUE
          </div>
          {/* Photo frame */}
          <div className="w-full h-11 bg-neutral-900 border border-neutral-700 rounded-xs flex items-center justify-center relative">
            <span className="text-[6px] font-sans font-bold uppercase tracking-widest text-amber-300/80 bg-black/60 px-1 py-0.2 rounded-xs">
              ISSUE NO. 01
            </span>
          </div>
          {/* Barcode & label */}
          <div className="flex items-center justify-between text-[6px] text-neutral-400 font-mono">
            <span>EDITORIAL</span>
            <span className="font-mono tracking-tighter">❚█❚||||❚█</span>
          </div>
        </div>
      );

    // 4. ONE PIECE WANTED POSTER
    case 'onepiece-wanted':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#DFC296] border-2 ${isSelected ? 'border-amber-600 shadow-md ring-2 ring-amber-500/40' : 'border-[#8C6239]'} p-1.5 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
          {/* Header */}
          <div className="text-center font-serif text-[10px] font-black tracking-widest text-[#3B2211] leading-tight">
            WANTED
          </div>
          {/* Photo area */}
          <div className="w-full h-10 bg-[#FAF3E0] border border-[#8C6239] rounded-xs flex items-center justify-center shadow-inner">
            <Skull className="w-4 h-4 text-[#5A381E]" />
          </div>
          {/* Bounty Footer */}
          <div className="flex flex-col items-center leading-none">
            <span className="text-[5.5px] font-serif font-bold text-[#4A2E18] tracking-wider">DEAD OR ALIVE</span>
            <span className="text-[7.5px] font-serif font-black text-[#5A180E] tracking-tight">฿ 1,500,000,000</span>
          </div>
        </div>
      );

    // 5. CINEMA FILM 35MM
    case 'cinema-film':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#0D0D0D] text-amber-300 border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-neutral-800'} p-1 flex relative overflow-hidden justify-between items-center`}>
          {/* Left film sprockets */}
          <div className="flex flex-col justify-between h-full py-0.5 gap-0.8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 h-2.5 bg-neutral-900 border border-neutral-700 rounded-2xs" />
            ))}
          </div>

          {/* Film Center Canvas */}
          <div className="flex-1 mx-1 h-full flex flex-col justify-between py-0.5">
            <div className="flex justify-between text-[5.5px] font-mono text-amber-400/80">
              <span>KODAK PORTRA</span>
              <span>400-36</span>
            </div>
            <div className="w-full h-11 bg-neutral-900 border border-neutral-800 rounded-xs flex items-center justify-center">
              <Film className="w-4 h-4 text-amber-400/60" />
            </div>
            <div className="text-[5px] text-center font-mono text-amber-400/60">▶ 24A • 35MM FILM</div>
          </div>

          {/* Right film sprockets */}
          <div className="flex flex-col justify-between h-full py-0.5 gap-0.8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 h-2.5 bg-neutral-900 border border-neutral-700 rounded-2xs" />
            ))}
          </div>
        </div>
      );

    // 6. MOVIE TICKET / TICKET STUB
    case 'movie-ticket':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#FFFDF5] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-[#1A1A1A]/20'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Top Notch Tear Effect */}
          <div className="absolute top-1/2 -left-2 w-3.5 h-3.5 rounded-full bg-[#EFEEE8] border border-[#1A1A1A]/20" />
          <div className="absolute top-1/2 -right-2 w-3.5 h-3.5 rounded-full bg-[#EFEEE8] border border-[#1A1A1A]/20" />

          {/* Ticket Header */}
          <div className="flex items-center justify-between text-[#8C7A5B] px-1">
            <Ticket className="w-3 h-3" />
            <span className="text-[6.5px] font-mono font-bold tracking-widest text-[#1A1A1A]">ADMIT ONE VIP</span>
            <span className="text-[6px] font-mono">№ 8492</span>
          </div>

          {/* Photo mockup */}
          <div className="w-full h-11 bg-amber-50/70 border border-dashed border-[#8C7A5B]/40 rounded-xs flex items-center justify-center">
            <span className="text-[6.5px] font-sans font-bold text-[#8C7A5B]">CINEMA PASS</span>
          </div>

          {/* Barcode bottom */}
          <div className="flex items-center justify-between px-1 text-[6px] font-mono text-gray-600">
            <span>SEAT A-12</span>
            <span className="font-mono tracking-tighter text-black font-bold">||| | | |||| |</span>
          </div>
        </div>
      );

    // 7. POLAROID / INSTAX
    case 'polaroid':
      return (
        <div className={`w-full h-24 rounded-lg bg-white border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-gray-200'} p-1.5 pb-2 flex flex-col justify-between shadow-sm relative overflow-hidden`}>
          {/* Photo frame */}
          <div className="w-full h-13.5 bg-neutral-100 border border-neutral-200 rounded-xs flex items-center justify-center shadow-inner">
            <Camera className="w-4 h-4 text-neutral-400" />
          </div>
          {/* Polaroid Chin handwriting */}
          <div className="text-center font-serif italic text-[8px] text-gray-700 font-bold tracking-tight">
            sweet memory ♡
          </div>
        </div>
      );

    // 8. VINYL RECORD / CD COVER
    case 'vinyl-cd':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#241E1C] text-[#F5EFEB] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-neutral-800'} p-1.5 flex items-center justify-between relative overflow-hidden`}>
          {/* Album sleeve left */}
          <div className="w-[58%] h-full bg-[#352D2A] border border-[#524641] rounded-xs p-1 flex flex-col justify-between z-10 shadow-lg">
            <span className="text-[5.5px] font-sans font-bold text-amber-200">VINYL EDITION</span>
            <Music className="w-3.5 h-3.5 text-amber-300 mx-auto" />
            <span className="text-[5px] font-mono text-neutral-400">SIDE A • 33 RPM</span>
          </div>

          {/* Grooved vinyl disc sticking out right */}
          <div className="w-16 h-16 -mr-4 rounded-full bg-black border-2 border-neutral-800 flex items-center justify-center relative shadow-xl">
            <div className="w-11 h-11 rounded-full border border-neutral-700/60" />
            <div className="w-7 h-7 rounded-full border border-neutral-700/80" />
            <div className="w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
        </div>
      );

    // 9. NHÃN DINH DƯỠNG KỶ NIỆM (NUTRITION LABEL)
    case 'nutrition-label':
      return (
        <div className={`w-full h-24 rounded-lg bg-white border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-[#1A1A1A]'} p-1.5 flex flex-col gap-0.5 relative overflow-hidden`}>
          <div className="text-center font-sans text-[9px] font-black tracking-tight text-[#1A1A1A] border-b-2 border-[#1A1A1A] pb-0.5">
            NHÃN DINH DƯỠNG
          </div>
          <div className="flex items-center justify-between text-[5.5px] font-mono text-[#1A1A1A] border-b border-[#1A1A1A]/40 pb-0.5">
            <span>KHẨU PHẦN: 1 KỶ NIỆM</span>
            <Tag className="w-2.5 h-2.5" />
          </div>
          <div className="flex-1 flex flex-col gap-0.3 justify-center text-[5px] font-mono text-[#1A1A1A]">
            <div className="flex justify-between border-b border-dotted border-[#1A1A1A]/40"><span>Tình Yêu</span><span>100%</span></div>
            <div className="flex justify-between border-b border-dotted border-[#1A1A1A]/40"><span>Niềm Tin</span><span>100%</span></div>
            <div className="flex justify-between border-b border-dotted border-[#1A1A1A]/40"><span>Hạnh Phúc</span><span>100%</span></div>
          </div>
          <Barcode className="w-full h-3.5 text-[#1A1A1A]" />
        </div>
      );

    // 10. SỔ LƯU NIỆM CẮT DÁN (SCRAPBOOK)
    case 'scrapbook':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#EFE7D8] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-[#8C7A5B]/40'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Washi tape corners */}
          <div className="absolute -top-1 left-2 w-6 h-2.5 bg-amber-300/70 -rotate-6 rounded-2xs" />
          <div className="absolute -top-1 right-2 w-6 h-2.5 bg-rose-300/70 rotate-6 rounded-2xs" />
          <div className="w-full h-12 bg-[#E4D9C4] border border-[#8C7A5B]/50 rounded-xs flex items-center justify-center shadow-inner mt-2">
            <Camera className="w-4 h-4 text-[#8C7A5B]/60" />
          </div>
          <div className="flex items-center justify-between px-0.5">
            <PenLine className="w-2.5 h-2.5 text-[#3A332A]/60" />
            <span className="text-[7px] font-serif italic text-[#3A332A] tracking-tight -rotate-2">ghi chú tay ♡</span>
          </div>
        </div>
      );

    // 11. VÉ CONCERT / BOOKMARK (K-POP)
    case 'concert-ticket':
      return (
        <div className={`w-full h-24 rounded-lg bg-gradient-to-b from-[#1A1A2E] to-[#2D1B4E] border-2 ${isSelected ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30' : 'border-[#F5D67B]/30'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Perforated left edge */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-around py-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 h-1.5 -ml-0.75 rounded-full bg-[#F9F7F2]" />
            ))}
          </div>
          <div className="text-center text-[6px] font-bold tracking-[0.2em] text-[#F5D67B] ml-1.5">ADMIT ONE • VIP</div>
          <div className="w-full h-9 bg-black/30 border border-[#F5D67B]/30 rounded-xs flex items-center justify-center ml-1.5">
            <Camera className="w-3.5 h-3.5 text-[#F5D67B]/60" />
          </div>
          <div className="flex items-center justify-between ml-1.5 text-[5px] font-mono text-[#F5D67B]/80">
            <span>01. INTRO 02. MEMORY</span>
          </div>
          <div className="flex items-center justify-between ml-1.5">
            <span className="text-[5px] font-mono text-[#F5D67B]/60">TRACK 01</span>
            <QrCode className="w-3.5 h-3.5 text-[#F5D67B]" />
          </div>
        </div>
      );

    // 12. THIỆP GẤP ĐĨA NHẠC (VINYL FOLD CARD)
    case 'vinyl-foldcard':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#2B2623] text-[#F3ECE4] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-neutral-800'} p-1.5 flex relative overflow-hidden`}>
          <div className="w-1/2 h-full flex flex-col items-center justify-center gap-1 pr-1.5">
            <Disc3 className="w-8 h-8 text-amber-200/80" />
            <span className="text-[5px] font-mono text-neutral-400">SIDE A</span>
          </div>
          {/* Dashed fold line */}
          <div className="w-0 border-l border-dashed border-amber-300/50 relative">
            <Scissors className="w-2.5 h-2.5 text-amber-300/70 absolute top-1/2 -left-1.2 -translate-y-1/2 rotate-90" />
          </div>
          <div className="w-1/2 h-full flex flex-col items-center justify-center gap-1 pl-1.5">
            <div className="w-full h-10 bg-[#3A322E] border border-[#524641] rounded-xs flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <span className="text-[5px] font-mono text-neutral-400">GẤP ĐÔI TẠI ĐÂY</span>
          </div>
        </div>
      );

    // 13. THIỆP GẤP THƯƠNG HIỆU (BRANDED FOLD CARD)
    case 'branded-foldcard':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#1A1A1A] text-white border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-neutral-800'} p-1.5 flex relative overflow-hidden`}>
          <div className="w-1/2 h-full flex flex-col items-center justify-center gap-1 pr-1.5">
            <Award className="w-5 h-5 text-amber-300" />
            <span className="text-[6px] font-serif font-bold tracking-widest text-center leading-tight">SOCIAL CLUB</span>
          </div>
          <div className="w-0 border-l border-dashed border-white/30 relative">
            <Scissors className="w-2.5 h-2.5 text-white/60 absolute top-1/2 -left-1.2 -translate-y-1/2 rotate-90" />
          </div>
          <div className="w-1/2 h-full flex items-center justify-center pl-1.5">
            <div className="w-full h-13 bg-white text-neutral-700 border border-neutral-300 rounded-xs flex items-center justify-center shadow-sm">
              <Camera className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </div>
      );

    // 14. VÉ TÀU KỶ NIỆM (TRAIN TICKET)
    case 'train-ticket':
      return (
        <div className={`w-full h-24 rounded-lg bg-[#F5F0E4] border-2 ${isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'border-[#8C7A5B]/40'} p-1.5 flex flex-col justify-between relative overflow-hidden`}>
          {/* Scalloped notches top & bottom */}
          <div className="absolute -top-1 left-0 w-full flex justify-around">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-white border border-[#8C7A5B]/30" />)}
          </div>
          <div className="flex items-center justify-between text-[5.5px] font-mono text-[#4A3A24] mt-1.5">
            <TrainFront className="w-3 h-3" />
            <span className="font-bold tracking-wider">GA KỶ NIỆM → GA HẠNH PHÚC</span>
          </div>
          <div className="w-full h-9 border-2 border-dashed border-[#8C7A5B]/50 rounded-xs flex items-center justify-center bg-white/40">
            <Camera className="w-3.5 h-3.5 text-[#8C7A5B]/50" />
          </div>
          <div className="flex items-center justify-between text-[5px] font-mono text-[#4A3A24]/70">
            <span>GHẾ: A-01 • TOA: 01</span>
            <span className="font-bold">VÉ KỶ NIỆM</span>
          </div>
        </div>
      );

    default:
      return null;
  }
};
