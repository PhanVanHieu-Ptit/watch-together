import { randomUUID } from "node:crypto";
export const avatars = ["🌷", "🐱", "🐼", "🦊", "🐸", "🐰"];
export const createRoom = () => ({
  participants: [],
  messages: [],
  queue: [],
  playback: {
    videoId: "aqz-KE-bpKQ",
    title: "Big Buck Bunny · Blender Foundation",
    status: "paused",
    positionAtUpdate: 0,
    updatedAtServer: Date.now(),
    revision: 0,
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
export { youtubeId } from "../shared/youtube.js";
export const message = (p, text) => ({
  id: randomUUID(),
  userId: p.id,
  name: p.name,
  displayName: p.name,
  avatar: p.avatar,
  text,
  createdAt: Date.now(),
});
