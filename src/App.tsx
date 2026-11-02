import { youtubeId as parseYoutube } from "../shared/youtube.js";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import {
  Clapperboard,
  Copy,
  Eye,
  EyeOff,
  Maximize2,
  MoreHorizontal,
  Wallet,
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
  Volume2,
  VolumeX,
  Palette,
  X,
} from "lucide-react";
import type { Room } from "./types";
import { AddVideoForm } from "./AddVideoForm";
import { ProfileForm, type AccountProfile } from "./ProfileForm";
import { EntryCard } from "./EntryCard";
import { CinemaHud, type CameraView } from "./CinemaHud";
import { ambientPeople } from "./theater/ambience";
import { Theater } from "./Theater";
import { Player } from "./Player";
import { SEATS, seatLabel } from "./seats";
import "./style.css";
import "./ui.css";
import "./reference.css";
import "./cinema-hud.css";
const localId = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const avatars = ["🌷", "🐱", "🐼", "🦊", "🐸", "🐰"];
const initial: Room = {
  participants: [],
  queue: [],
  messages: [],
  playback: {
    videoId: "aqz-KE-bpKQ",
    title: "Big Buck Bunny · Blender Foundation",
    status: "paused",
    positionAtUpdate: 0,
    updatedAtServer: Date.now(),
    revision: 0,
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
    [panel, setPanel] = useState(false),
    [twoD, setTwoD] = useState(false),
    [seats, setSeats] = useState(false),
    [add, setAdd] = useState(false),
    [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [notice, setNotice] = useState(""),
    [offset, setOffset] = useState(0),
    [help, setHelp] = useState(false);
  const [profile,setProfile] = useState<AccountProfile|null>(null);
  const [account,setAccount] = useState<AccountProfile|null>(null);
  const selectAfterJoin=useRef(false);
  const [adding, setAdding] = useState(false);
  const [privateRoom, setPrivateRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [password, setPassword] = useState("");
  const roomId = useRef(new URLSearchParams(location.search).get("room") || "community");
  const [unread, setUnread] = useState(0);
  const nearBottom = useRef(true), lastMessage = useRef<string | null>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('cx-muted') !== '0');
  const [volume,setVolume] = useState(() => Math.max(0,Math.min(100,Number(localStorage.getItem('cx-volume')||80))));
  const [captions,setCaptions] = useState(() => localStorage.getItem('cx-captions')==='1');
  const [laser,setLaser] = useState(true);
  const [hudHidden,setHudHidden] = useState(() => localStorage.getItem('wetube-hud-hidden')==='1');
  const [dockCollapsed,setDockCollapsed] = useState(() => localStorage.getItem('wetube-dock-collapsed')==='1');
  const [commerce,setCommerce] = useState<'support'|'wallet'|'post'|null>(null);
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{localStorage.setItem('cx-muted',muted?'1':'0');localStorage.setItem('cx-volume',String(volume));localStorage.setItem('cx-captions',captions?'1':'0');localStorage.setItem('wetube-hud-hidden',hudHidden?'1':'0');localStorage.setItem('wetube-dock-collapsed',dockCollapsed?'1':'0');},[muted,volume,captions,hudHidden,dockCollapsed]);
  const bots=useMemo(()=>ambientPeople(room.participants,now,roomId.current==='community'),[room.participants,now]);
  const theaterPeople=useMemo(()=>[...room.participants,...bots],[room.participants,bots]);
  const [appearance, setAppearance] = useState(false);
  const [view, setView] = useState<CameraView>("overview");
  const [quality, setQuality] = useState<"high" | "smooth">(() => matchMedia("(max-width:720px)").matches ? "smooth" : "high");
  const [focusedSeat, setFocusedSeat] = useState(0);
  const socketCleanup = useRef<() => void>(() => {});
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
    const latest = room.messages.at(-1)?.id || null;
    const oldIndex = room.messages.findIndex(m => m.id === lastMessage.current);
    const fresh = lastMessage.current && latest !== lastMessage.current ? (oldIndex >= 0 ? room.messages.length - oldIndex - 1 : room.messages.length) : 0;
    lastMessage.current = latest;
    const visible = tab === "chat" && (panel || window.innerWidth > 760);
    if (visible && nearBottom.current) {
      chatEnd.current?.scrollIntoView({behavior: "smooth"}); setUnread(0);
    } else if (fresh) setUnread(n => n + fresh);
  }, [room.messages, tab, panel]);
  useEffect(
    () => () => {
      socketCleanup.current(); socket.current?.disconnect();
    },
    [],
  );
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty("--visible-height", `${viewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty("--visible-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize(); viewport?.addEventListener("resize", resize); viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize); window.removeEventListener("resize", resize);};
  }, []);
  useEffect(() => {
    const dialogOpen = seats || add || help || !!commerce || !!profile;
    const selector = dialogOpen ? ".modal" : mode === "welcome" ? ".welcome-card" : panel ? ".side-panel" : null;
    if (!selector) return;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    const previous = document.activeElement as HTMLElement | null;
    const backgrounds = selector === ".side-panel" ? [] : [".header", "main", ...(dialogOpen ? [".welcome-card"] : [])];
    const elements = backgrounds.flatMap(q => Array.from(document.querySelectorAll<HTMLElement>(q)));
    elements.forEach(el => el.inert = true);
    const focusable = () => Array.from(target.querySelectorAll<HTMLElement>("button,input,select,a[href],[tabindex]"))
      .filter(el => el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0);
    if (mode === "welcome" && !dialogOpen) target.focus(); else focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode !== "welcome") { e.preventDefault();
        if (dialogOpen) {setSeats(false); setAdd(false); setHelp(false); setAppearance(false);setCommerce(null);
              if(profile){if(!profile.configured){void fetch('/api/auth/logout',{method:'POST'});setAccount(null);}setProfile(null);}}
        else setPanel(false);
      } else if (e.key === "Escape" && dialogOpen) {setSeats(false); setAdd(false); setHelp(false); setAppearance(false);setCommerce(null);
              if(profile){if(!profile.configured){void fetch('/api/auth/logout',{method:'POST'});setAccount(null);}setProfile(null);}}
      if (e.key === "Tab" && selector !== ".side-panel") {
        const items = focusable(), first = items[0], last = items.at(-1);
        if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last) || !target.contains(document.activeElement)) {
          e.preventDefault(); (e.shiftKey ? last : first)?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {document.removeEventListener("keydown", key); elements.forEach(el => el.inert = false); if (previous?.isConnected) previous.focus();};
  }, [seats, add, help, panel, mode, commerce,profile]);
  const join = (entryName = name, createPrivate = privateRoom) => {
    if (!entryName.trim()) {
      notify("Nhập tên để cả hội nhận ra bạn nhé.");
      return;
    }
    socketCleanup.current(); socket.current?.disconnect();
    setJoining(true);
    const joinTimeout = setTimeout(() => {if (socket.current === s) {setJoining(false); notify("Kết nối chậm. Bạn có thể chờ hoặc thử vào lại.");}}, 12000);
    const s = io({ timeout: 5000 });
    socket.current = s;
    let revision = -1, generation = 0, bestRtt = Infinity, hasJoined = false;
    const receive = (r: Room) => {
      if (socket.current !== s || !s.connected || !r?.playback || r.playback.revision < revision) return;
      revision = r.playback.revision;
      setRoom(r);
    };
    const clock = () => {
      if (!s.connected) return;
      const epoch = generation, sent = Date.now(), start = performance.now();
      s.timeout(3000).emit("clock", null, (err: Error | null, server: number) => {
        const rtt = performance.now() - start;
        if (!err && epoch === generation && Number.isFinite(server) && rtt < bestRtt) {
          bestRtt = rtt;
          setOffset(server - (sent + rtt / 2));
        }
      });
    };
    s.on("connect", () => {
      generation++; revision = -1; bestRtt = Infinity;
      const enter = () => s.emit("join", { name:entryName, avatar, roomId: roomId.current, password, token: sessionStorage.getItem("cx-session:"+roomId.current) });
      if (createPrivate && !hasJoined && roomId.current === "community") {
        s.timeout(5000).emit("room:create", {name:roomName, maxMembers:capacity, password}, (err: Error | null, result: {ok:boolean; roomId:string}) => {
          if (err || !result?.ok) {setJoining(false); notify("Không tạo được phòng. Hãy thử lại."); return;}
          roomId.current = result.roomId;
          history.replaceState(null,"", "?room="+result.roomId); enter();
        });
      } else enter();
      clock();
      const epoch = generation;
      s.timeout(3000).emit("snapshot", null, (err: Error | null, r: Room) => {
        if (!err && epoch === generation) receive(r);
      });
    });
    const clockTimer = setInterval(() => { bestRtt = Infinity; clock(); }, 15000);
    socketCleanup.current = () => {clearTimeout(joinTimeout); clearInterval(clockTimer);};
    s.on("disconnect", () => { generation++; });
    s.on("state", receive);
    s.on("disconnect", (reason) => { clearTimeout(joinTimeout); if (reason === "io client disconnect" || reason === "io server disconnect") clearInterval(clockTimer); });
    s.on("session", (session: {token: string; roomId: string}) => sessionStorage.setItem("cx-session:"+session.roomId, session.token));
    s.on("room:removed", (reason: string) => {sessionStorage.removeItem("cx-session:"+roomId.current); s.disconnect(); setRoom(initial); setMode("welcome"); setMyId(""); notify(reason);});
    s.on("joined", (id: string) => {
      if (hasJoined) notify("Đã kết nối lại và đồng bộ rạp.");
      clearTimeout(joinTimeout); hasJoined = true;
      setMyId(id);
      setMode("live");
      setConnected(true);
      setJoining(false);
      if(selectAfterJoin.current){selectAfterJoin.current=false;setSeats(true);}
      localStorage.setItem("cx-name", entryName);
      localStorage.setItem("cx-avatar", avatar);
    });
    s.on("notice", (t: string) => {
      if (!hasJoined) clearTimeout(joinTimeout);
      notify(t);
      setJoining(false);
    });
    s.on("disconnect", reason => { setConnected(false); if (reason === "io client disconnect" || reason === "io server disconnect") return; notify("Mất kết nối · đang kết nối lại. Ghế được giữ trong 30 giây."); });
    s.on("connect_error", () => {
      clearTimeout(joinTimeout); setJoining(false);
      setConnected(false);
      notify("Chưa kết nối được backend. Chạy npm run dev hoặc khám phá demo.");
    });
  };
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/auth/me', {signal:abort.signal, credentials:'same-origin'})
      .then(response => response.ok ? response.json() : null)
      .then(result => {if (!abort.signal.aborted && result?.user) {setName(result.user.name);setAccount(result.user);if(!result.user.configured)setProfile(result.user);else join(result.user.name);}})
      .catch(() => {});
    return () => abort.abort();
  }, []);

  const enterDemo = () => {
    socketCleanup.current(); socket.current?.disconnect();
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
  const action = (event: string, data?: any, done?: (ok: boolean) => void) => {
    if (!ready) {
      notify(mode === "live" ? "Gửi thất bại: đã mất kết nối. Nội dung được giữ lại, hãy thử lại khi kết nối phục hồi." : "Vào rạp để sử dụng tính năng này.");
      return false;
    }
    if (mode === "live") {
      const transport = ["playback", "next", "ended", "skip:vote"].includes(event) ? socket.current?.volatile : socket.current;
      transport?.timeout(5000).emit(event, ["playback", "next", "ended", "skip:vote"].includes(event) ? { ...data, revision: room.playback.revision } : data ?? null, (err: Error | null, result: { ok: boolean }) => {
        done?.(!err && !!result?.ok);
        if (err || !result?.ok) {
          if (event === "chat") setText(data);
          if (event === "queue:add") { setUrl(data.url); setTitle(data.title); setAdd(true); }
          notify("Gửi dữ liệu thất bại. Nội dung đã được giữ lại để bạn thử lại.");
        }
      });
      return true;
    }
    done?.(true);
    setRoom((r) => {
      if (event === "emote") return {...r,participants:r.participants.map(p=>p.id===myId?{...p,emote:{kind:data.kind,until:Date.now()+8000}}:p)};
      if (event === "stage") return {...r,participants:r.participants.map(p=>p.id===myId?{...p,stageSpot:data.spot,stageUntil:Date.now()+60000}:p)};
      if (event === "appearance") return { ...r, participants: r.participants.map(p => p.id === myId ? {...p, ...data} : p) };
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
          playback: { ...r.playback,
            status: data.type === "play" ? "playing" : data.type === "pause" ? "paused" : r.playback.status,
            positionAtUpdate: data.type === "seek" ? data.position : r.playback.positionAtUpdate + (r.playback.status === "playing" ? (Date.now() - r.playback.updatedAtServer) / 1000 : 0),
            updatedAtServer: Date.now(), revision: r.playback.revision + 1 },
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
            videoId: v.youtubeId,
            title: v.title,
            positionAtUpdate: 0,
            status: "playing",
            updatedAtServer: Date.now(),
            revision: r.playback.revision + 1,
          },
        };
      }
      return r;
    });
    return true;
  };
  const canControl = ready && (mode === "demo" || (room.participants[0]?.id === myId || !!room.permissions?.playback));
  const togglePlay = () => action("playback", { type: room.playback.status === "playing" ? "pause" : "play" });
  const me = room.participants.find((p) => p.id === myId),
    fail = useCallback(() => {
      setTwoD(true);
      setNotice("WebGL không khả dụng. Đã chuyển sang rạp 2D.");
    }, []);
  const seatGrid = (
    <div className="seat-grid reference-seat-grid" role="group" aria-label="100 ghế A1 đến J10; phím mũi tên di chuyển, Enter đặt ghế">
      {Array.from({ length: 100 }, (_, i) => {
        const p = theaterPeople.find((p) => p.seat === i);
        return (
          <button
            key={i}
            data-seat-id={i}
            tabIndex={focusedSeat === i ? 0 : -1}
            onFocus={() => setFocusedSeat(i)}
            onKeyDown={e => {
              const row = Math.floor(i / 10), col = i % 10;
              const next = e.key === "ArrowRight" ? row * 10 + Math.min(9, col + 1) : e.key === "ArrowLeft" ? row * 10 + Math.max(0, col - 1) : e.key === "ArrowDown" ? Math.min(99, i + 10) : e.key === "ArrowUp" ? Math.max(0, i - 10) : e.key === "Home" ? (e.ctrlKey ? 0 : row * 10) : e.key === "End" ? (e.ctrlKey ? 99 : row * 10 + 9) : null;
              if (next !== null) { e.preventDefault(); setFocusedSeat(next); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-seat-id="${next}"]`)?.focus(); }
            }}
            title={
              p ? seatLabel(i) + " · " + p.name + (p.id === myId ? " · Ghế của bạn" : p.isBot ? " · Bot · Bấm để ngồi và bot nhường ghế" : " · Đang có người") : "Chọn ghế " + seatLabel(i) + " · Cụm " + SEATS[i].size + " chỗ"
            }
            aria-label={
              p ? seatLabel(i) + " · " + p.name + (p.id === myId ? " · Ghế của bạn" : p.isBot ? " · Bot · Bấm để ngồi và bot nhường ghế" : " · Đang có người") : "Chọn ghế " + seatLabel(i) + " · Cụm " + SEATS[i].size + " chỗ"
            }
            aria-disabled={!!p && !p.isBot && p.id !== myId}
            className={
              "seat " + (p?.id === myId ? "mine" : p?.isBot ? "bot-seat" : p ? "occupied" : "")
            }
            onClick={() => p && !p.isBot && p.id !== myId ? notify("Ghế " + seatLabel(i) + " đã có " + p.name + ". Hãy chọn ghế còn trống nhé.") : action("seat", i, ok=>{if(ok)setSeats(false);})}
          >
            <span className="seat-code">{String(i%10+1).padStart(2,'0')}</span>
          </button>
        );
      })}
    </div>
  );
  return (
    <div className={"app " + (!panel ? "panel-hidden " : "")+(hudHidden?"hud-hidden":"")}>
      <header className="header">
        <a className="brand" href="/" aria-label="wetube ciné — Trang chủ">
          <img src="/brand-mark.svg" alt="" />
          <span>
            wetube ciné<small>VIDEO / NGHE NHẠC / 01</small>
          </span>

        </a>
        <div className="room-nav">
          <span className="live-dot" />
          <span>{joining ? "Đang kết nối…" : mode === "demo" ? "Rạp demo" : connected ? "Đã kết nối" : mode === "live" ? "Mất kết nối · đang thử lại" : "Rạp đang mở"}</span>
          <ChevronDown size={14} />
          <i />
          <Users size={14}/><span className="public-label"><span>{mode === 'welcome'?'Chưa vào rạp':`${room.participants.length} đang online`}</span><small title={`Bao gồm ${bots.length} bot minh họa tự đổi ghế`}>{theaterPeople.filter(p=>p.seat!=null).length} / {room.maxMembers || 100} ghế</small></span>
        </div>
        <div className="header-actions">
          <button
            aria-label="Mời bạn bè"
            className="invite"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(room.roomId && room.roomId !== "community" ? `${location.origin}/?room=${room.roomId}` : location.origin + "/");
                notify(
                  "Đã sao chép liên kết. Bạn bè cần truy cập cùng máy chủ để cùng xem.",
                );
              } catch {
                notify("Liên kết rạp: " + location.href);
              }
            }}
          >
            <Copy size={18} />
            <span>Mời bạn bè</span>
          </button>
          <button className="header-icon fullscreen-button hud-optional" aria-label="Toàn màn hình trình duyệt" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen?.().catch(()=>notify('Trình duyệt chưa hỗ trợ toàn màn hình.'));}}><Maximize2 size={18}/></button>
          <button className="header-icon quality-button hud-optional" aria-label={quality==='high'?'Độ nét cao — bấm để chuyển sang mượt':'Chế độ mượt — bấm để tăng độ nét'} onClick={()=>setQuality(quality==='high'?'smooth':'high')}><Settings2 size={18}/></button>
          <button className="header-icon hud-toggle" aria-label={hudHidden?'Hiện lại các nút':'Ẩn các nút trên màn'} aria-pressed={hudHidden} onClick={()=>setHudHidden(!hudHidden)}>{hudHidden?<Eye size={18}/>:<EyeOff size={18}/>}</button>
          <button className="header-icon mobile-more hud-optional" aria-label="Cài đặt rạp" onClick={()=>setHelp(true)}><MoreHorizontal size={20}/></button>
          {mode!=='welcome'&&<button className="profile" aria-label="Thông tin của bạn" onClick={()=>{if(account)setProfile({...account,...me});else{setAppearance(true);setHelp(true);}}}>{name.slice(0,1).toUpperCase()}</button>}
        </div>
      </header>
      <main>
        <section className="cinema">
          <div className="cinema-top hud-optional">
            <div>
              <span className="eyebrow">MỘT CHIẾC RẠP. CẢ HỘI CÙNG XEM.</span>
              <h1>
                Chọn một chỗ, xem cùng nhau.
              </h1>
              <p className="intro-description">Ghế đơn, ghế đôi, ghế ba — chỗ của bạn ở đâu?</p>
            </div>
            <button className="mode-button" aria-pressed={twoD} aria-label={twoD ? "Chuyển sang không gian 3D" : "Chuyển sang chế độ 2D"} onClick={() => setTwoD(!twoD)}>
              <LayoutGrid size={14} />
              {twoD ? "Chế độ 2D" : "Không gian 3D"}
              <ChevronDown size={13} />
            </button>
          </div>
          <div className={"stage " + (!twoD ? "immersive-stage" : "flat-stage")}>
            <div className="screen-caption">
              <span className="tiny-pill">
                <span /> ĐANG CHIẾU
              </span>
              <span>RẠP CỦA CHÚNG MÌNH</span>
              <span>01</span>
            </div>
            <div className="screen-frame" ref={playerWrap}>
              <div className="projection" />
              {mode !== "welcome" && !!room.playback.videoId ? (
                <Player
                  onEnded={() => { if (mode === "live") action("ended", {videoId: room.playback.videoId}); }}
                  muted={muted}
                  volume={volume}
                  captions={captions}
                  playback={room.playback}
                  connected={mode === "demo" || connected}
                  offset={mode === "demo" ? 0 : offset}
                />
              ) : (
                <div className="reference-screen">
                  <div className="reference-screen-top"><span>WETUBE CINÉ / PHÒNG 01</span><span>100 CHỖ · CÙNG MỘT MÀN HÌNH</span></div>
                  <div className="reference-screen-copy"><Clapperboard size={76} strokeWidth={1}/><span>MỘT CHIẾC RẠP. CẢ HỘI CÙNG XEM.</span><h2>{room.nextAt?'Bình chọn kết thúc':'Chỗ này còn trống.'}<br/><i>{room.nextAt?`sau ${Math.max(0,Math.ceil((room.nextAt-now-offset)/1000))} giây`:'Chờ bạn và một video hay.'}</i></h2><p>{room.nextAt?'Mở Hàng chờ và bình chọn video cả hội cùng xem.':'Chọn một chỗ ngồi · Gửi video bạn thích · Bình chọn cùng nhau'}</p></div>
                  <div className="reference-screen-bottom"><span>KHÔNG GIAN CỦA CHÚNG MÌNH</span><span>EST. 2026</span></div>
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
                    : (room.playback.status === "playing")
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
                  view={view}
                  quality={quality}
                  screen={playerWrap}
                  people={theaterPeople}
                  messages={room.messages}
                  energetic={room.playback.energetic}
                  bpm={room.playback.bpm}
                  laser={laser}
                  onStage={spot=>action("stage",{spot})}
                  myId={myId}
                  onSeat={(i) => action("seat", i)}
                  onFail={fail}
                />
              )}
              <div className="seat-hint">
                <span className="seat-dot" />
                {me?.seat != null
                  ? "Bạn đang ngồi ở ghế " + seatLabel(me.seat)
                  : room.participants.length === 0 ? "Rạp còn trống. Bạn sẽ là người mở đầu tối nay." : "Chọn một chỗ ngồi, gần nhau hơn một chút."}
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
          <CinemaHud active={mode!=='welcome'} view={view} setView={setView} hasSeat={me?.seat!=null} seatLabel={me?.seat!=null?seatLabel(me.seat):''}
            hidden={hudHidden} collapsed={dockCollapsed} setCollapsed={setDockCollapsed} laser={laser} setLaser={setLaser}
            muted={muted} setMuted={setMuted} volume={volume} setVolume={setVolume} captions={captions} setCaptions={setCaptions}
            tab={tab} panel={panel} openPanel={target=>{setTab(target);setPanel(!(panel&&tab===target));}} queueCount={room.queue.length} unread={unread}
            text={text} setText={setText} send={()=>{if(text.trim()&&action('chat',text.trim()))setText('');}} ready={ready} canChat={room.permissions?.chat!==false||room.participants[0]?.id===myId}
            openSeats={()=>setSeats(true)} openAdd={()=>setAdd(true)} openAppearance={()=>{if(account)setProfile({...account,...me});else{setAppearance(true);setHelp(true);}}} openPrivate={()=>setHelp(true)} openCommerce={setCommerce}
            emote={kind=>action('emote',{kind})} notify={notify}/>

        </section>
        {panel && <div className="panel-backdrop" onClick={() => setPanel(false)} aria-hidden="true" />}
        <aside role="dialog" aria-modal={false} aria-label="Trò chuyện và hàng chờ" className={"side-panel " + (panel ? "open" : "")}>
          <div className="reference-drawer-head"><div><span className="eyebrow">{tab==='queue'?'CÙNG CHỌN, CÙNG XEM':`${room.participants.length} NGƯỜI ĐANG Ở ĐÂY`}</span><h2>{tab==='queue'?'Danh sách chờ':tab==='people'?'Thành viên':'Trò chuyện'}</h2></div><button aria-label="Đóng bảng" onClick={()=>setPanel(false)}><X size={19}/></button></div>
          <div className="panel-tabs">
            <button
              aria-pressed={tab === "chat"}
              className={tab === "chat" ? "active" : ""}
              onClick={() => setTab("chat")}
            >
              Trò chuyện <span>{room.messages.length}</span>
            </button>
            <button
              aria-pressed={tab === "queue"}
              className={tab === "queue" ? "active" : ""}
              onClick={() => setTab("queue")}
            >
              Hàng chờ <span>{room.queue.length}</span>
            </button>
            <button
              className={"panel-people " + (tab === "people" ? "active" : "")}
              aria-pressed={tab === "people"}
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
              <strong>{room.name || "Góc chill của chúng mình"}</strong>
              <p>Một chiếc rạp, nhiều niềm vui.</p>
            </div>
            <span className="room-star">✧</span>
          </div>
          {tab === "chat" ? (
            <>
              <div className="chat-content" onScroll={e => {
                const el = e.currentTarget;
                nearBottom.current = el.scrollHeight-el.scrollTop-el.clientHeight < 60;
                if (nearBottom.current) setUnread(0);
              }}>
                <div className="day-label">
                  <span />
                  Hôm nay
                  <span />
                </div>
                <div className="system-message">
                  <Sparkles size={16} />
                  <p>
                    Chào mừng đến với wetube ciné!
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
                {unread > 0 && <button onClick={() => {nearBottom.current = true; setUnread(0); chatEnd.current?.scrollIntoView({behavior:"smooth"});}}>{unread} tin mới ↓</button>}
                <div aria-label="Emoji">{["😊", "❤️", "🎉", "👏", "🎶"].map(emoji => <button type="button" key={emoji} aria-label={"Thêm " + emoji} onClick={() => setText(t => Array.from(t+emoji).slice(0,160).join(''))}>{emoji}</button>)}</div>
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
                    if (action("chat", text.trim())) setText("");
                  }}
                >
                  <input
                    value={text}
                    maxLength={160}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Nói gì đó với cả rạp..."
                    aria-label="Tin nhắn"
                  />
                  <button type="submit" disabled={!ready || !text.trim()} aria-label="Gửi tin nhắn">
                    <Send size={17} />
                  </button>
                </form>
                <div className="chat-footer-caption">
                  <span>Enter để gửi · {Array.from(text).length}/160</span>
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
              {mode === "live" && <button disabled={!ready} onClick={() => action("skip:vote", {voted: !room.skipVote?.votes.includes(myId)})}>
                Bỏ qua bài hiện tại {room.skipVote ? `${room.skipVote.votes.length}/${room.skipVote.threshold} · đến ${new Date(room.skipVote.expiresAt).toLocaleTimeString("vi-VN")}` : ""}
              </button>}
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
                    onClick={() => action("vote", mode === "demo" ? v.id : {id: v.id, voted: !v.votes.includes(myId)})}
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
                  {mode === "live" && room.participants[0]?.id === myId && p.id !== myId && <button onClick={() => action("room:kick", p.id)}>Mời rời phòng</button>}
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
              <span>{room.roomId && room.roomId !== "community" ? "Phòng riêng · Chia sẻ link để mời bạn" : "Tạo phòng riêng từ màn hình vào rạp"}</span>
            </div>
            <ArrowUpRight size={16} />
          </div>
        </aside>
      </main>
      {mode === "welcome" && <EntryCard roomPasswordRequired={roomId.current !== "community"} roomPassword={password} setRoomPassword={setPassword} joining={joining} onAuthenticated={user => {setAccount(user);setName(user.name);if(!user.configured)setProfile(user);else join(user.name);}} onDemo={enterDemo}/>}
      {notice && (
        <div className="toast" role="status">
          <Info size={17} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
            <X size={14} />
          </button>
        </div>
      )}
      {(seats || add || help || commerce || profile) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSeats(false);
            setAdd(false);
            setHelp(false); setAppearance(false);setCommerce(null);
              if(profile){if(!profile.configured){void fetch('/api/auth/logout',{method:'POST'});setAccount(null);}setProfile(null);}
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={seats ? "Chọn ghế" : add ? "Thêm video" : "Về wetube ciné"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Đóng"
              onClick={() => {
                setSeats(false);
                setAdd(false);
                setHelp(false); setAppearance(false);setCommerce(null);
              if(profile){if(!profile.configured){void fetch('/api/auth/logout',{method:'POST'});setAccount(null);}setProfile(null);}
              }}
            >
              <X size={20} />
            </button>
            {profile ? <ProfileForm user={profile} onSave={user=>{setAccount(user);setName(user.name);setProfile(null);if(mode==='welcome'){selectAfterJoin.current=true;join(user.name);}else{action('appearance',{name:user.name,gender:user.gender,shirtColor:user.shirtColor});}}}/> : commerce ? <div className="commerce-panel"><span className="eyebrow">WETUBE CINÉ / CÙNG NHAU</span><h2>{commerce==='support'?'Một chút ủng hộ, một rạp thật vui.':commerce==='wallet'?'Phần ủng hộ của bạn':'Khoảnh khắc của bạn trên màn ảnh.'}</h2><p>{commerce==='post'?'Chọn ảnh từ máy hoặc điện thoại, viết lời nhắn và chọn thời gian.':'Cảm ơn bạn đã cùng giữ cho chiếc rạp luôn sáng đèn.'}</p><div className="commerce-balance"><span>Phần ủng hộ còn lại</span><strong>0đ</strong></div><p>Rạp chưa mở nhận ủng hộ và chiếu ảnh trả phí.</p><button className="primary" onClick={()=>setCommerce(null)}>Quay lại rạp</button></div> : seats ? (
              <>
                <span className="eyebrow">WETUBE CINÉ / CÙNG NHAU</span>
                <h2>Chọn một chỗ thật ưng.</h2><p className="seatmap-subtitle">10 hàng · 100 chỗ · Ghế đơn, ghế đôi và ghế ba. Bạn có thể đổi chỗ bất kỳ lúc nào.</p>
                <div className="map-screen">MÀN HÌNH CHIẾU</div>
                <div className="seat-map-scroll" tabIndex={0} role="region" aria-label="Sơ đồ ghế, cuộn ngang để xem tất cả">{seatGrid}</div>
                <div className="legend">
                  <span>
                    <i /> Còn trống
                  </span>
                  <span>
                    <i className="occupied" /> Đã có người
                  </span>
                  <span><i className="mine" /> Ghế của bạn</span><span><i className="bot-seat"/> Bot · Có thể chọn</span>
                </div>
                <p className="queue-tip">
                  10 hàng A–J, mỗi hàng 10 ghế. Chạm ghế trống để chọn; vuốt ngang để xem thêm.
                </p>
              </>
            ) : add ? (
              <AddVideoForm preview={async videoUrl=>{
                if(!parseYoutube(videoUrl))throw Error('Đường dẫn YouTube chưa hợp lệ.');
                if(mode==='demo')return {youtubeId:parseYoutube(videoUrl)!,title:'Video YouTube · bản xem trước demo',author:'Demo cục bộ'};
                return await new Promise((resolve,reject)=>socket.current?.timeout(7000).emit('queue:preview',{url:videoUrl},(err:Error|null,result:any)=>{if(err||!result?.ok)reject(Error(result?.error||'Không lấy được thông tin video.'));else resolve(result.video);}));
              }} add={data=>new Promise(resolve=>{if(!action('queue:add',data,ok=>{if(ok){setAdd(false);setTab('queue');setPanel(true);}resolve(ok);}))resolve(false);})}/>
            ) : (
              <>
                <span className="eyebrow">{appearance ? "NGOẠI HÌNH CỦA BẠN" : "CÀI ĐẶT RẠP"}</span>
                {!appearance&&<div className="settings-actions"><button onClick={()=>setQuality(quality==='high'?'smooth':'high')}>Độ nét: {quality==='high'?'Cao':'Mượt'}</button><button onClick={()=>{setAppearance(true);}}>Đổi tên và ngoại hình</button><button onClick={()=>setHudHidden(!hudHidden)}>{hudHidden?'Hiện lại các nút':'Ẩn các nút trên màn'}</button></div>}
                {appearance && <div className="appearance-controls">
                  <label>Màu áo <input type="color" aria-label="Màu áo" value={me?.shirtColor ?? "#879fbb"} onChange={e => action("appearance", {shirtColor: e.target.value})} /></label>
                  <label>Kiểu ngoại hình <select aria-label="Kiểu ngoại hình" value={me?.bodyStyle ?? "classic"} onChange={e => action("appearance", {bodyStyle: e.target.value})}><option value="classic">Cơ bản</option><option value="tall">Cao</option><option value="broad">Vai rộng</option><option value="cap">Đội mũ</option></select></label>
                </div>}
                {appearance && <div className="avatar-options">{avatars.map(a => <button key={a} aria-label={"Chọn " + a} aria-pressed={avatar === a} className={avatar === a ? "chosen" : ""} onClick={() => { setAvatar(a); localStorage.setItem("cx-avatar", a); if (mode === "demo") setRoom(r => ({...r, participants: r.participants.map(p => p.id === myId ? {...p, avatar: a} : p)})); else notify("Đã lưu ngoại hình. Ngoại hình mới được áp dụng khi bạn vào lại rạp."); }}>{a}</button>)}</div>}
                <button className="mode-button" aria-pressed={twoD} aria-label={twoD ? "Chuyển sang không gian 3D" : "Chuyển sang chế độ 2D"} onClick={() => setTwoD(!twoD)}><LayoutGrid size={18} />{twoD ? "Chuyển sang rạp 3D" : "Chuyển sang rạp 2D"}</button>
                {mode === "live" && room.participants[0]?.id === myId && room.permissions && <div>{([['chat','Chat'],['addVideo','Thêm video'],['playback','Điều khiển phát']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={room.permissions![key]} onChange={e => action("room:permissions", {[key]:e.target.checked})} /> Thành viên: {label}</label>)}</div>}
                {mode !== "welcome" && <form onSubmit={e => {e.preventDefault(); action("playback", {type:"seek", position:Number(new FormData(e.currentTarget).get("seconds"))});}}>
                  <label>Tua đến giây <input aria-label="Tua trong cài đặt (giây)" name="seconds" type="number" min="0" max="86400" step="0.1" defaultValue="0" disabled={!canControl} /></label>
                  <button disabled={!canControl}>Tua video</button>
                  <button type="button" disabled={!canControl || !room.queue.length} onClick={() => action("next")}>Chuyển bài tiếp theo</button>
                </form>}
                {<form className="private-create-form" onSubmit={e=>{e.preventDefault(); const start=()=>{setHelp(false);setMode("welcome");join(name,true);}; if(mode === "live") {socketCleanup.current();const s=socket.current;s?.timeout(2000).emit("room:leave",null,()=>{s.disconnect();start();});}else start();}}><h2>Phòng riêng</h2><label><input type="checkbox" checked={privateRoom} onChange={e=>setPrivateRoom(e.target.checked)}/> Tạo phòng riêng</label>{privateRoom&&<><label>Tên phòng<input required maxLength={60} value={roomName} onChange={e=>setRoomName(e.target.value)}/></label><label>Giới hạn người<input type="number" min={1} max={100} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label></>}<label>Mật khẩu phòng (nếu có)<input type="password" maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={!privateRoom}>Vào phòng</button></form>}
                <h2>Một chiếc rạp, gần nhau hơn.</h2>
                <p>
                  Rạp công khai 100 ghế. Xem YouTube, nghe nhạc, bình chọn và
                  trò chuyện cùng bạn bè.
                </p>
                <p className="queue-tip">Chọn ghế để có góc nhìn riêng, gửi video và bình chọn cùng cả rạp. Kéo để xoay góc nhìn; cuộn chuột hoặc dùng hai ngón tay để zoom. Dùng Tương tác để vẫy tay, vỗ tay hoặc nhảy.</p>
                {mode !== "welcome" && (
                  <button
                    className="primary"
                    onClick={() => {
                      void fetch("/api/auth/logout", {method:"POST"});
                      socketCleanup.current();
                      const s = socket.current;
                      s?.timeout(2000).emit("room:leave", null, () => s.disconnect());
                      sessionStorage.removeItem("cx-session:"+roomId.current);
                      if (mode === "demo") s?.disconnect();
                      setMode("welcome");
                      setRoom(initial);
                      setMyId("");
                      setHelp(false); setAppearance(false);setCommerce(null);
                      setAccount(null);setProfile(null);
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