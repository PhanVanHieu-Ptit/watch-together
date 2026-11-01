# Cùng Xem — MVP

Repository ban đầu chỉ có README. Stack: React + TypeScript + Vite, Three.js, Express + Socket.IO. Phát triển và chạy trên repository này; chưa triển khai hosting.

## Thiết kế

Rạp tối, tím lavender, ghế đỏ mận, typography hệ thống; logo SVG tự thiết kế. Không dùng tài sản của website tham khảo. Giao diện gồm sân khấu chính, panel chat/hàng chờ, dock dưới và bộ chọn ghế. Mobile dùng panel dạng sheet. WebGL thất bại sẽ tự dùng sơ đồ 2D.

## Mô hình dữ liệu

- Participant: id (socket), name (1–24 ký tự), avatar (enum), seat (0–99 hoặc null).
- Room: id public-lobby, participants, queue, messages, playback.
- QueueItem: id, youtubeId, title, addedBy, votes (Set participant id).
- Message: id, userId, name, avatar, text (tối đa 500 ký tự), createdAt.
- Playback: youtubeId, title, playing, position, updatedAt. Server là nguồn thời gian chuẩn; client bù thời gian và sửa độ lệch.

## Mốc

1. Khởi tạo frontend/backend và giao thức join/state/seat/chat/queue/vote/playback.
2. Rạp 3D 100 ghế, nhập tên/avatar, chọn ghế, responsive, 2D fallback.
3. YouTube IFrame API; đồng bộ play/pause/seek, hàng chờ, một phiếu/người/video; chat realtime.
4. Build TypeScript, kiểm thử tranh chấp ghế, validation và đồng bộ hai socket; tài liệu chạy.

## Ranh giới MVP

Một phòng công khai. Trạng thái trong RAM, không bền qua restart. Server kiểm tra dữ liệu, giới hạn tần suất và quyền tham gia. Mọi thành viên có thể điều khiển video, chỉ host được chuyển bài; host là người vào đầu tiên và tự chuyển khi rời. Chế độ demo dùng dữ liệu cục bộ, được đánh dấu riêng; kết nối thật chỉ hiển thị khi server xác nhận join. YouTube có thể chặn nhúng hoặc yêu cầu người dùng bấm phát theo chính sách autoplay.

## Giai đoạn tiếp theo

Phòng riêng: mã mời, host/moderation, lưu dữ liệu, xác thực, rate limit phân tán và triển khai production. Thanh toán, quà và game ngoài MVP.

## Trạng thái triển khai

Cả bốn mốc MVP đã triển khai. Đã kiểm tra build TypeScript/Vite, 3 test backend (bao gồm hai client Socket.IO thật), và Chrome headless desktop/mobile: vào demo, chọn ghế, chat, thêm video, chat giữa hai trình duyệt qua backend và kiểm tra tràn ngang ở 390px. Đã xem ảnh chụp desktop và mobile, sửa dock che form mobile và kích thước ghế.

Chưa xác nhận bằng tai/mắt việc phát video YouTube và độ lệch phát giữa hai máy; kiểm thử tích hợp xác nhận truyền trạng thái phát/vị trí, không chứng minh nội dung nhúng phát được. Chưa triển khai hosting.
