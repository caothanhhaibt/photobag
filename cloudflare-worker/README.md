# PhotoBag Upload Worker — Hướng Dẫn Triển Khai

Đây là "máy chủ nhỏ" trung gian giúp app PhotoBag lưu ảnh/video lên Cloudflare R2 và cấp link công
khai để tạo mã QR cho khách quét tải về. Mỗi máy/mỗi chủ cửa hàng chạy PhotoBag nên tự tạo 1 bản
Worker + bucket R2 **của riêng mình** (miễn phí, độc lập hoàn toàn với người khác) — kể cả khi bạn
bán app cho người khác, họ chỉ cần làm lại đúng các bước dưới đây với tài khoản Cloudflare của họ.

## Bước 1 — Tạo tài khoản Cloudflare (nếu chưa có)

Vào https://dash.cloudflare.com/sign-up, đăng ký miễn phí.

## Bước 2 — Tạo bucket R2

1. Trong Cloudflare Dashboard, vào mục **R2 Object Storage** (menu bên trái).
2. Bấm **Create bucket**, đặt tên bất kỳ, ví dụ `photobag`.
3. Sau khi tạo xong, vào bucket đó → tab **Settings** → mục **Public Access** → bật **Allow Access**
   (Cloudflare sẽ tự cấp cho bạn 1 địa chỉ công khai dạng `https://pub-xxxxxxxx.r2.dev`). **Ghi lại
   địa chỉ này** — sẽ cần ở bước 4.

## Bước 3 — Cài công cụ triển khai (Wrangler)

Trên máy tính của bạn (cần cài sẵn Node.js), mở terminal/cmd trong thư mục `cloudflare-worker` này
rồi chạy:

```bash
npm install -g wrangler
wrangler login
```

Lệnh `wrangler login` sẽ mở trình duyệt để bạn đăng nhập và cấp quyền — làm theo hướng dẫn trên
màn hình.

## Bước 4 — Điền cấu hình

Mở file `wrangler.toml` trong thư mục này, sửa 2 chỗ:

- `bucket_name = "photobag"` → đổi thành đúng tên bucket bạn tạo ở Bước 2.
- `PUBLIC_BASE_URL = "https://pub-xxxx...r2.dev"` → đổi thành địa chỉ công khai bạn ghi lại ở Bước 2.

## Bước 4.5 — Tạo KV namespace cho THỐNG KÊ TỔNG (xem số liệu từ xa)

Nếu bạn có nhiều máy/nhiều địa điểm dùng chung 1 tài khoản, bước này giúp bạn xem tổng số liệu
(lượt chụp, ảnh, QR đã chia sẻ, dải ảnh đã xuất) từ xa qua 1 link riêng — không cần đứng tại máy.
Nếu chỉ có 1 máy và không cần xem từ xa, bạn có thể bỏ qua bước này.

```bash
wrangler kv namespace create STATS_KV
```

Lệnh trên in ra 1 đoạn có dạng:

```
[[kv_namespaces]]
binding = "STATS_KV"
id = "abcd1234..."
```

Mở `wrangler.toml`, tìm dòng `id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"` trong khối `[[kv_namespaces]]`
và thay bằng `id` thật vừa được in ra.

## Bước 5 — Đặt mã bí mật xác thực (khuyến khích, để không ai lạ tải/xóa ảnh của bạn được)

```bash
wrangler secret put UPLOAD_TOKEN
```

Khi được hỏi, nhập 1 chuỗi bất kỳ do bạn tự nghĩ ra (càng dài càng khó đoán), ví dụ:
`photobag-shop1-2026-x7k9`. **Ghi nhớ chuỗi này** — sẽ cần nhập lại vào Admin Settings của app ở
Bước 7.

## Bước 6 — Triển khai (Deploy)

```bash
wrangler deploy
```

Sau khi chạy xong, terminal sẽ hiện ra 1 địa chỉ dạng:
`https://photobag-upload-worker.<tên-tài-khoản-cloudflare-của-bạn>.workers.dev`

**Ghi lại địa chỉ này** — đây chính là "Worker URL" cần nhập vào app.

## Bước 7 — Nhập vào app PhotoBag

Mở app PhotoBag → bấm biểu tượng cài đặt (Admin) → tab **Quản Lý Ảnh & Bộ Nhớ** → mục **Lưu Trữ
Ảnh Trên Đám Mây** → nhập:

- **Địa chỉ Worker**: link ở Bước 6.
- **Mã Token**: chuỗi bạn đặt ở Bước 5.
- **Mã Tài Khoản Thống Kê** (nếu bạn đã làm Bước 4.5): 1 chuỗi bất kỳ do bạn tự nghĩ ra, dùng để
  gộp số liệu của nhiều máy vào cùng 1 chỗ — CHÍNH chuỗi này cũng là "mã bí mật" để xem link thống
  kê ở bước dưới, nên đặt dài & khó đoán, ví dụ `shop1-stats-k7m2x9`. Nếu có nhiều máy/nhiều địa
  điểm, nhập **CÙNG MỘT chuỗi này** trên tất cả các máy để số liệu cộng chung vào 1 nơi.

Bấm **Áp Dụng**. Từ giờ, mỗi khi khách chụp xong và bấm sang màn Xuất Bản, ảnh sẽ tự động tải lên
và mã QR sẽ là link thật tới ảnh đó. Đồng thời app cũng âm thầm gửi số liệu (lượt chụp, ảnh, QR đã
chia sẻ, dải ảnh đã xuất) lên Worker mỗi khi các sự kiện đó xảy ra — không ảnh hưởng gì tới trải
nghiệm của khách kể cả khi máy đang mất mạng (sẽ tự bỏ qua, không báo lỗi cho khách thấy).

## Xem Thống Kê Tổng Từ Xa (không cần đứng tại máy)

Nếu bạn đã làm Bước 4.5 và nhập **Mã Tài Khoản Thống Kê** ở trên, mở trình duyệt bất kỳ (điện
thoại, máy tính, ở đâu cũng được) và vào link:

```
https://<Địa chỉ Worker của bạn>/stats-page?key=<Mã Tài Khoản Thống Kê>
```

Ví dụ: `https://photobag-upload-worker.ten-tai-khoan.workers.dev/stats-page?key=shop1-stats-k7m2x9`

Trang này hiện tổng số liệu cộng dồn từ TẤT CẢ các máy đang dùng chung mã tài khoản đó, tự làm mới
mỗi 30 giây. Bạn có thể lưu link này lại (bookmark) để xem lại bất cứ lúc nào — không cần đăng
nhập, ai có đúng link mới xem được, vì vậy đừng chia sẻ link này cho người ngoài.

## Khi tài khoản đầy dung lượng, hoặc chuyển giao cho chủ cửa hàng khác

Lặp lại đúng 7 bước trên với 1 tài khoản Cloudflare khác (hoặc bucket khác), rồi vào Admin Settings
đổi lại **Địa chỉ Worker** + **Mã Token** sang bộ mới — không cần sửa code, không cần tôi hỗ trợ lại.
Ảnh cũ đã lưu ở nơi cũ vẫn giữ nguyên, chỉ có ảnh chụp MỚI mới lưu vào nơi mới.

## Chi phí

Cloudflare R2 có hạn mức miễn phí 10GB lưu trữ + không tính phí băng thông tải xuống. Cloudflare
Workers (nơi chạy file `worker.js` này) cũng có hạn mức miễn phí rất rộng rãi (100.000 lượt gọi/ngày).
Với quy mô 1 photobooth, gần như chắc chắn không phát sinh chi phí nào.
