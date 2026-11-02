# wetube ciné

Ứng dụng cùng xem YouTube, chọn ghế, chat, bình chọn hàng chờ và tạo phòng riêng. Source nằm trong repo này; frontend production được tạo trong `dist/`.

## Chạy frontend và backend

Yêu cầu Node.js **22.12+**, npm và Internet để tải YouTube/fonts/metadata.

```sh
npm ci
cp .env.example .env
npm run dev
```

- Frontend: http://127.0.0.1:5178
- Backend: http://127.0.0.1:3001, health: `/api/health`
- Vite proxy `/socket.io` (kể cả WebSocket) và `/api` đến backend cổng 3001.
- Có thể chạy riêng `npm run dev:frontend` và `npm run dev:backend` trong hai terminal.
- Khi đổi PORT backend trong development, sửa target proxy trong `vite.config.ts` cho khớp. Frontend không cần biến bí mật.
- Mở hai tab hoặc hai trình duyệt, dùng hai tên khác nhau. Token phiên lưu trong sessionStorage theo phòng; mỗi phiên chỉ cho phép một kết nối hoạt động. Nếu trình duyệt sao chép sessionStorage khi nhân bản tab, dùng tab mới độc lập hoặc cửa sổ riêng tư.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` phục vụ frontend đã build và backend Socket.IO chung cổng PORT (mặc định 3001). Các lệnh backend đọc `.env` qua Node `--env-file-if-exists`; `.env.example` chỉ chứa cấu hình công khai. `npm test` cần quyền mở cổng local; metadata được giả lập để không phụ thuộc mạng.

## Kiến trúc

- React/TypeScript (`src/App.tsx`): giao diện, phiên khách, đồng hồ RTT, quản lý dialog/drawer và gửi ý định người dùng. Chỉ state server xác nhận mới là dữ liệu dùng chung.
- `src/Theater.tsx`: Three.js, 100 ghế A1–J10; instancing, chất lượng Mượt/Cao, render khi thay đổi. Iframe DOM được chiếu bằng CSS matrix3d; lỗi tạo WebGL/mất context chuyển sang 2D. Sơ đồ ghế là lối truy cập bằng bàn phím.
- `src/Player.tsx`: YouTube IFrame API, mute/volume cục bộ, autoplay recovery, thông báo lỗi nhúng và retry. Đồng bộ theo videoId/status/positionAtUpdate/updatedAtServer/revision; sửa lệch >1,25 giây, cách nhau >2,5 giây, không sửa liên tục khi buffering.
- `server/index.js`: Express + Socket.IO, Map phòng/phiên/giới hạn trong RAM. UUID phòng không đoán tuần tự; socket chỉ join kênh của phòng sau khi xác thực. Mọi mutation và snapshot kiểm tra tư cách thành viên; quyền quản lý/điều khiển kiểm tra lại trên server. Kết quả metadata async kiểm tra lại phiên và quyền trước khi ghi.
- `server/room.js`: state ban đầu, chọn ghế nguyên tử trong một tiến trình, message. `shared/youtube.js`: bộ phân tích URL dùng chung client/server, từ chối host giả/raw ID/đường dẫn không hỗ trợ.
- Server giữ trạng thái phát chuẩn, revision tăng sau mỗi thay đổi. Client tính vị trí theo thời gian server, định kỳ đo RTT; lệnh playback volatile không phát lại khi reconnect. Kết thúc video chỉ chuyển hàng chờ một lần theo revision; hết hàng chờ thì dừng.

## Socket events

Client kết nối cùng origin. Không có API duyệt danh sách phòng riêng.

| Event client → server | Payload / hành vi |
| --- | --- |
| `room:create` | `{name,maxMembers,password?}` → ack `{ok,roomId?}`; chưa tự tham gia |
| `join` | `{name,avatar?,roomId?,password?,token?}`; mặc định community; trả `session`, `joined`, `state` hoặc `notice` |
| `snapshot` | `null` → ack snapshot cho thành viên, `{ok:false}` cho người ngoài |
| `clock` | `null` → ack thời gian server ms; không chứa dữ liệu phòng |
| `seat` | seatId số nguyên 0–99; từ chối ghế đã có người |
| `appearance` | `{shirtColor?,bodyStyle?}`; màu hex, classic/tall/broad/cap |
| `chat` | chuỗi 1–500 ký tự; tối thiểu 500 ms giữa hai tin |
| `queue:add` | `{url}`; tiêu đề lấy từ YouTube oEmbed cố định, timeout 5 giây; 1 video/giây/phiên |
| `vote` | `{id,voted}`; idempotent; xếp theo số phiếu rồi thứ tự thêm |
| `playback` | `{type:'play'|'pause'|'seek',position?,revision}`; cần quyền điều khiển |
| `next` | `{revision}`; cần quyền điều khiển, hàng chờ không trống |
| `ended` | `{videoId,revision}`; thành viên báo hết video đang phát |
| `skip:vote` | `{revision,voted}`; ngưỡng mặc định 60% số thành viên kết nối tại lúc mở lượt, hết hạn 30 giây |
| `room:permissions` | `{chat?,addVideo?,playback?}` boolean; chỉ chủ phòng |
| `room:kick` | userId thành viên khác; chỉ chủ phòng; thu hồi phiên ngay |
| `room:leave` | `null`; xóa thành viên và chuyển chủ ngay |

Các mutation trừ `join` trả ack `{ok:boolean}` và gửi `notice` khi từ chối. Server → client: `state` (snapshot chỉ trong phòng), `session` (`userId,roomId,token` chỉ cho chính socket), `joined` (userId), `notice` (thông báo), `room:removed` (lý do xóa/mời rời). Không trả password/salt/hash trong bất kỳ snapshot nào.

## Chức năng hoàn tất

- Rạp chung và phòng riêng: tên phòng 1–60 ký tự, 1–100 người, mật khẩu tùy chọn tối đa 128 ký tự, link mời `?room=<UUID>`.
- Tên khách tối đa 24 ký tự, 6 avatar; chọn/đổi ghế, màu áo và kiểu người; ghế và phiếu gắn với phiên ổn định.
- Chat realtime, emoji, badge chưa đọc; giữ 100 tin gần nhất. React hiển thị nội dung dưới dạng text.
- Hàng chờ tối đa 30, metadata server, chống trùng video, vote/thu hồi vote, chuyển bài và vote bỏ qua.
- Chủ phòng bật/tắt quyền chat/thêm video/điều khiển cho thành viên; chủ luôn có quyền. Mời rời thu hồi phiên/ghế/phiếu ngay. Người bị mời vẫn có thể vào lại bằng link và mật khẩu như khách mới, chưa có ban vĩnh viễn.
- Playback/mute/volume, autoplay cần chạm, lỗi nhúng/timeout và retry; mất socket chặn thao tác dùng chung và tạm dừng player cục bộ; reconnect lấy snapshot mới.
- Dialog/drawer có focus containment, trả focus, Escape; ghế hỗ trợ mũi tên/Home/End/Ctrl+Home/End/Enter/Space. Reduced motion tắt animation/transition. Mobile có nút tua/chuyển bài trong cài đặt để dock đủ chỗ.

## Demo

“Khám phá demo trước” dùng thành viên, chat và video mẫu. Ghế/chat/vote/queue/ngoại hình/playback chỉ đổi trên thiết bị hiện tại, không kết nối Socket.IO. YouTube vẫn là iframe thật cần Internet. Không có người dùng hoặc tin nhắn server giả làm thành công trực tiếp. Avatar thay trong cài đặt được lưu cho lần vào mới; màu áo/kiểu người áp dụng ngay.

## Phòng hết hạn, chủ rời đi và giữ dữ liệu

- Phòng riêng hết hạn sau **24 giờ kể từ khi tạo**, kể cả đang hoạt động; phòng trống xóa sau **30 phút**, kể cả tạo nhưng chưa ai vào. Quét mỗi giây theo cấu hình mặc định.
- Mất mạng/đóng tab: giữ phiên, ghế và quyền chủ trong **30 giây**. Sau đó xóa thành viên, chuyển chủ cho người vào sớm nhất còn lại. Thành viên đã được cấp quyền playback vẫn có thể điều khiển trong thời gian chờ.
- Bấm Rời rạp: gửi leave, chuyển chủ ngay khi server nhận, rồi ngắt socket; nếu không tới được server thì áp dụng grace disconnect.
- Phòng trống bắt đầu tính sau khi phiên cuối rời/hết grace. Rạp cộng đồng không hết hạn nhưng state vẫn chỉ nằm trong RAM.
- Chat, queue, ghế, playback, token và hash mật khẩu lưu trong RAM, xóa cùng phòng; không lưu DB/log chat/backup. Restart mất toàn bộ. Token đã rời/hết grace/mời rời không được khôi phục.
- Password băm scrypt với salt ngẫu nhiên riêng phòng. Link mời không mang mật khẩu; chia sẻ mật khẩu qua kênh riêng. Token hợp lệ cho reconnect không cần nhập lại mật khẩu.
- Rate limit: 5 lần tạo và 15 lần vào/thử mật khẩu mỗi phút theo IP kết nối trực tiếp; tổng 20 sự kiện/giây/socket, điều khiển 1 lần/250 ms/socket. Không tin header IP do client tự gửi. Sau reverse proxy, nhiều người có thể chung IP và chung giới hạn.

Biến cấu hình xem `.env.example`: PORT, RECONNECT_GRACE_MS, SKIP_VOTE_MS, SKIP_VOTE_RATIO, EMPTY_ROOM_MS, ROOM_TTL_MS.

## Triển khai

1. Cài Node/npm, `npm ci`, cấu hình `.env`, chạy `npm run typecheck && npm test && npm run build`.
2. Chạy `npm start` dưới process manager (systemd hoặc tương đương), working directory là root repo; bảo đảm `dist/` có mặt.
3. Dùng **một tiến trình/replica**. Reverse proxy chuyển toàn bộ `/` về PORT; hỗ trợ HTTP/1.1 upgrade WebSocket, timeout idle trên 60 giây, HTTPS và hostname công khai ổn định. Không triển khai frontend trên static hosting riêng mà bỏ backend/proxy socket.
4. Giữ Referer/origin hợp lệ cho YouTube; không đặt Referrer-Policy `no-referrer`. Nếu dùng CSP, cho phép script/frame YouTube, ảnh i.ytimg.com và Google Fonts đang dùng; kiểm tra lại playback sau khi áp header.
5. Health `/api/health` chỉ trả trạng thái và số người rạp cộng đồng. Không công khai `.env` hoặc source server qua static hosting; Express chỉ phục vụ `dist/`.

Có tài khoản cục bộ theo mục đối chiếu bên dưới; chưa có DB, quản trị/moderation, khôi phục sau restart, kho rate limit chung hay đồng bộ nhiều replica. Scale cần kho state/phiên/giới hạn dùng chung, Socket.IO adapter và thao tác nguyên tử, không chỉ tăng số process. Chưa tích hợp CI/deploy tự động hay đo tải production. Metadata YouTube, font và video phụ thuộc dịch vụ ngoài. Autoplay, video không cho nhúng, hạn chế tuổi/khu vực và buffering không thể bảo đảm từ app. Báo `ended` là tín hiệu client, chưa chứng thực thời lượng phát.

## Kiểm thử và bàn giao

`npm test`: client Socket.IO thật kiểm tra tranh ghế, quyền, chat/queue/vote, reconnect, kết thúc trùng, vote bỏ qua, cách ly hai phòng đồng thời, mật khẩu/phòng đầy, rate limit, thu hồi phiên và xóa phòng trống. Metadata giả lập.

```sh
# Cài Playwright vào môi trường QA riêng nếu chưa có; không cần cho runtime.
# Terminal 1:
PORT=31401 npm start
# Terminal 2 (module phải được resolve trong môi trường hiện tại):
BASE_URL=http://127.0.0.1:31401 node tests/browser-handoff.mjs
```

Có thể đặt `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs` và `CHROME_PATH=/absolute/path/to/chrome`. Script lưu ảnh và JSON vào `artifacts/handoff/`; YouTube fixture được phân biệt rõ với mạng thật. `tests/browser-sync.mjs` là kiểm thử playback YouTube mạng thật, phụ thuộc chính sách mạng/autoplay và video được phép nhúng.

Xem [báo cáo bàn giao](artifacts/handoff/REPORT.md) cho bằng chứng và phần chưa xác minh. Ảnh/báo cáo cũ trong artifacts là kết quả lần kiểm tra trước, không thay thế báo cáo bàn giao hiện tại. Build còn cảnh báo bundle Three.js lớn; chưa chia bundle/lazy-load.


## Đối chiếu choigivui.com (02/11/2026)

Đã thay khung giao diện theo website tham chiếu, thêm đăng ký/đăng nhập và phục hồi phiên bằng cookie HttpOnly. Tài khoản được lưu tại `ACCOUNTS_FILE` (mặc định `data/accounts.json`); mật khẩu băm scrypt với salt. Phiên đăng nhập trong RAM hết hạn sau 7 ngày và mất khi server restart; tài khoản vẫn còn trên đĩa. Backend chạy bằng CLI yêu cầu đăng nhập để vào/tạo phòng. Factory `createBackend()` không có `accountsFile` giữ chế độ khách dành cho test tích hợp.

Chạy lại backend đang mở để nạp API tài khoản mới. Sau đó dùng `npm run dev` hoặc `npm run build && npm start`. Cần một tiến trình server và ổ đĩa bền để giữ tài khoản. Không có khôi phục mật khẩu, xác minh email, CAPTCHA hoặc bot AI trong bản này.

Báo cáo đối chiếu và ảnh nằm tại [artifacts/reference/REPORT.md](artifacts/reference/REPORT.md). Chưa đạt tương đương 100% về hình ảnh hoặc chức năng. Báo cáo cũ trong `artifacts/handoff/` và script `tests/browser-handoff.mjs` sử dụng biểu mẫu khách cũ; không xác nhận giao diện đăng nhập mới.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs BASE_URL=http://127.0.0.1:3001 node tests/reference-parity.mjs
```

Script đăng ký tài khoản QA trên server được chỉ định. Dùng server QA riêng và `ACCOUNTS_FILE` tạm để không để lại tài khoản test trong dữ liệu thật.


### Cập nhật đối chiếu lần 2

- Thêm bốn góc camera, kéo/zoom chuột và pinch, thanh chat nhanh 160 ký tự, bong bóng chat trên nhân vật, cử chỉ realtime, ba chỗ trên sân khấu (tối đa 60 giây), bot minh họa nhường ghế và nhân vật đi qua lối giữa các hàng.
- Hồ sơ tên/giới tính/màu áo lưu cùng tài khoản. Đăng ký xong chọn nhân vật rồi chọn ghế. Giới hạn đăng ký trong một tiến trình: 3 tài khoản/giờ, 10/24 giờ/IP; bộ đếm giới hạn và phiên vẫn trong RAM.
- `queue:preview` lấy metadata; video có nhãn sôi động và BPM 60–200. Phòng xác thực đang trống mở bình chọn `NEXT_VIDEO_DELAY_MS` rồi tự phát video đầu hàng chờ. Chưa xác minh được thời gian bình chọn mặc định trên backend gốc.
- Chưa cấu hình Turnstile, Anthropic hay thanh toán QR/Telegram. Các mục ủng hộ/chiếu ảnh trả phí thông báo chưa mở; không trừ tiền, không giả xác minh hoặc bot AI.
- `tests/compare-entry.mjs` đo hình học và typography form công khai, không đo tương đương toàn website. Kết quả tại `artifacts/reference/entry-comparison.json`.

Để chạy QA không phụ thuộc metadata YouTube, mở một server riêng:

```sh
PORT=31402 ACCOUNTS_FILE=/private/tmp/wetube-reference-qa.json node tests/serve-reference.mjs
QA_METADATA_FIXTURE=1 PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs BASE_URL=http://127.0.0.1:31402 node tests/reference-parity.mjs
```

Server fixture chỉ dành cho test: metadata được giả lập và video không được giả lập. Khởi động lại server QA trước mỗi lần chạy để bộ đếm đăng ký không chặn tài khoản test. Không dùng server fixture để triển khai.
