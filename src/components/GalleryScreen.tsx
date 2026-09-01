import React, { useMemo, useState, useCallback } from 'react';
import { AppScreen, CapturedPhoto, StripLayout } from '../types';
import { LAYOUT_OPTIONS } from '../constants/filters';

interface GalleryScreenProps {
  onNavigate: (screen: AppScreen) => void;
  capturedPhotos: CapturedPhoto[];
  onDeletePhoto: (id: string) => void;
  // Bố cục khách đã chọn ban đầu — quyết định số ô cần gán ở cột hậu kỳ bên phải.
  selectedLayout: StripLayout;
  // Xác nhận danh sách ảnh đã gán đủ ô, dùng làm nguồn cho màn Chia Sẻ, rồi chuyển sang đó.
  onConfirmSelection: (photos: CapturedPhoto[]) => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({
  onNavigate,
  capturedPhotos,
  onDeletePhoto,
  selectedLayout,
  onConfirmSelection,
}) => {
  const requiredCount = useMemo(() => {
    const cfg = LAYOUT_OPTIONS.find((l) => l.id === selectedLayout);
    return cfg ? cfg.photoCount : 3;
  }, [selectedLayout]);

  // Cột phải: mảng cố định requiredCount ô, mỗi ô chứa id ảnh hoặc null (còn trống).
  const [staged, setStaged] = useState<(string | null)[]>(() => Array.from({ length: requiredCount }, () => null));

  // Nếu layout đổi (số ô cần thay đổi) trong lúc đang ở Thư Viện: giữ lại các ảnh đã gán còn hợp lệ,
  // cắt bớt hoặc thêm ô trống cho khớp số lượng mới.
  React.useEffect(() => {
    setStaged((prev) => {
      if (prev.length === requiredCount) return prev;
      const next = prev.slice(0, requiredCount);
      while (next.length < requiredCount) next.push(null);
      return next;
    });
  }, [requiredCount]);

  const stagedIdSet = useMemo(() => new Set(staged.filter((id): id is string => !!id)), [staged]);
  const filledCount = staged.filter((id) => !!id).length;
  const isComplete = filledCount === requiredCount && requiredCount > 0;

  // Gán 1 ảnh vào ô trống đầu tiên còn lại (dùng cho bấm chọn ở cột trái, hoặc thả kéo vào cột phải nói chung)
  const assignToNextEmptySlot = useCallback(
    (photoId: string) => {
      setStaged((prev) => {
        if (prev.includes(photoId)) return prev; // đã có trong danh sách chờ rồi
        const emptyIdx = prev.findIndex((id) => id === null);
        if (emptyIdx === -1) return prev; // hết chỗ trống
        const next = [...prev];
        next[emptyIdx] = photoId;
        return next;
      });
    },
    []
  );

  // Gán 1 ảnh vào đúng ô chỉ định (dùng khi thả kéo trực tiếp vào 1 ô cụ thể)
  const assignToSlot = useCallback((slotIdx: number, photoId: string) => {
    setStaged((prev) => {
      const withoutDup = prev.map((id) => (id === photoId ? null : id));
      const next = [...withoutDup];
      next[slotIdx] = photoId;
      return next;
    });
  }, []);

  // Bỏ 1 ảnh ra khỏi ô (kéo ra / bấm lại)
  const removeFromSlot = useCallback((slotIdx: number) => {
    setStaged((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }, []);

  const handleLeftPhotoTap = (photoId: string) => {
    if (stagedIdSet.has(photoId)) {
      // Bấm lại ảnh đã chọn ở cột trái = bỏ nó ra khỏi ô đang gán
      setStaged((prev) => prev.map((id) => (id === photoId ? null : id)));
    } else {
      assignToNextEmptySlot(photoId);
    }
  };

  const handleConfirm = () => {
    const photos = staged
      .map((id) => capturedPhotos.find((p) => p.id === id))
      .filter((p): p is CapturedPhoto => !!p);
    if (photos.length === 0) return;
    onConfirmSelection(photos);
    onNavigate('share');
  };

  // Kéo-thả HTML5 (bổ trợ cho chuột trên desktop — thao tác chính vẫn là bấm chọn, dùng tốt trên cảm ứng)
  const handleDragStartLeft = (e: React.DragEvent, photoId: string) => {
    e.dataTransfer.setData('text/photo-id', photoId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnSlot = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const photoId = e.dataTransfer.getData('text/photo-id');
    if (photoId) assignToSlot(slotIdx, photoId);
  };
  const handleDragStartSlot = (e: React.DragEvent, slotIdx: number) => {
    e.dataTransfer.setData('text/slot-idx', String(slotIdx));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnLeft = (e: React.DragEvent) => {
    e.preventDefault();
    const slotIdxRaw = e.dataTransfer.getData('text/slot-idx');
    if (slotIdxRaw !== '') removeFromSlot(Number(slotIdxRaw));
  };

  return (
    <div className="w-full h-full flex flex-col select-none text-[#1A1A1A]">
      {capturedPhotos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center text-[#1A1A1A]/50">
          <span className="material-symbols-outlined text-[48px]">photo_library</span>
          <p className="text-sm font-sans">Chưa có tấm ảnh nào được chụp.</p>
          <button
            onClick={() => onNavigate('camera')}
            className="mt-2 px-5 py-2.5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#8C7A5B] transition-all"
          >
            Chụp Ảnh Ngay
          </button>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-6xl mx-auto px-3 md:px-6 flex flex-col md:flex-row gap-4 md:gap-5 min-h-0">
          {/* CỘT TRÁI (LỚN HƠN): TOÀN BỘ ẢNH ĐÃ CHỤP, KHÔNG TÁCH LƯỢT */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnLeft}
            className="flex-[2.2] min-h-0 flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                Tất Cả Ảnh ({capturedPhotos.length})
              </h3>
              <span className="text-[10px] font-sans text-[#1A1A1A]/50">Bấm ảnh để đưa vào ô hậu kỳ →</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {capturedPhotos.map((photo) => {
                  const isStaged = stagedIdSet.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={(e) => handleDragStartLeft(e, photo.id)}
                      onClick={() => handleLeftPhotoTap(photo.id)}
                      className={`aspect-square bg-[#1A1A1A] overflow-hidden relative cursor-pointer active:scale-[0.97] transition-transform border-2 ${
                        isStaged ? 'border-amber-500 ring-2 ring-amber-400/60' : 'border-[#1A1A1A]/10'
                      }`}
                    >
                      <img
                        src={photo.dataUrl}
                        alt="Ảnh đã chụp"
                        className={`w-full h-full object-cover transition-opacity ${isStaged ? 'opacity-50' : ''}`}
                      />

                      {isStaged && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <span className="material-symbols-outlined text-white text-[26px] drop-shadow-md">
                            check_circle
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePhoto(photo.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/55 hover:bg-red-700 active:bg-red-700 text-white flex items-center justify-center rounded-full shadow-sm transition-colors"
                        title="Xóa tấm ảnh này"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (NHỎ HƠN): SỐ Ô CHỜ HẬU KỲ THEO ĐÚNG BỐ CỤC ĐÃ CHỌN */}
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 md:max-w-[280px]">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                Chờ Hậu Kỳ ({filledCount}/{requiredCount})
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-3">
              <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                {staged.map((photoId, slotIdx) => {
                  const photo = photoId ? capturedPhotos.find((p) => p.id === photoId) : null;
                  return (
                    <div
                      key={slotIdx}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnSlot(e, slotIdx)}
                      draggable={!!photo}
                      onDragStart={(e) => photo && handleDragStartSlot(e, slotIdx)}
                      onClick={() => photo && removeFromSlot(slotIdx)}
                      className={`aspect-square relative overflow-hidden transition-all ${
                        photo
                          ? 'bg-[#1A1A1A] cursor-pointer active:scale-[0.97]'
                          : 'bg-[#EFEEE8] border-2 border-dashed border-[#1A1A1A]/20 flex items-center justify-center'
                      }`}
                      title={photo ? 'Bấm để bỏ ảnh này ra' : `Ô #${slotIdx + 1} còn trống`}
                    >
                      {photo ? (
                        <>
                          <img src={photo.dataUrl} alt={`Ô #${slotIdx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1 w-6 h-6 bg-black/55 text-white flex items-center justify-center rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-[#1A1A1A]/35">#{slotIdx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NÚT GỬI SANG HẬU KỲ / CHIA SẺ (HÌNH MÁY BAY GIẤY) */}
            <button
              onClick={handleConfirm}
              disabled={!isComplete}
              className={`w-full py-3.5 font-sans text-xs uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                isComplete
                  ? 'bg-[#1A1A1A] hover:bg-[#8C7A5B] text-[#F9F7F2] cursor-pointer active:scale-[0.98]'
                  : 'bg-[#1A1A1A]/15 text-[#1A1A1A]/40 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{isComplete ? 'Qua Hậu Kỳ & Chia Sẻ' : `Còn Thiếu ${requiredCount - filledCount} Ảnh`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
