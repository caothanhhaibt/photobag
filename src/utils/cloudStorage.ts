// Tiện ích gọi tới "Cloudflare Worker" trung gian để tải ảnh/video lên Cloudflare R2, liệt kê và
// xóa file — xem hướng dẫn triển khai Worker trong thư mục cloudflare-worker/ ở gốc dự án.
//
// Vì sao cần qua 1 Worker trung gian thay vì gọi thẳng R2 từ trình duyệt: R2 (và mọi kho lưu trữ
// kiểu S3) yêu cầu ký request bằng khóa bí mật — nếu gọi thẳng từ trình duyệt sẽ lộ khóa đó ra
// ngoài (ai mở DevTools trên máy kiosk cũng xem được). Worker giữ khóa đó an toàn phía server,
// trình duyệt chỉ cần biết địa chỉ Worker + 1 mã token xác thực (không phải khóa R2 thật).
import type { CloudStorageConfig } from '../types';

export interface CloudObjectInfo {
  key: string;
  url: string;
  size: number;
  uploaded: string;
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isCloudStorageConfigured(config?: CloudStorageConfig | null): boolean {
  return !!(config?.workerUrl && config.workerUrl.trim());
}

function authHeaders(config: CloudStorageConfig): Record<string, string> {
  return config.uploadToken && config.uploadToken.trim()
    ? { Authorization: `Bearer ${config.uploadToken.trim()}` }
    : {};
}

/** Tải 1 ảnh/video (Blob) lên kho lưu trữ đám mây, trả về link công khai để tạo mã QR. */
export async function uploadPhotoToCloud(
  blob: Blob,
  config: CloudStorageConfig
): Promise<{ url: string; key: string }> {
  if (!isCloudStorageConfigured(config)) {
    throw new Error(
      'Chưa cấu hình nơi lưu ảnh trên đám mây. Vào Admin → Quản Lý Ảnh & Bộ Nhớ để nhập địa chỉ Worker.'
    );
  }
  const base = normalizeBase(config.workerUrl!);
  const res = await fetch(`${base}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'image/png',
      ...authHeaders(config),
    },
    body: blob,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Tải ảnh lên thất bại (mã lỗi ${res.status}).${detail ? ` ${detail}` : ''}`);
  }
  const data = (await res.json().catch(() => null)) as { url?: string; key?: string } | null;
  if (!data?.url || !data?.key) {
    throw new Error('Máy chủ lưu trữ trả về dữ liệu không hợp lệ (thiếu link ảnh).');
  }
  return { url: data.url, key: data.key };
}

/** Liệt kê toàn bộ file đã lưu trên đám mây — dùng cho màn Admin dọn dẹp thủ công. */
export async function listCloudObjects(config: CloudStorageConfig): Promise<CloudObjectInfo[]> {
  if (!isCloudStorageConfigured(config)) return [];
  const base = normalizeBase(config.workerUrl!);
  const res = await fetch(`${base}/list`, { headers: authHeaders(config) });
  if (!res.ok) {
    throw new Error(`Không tải được danh sách ảnh trên đám mây (mã lỗi ${res.status}).`);
  }
  const data = (await res.json().catch(() => null)) as { objects?: CloudObjectInfo[] } | null;
  return Array.isArray(data?.objects) ? data!.objects! : [];
}

/** Xóa 1 file đã lưu trên đám mây theo key. */
export async function deleteCloudObject(config: CloudStorageConfig, key: string): Promise<void> {
  if (!isCloudStorageConfigured(config)) return;
  const base = normalizeBase(config.workerUrl!);
  const res = await fetch(`${base}/object/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(config),
  });
  if (!res.ok) {
    throw new Error(`Xóa ảnh trên đám mây thất bại (mã lỗi ${res.status}).`);
  }
}
