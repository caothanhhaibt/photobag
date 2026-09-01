import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AppScreen, CapturedPhoto } from '../types';

interface GalleryScreenProps {
  onNavigate: (screen: AppScreen) => void;
  capturedPhotos: CapturedPhoto[];
  onDeletePhoto: (id: string) => void;
  onSelectPhotoForFilter: (photo: CapturedPhoto) => void;
  // Gán 1 lượt chụp (nhóm ảnh) làm nguồn cho màn Chia Sẻ, rồi chuyển sang đó để ghép dải ảnh.
  onUseSessionForShare?: (photos: CapturedPhoto[]) => void;
}

// Khoảng cách thời gian tối đa (phút) giữa 2 tấm ảnh để vẫn tính là cùng 1 lượt chụp.
const SESSION_GAP_MS = 3 * 60 * 1000;

// Gom danh sách ảnh (đã sắp xếp mới nhất trước) thành từng nhóm theo lượt chụp,
// dựa trên khoảng cách thời gian giữa các tấm — giúp phân biệt rõ "đây là ảnh của
// nhóm khách nào" thay vì dồn chung tất cả vào 1 lưới phẳng.
function groupPhotosIntoSessions(photos: CapturedPhoto[]): CapturedPhoto[][] {
  const groups: CapturedPhoto[][] = [];
  let current: CapturedPhoto[] = [];

  for (const photo of photos) {
    if (current.length === 0) {
      current.push(photo);
      continue;
    }
    const prev = current[current.length - 1];
    if (prev.timestamp - photo.timestamp <= SESSION_GAP_MS) {
      current.push(photo);
    } else {
      groups.push(current);
      current = [photo];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function formatSessionLabel(newestTimestamp: number, isFirstGroup: boolean): string {
  const diffMs = Date.now() - newestTimestamp;
  if (isFirstGroup && diffMs < 2 * 60 * 1000) return 'Lượt Chụp Vừa Xong';

  const d = new Date(newestTimestamp);
  const isToday = new Date().toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hôm Nay • ${timeStr}`;
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return `${dateStr} • ${timeStr}`;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({
  onNavigate,
  capturedPhotos,
  onDeletePhoto,
  onSelectPhotoForFilter,
  onUseSessionForShare,
}) => {
  const sessions = useMemo(() => groupPhotosIntoSessions(capturedPhotos), [capturedPhotos]);

  // Ảnh đang mở xem phóng to (lightbox), lưu theo id để danh sách phẳng luôn khớp
  // dù ảnh có bị xoá/thay đổi thứ tự giữa chừng.
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const lightboxIndex = lightboxId ? capturedPhotos.findIndex((p) => p.id === lightboxId) : -1;
  const lightboxPhoto = lightboxIndex >= 0 ? capturedPhotos[lightboxIndex] : null;

  const goToRelative = useCallback(
    (delta: number) => {
      if (lightboxIndex < 0 || capturedPhotos.length === 0) return;
      const nextIndex = (lightboxIndex + delta + capturedPhotos.length) % capturedPhotos.length;
      setLightboxId(capturedPhotos[nextIndex].id);
    },
    [lightboxIndex, capturedPhotos]
  );

  // Đóng lightbox tự động nếu ảnh đang xem bị xoá khỏi danh sách
  useEffect(() => {
    if (lightboxId && lightboxIndex < 0) {
      setLightboxId(null);
    }
  }, [lightboxId, lightboxIndex]);

  // Điều hướng bằng phím mũi tên / Esc khi lightbox đang mở
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToRelative(-1);
      else if (e.key === 'ArrowRight') goToRelative(1);
      else if (e.key === 'Escape') setLightboxId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhoto, goToRelative]);

  const handleDeleteFromLightbox = (id: string) => {
    onDeletePhoto(id);
  };

  const handleUseForColorEdit = (photo: CapturedPhoto) => {
    onSelectPhotoForFilter(photo);
    onNavigate('filters');
  };

  return (
    <div className="w-full max-w-6xl mx-auto pt-2 md:pt-6 px-4 md:px-8 flex flex-col gap-6 select-none pb-28 md:pb-12 text-[#1A1A1A]">
      {/* Tiêu Đề (rút gọn chỉ còn dòng thống kê — đã có nút quay lại chụp ảnh ở thanh trên) */}
      <div className="border-b border-[#1A1A1A]/10 pb-3">
        <p className="text-[11px] font-sans text-[#1A1A1A]/60 uppercase tracking-widest">
          {capturedPhotos.length} Tấm Ảnh • {sessions.length} Lượt Chụp
        </p>
      </div>

      {/* Trạng Thái Trống */}
      {capturedPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-[#1A1A1A]/50">
          <span className="material-symbols-outlined text-[48px]">photo_library</span>
          <p className="text-sm font-sans">Chưa có tấm ảnh nào được chụp.</p>
          <button
            onClick={() => onNavigate('camera')}
            className="mt-2 px-5 py-2.5 bg-[#1A1A1A] text-[#F9F7F2] font-sans text-xs uppercase tracking-[0.2em] hover:bg-[#8C7A5B] transition-all"
          >
            Chụp Ảnh Ngay
          </button>
        </div>
      )}

      {/* Danh Sách Ảnh Theo Từng Lượt Chụp */}
      <div className="flex flex-col gap-8">
        {sessions.map((group, groupIdx) => (
          <div key={group[0].id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A5B]" />
                <h3 className="text-[11px] font-sans font-bold text-[#1A1A1A] uppercase tracking-[0.2em]">
                  {formatSessionLabel(group[0].timestamp, groupIdx === 0)}
                </h3>
                <span className="text-[10px] font-sans text-[#1A1A1A]/40 uppercase tracking-wider">
                  {group.length} tấm
                </span>
              </div>

              {onUseSessionForShare && (
                <button
                  onClick={() => {
                    onUseSessionForShare(group);
                    onNavigate('share');
                  }}
                  className="px-3.5 py-1.5 bg-transparent border border-[#1A1A1A]/20 text-[#1A1A1A] font-sans text-[10.5px] uppercase tracking-wider hover:bg-[#1A1A1A]/5 transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  <span>Ghép Dải Ảnh Từ Lượt Này</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {group.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxId(photo.id)}
                  className="aspect-square bg-[#1A1A1A] overflow-hidden border border-[#1A1A1A]/15 relative cursor-pointer active:scale-[0.97] transition-transform"
                >
                  <img src={photo.dataUrl} alt="Ảnh đã chụp" className="w-full h-full object-cover" />

                  {/* Nút xoá luôn hiển thị (không dựa vào hover) để dùng tốt trên màn cảm ứng */}
                  {capturedPhotos.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePhoto(photo.id);
                      }}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/55 hover:bg-red-700 active:bg-red-700 text-white flex items-center justify-center rounded-full shadow-sm transition-colors"
                      title="Xóa tấm ảnh này"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* LIGHTBOX: Xem Ảnh Phóng To Toàn Màn Hình */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxId(null)}
        >
          {/* Nút Đóng */}
          <button
            onClick={() => setLightboxId(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
            title="Đóng"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>

          {/* Đếm Số Thứ Tự */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1.5 bg-white/10 text-white rounded-full text-[11px] font-sans font-bold tracking-wider z-10">
            {lightboxIndex + 1} / {capturedPhotos.length}
          </div>

          {/* Nút Trước */}
          {capturedPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToRelative(-1);
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
              title="Ảnh trước"
            >
              <span className="material-symbols-outlined text-[26px]">chevron_left</span>
            </button>
          )}

          {/* Ảnh Phóng To */}
          <img
            src={lightboxPhoto.dataUrl}
            alt="Xem ảnh phóng to"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[70vh] sm:max-h-[75vh] object-contain shadow-2xl"
          />

          {/* Nút Sau */}
          {capturedPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToRelative(1);
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
              title="Ảnh sau"
            >
              <span className="material-symbols-outlined text-[26px]">chevron_right</span>
            </button>
          )}

          {/* Thanh Thao Tác Dưới Cùng */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-5 flex items-center gap-2.5 flex-wrap justify-center"
          >
            <button
              onClick={() => handleUseForColorEdit(lightboxPhoto)}
              className="px-4 py-2.5 bg-white text-[#1A1A1A] font-sans text-[11px] uppercase tracking-wider hover:bg-[#EFEEE8] transition-all flex items-center gap-2 rounded-full shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Chỉnh Màu</span>
            </button>
            <a
              href={lightboxPhoto.dataUrl}
              download={`photobag-${lightboxPhoto.id}.png`}
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2.5 bg-white/10 text-white font-sans text-[11px] uppercase tracking-wider hover:bg-white/20 transition-all flex items-center gap-2 rounded-full"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Tải Ảnh Này</span>
            </a>
            {capturedPhotos.length > 1 && (
              <button
                onClick={() => handleDeleteFromLightbox(lightboxPhoto.id)}
                className="px-4 py-2.5 bg-red-950/50 text-red-200 font-sans text-[11px] uppercase tracking-wider hover:bg-red-900/60 transition-all flex items-center gap-2 rounded-full"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Xóa Ảnh Này</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
