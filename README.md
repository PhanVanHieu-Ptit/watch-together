# Cùng Xem

Rạp phim trực tuyến cho bạn bè, thương hiệu và hình ảnh tự thiết kế.

## Chạy cục bộ

Yêu cầu Node.js 22.12+ (hoặc phiên bản phù hợp Vite trong lockfile).

```sh
npm install
npm run dev
```

Frontend: http://127.0.0.1:5178. Backend: http://127.0.0.1:3001. Vite chuyển tiếp Socket.IO đến backend. Mở hai tab, nhập tên khác nhau và vào rạp để kiểm tra đồng bộ. Bạn bè trên cùng mạng có thể dùng địa chỉ IP LAN của máy chạy frontend, cổng 5178; cần mở firewall tương ứng.

```sh
npm test
npm run build
npm start
```

Bản production phục vụ frontend đã build và Socket.IO chung cổng 3001, có thể cấu hình PORT. Dùng reverse proxy hỗ trợ WebSocket và HTTPS khi triển khai. Chưa triển khai hosting tự động.

## MVP

- Tên hiển thị và 6 avatar; 100 ghế có kiểm tra tranh chấp từ server.
- Rạp Three.js; chuyển sang 2D thủ công hoặc tự động nếu không tạo được WebGL.
- YouTube IFrame API: server giữ video, play/pause, vị trí và timestamp; client bù đồng hồ và sửa lệch mỗi 3 giây.
- Hàng chờ YouTube (tối đa 30), mỗi người một phiếu mỗi bài, bấm lại để bỏ phiếu.
- Mọi thành viên được điều khiển phát; chủ rạp (người đầu tiên) được chuyển sang video đứng đầu hàng chờ. Chủ rạp tự chuyển khi người trước rời.
- Chat realtime, lưu 100 tin gần nhất; tên tối đa 24 ký tự, tin nhắn 500 ký tự.
- Responsive; sơ đồ ghế có nút truy cập bằng bàn phím.

## Demo và backend

“Khám phá demo” dùng thành viên/tin nhắn mẫu, chỉ cập nhật trên thiết bị hiện tại. Không tạo kết nối server và không gửi tin cho người khác. YouTube vẫn là trình phát nhúng thật, cần Internet.

“Vào rạp” dùng Socket.IO thật. Chỉ hiển thị “Trực tiếp” khi server đã xác nhận join. Khi mất kết nối, thao tác chia sẻ bị chặn; client thử kết nối và tham gia lại, cần chọn lại ghế nếu socket thay đổi.

## Giới hạn

Một phòng công khai; dữ liệu trong RAM, mất khi restart. Chưa có tài khoản, lưu trữ bền, moderation hoặc hạ tầng đa server. YouTube không phải mọi video đều cho nhúng; autoplay có thể yêu cầu bấm phát lần đầu. Người xem mới không đăng nhập YouTube vẫn có thể gặp hạn chế tuổi/khu vực. Client theo dõi bước nhảy vị trí trong trình phát để truyền thao tác tua và định kỳ hiệu chỉnh độ lệch; độ trễ mạng và buffering vẫn có thể gây lệch ngắn hạn.

Phòng riêng ở giai đoạn tiếp theo. Thanh toán, quà và game nằm ngoài MVP. Xem PLAN.md để biết mô hình dữ liệu và các mốc.
