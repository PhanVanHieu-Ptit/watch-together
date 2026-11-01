# Bàn giao Cùng Xem — 01/11/2026

Source đã cập nhật trong repo, frontend production trong `dist/`. Hướng dẫn chạy và mô tả kiến trúc/socket/deployment/giới hạn nằm trong [README](../../README.md); cấu hình mẫu tại [.env.example](../../.env.example).

## Kết quả

| Hạng mục | Kết quả / bằng chứng |
| --- | --- |
| Typecheck | `npm run typecheck` đạt |
| Build production | `npm run build` đạt; còn cảnh báo bundle JS khoảng 802 kB, gzip 220 kB |
| Server integration | `npm test`: 8/8 đạt, dùng Socket.IO thật, metadata giả lập |
| Chrome UI | `tests/browser-handoff.mjs`: 15 nhóm hành vi đạt; chi tiết [results.json](results.json) |
| Desktop | 1440×900, xem ảnh [welcome](1440-welcome.png), [chat](1440-chat.png), [ghế](1440-seats.png) |
| Tablet | 768×1024: [rạp](768-theater.png), [ghế](768-seats.png), [mất mạng](768-offline.png) |
| Mobile | 390×844: [rạp](390-theater.png), [chat](390-chat.png), [tạo phòng](390-create-room.png), [2D](390-webgl-fallback.png) |
| Bàn phím / xoay ngang giả lập | 390×430 [chat](390-keyboard-space.png); 844×390 [ngang](844-landscape.png), [sau cuộn](844-landscape-scrolled.png) |
| YouTube | [Autoplay bị chặn](1440-autoplay-blocked.png), [không cho nhúng](1440-embed-denied.png); hai ca lỗi này dùng fixture API có kiểm soát |

Đã kiểm tra hai browser context độc lập: tạo phòng mới, chủ có quyền phát, khách không có quyền; chat đi qua server đến người kia, đặt ghế được server xác nhận. Backend integration kiểm tra hai phòng đồng thời không rò state/sự kiện, tranh ghế, quyền, reconnect/grace, queue/vote/skip, mật khẩu, phòng đầy, thu hồi phiên, rate limit và xóa phòng trống.

Chrome kiểm tra focus containment của drawer/dialog, Escape, mũi tên và Enter trên ghế, reduced motion, không tràn ngang các viewport, giữ input chat trong không gian viewport bị thu hẹp, socket offline chặn playback và reconnect khôi phục phiên. Script chặn WebGL để xác nhận 2D, chặn script YouTube để xác nhận báo lỗi, trì hoãn socket handshake để xác nhận màn hình vẫn chờ server. Tạo/join phòng riêng bằng link và mật khẩu qua UI; quyền thêm video bị tắt thì form giữ URL, không giả thành công.

Không ghi nhận uncaught JavaScript application error (`pageErrors: []`). Console có lỗi mạng do chủ động offline/chặn script và thông báo Three.js do chủ động vô hiệu WebGL; các tình huống này có fallback hiển thị. Một số lượt trước có cảnh báo permissions policy từ iframe YouTube; không phải lỗi ứng dụng. Log của lượt cuối lưu nguyên trong JSON.

## Sửa trong lượt rà soát

- Thu gọn dock mobile, chuyển tua/chuyển bài bổ sung vào cài đặt; giới hạn kích thước form/ghế/dialog, ngắt dòng tên phòng/video dài.
- Bố cục landscape thấp cuộn được, dock cố định; thông tin video và vùng điều khiển không còn chồng lên nhau trong ảnh đã kiểm tra.
- Dùng VisualViewport và viewport-fit/safe-area; form tạo phòng cuộn được, input mobile 16px tránh zoom khi nhập.
- Giữ focus trong welcome/dialog/drawer, inert nền, khôi phục focus, Escape chỉ đóng lớp hiện tại; bỏ vai trò ARIA grid không đúng cấu trúc.
- Thêm video chờ ack server rồi mới đóng/xóa form; khi từ chối giữ URL. Tạo phòng có timeout; cleanup timer kết nối khi rời/chuyển demo/unmount. Leave chờ ack trước disconnect khi có kết nối.
- Lỗi/loading/autoplay của YouTube ở lớp UI bình thường, không bị thu nhỏ theo phối cảnh 3D; có thử lại và link mở YouTube.
- Thêm scripts frontend/backend/typecheck, đọc `.env` bằng Node, proxy health API; cấu hình TTL phòng từ env. Viết lại README để bỏ thông tin cũ mâu thuẫn về phòng riêng và chuyển chủ.

## Phần chưa xác minh và giới hạn

- Không có runtime trình duyệt tích hợp trong phiên; đã dùng Chrome headless/Playwright cục bộ, SwiftShader cho WebGL. Không đại diện hiệu năng GPU thiết bị thật.
- **Chưa kiểm tra máy iOS/Android thật**: bàn phím ảo, xoay phần cứng, notch/safe-area, thanh địa chỉ động. Đã giả lập viewport hẹp/ngang và không gian khi bàn phím mở; cần smoke test thiết bị trước phát hành công khai.
- Chưa chạy Safari/Firefox, screen reader, load test hoặc kiểm thử mọi tổ hợp chiều rộng/chiều cao. Sơ đồ ghế mobile nén nút để đủ 10 cột, nhỏ hơn mục tiêu chạm 44px; có nhãn và điều hướng bàn phím.
- YouTube mạng thật tải được iframe, không hiện lỗi player tại thời điểm quan sát. **Chưa chứng nhận độ lệch playback của hai video đang phát trong lượt bàn giao này**; dùng `tests/browser-sync.mjs` để đo trong môi trường cho phép phát. Autoplay/không cho nhúng dùng fixture, không thay đổi chính sách thực tế của YouTube.
- Dữ liệu và rate limit chỉ trong RAM/một tiến trình, restart mất dữ liệu; chưa tài khoản/DB/moderation/ban vĩnh viễn/đa replica/CI deployment. Chưa deploy ra Internet.
- Google Fonts/YouTube/metadata cần mạng; font có fallback sans-serif, video lỗi có thông báo. Bundle Three.js lớn chưa lazy-load.

## Tái lập

Chạy server production sạch trên cổng riêng (`PORT=31401 npm start`) sau build. Chạy script browser theo README; cần Playwright và Chrome tương thích trong môi trường QA. Lượt này dùng Node 22.22.3, module Playwright từ môi trường QA cục bộ, Chrome ở `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

Không commit `.env` hoặc token phiên. Các mật khẩu trong script QA chỉ là dữ liệu thử nghiệm, không phải bí mật triển khai.
