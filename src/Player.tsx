import { useEffect, useRef, useState } from "react";
import type { Room } from "./types";
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
export function Player({
  playback,
  onChange,
  offset,
}: {
  playback: Room["playback"];
  onChange: (playing: boolean, position: number) => void;
  offset: number;
}) {
  const root = useRef<HTMLDivElement>(null),
    player = useRef<any>(null),
    current = useRef(playback),
    change = useRef(onChange),
    syncing = useRef(0),
    offsetRef = useRef(offset);
  const sample = useRef({ position: 0, time: 0 });
  const [error, setError] = useState("");
  current.current = playback;
  change.current = onChange;
  offsetRef.current = offset;
  const sync = () => {
    const p = player.current,
      s = current.current;
    if (!p?.getPlayerState) return;
    const target = Math.max(
      0,
      s.position +
        (s.playing ? (Date.now() + offsetRef.current - s.updatedAt) / 1000 : 0),
    );
    if (p.getVideoData?.()?.video_id !== s.youtubeId) {
      syncing.current = Date.now() + 1500;
      setError("");
      p.cueVideoById(s.youtubeId, target);
    } else if (Math.abs((p.getCurrentTime() || 0) - target) > 2) {
      syncing.current = Date.now() + 1000;
      p.seekTo(target, true);
    }
    if (s.playing && p.getPlayerState() !== 1) {
      syncing.current = Date.now() + 1000;
      p.playVideo();
    }
    if (!s.playing && p.getPlayerState() === 1) {
      syncing.current = Date.now() + 1000;
      p.pauseVideo();
    }
    sample.current = { position: p.getCurrentTime() || 0, time: Date.now() };
  };
  useEffect(() => {
    let alive = true;
    const init = () => {
      if (!alive || !root.current) return;
      player.current = new window.YT.Player(root.current, {
        videoId: current.current.youtubeId,
        playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: sync,
          onError: () =>
            setError(
              "Video không cho phép nhúng hoặc không khả dụng. Hãy chọn video khác.",
            ),
          onStateChange: (e: any) => {
            if (Date.now() < syncing.current) return;
            if (e.data === 1 || e.data === 2)
              change.current(e.data === 1, player.current.getCurrentTime());
          },
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.querySelector("script[data-youtube]")) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.dataset.youtube = "true";
        document.head.appendChild(s);
      }
    }
    const timer = setInterval(sync, 3000);
    const seekTimer = setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const now = Date.now(),
        pos = p.getCurrentTime() || 0,
        state = p.getPlayerState(),
        prev = sample.current;
      if (prev.time && now > syncing.current && (state === 1 || state === 2)) {
        const expected =
          prev.position + (state === 1 ? (now - prev.time) / 1000 : 0);
        if (Math.abs(pos - expected) > 2) {
          current.current = {
            ...current.current,
            playing: state === 1,
            position: pos,
            updatedAt: now + offsetRef.current,
          };
          change.current(state === 1, pos);
        }
      }
      sample.current = { position: pos, time: now };
    }, 400);
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(seekTimer);
      player.current?.destroy?.();
      player.current = null;
    };
  }, []);
  useEffect(sync, [playback, offset]);
  return (
    <>
      <div ref={root} />
      {error && <div className="player-error">{error}</div>}
    </>
  );
}
