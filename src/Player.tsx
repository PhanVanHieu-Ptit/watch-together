import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Room } from "./types";
declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}
let api: Promise<void> | undefined;
function loadAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (!api) api = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => { api = undefined; reject(new Error("timeout")); }, 15000);
    window.onYouTubeIframeAPIReady = () => { previous?.(); clearTimeout(timer); resolve(); };
    document.querySelector("script[data-youtube]")?.remove();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.dataset.youtube = "true";
    script.onerror = () => { clearTimeout(timer); api = undefined; reject(new Error("network")); };
    document.head.appendChild(script);
  });
  return api;
}
const errors: Record<number, string> = {
  2: "Mã video không hợp lệ.",
  5: "Trình duyệt không phát được video này.",
  100: "Video đã bị xóa hoặc đặt riêng tư.",
  101: "Chủ video không cho phép nhúng.",
  150: "Chủ video không cho phép nhúng.",
  153: "YouTube không xác minh được nguồn nhúng. Kiểm tra Referer và cấu hình website.",
};
export function Player({ playback, muted, offset, connected, onEnded, volume=80, captions=false }: {
  volume?:number; captions?:boolean; onEnded?: () => void; playback: Room["playback"]; muted: boolean; offset: number; connected: boolean;
}) {
  const endedCallback = useRef(onEnded); endedCallback.current = onEnded;
  const root = useRef<HTMLDivElement>(null), player = useRef<any>(null);
  const latest = useRef({ playback, muted, offset, connected });
  latest.current = { playback, muted, offset, connected };
  const loaded = useRef(""), ready = useRef(false), lastCorrection = useRef(0);
  const failure = useRef(false), blocked = useRef(false);
  const [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [needsTap, setNeedsTap] = useState(false), [retry, setRetry] = useState(0);
  const volumeRef = useRef(volume); volumeRef.current = volume;
  const captionsRef=useRef(captions);captionsRef.current=captions;
  const sync = (force = false) => {
    const p = player.current, { playback: s, offset, connected } = latest.current;
    if (!ready.current || !p) return;
    if (!connected) { p.pauseVideo(); return; }
    if (loaded.current !== s.videoId) {
      loaded.current = s.videoId; failure.current = false; blocked.current = false;
      setError(""); setNeedsTap(false);
      const target = Math.max(0, s.positionAtUpdate + (s.status === "playing" ? Math.max(0, Date.now() + offset - s.updatedAtServer) / 1000 : 0));
      if (s.status === "playing") p.loadVideoById({ videoId: s.videoId, startSeconds: target });
      else p.cueVideoById({ videoId: s.videoId, startSeconds: target });
      lastCorrection.current = performance.now();
      return;
    }
    if (failure.current || (blocked.current && !force)) return;
    const duration = p.getDuration();
    let target = Math.max(0, s.positionAtUpdate + (s.status === "playing" ? Math.max(0, Date.now() + offset - s.updatedAtServer) / 1000 : 0));
    if (duration > 0) target = Math.min(target, Math.max(0, duration - 0.1));
    const state = p.getPlayerState();
    if (root.current) {
      root.current.dataset.position = String(p.getCurrentTime() || 0);
      root.current.dataset.target = String(target);
      root.current.dataset.state = String(state);
      root.current.dataset.revision = String(s.revision);
      root.current.dataset.video = s.videoId;
    }
    // Buffering is local; never publish it or repeatedly seek while recovering.
    if (state === 3 && !force) return;
    const drift = Math.abs((p.getCurrentTime() || 0) - target);
    if ((force || drift > 1.25) && (force || performance.now() - lastCorrection.current > 2500)) {
      p.seekTo(target, true); lastCorrection.current = performance.now();
    }
    if (s.status === "playing" && state !== 1 && !(state === 0 && duration > 0 && target >= duration - 0.2)) p.playVideo();
    if (s.status === "paused" && state !== 2 && state !== 5) p.pauseVideo();
  };
  useEffect(() => {
    let alive = true;
    ready.current = false; loaded.current = ""; failure.current = false; blocked.current = false;
    setLoading(true); setError(""); setNeedsTap(false);
    // YT replaces its target node. Keep React's wrapper intact across retries.
    const mount = document.createElement("div");
    root.current?.replaceChildren(mount);
    const timeout = setTimeout(() => { if (alive && !ready.current) { setLoading(false); setError("Không thể tải trình phát. Kiểm tra kết nối rồi thử lại."); } }, 20000);
    loadAPI().then(() => {
      if (!alive) return;
      player.current = new window.YT.Player(mount, {
        videoId: latest.current.playback.videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, rel: 0, playsinline: 1, cc_load_policy:captionsRef.current?1:0, origin: location.origin },
        events: {
          onReady: (e: any) => {
            if (!alive) return;
            ready.current = true; clearTimeout(timeout); setLoading(false);
            const iframe = e.target.getIframe();
            iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
            iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
            e.target.setVolume(volumeRef.current);
            latest.current.muted ? e.target.mute() : e.target.unMute();
            sync();
          },
          onAutoplayBlocked: () => { if (alive) { blocked.current = true; setNeedsTap(true); } },
          onError: (e: any) => { if (alive) { failure.current = true; setLoading(false); setError(errors[e.data] || "Không thể phát video. Kiểm tra kết nối rồi thử lại."); } },
          onStateChange: (e: any) => {
            if (alive && e.data === 0 && latest.current.connected && loaded.current === latest.current.playback.videoId) endedCallback.current?.();
            if (alive && e.data === 1) { blocked.current = false; setNeedsTap(false); }
          },
        },
      });
    }).catch(() => { if (alive) { setLoading(false); setError("Không tải được YouTube. Kiểm tra kết nối rồi thử lại."); } });
    const timer = setInterval(() => sync(), 1000);
    const online = () => { if (alive) setRetry(n => n + 1); };
    const offline = () => { if (alive) setError("Đã mất mạng. Video của cả rạp vẫn được giữ lại."); };
    const visible = () => { if (!document.hidden) sync(); };
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false; ready.current = false;
      clearTimeout(timeout); clearInterval(timer);
      window.removeEventListener("online", online); window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
      player.current?.destroy?.(); player.current = null;
    };
  }, [retry]);
  useEffect(() => { sync(); }, [playback.revision, connected, offset]);
  useEffect(() => { if (ready.current) muted ? player.current.mute() : player.current.unMute(); }, [muted]);
  useEffect(() => { localStorage.setItem("cx-volume", String(volume)); if (ready.current) player.current.setVolume(volume); }, [volume]);
  useEffect(()=>{if(!ready.current)return;const p=player.current;try{if(captions){p.loadModule?.('captions');p.setOption?.('captions','track',{'languageCode':'vi'});}else p.unloadModule?.('captions');}catch{}},[captions]);
  const feedback = <div className="player-feedback">
    {loading && <div className="player-loading" role="status">Đang chuẩn bị màn chiếu…</div>}
    {needsTap && !error && <div className="player-error"><button onClick={() => { blocked.current = false; setNeedsTap(false); sync(true); }}>Chạm để bắt đầu</button></div>}
    {error && <div className="player-error" role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Thử lại</button><a href={"https://www.youtube.com/watch?v="+playback.videoId} target="_blank" rel="noopener noreferrer">Mở trên YouTube ↗</a></div>}
  </div>;
  const feedbackTarget = root.current?.closest(".stage");
  return <>
    <div ref={root} className="youtube-mount" />
    {feedbackTarget ? createPortal(feedback, feedbackTarget) : feedback}

  </>;
}
