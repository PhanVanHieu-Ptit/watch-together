import { randomUUID } from "node:crypto";
export const avatars = ["🌷", "🐱", "🐼", "🦊", "🐸", "🐰"];
export const createRoom = () => ({
  participants: [],
  messages: [],
  queue: [],
  playback: {
    youtubeId: "jfKfPfyJRdk",
    title: "Lofi hip hop radio · beats to relax / study to",
    playing: false,
    position: 0,
    updatedAt: Date.now(),
  },
});
export function selectSeat(r, id, seat) {
  if (!Number.isInteger(seat) || seat < 0 || seat > 99) return false;
  const p = r.participants.find((p) => p.id === id);
  if (!p || r.participants.some((p) => p.id !== id && p.seat === seat))
    return false;
  p.seat = seat;
  return true;
}
export function youtubeId(input) {
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
export const message = (p, text) => ({
  id: randomUUID(),
  userId: p.id,
  name: p.name,
  avatar: p.avatar,
  text,
  createdAt: Date.now(),
});
