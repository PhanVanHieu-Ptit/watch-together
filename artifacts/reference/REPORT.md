# Đối chiếu choigivui.com — 02/11/2026

**Chưa đạt tương đương 100% toàn website.** Đã đo form đăng nhập công khai khớp hình học/typography ở hai viewport. Không dùng kết quả này để suy ra tỷ lệ giống của rạp 3D, toàn bộ pixel hoặc chức năng sau đăng nhập.

Tham chiếu: https://choigivui.com/. Đã kiểm tra trang công khai, đăng nhập/đăng ký và tài sản frontend công khai; không đăng ký tài khoản hay gửi dữ liệu lên trang gốc. Người dùng xác nhận chưa có cấu hình dịch vụ Turnstile, Anthropic hoặc QR/Telegram.

## Kết quả có thể kiểm chứng

| Phạm vi đo | 1440×900 | 390×844 |
| --- | --- | --- |
| Khung form: x/y/rộng/cao | 0 px sai lệch | 0 px sai lệch |
| Tiêu đề: x/y/rộng/cao | 0 px sai lệch | 0 px sai lệch |
| Ô tài khoản và mật khẩu: x/y/rộng/cao | 0 px sai lệch | 0 px sai lệch |
| Nút vào rạp: x/y/rộng/cao | 0 px sai lệch | 0 px sai lệch |
| Font size, weight, line height của các phần trên | Khớp | Khớp |

Số đo gốc và kết quả đầy đủ: [entry-comparison.json](entry-comparison.json), tạo bởi `tests/compare-entry.mjs`. Phép đo không bao gồm màu, rasterization, nền động, ảnh hoặc toàn bộ các trạng thái khác.

Ảnh: [tham chiếu desktop](reference-desktop.png), [local desktop](local-desktop.png), [tham chiếu mobile](reference-mobile.png), [local mobile](local-mobile.png), [rạp local](local-world.png), [chat mobile](local-mobile-chat.png). Vị trí bot thay đổi theo thời gian nên hai ảnh rạp không phải cùng một trạng thái động.

## Đã triển khai thêm

- Khung nhận diện, logo, font, màu, overlay và màn chiếu theo CSS và số đo công khai. Không nhúng bundle frontend của website gốc vào ứng dụng.
- Sofa theo cụm 1/2/3/3/1, sửa tỷ lệ đầu/tóc, tên in trên áo, nam/nữ, tay/chân và dáng ngồi.
- Bốn góc camera: toàn cảnh, từ ghế, tập trung màn hình và nhìn khán giả. Có kéo xoay, cuộn để zoom và pinch hai ngón tay.
- Bot minh họa tự đổi ghế, nhường chỗ cho người thật, không chat hoặc tham gia bình chọn. Nhân vật đi qua lối giữa hàng khi đổi chỗ.
- Vẫy tay/vỗ tay/nhảy được server xác nhận và gửi cho các thành viên. Ba vị trí sân khấu kiểm tra tranh chỗ, tối đa 60 giây rồi trở về ghế.
- Dock dọc thu gọn/mở, ẩn/hiện HUD, nhóm camera/âm thanh, âm lượng/phụ đề cục bộ, thanh chat nhanh, emoji và bong bóng chat trên đầu nhân vật.
- Hồ sơ tên/ngoại hình lưu bền trên đĩa. Luồng đăng ký → chọn nhân vật → vào rạp → chọn ghế; khôi phục tài khoản/phòng khi tải lại.
- Giới hạn đăng ký 3 tài khoản/giờ và 10 tài khoản/24 giờ/IP, trong bộ nhớ của một tiến trình. Giới hạn chat 160 code point trên client/server.
- Xem trước metadata YouTube, nhãn remix/sôi động, BPM 60–200, laser/disco cục bộ và tự bắt đầu video sau lượt bình chọn trong phòng trống.
- Dọn GPU geometry/texture khi thay nhân vật; chế độ Mượt giới hạn 30 fps. Reduced motion tắt cử chỉ/đi lại/disco và chuyển camera tức thời.

## Kiểm thử

- `npm test`: **11/11 đạt**. Bao gồm tài khoản/hồ sơ qua restart, cookie/logout, giới hạn đăng ký, chống giả danh socket, tranh ghế, cách ly phòng, metadata, vote/playback, cử chỉ, sân khấu và tự phát hàng chờ.
- `tests/reference-parity.mjs`: **16 mục đạt, không có lỗi ứng dụng chưa bắt**, chi tiết [results.json](results.json). Hai browser context độc lập kiểm tra chat và bong bóng trên nhân vật, ngoại hình, camera, cử chỉ, xem trước video, tạo phòng riêng và khôi phục phiên.
- Viewport 320×740, 390×844, 768×1024 và 844×390: form vừa vùng nhìn, không tràn ngang.
- Kiểm tra nhanh bổ sung: đổi ngoại hình đang hoạt động (gỡ geometry/texture cũ), nhập 160 emoji code point và Escape đóng popup; không có lỗi ứng dụng.
- Metadata trong QA được giả lập rõ ràng bằng `tests/serve-reference.mjs`; đây không phải bằng chứng phát video mạng thật. YouTube không được giả lập; chưa xác nhận phát âm thanh/video hoặc lệch thời gian giữa hai thiết bị.
- `npm run build`: đạt; vẫn có cảnh báo bundle Three.js lớn hơn 500 kB.
- Vòng kiểm tra viewport đóng các context trước đó để tránh áp lực GPU của nhiều rạp 3D đồng thời trên Chrome software renderer.

## Còn khác / cần cấu hình

- **Chưa có Cloudflare Turnstile, bot AI Anthropic hoặc QR/Telegram.** Các mục ủng hộ/chiếu ảnh trả phí thông báo chưa mở, không giả xác minh, không trừ tiền và không giả bot AI đang hoạt động.
- Tủ đồ trả phí, lịch sử ủng hộ, số dư, quyền chen hàng, thuê phòng theo giờ, kiểm duyệt ảnh và trò chơi/co-op chưa có tương đương hoạt động với website gốc.
- Màn quản lý phòng riêng và cài đặt vẫn dùng chức năng local hiện có; bố cục và quy tắc thanh toán chưa khớp trang gốc. Tủ đồ hiện mở hồ sơ ngoại hình cơ bản.
- Mô hình 3D/chuyển động được dựng lại, không phải asset gốc; chưa có kiểm chứng pixel hoặc choreography toàn cảnh. Laser/disco và đường đi chưa được chứng minh trùng từng khung hình.
- Các luồng sau đăng nhập trên website gốc chưa được kiểm tra trực tiếp. Thời gian bình chọn, quyền điều khiển phát và một số quy tắc backend vẫn theo dự án local; không thể khẳng định giống bằng cách đọc frontend.
- Tài khoản lưu đĩa; phiên, phòng và bộ đếm giới hạn lưu RAM. Restart vẫn mất phiên/phòng/bộ đếm. Chưa có DB chung hoặc nhiều replica.
- Chính sách pháp lý trong bản local mô tả bản local, không sao chép cam kết vận hành của trang gốc. Chưa kiểm tra bàn phím và GPU trên thiết bị iOS/Android thật.

## Tiếp tục để đạt toàn bộ phạm vi

Cần cấu hình các dịch vụ ngoài, môi trường tham chiếu sau đăng nhập và kiểm thử các luồng thương mại/game. Không gửi mật khẩu hoặc secret trong chat. Không có căn cứ để ghi “giống 100%” trước khi hoàn thành các phần trên.
