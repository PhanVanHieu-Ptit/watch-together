# Ba tính năng gắn kết — 03/11/2026

Đã tích hợp vào frontend React và backend Socket.IO hiện có; giữ các chỉnh sửa giao diện đang có trong workspace.

- **Khách qua link:** tab Vào nhanh mặc định khi mở phòng riêng; nhập biệt danh và mật khẩu phòng tùy chọn, không cần đăng ký. Có đăng nhập/đăng ký riêng. Token reconnect giữ ghế trong thời gian giữ phiên.
- **Đoán bài hát:** chủ phòng đặt video/đáp án/giây bắt đầu, vòng 30 giây, che hình/tiêu đề, tắt phụ đề khi chơi. Server giữ đáp án riêng đến khi kết thúc, chấm theo thời gian còn lại, từ chối tính điểm lặp và người ra câu hỏi. Bảng điểm cộng dồn giữa các vòng trong RAM.
- **Phòng cố định + playlist:** quyền sở hữu gắn tài khoản; khách vào trước không thành chủ. Lưu cấu hình, hash mật khẩu và playlist trong ROOMS_FILE (CLI mặc định data/rooms.json), ghi file tạm rồi rename. Khôi phục được qua restart; hàng chờ/chat/ghế/game vẫn là dữ liệu buổi xem. Chủ lưu/nạp/xóa playlist; danh sách phòng của tài khoản nằm trong cài đặt.

## Xác minh

- `npm test`: **14/14 đạt**, gồm ba test mới trong `server/engagement.test.js`. Có kiểm tra restart thật, từ chối sai mật khẩu/quyền, khôi phục điểm qua reconnect, deadline tự kết thúc, lỗi ghi phòng không để lại phòng mồ côi.
- `npm run build`: đạt, bao gồm TypeScript. Còn cảnh báo bundle Three.js lớn hơn 500 kB vốn có.
- `git diff --check` và kiểm tra cú pháp các module mới: đạt.
- `tests/browser-engagement.mjs`: **9 nhóm hành vi đạt** trên Chrome headless với hai context độc lập, desktop 1440×900 và mobile 390×844. Chi tiết tại [results.json](results.json). Không có lỗi ứng dụng chưa bắt; mobile không tràn ngang.

Ảnh kiểm tra:

- [Vào phòng bằng link trên mobile](guest-invite-mobile.png)
- [Lưu playlist trên desktop](playlist-desktop.png)
- [Trò chơi desktop](game-desktop.png)
- [Khách đoán đúng trên mobile](game-mobile.png)

## Giới hạn kiểm tra và vận hành

Server UI QA dùng tài khoản/phòng trong thư mục tạm, metadata giả lập rõ ràng. Không dùng hoặc sửa tài khoản, phòng hay `.env` thực của người dùng. Các bài test kiểm tra trạng thái đồng bộ và giao diện, **chưa chứng nhận âm thanh/video YouTube thật hoặc độ lệch giữa hai thiết bị**. Autoplay và quyền nhúng vẫn phụ thuộc YouTube/trình duyệt.

Video ID phải tới client để trình phát hoạt động, nên trò chơi không ngăn người chơi tra cứu bằng công cụ lập trình. Điểm/chat/phiên/hàng chờ không lưu qua restart. Phòng cố định và playlist cần ổ đĩa bền, cùng ACCOUNTS_FILE; backend tiếp tục chạy một tiến trình. Chưa kiểm tra thiết bị iOS/Android thật.

## Tái lập

```sh
npm test
npm run build
node tests/serve-engagement.mjs
# Terminal khác, cung cấp PLAYWRIGHT_MODULE / CHROME_PATH nếu cần:
node tests/browser-engagement.mjs
```

Server QA cổng 31403; dừng bằng Ctrl+C để xóa dữ liệu tạm. Hướng dẫn sử dụng và socket events mới nằm trong [README](../../README.md).
