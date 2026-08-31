// PhotoBag Upload Worker
// -----------------------------------------------------------------------------
// Nhận ảnh/video từ app PhotoBag, lưu vào Cloudflare R2, trả về link công khai
// để app tạo mã QR cho khách quét tải về. Cũng phục vụ màn Admin > Quản Lý Ảnh &
// Bộ Nhớ để xem danh sách và xóa file khi cần.
//
// Hướng dẫn triển khai đầy đủ: xem README.md cùng thư mục này.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Kiểm tra mã token gửi kèm (header Authorization: Bearer <UPLOAD_TOKEN>) có khớp với mã bí mật
// đã đặt trên Worker hay không. Nếu bạn CHƯA đặt UPLOAD_TOKEN (không khuyến khích), Worker sẽ bỏ
// qua bước kiểm tra này — chỉ nên dùng để thử nghiệm nhanh, không nên dùng lâu dài vì bất kỳ ai
// biết địa chỉ Worker cũng tải/xóa được ảnh.
function checkAuth(request, env) {
  if (!env.UPLOAD_TOKEN) return true;
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.UPLOAD_TOKEN}`;
}

function extFromContentType(contentType) {
  if (!contentType) return 'bin';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('mp4')) return 'mp4';
  return 'bin';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (!env.PHOTO_BUCKET) {
      return json({ error: 'Worker chưa được gắn bucket R2 (PHOTO_BUCKET). Xem README.md.' }, 500);
    }

    if (!checkAuth(request, env)) {
      return json({ error: 'Không có quyền truy cập (sai hoặc thiếu mã token xác thực).' }, 401);
    }

    // POST /upload — lưu 1 ảnh/video mới, trả về key + link công khai
    if (request.method === 'POST' && url.pathname === '/upload') {
      const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
      const ext = extFromContentType(contentType);
      const key = `${crypto.randomUUID()}.${ext}`;

      await env.PHOTO_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      const base = (env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
      if (!base) {
        return json({ error: 'Worker chưa cấu hình PUBLIC_BASE_URL. Xem README.md.' }, 500);
      }
      return json({ key, url: `${base}/${key}` });
    }

    // GET /list — liệt kê các file đã lưu (dùng cho màn Admin dọn dẹp)
    if (request.method === 'GET' && url.pathname === '/list') {
      const base = (env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
      const objects = [];
      let cursor;
      do {
        const listed = await env.PHOTO_BUCKET.list({ limit: 1000, cursor });
        for (const o of listed.objects) {
          objects.push({
            key: o.key,
            url: `${base}/${o.key}`,
            size: o.size,
            uploaded: o.uploaded,
          });
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      return json({ objects });
    }

    // DELETE /object/<key> — xóa 1 file theo key
    if (request.method === 'DELETE' && url.pathname.startsWith('/object/')) {
      const key = decodeURIComponent(url.pathname.replace('/object/', ''));
      if (!key) return json({ error: 'Thiếu tên file cần xóa.' }, 400);
      await env.PHOTO_BUCKET.delete(key);
      return json({ deleted: key });
    }

    return json({ error: 'Không tìm thấy đường dẫn này.' }, 404);
  },
};
