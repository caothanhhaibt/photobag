// PhotoBag Upload Worker
// -----------------------------------------------------------------------------
// Nhận ảnh/video từ app PhotoBag, lưu vào Cloudflare R2, trả về link công khai
// để app tạo mã QR cho khách quét tải về. Cũng phục vụ màn Admin > Quản Lý Ảnh &
// Bộ Nhớ để xem danh sách và xóa file khi cần.
//
// Ngoài ra Worker này còn giữ THỐNG KÊ TỔNG dùng chung cho nhiều máy/nhiều địa điểm cùng 1 tài
// khoản cho thuê (lưu trong Cloudflare KV, namespace STATS_KV) — mỗi lần khách chụp xong / tải ảnh
// QR / xuất file in, app sẽ âm thầm gọi POST /stats/increment để cộng dồn số liệu vào đây. Chủ máy
// xem tổng số liệu từ xa (không cần đứng tại máy) qua link riêng dạng:
//   https://<worker-url>/stats-page?key=<Mã Tài Khoản Thống Kê>
// Link này CHÍNH LÀ "mã bí mật" — ai biết đúng "Mã Tài Khoản Thống Kê" mới xem được số liệu, không
// cần đăng nhập. Vì vậy nên đặt mã đó dài & khó đoán (xem gợi ý trong README.md).
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

function html(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
  });
}

// Kiểm tra mã token gửi kèm (header Authorization: Bearer <UPLOAD_TOKEN>) có khớp với mã bí mật
// đã đặt trên Worker hay không. Nếu bạn CHƯA đặt UPLOAD_TOKEN (không khuyến khích), Worker sẽ bỏ
// qua bước kiểm tra này — chỉ nên dùng để thử nghiệm nhanh, không nên dùng lâu dài vì bất kỳ ai
// biết địa chỉ Worker cũng tải/xóa được ảnh (hoặc cộng khống số liệu thống kê).
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

// Chỉ nhận số nguyên không âm hợp lệ làm số lượng cộng dồn — bỏ qua giá trị rác (NaN, âm, chuỗi...)
// để 1 request lỗi không làm hỏng số liệu đã tích lũy.
function safeDelta(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

const STATS_KEY_PREFIX = 'stats:';

async function readStats(env, accountKey) {
  const raw = await env.STATS_KV.get(STATS_KEY_PREFIX + accountKey);
  if (!raw) {
    return { totalSessions: 0, totalPhotosCaptured: 0, totalQrShares: 0, totalStripsExported: 0, updatedAt: null };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      totalSessions: parsed.totalSessions || 0,
      totalPhotosCaptured: parsed.totalPhotosCaptured || 0,
      totalQrShares: parsed.totalQrShares || 0,
      totalStripsExported: parsed.totalStripsExported || 0,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { totalSessions: 0, totalPhotosCaptured: 0, totalQrShares: 0, totalStripsExported: 0, updatedAt: null };
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderStatsPage(accountKey, stats) {
  const updated = stats.updatedAt ? new Date(stats.updatedAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu';
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="30" />
<title>Thống Kê PhotoBag</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 48px; min-height: 100vh;
    background: linear-gradient(160deg, #1A1A1A 0%, #2A2A2A 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #F9F7F2;
  }
  .wrap { max-width: 480px; margin: 0 auto; }
  h1 {
    font-size: 13px; text-transform: uppercase; letter-spacing: 0.25em; font-weight: 700;
    color: #8C7A5B; text-align: center; margin: 0 0 4px;
  }
  .sub { text-align: center; font-size: 11px; color: rgba(249,247,242,0.5); margin: 0 0 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card {
    background: rgba(249,247,242,0.06); border: 1px solid rgba(249,247,242,0.12);
    border-radius: 16px; padding: 18px 14px; text-align: center;
  }
  .card .num { font-size: 28px; font-weight: 800; font-family: monospace; color: #F9F7F2; }
  .card .label {
    margin-top: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
    color: rgba(249,247,242,0.55); font-weight: 600;
  }
  .footer { text-align: center; margin-top: 28px; font-size: 10.5px; color: rgba(249,247,242,0.35); }
  .footer code { color: rgba(249,247,242,0.55); }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Thống Kê Tổng — PhotoBag</h1>
    <p class="sub">Cộng dồn từ tất cả các máy dùng chung mã tài khoản này · Cập nhật lần cuối: ${escapeHtml(updated)}</p>
    <div class="grid">
      <div class="card">
        <div class="num">${stats.totalSessions.toLocaleString('vi-VN')}</div>
        <div class="label">Lượt Chụp</div>
      </div>
      <div class="card">
        <div class="num">${stats.totalPhotosCaptured.toLocaleString('vi-VN')}</div>
        <div class="label">Ảnh Đã Chụp</div>
      </div>
      <div class="card">
        <div class="num">${stats.totalQrShares.toLocaleString('vi-VN')}</div>
        <div class="label">Lượt Chia Sẻ QR</div>
      </div>
      <div class="card">
        <div class="num">${stats.totalStripsExported.toLocaleString('vi-VN')}</div>
        <div class="label">Dải Ảnh Đã Xuất</div>
      </div>
    </div>
    <p class="footer">Trang tự làm mới mỗi 30 giây · Mã tài khoản: <code>${escapeHtml(accountKey)}</code></p>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // GET /stats-page?key=<Mã Tài Khoản Thống Kê> — trang xem thống kê từ xa, KHÔNG cần Authorization
    // header (chủ máy mở thẳng link này trên điện thoại), bảo vệ bằng chính mã bí mật trong ?key=.
    if (request.method === 'GET' && url.pathname === '/stats-page') {
      if (!env.STATS_KV) {
        return html('<p style="font-family:sans-serif;padding:24px">Worker chưa được gắn KV namespace (STATS_KV). Xem README.md.</p>', 500);
      }
      const accountKey = (url.searchParams.get('key') || '').trim();
      if (!accountKey) {
        return html('<p style="font-family:sans-serif;padding:24px">Thiếu mã tài khoản thống kê trong link (?key=...).</p>', 400);
      }
      const stats = await readStats(env, accountKey);
      return html(renderStatsPage(accountKey, stats));
    }

    // GET /stats.json?key=... — bản dữ liệu thô (JSON) cùng cơ chế bảo vệ như trên, dùng nếu cần
    // tích hợp thêm ở nơi khác (không bắt buộc dùng tới nếu chỉ xem trang /stats-page).
    if (request.method === 'GET' && url.pathname === '/stats.json') {
      if (!env.STATS_KV) {
        return json({ error: 'Worker chưa được gắn KV namespace (STATS_KV). Xem README.md.' }, 500);
      }
      const accountKey = (url.searchParams.get('key') || '').trim();
      if (!accountKey) {
        return json({ error: 'Thiếu mã tài khoản thống kê (?key=...).' }, 400);
      }
      const stats = await readStats(env, accountKey);
      return json(stats);
    }

    // ---- Từ đây trở xuống là các endpoint cần xác thực bằng UPLOAD_TOKEN (ảnh + cộng dồn thống kê) ----

    if (!checkAuth(request, env)) {
      return json({ error: 'Không có quyền truy cập (sai hoặc thiếu mã token xác thực).' }, 401);
    }

    // POST /stats/increment — app gọi âm thầm mỗi khi có phiên chụp xong / chia sẻ QR / xuất dải ảnh,
    // cộng dồn vào KV theo accountKey (nhiều máy dùng chung 1 accountKey sẽ cộng chung vào 1 chỗ).
    if (request.method === 'POST' && url.pathname === '/stats/increment') {
      if (!env.STATS_KV) {
        return json({ error: 'Worker chưa được gắn KV namespace (STATS_KV). Xem README.md.' }, 500);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Nội dung request không hợp lệ (cần JSON).' }, 400);
      }
      const accountKey = (body?.accountKey || '').trim();
      if (!accountKey) {
        return json({ error: 'Thiếu accountKey.' }, 400);
      }

      const current = await readStats(env, accountKey);
      const updated = {
        totalSessions: current.totalSessions + safeDelta(body.sessions),
        totalPhotosCaptured: current.totalPhotosCaptured + safeDelta(body.photos),
        totalQrShares: current.totalQrShares + safeDelta(body.qrShares),
        totalStripsExported: current.totalStripsExported + safeDelta(body.exports),
        updatedAt: new Date().toISOString(),
      };
      await env.STATS_KV.put(STATS_KEY_PREFIX + accountKey, JSON.stringify(updated));
      return json({ ok: true, stats: updated });
    }

    if (!env.PHOTO_BUCKET) {
      return json({ error: 'Worker chưa được gắn bucket R2 (PHOTO_BUCKET). Xem README.md.' }, 500);
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
