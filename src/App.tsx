import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Expand,
  Headphones,
  Info,
  LayoutGrid,
  Link,
  Lock,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Plus,
  Send,
  Settings2,
  SkipForward,
  Sofa,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { Room } from "./types";
import { Theater } from "./Theater";
import { Player } from "./Player";
import "./style.css";
const localId = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const avatars = ["🌷", "🐱", "🐼", "🦊", "🐸", "🐰"];
const initial: Room = {
  participants: [],
  queue: [],
  messages: [],
  playback: {
    youtubeId: "jfKfPfyJRdk",
    title: "Lofi hip hop radio · beats to relax / study to",
    playing: false,
    position: 0,
    updatedAt: Date.now(),
  },
};
const demo: Room = {
  ...initial,
  participants: [
    { id: "linh", name: "Linh", avatar: "🐱", seat: 43 },
    { id: "minh", name: "Minh", avatar: "🐼", seat: 45 },
    { id: "an", name: "An", avatar: "🦊", seat: 54 },
  ],
  queue: [
    {
      id: "d1",
      youtubeId: "5qap5aO4i9A",
      title: "Một chút bình yên cho buổi tối",
      addedBy: "Linh",
      votes: ["linh", "an"],
    },
    {
      id: "d2",
      youtubeId: "DWcJFNfaw9c",
      title: "Chill cùng những giai điệu jazz",
      addedBy: "Minh",
      votes: ["minh"],
    },
  ],
  messages: [
    {
      id: "1",
      userId: "linh",
      name: "Linh",
      avatar: "🐱",
      text: "Một chiếc rạp nhỏ cho tối nay ✨",
      createdAt: Date.now() - 180000,
    },
    {
      id: "2",
      userId: "minh",
      name: "Minh",
      avatar: "🐼",
      text: "Nhạc chill quá, ngồi đây luôn thôi",
      createdAt: Date.now() - 90000,
    },
    {
      id: "3",
      userId: "an",
      name: "An",
      avatar: "🦊",
      text: "Mọi người thêm bài vào hàng chờ nhé 🎶",
      createdAt: Date.now() - 30000,
    },
  ],
};
export default function App() {
  const [room, setRoom] = useState<Room>(initial),
    [mode, setMode] = useState<"welcome" | "demo" | "live">("welcome"),
    [connected, setConnected] = useState(false),
    [myId, setMyId] = useState(""),
    [name, setName] = useState(localStorage.getItem("cx-name") || ""),
    [avatar, setAvatar] = useState(localStorage.getItem("cx-avatar") || "🌷"),
    [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"chat" | "queue" | "people">("chat"),
    [panel, setPanel] = useState(window.innerWidth > 760),
    [twoD, setTwoD] = useState(false),
    [seats, setSeats] = useState(false),
    [add, setAdd] = useState(false),
    [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [notice, setNotice] = useState(""),
    [offset, setOffset] = useState(0),
    [help, setHelp] = useState(false);
  const socket = useRef<Socket | null>(null),
    chatEnd = useRef<HTMLDivElement>(null),
    playerWrap = useRef<HTMLDivElement>(null);
  const notify = useCallback((s: string) => setNotice(s), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [room.messages, tab]);
  useEffect(
    () => () => {
      socket.current?.disconnect();
    },
    [],
  );
  useEffect(() => {
    if (!seats && !add && !help) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector(".modal") as HTMLElement | null;
    const focusable = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSeats(false);
        setAdd(false);
        setHelp(false);
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [seats, add, help]);
  const join = () => {
    if (!name.trim()) {
      notify("Nhập tên để cả hội nhận ra bạn nhé.");
      return;
    }
    socket.current?.disconnect();
    setJoining(true);
    const s = io({ timeout: 5000 });
    socket.current = s;
    s.on("connect", () => s.emit("join", { name, avatar }));
    s.on("joined", (id: string) => {
      setMyId(id);
      setMode("live");
      setConnected(true);
      setJoining(false);
      localStorage.setItem("cx-name", name);
      localStorage.setItem("cx-avatar", avatar);
    });
    s.on("state", (r: Room) => {
      setRoom(r);
      setOffset((r.serverTime || Date.now()) - Date.now());
    });
    s.on("notice", (t: string) => {
      notify(t);
      setJoining(false);
    });
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => {
      setJoining(false);
      setConnected(false);
      notify("Chưa kết nối được backend. Chạy npm run dev hoặc khám phá demo.");
    });
  };
  const enterDemo = () => {
    socket.current?.disconnect();
    setRoom({
      ...demo,
      participants: [
        ...demo.participants,
        { id: "demo-me", name: name.trim() || "Bạn", avatar, seat: 44 },
      ],
    });
    setMyId("demo-me");
    setMode("demo");
  };
  const ready = mode === "demo" || (mode === "live" && connected);
  const action = (event: string, data?: any) => {
    if (!ready) {
      notify("Vào rạp để sử dụng tính năng này.");
      return;
    }
    if (mode === "live") {
      socket.current?.emit(event, data);
      return;
    }
    setRoom((r) => {
      if (event === "seat") {
        if (r.participants.some((p) => p.id !== myId && p.seat === data)) {
          notify("Ghế này đã có người ngồi.");
          return r;
        }
        return {
          ...r,
          participants: r.participants.map((p) =>
            p.id === myId ? { ...p, seat: data } : p,
          ),
        };
      }
      if (event === "chat")
        return {
          ...r,
          messages: [
            ...r.messages,
            {
              id: localId(),
              userId: myId,
              name: name.trim() || "Bạn",
              avatar,
              text: data,
              createdAt: Date.now(),
            },
          ],
        };
      if (event === "vote")
        return {
          ...r,
          queue: r.queue
            .map((v) =>
              v.id === data
                ? {
                    ...v,
                    votes: v.votes.includes(myId)
                      ? v.votes.filter((i) => i !== myId)
                      : [...v.votes, myId],
                  }
                : v,
            )
            .sort((a, b) => b.votes.length - a.votes.length),
        };
      if (event === "queue:add") {
        const id = parseYoutube(data.url);
        if (!id) {
          notify("Hãy nhập đường dẫn YouTube hợp lệ.");
          return r;
        }
        if (r.queue.some((v) => v.youtubeId === id)) {
          notify("Video đã có trong hàng chờ.");
          return r;
        }
        return {
          ...r,
          queue: [
            ...r.queue,
            {
              id: localId(),
              youtubeId: id,
              title: data.title || "YouTube · " + id,
              addedBy: name || "Bạn",
              votes: [],
            },
          ],
        };
      }
      if (event === "playback")
        return {
          ...r,
          playback: { ...r.playback, ...data, updatedAt: Date.now() },
        };
      if (event === "next") {
        const [v, ...queue] = r.queue;
        if (!v) {
          notify("Hàng chờ đang trống.");
          return r;
        }
        return {
          ...r,
          queue,
          playback: {
            youtubeId: v.youtubeId,
            title: v.title,
            position: 0,
            playing: true,
            updatedAt: Date.now(),
          },
        };
      }
      return r;
    });
  };
  const changePlayback = (playing: boolean, position: number) =>
    action("playback", { playing, position });
  const togglePlay = () => {
    const p = room.playback;
    changePlayback(
      !p.playing,
      p.position + (p.playing ? (Date.now() + offset - p.updatedAt) / 1000 : 0),
    );
  };
  const me = room.participants.find((p) => p.id === myId),
    fail = useCallback(() => {
      setTwoD(true);
      setNotice("WebGL không khả dụng. Đã chuyển sang rạp 2D.");
    }, []);
  const seatLabel = (n: number) =>
    String.fromCharCode(65 + Math.floor(n / 10)) + ((n % 10) + 1);
  const seatGrid = (
    <div className="seat-grid">
      {Array.from({ length: 100 }, (_, i) => {
        const p = room.participants.find((p) => p.seat === i);
        return (
          <button
            key={i}
            title={
              p ? seatLabel(i) + " · " + p.name : "Chọn ghế " + seatLabel(i)
            }
            aria-label={
              p ? seatLabel(i) + " · " + p.name : "Chọn ghế " + seatLabel(i)
            }
            disabled={!!p && p.id !== myId}
            className={
              "seat " + (p?.id === myId ? "mine" : p ? "occupied" : "")
            }
            onClick={() => action("seat", i)}
          >
            {p ? p.avatar : <Sofa size={17} />}
          </button>
        );
      })}
    </div>
  );
  return (
    <div className={"app " + (!panel ? "panel-hidden" : "")}>
      <header className="header">
        <a className="brand" href="/" aria-label="Cùng Xem">
          <img src="/favicon.svg" />
          <span>
            Cùng Xem<span className="brand-dot">.</span>
          </span>
          <span className="beta">BETA</span>
        </a>
        <div className="room-nav">
          <span className="live-dot" />
          <span>Rạp chung</span>
          <ChevronDown size={14} />
          <i />
          <span className="public-label">Ai cũng được chào đón</span>
        </div>
        <div className="header-actions">
          <button
            className="invite"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                notify(
                  "Đã sao chép liên kết. Bạn bè cần truy cập cùng máy chủ để cùng xem.",
                );
              } catch {
                notify("Liên kết rạp: " + location.href);
              }
            }}
          >
            <Link size={15} />
            <span>Mời bạn bè</span>
          </button>
          <button
            className="profile"
            onClick={() => setHelp(true)}
            aria-label="Thông tin của bạn"
          >
            {avatar}
          </button>
        </div>
      </header>
      <main>
        <section className="cinema">
          <div className="cinema-top">
            <div>
              <span className="eyebrow">MỘT CHỖ NGỒI. CẢ HỘI BẠN.</span>
              <h1>
                Tối nay, cùng xem nhé<span> ✦</span>
              </h1>
            </div>
            <button className="mode-button" onClick={() => setTwoD(!twoD)}>
              <LayoutGrid size={14} />
              {twoD ? "Chế độ 2D" : "Không gian 3D"}
              <ChevronDown size={13} />
            </button>
          </div>
          <div className="stage">
            <div className="screen-caption">
              <span className="tiny-pill">
                <span /> ĐANG CHIẾU
              </span>
              <span>RẠP CỦA CHÚNG MÌNH</span>
              <span>01</span>
            </div>
            <div className="screen-frame" ref={playerWrap}>
              <div className="projection" />
              {mode !== "welcome" ? (
                <Player
                  playback={room.playback}
                  onChange={changePlayback}
                  offset={mode === "demo" ? 0 : offset}
                />
              ) : (
                <div className="screen-art">
                  <div className="art-sun" />
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-mountain back" />
                  <div className="art-mountain front" />
                  <div className="art-water" />
                  <div className="screen-art-copy">
                    <span>CÙNG NHAU, Ở ĐÂY.</span>
                    <strong>Chậm lại một chút.</strong>
                    <p>Để một giai điệu kết nối chúng mình.</p>
                  </div>
                  <span className="art-stamp">CÙNG XEM ORIGINAL SPACE</span>
                </div>
              )}
            </div>
            <div className="now-playing">
              <span className="equalizer">
                <i />
                <i />
                <i />
              </span>
              <div>
                <strong>{room.playback.title}</strong>
                <span>
                  <Music2 size={11} /> YouTube <b>•</b>{" "}
                  {mode === "welcome"
                    ? "Chọn một bài, bắt đầu buổi tối"
                    : room.playback.playing
                      ? "Đang phát cùng mọi người"
                      : "Bấm phát để bắt đầu nghe"}
                </span>
              </div>
              <button
                onClick={() => {
                  if (playerWrap.current?.requestFullscreen)
                    playerWrap.current
                      .requestFullscreen()
                      .catch(() =>
                        notify("Trình duyệt chưa cho phép toàn màn hình."),
                      );
                }}
                aria-label="Toàn màn hình"
              >
                <Expand size={16} />
              </button>
            </div>
            <div className="theater-space">
              <div className="floor-glow" />
              <div className="wall-line left" />
              <div className="wall-line right" />
              {twoD ? (
                <div className="inline-seats">{seatGrid}</div>
              ) : (
                <Theater
                  people={room.participants}
                  myId={myId}
                  onSeat={(i) => action("seat", i)}
                  onFail={fail}
                />
              )}
              <div className="seat-hint">
                <span className="seat-dot" />
                {me?.seat != null
                  ? "Bạn đang ngồi ở ghế " + seatLabel(me.seat)
                  : "Chọn một chỗ ngồi, gần nhau hơn một chút."}
                <button onClick={() => setSeats(true)}>
                  Sơ đồ ghế <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
          <div className="cinema-bottom">
            <span>
              <Users size={14} />
              <b>{room.participants.length}</b> / 100 chỗ
              <span className="bottom-divider" />{" "}
              <span
                className={
                  "connection " + (mode === "live" && connected ? "online" : "")
                }
              >
                {mode === "demo"
                  ? "DEMO · chỉ trên thiết bị này"
                  : mode === "live"
                    ? connected
                      ? "Trực tiếp · Socket.IO"
                      : "Mất kết nối · đang thử lại"
                    : "Sẵn sàng khi bạn sẵn sàng"}
              </span>
            </span>
            <button onClick={() => setHelp(true)}>
              <Info size={14} />
              <span>Về rạp này</span>
            </button>
          </div>
          <div className="dock">
            <button
              onClick={togglePlay}
              aria-label={room.playback.playing ? "Tạm dừng" : "Phát"}
              className="play-button"
            >
              {room.playback.playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <button onClick={() => action("next")} title="Chủ rạp chuyển bài">
              <SkipForward size={18} />
            </button>
            <div className="dock-divider" />
            <button
              aria-label="Chỗ ngồi"
              onClick={() => setSeats(true)}
              className={seats ? "selected" : ""}
            >
              <Sofa size={19} />
              <span>Chỗ ngồi</span>
            </button>
            <button
              aria-label="Hàng chờ"
              onClick={() => {
                setTab("queue");
                setPanel(true);
              }}
            >
              <Music2 size={19} />
              <span>Hàng chờ</span>
              <small>{room.queue.length}</small>
            </button>
            <button
              aria-label="Trò chuyện"
              className={panel && tab === "chat" ? "selected" : ""}
              onClick={() => {
                if (panel && tab === "chat") setPanel(false);
                else {
                  setTab("chat");
                  setPanel(true);
                }
              }}
            >
              <MessageCircle size={19} />
              <span>Trò chuyện</span>
            </button>
            <div className="dock-divider" />
            <button
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else
                  document.documentElement
                    .requestFullscreen?.()
                    .catch(() =>
                      notify("Trình duyệt chưa hỗ trợ toàn màn hình."),
                    );
              }}
              aria-label="Toàn màn hình rạp"
            >
              <Expand size={18} />
            </button>
            <button onClick={() => setHelp(true)} aria-label="Cài đặt">
              <Settings2 size={19} />
            </button>
          </div>
        </section>
        <aside className={"side-panel " + (panel ? "open" : "")}>
          <div className="panel-tabs">
            <button
              className={tab === "chat" ? "active" : ""}
              onClick={() => setTab("chat")}
            >
              Trò chuyện <span>{room.messages.length}</span>
            </button>
            <button
              className={tab === "queue" ? "active" : ""}
              onClick={() => setTab("queue")}
            >
              Hàng chờ <span>{room.queue.length}</span>
            </button>
            <button
              className="panel-people"
              onClick={() => setTab("people")}
              aria-label="Người tham gia"
            >
              <Users size={17} />
            </button>
            <button
              className="mobile-close"
              onClick={() => setPanel(false)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
          <div className="room-card">
            <div className="room-icon">
              <Headphones size={22} />
            </div>
            <div>
              <strong>Góc chill của chúng mình</strong>
              <p>Một chiếc rạp, nhiều niềm vui.</p>
            </div>
            <span className="room-star">✧</span>
          </div>
          {tab === "chat" ? (
            <>
              <div className="chat-content">
                <div className="day-label">
                  <span />
                  Hôm nay
                  <span />
                </div>
                <div className="system-message">
                  <Sparkles size={16} />
                  <p>
                    Chào mừng đến với Cùng Xem!
                    <br />
                    <span>Chọn ghế, bật nhạc và kể nhau nghe.</span>
                  </p>
                </div>
                {room.messages.map((m) => (
                  <div
                    className={"message " + (m.userId === myId ? "own" : "")}
                    key={m.id}
                  >
                    <span className="message-avatar">{m.avatar}</span>
                    <div>
                      <div className="message-meta">
                        <strong>{m.name}</strong>
                        {m.userId === myId && <em>bạn</em>}
                        <time>
                          {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
                {!room.messages.length && (
                  <div className="chat-empty">
                    <MessageCircle size={28} />
                    <p>
                      Một lời chào mở đầu
                      <br />
                      cho một buổi tối vui.
                    </p>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="chat-footer">
                <div className="chat-note">
                  <span />{" "}
                  {mode === "demo"
                    ? "Tin nhắn demo không gửi đến người khác"
                    : "Cùng xem, cùng trò chuyện. Luôn tử tế nhé."}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!text.trim()) return;
                    action("chat", text.trim());
                    setText("");
                  }}
                >
                  <input
                    value={text}
                    maxLength={500}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Nói gì đó với cả rạp..."
                    aria-label="Tin nhắn"
                  />
                  <button type="submit" aria-label="Gửi tin nhắn">
                    <Send size={17} />
                  </button>
                </form>
                <div className="chat-footer-caption">
                  <span>Enter để gửi</span>
                  <span>✧ Những kết nối nhỏ, niềm vui lớn</span>
                </div>
              </div>
            </>
          ) : tab === "queue" ? (
            <div className="queue-content">
              <div className="section-label">
                <span>TIẾP THEO TRONG RẠP</span>
                <button onClick={() => setAdd(true)}>
                  <Plus size={16} /> Thêm
                </button>
              </div>
              <p className="queue-tip">
                Bình chọn để đưa bài yêu thích lên đầu.
              </p>
              {room.queue.map((v, i) => (
                <div className="queue-item" key={v.id}>
                  <div className="video-thumb">
                    <img
                      src={
                        "https://i.ytimg.com/vi/" +
                        v.youtubeId +
                        "/mqdefault.jpg"
                      }
                      alt=""
                    />
                    <span>{i + 1}</span>
                  </div>
                  <div>
                    <strong>{v.title}</strong>
                    <p>Thêm bởi {v.addedBy}</p>
                  </div>
                  <button
                    className={
                      "vote " + (v.votes.includes(myId) ? "voted" : "")
                    }
                    onClick={() => action("vote", v.id)}
                    aria-label={"Bình chọn " + v.title}
                  >
                    <ArrowUp size={15} />
                    {v.votes.length}
                  </button>
                </div>
              ))}
              {!room.queue.length && (
                <div className="chat-empty">
                  <Music2 size={30} />
                  <p>
                    Chọn giai điệu tiếp theo
                    <br />
                    cho cả hội nhé.
                  </p>
                  <button className="primary" onClick={() => setAdd(true)}>
                    Thêm video đầu tiên
                  </button>
                </div>
              )}
              <button className="add-video" onClick={() => setAdd(true)}>
                <Plus size={17} /> Thêm video YouTube
              </button>
              <p className="queue-tip">
                Chủ rạp chuyển bài bằng nút ⏭ trên dock.
              </p>
            </div>
          ) : (
            <div className="people-content">
              <div className="section-label">
                ĐANG Ở TRONG RẠP · {room.participants.length}
              </div>
              {room.participants.map((p, i) => (
                <div className="person-row" key={p.id}>
                  <span>{p.avatar}</span>
                  <strong>
                    {p.name}
                    {p.id === myId ? " (bạn)" : ""}
                    <small>{i === 0 ? "Chủ rạp" : "Thành viên"}</small>
                  </strong>
                  <em>
                    {p.seat == null ? "Chưa chọn ghế" : seatLabel(p.seat)}
                  </em>
                </div>
              ))}
              {!room.participants.length && (
                <p className="queue-tip">Bạn có thể là người đầu tiên ở đây.</p>
              )}
            </div>
          )}
          <div className="private-card">
            <Lock size={16} />
            <div>
              <strong>Một không gian riêng cho hội bạn</strong>
              <span>Phòng riêng · Sắp ra mắt</span>
            </div>
            <ArrowUpRight size={16} />
          </div>
        </aside>
      </main>
      {mode === "welcome" && (
        <div className="welcome-card">
          <div className="welcome-top">
            <span className="welcome-spark">✦</span>
            <span>HẸN NHAU Ở HÀNG GHẾ NÀY</span>
            <span>01 / 100</span>
          </div>
          <h2>Chỗ của bạn còn trống.</h2>
          <p>Mang theo một cái tên. Phần còn lại, cùng nhau.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <label htmlFor="display-name">MỌI NGƯỜI GỌI BẠN LÀ</label>
            <div className="name-input">
              <span>{avatar}</span>
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="Tên của bạn..."
                autoComplete="nickname"
              />
            </div>
            <div className="avatar-options" aria-label="Chọn avatar">
              {avatars.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-label={"Avatar " + a}
                  aria-pressed={avatar === a}
                  className={a === avatar ? "chosen" : ""}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <button className="primary join" disabled={joining}>
              {joining ? "Đang kết nối..." : "Vào rạp cùng mọi người"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <button className="demo-link" onClick={enterDemo}>
            Khám phá demo trước <ChevronRight size={13} />
          </button>
          <div className="welcome-foot">
            <span /> Miễn phí. Không cần tài khoản.
          </div>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Info size={17} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
            <X size={14} />
          </button>
        </div>
      )}
      {(seats || add || help) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSeats(false);
            setAdd(false);
            setHelp(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={seats ? "Chọn ghế" : add ? "Thêm video" : "Về Cùng Xem"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Đóng"
              onClick={() => {
                setSeats(false);
                setAdd(false);
                setHelp(false);
              }}
            >
              <X size={20} />
            </button>
            {seats ? (
              <>
                <span className="eyebrow">TÌM CHỖ CỦA BẠN</span>
                <h2>Ngồi đâu cũng vui.</h2>
                <div className="map-screen">MÀN CHIẾU</div>
                {seatGrid}
                <div className="legend">
                  <span>
                    <i /> Còn trống
                  </span>
                  <span>
                    <i className="occupied" /> Đã có người
                  </span>
                  <span>
                    <i className="mine" /> Ghế của bạn
                  </span>
                </div>
                <p className="queue-tip">
                  10 hàng A–J, mỗi hàng 10 ghế. Di chuột hoặc giữ để xem số ghế.
                </p>
              </>
            ) : add ? (
              <>
                <span className="eyebrow">GÓP MỘT GIAI ĐIỆU</span>
                <h2>Tiếp theo, xem gì?</h2>
                <form
                  className="add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!parseYoutube(url)) {
                      notify("Đường dẫn YouTube chưa hợp lệ.");
                      return;
                    }
                    action("queue:add", { url, title });
                    setAdd(false);
                    setUrl("");
                    setTitle("");
                    setTab("queue");
                    setPanel(true);
                  }}
                >
                  <label>
                    Đường dẫn YouTube
                    <input
                      type="text"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </label>
                  <label>
                    Tên video <span>(tuỳ chọn)</span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                      placeholder="Đặt tên để cả hội dễ nhận ra"
                    />
                  </label>
                  <button className="primary">
                    Thêm vào hàng chờ <Plus size={17} />
                  </button>
                </form>
              </>
            ) : (
              <>
                <span className="eyebrow">CÙNG XEM · MVP</span>
                <h2>Một chiếc rạp, gần nhau hơn.</h2>
                <p>
                  Rạp công khai 100 ghế. Xem YouTube, nghe nhạc, bình chọn và
                  trò chuyện cùng bạn bè.
                </p>
                <div className="info-box">
                  <strong>
                    {mode === "demo"
                      ? "Bạn đang ở chế độ demo"
                      : mode === "live"
                        ? "Kết nối backend Socket.IO"
                        : "Bạn chưa vào rạp"}
                  </strong>
                  <p>
                    {mode === "demo"
                      ? "Mọi thao tác chỉ diễn ra trong trình duyệt này. Thành viên và tin nhắn ban đầu là dữ liệu minh hoạ."
                      : "Khi kết nối server, ghế, chat, hàng chờ và trạng thái phát được chia sẻ theo thời gian thực. Trạng thái lưu trong RAM và mất khi server khởi động lại."}
                  </p>
                </div>
                <p className="queue-tip">
                  YouTube có thể yêu cầu bấm phát lần đầu hoặc chặn video nhúng.
                  Chủ rạp là người vào đầu tiên. Phòng riêng sẽ có ở giai đoạn
                  sau.
                </p>
                {mode !== "welcome" && (
                  <button
                    className="primary"
                    onClick={() => {
                      socket.current?.disconnect();
                      setMode("welcome");
                      setRoom(initial);
                      setMyId("");
                      setHelp(false);
                    }}
                  >
                    Rời rạp
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function parseYoutube(input: string) {
  try {
    const u = new URL(input);
    if (
      !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
        u.hostname,
      )
    )
      return null;
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ||
          u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    return /^[\w-]{11}$/.test(id || "") ? id : null;
  } catch {
    return /^[\w-]{11}$/.test(input) ? input : null;
  }
}
