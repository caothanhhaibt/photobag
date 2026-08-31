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

Bấm **Áp Dụng**. Từ giờ, mỗi khi khách chụp xong và bấm sang màn Xuất Bản, ảnh sẽ tự động tải lên
và mã QR sẽ là link thật tới ảnh đó.

## Khi tài khoản đầy dung lượng, hoặc chuyển giao cho chủ cửa hàng khác

Lặp lại đúng 7 bước trên với 1 tài khoản Cloudflare khác (hoặc bucket khác), rồi vào Admin Settings
đổi lại **Địa chỉ Worker** + **Mã Token** sang bộ mới — không cần sửa code, không cần tôi hỗ trợ lại.
Ảnh cũ đã lưu ở nơi cũ vẫn giữ nguyên, chỉ có ảnh chụp MỚI mới lưu vào nơi mới.

## Chi phí

Cloudflare R2 có hạn mức miễn phí 10GB lưu trữ + không tính phí băng thông tải xuống. Cloudflare
Workers (nơi chạy file `worker.js` này) cũng có hạn mức miễn phí rất rộng rãi (100.000 lượt gọi/ngày).
Với quy mô 1 photobooth, gần như chắc chắn không phát sinh chi phí nào.
