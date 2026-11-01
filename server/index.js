import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { avatars, createRoom, selectSeat, youtubeId, message } from "./room.js";
const app = express(),
  http = createServer(app),
  io = new Server(http),
  room = createRoom();
app.get("/api/health", (_, res) =>
  res.json({ ok: true, participants: room.participants.length }),
);
app.use(express.static("dist"));
const broadcast = () => io.emit("state", { ...room, serverTime: Date.now() });
io.on("connection", (socket) => {
  let last = 0,
    hits = 0,
    start = Date.now();
  socket.use((_, next) => {
    if (Date.now() - start > 1000) {
      hits = 0;
      start = Date.now();
    }
    if (++hits > 20) return next(new Error("Too many events"));
    next();
  });
  const person = () => room.participants.find((p) => p.id === socket.id),
    error = (t) => socket.emit("notice", t);
  socket.on("join", (d) => {
    if (person()) return;
    if (room.participants.length >= 100) return error("Rạp đã đủ 100 người.");
    if (typeof d?.name !== "string" || !d.name.trim())
      return error("Hãy nhập tên của bạn.");
    room.participants.push({
      id: socket.id,
      name: d.name.trim().slice(0, 24),
      avatar: avatars.includes(d.avatar) ? d.avatar : avatars[0],
      seat: null,
    });
    socket.emit("joined", socket.id);
    broadcast();
  });
  socket.on("seat", (s) => {
    if (!selectSeat(room, socket.id, s))
      return error("Ghế vừa có người chọn. Hãy chọn ghế khác.");
    broadcast();
  });
  socket.on("chat", (t) => {
    const p = person();
    if (!p || typeof t !== "string" || !t.trim()) return;
    if (Date.now() - last < 500)
      return error("Chờ một chút trước khi gửi tiếp nhé.");
    last = Date.now();
    room.messages.push(message(p, t.trim().slice(0, 500)));
    room.messages = room.messages.slice(-100);
    broadcast();
  });
  socket.on("queue:add", (d) => {
    const p = person();
    if (!p) return;
    const id = youtubeId(typeof d?.url === "string" ? d.url : "");
    if (!id) return error("Đường dẫn YouTube chưa hợp lệ.");
    if (room.queue.length >= 30) return error("Hàng chờ tối đa 30 video.");
    if (room.queue.some((v) => v.youtubeId === id))
      return error("Video đã ở trong hàng chờ.");
    room.queue.push({
      id: randomUUID(),
      youtubeId: id,
      title:
        typeof d.title === "string" && d.title.trim()
          ? d.title.trim().slice(0, 120)
          : "YouTube · " + id,
      addedBy: p.name,
      votes: [],
    });
    broadcast();
  });
  socket.on("vote", (id) => {
    if (!person()) return;
    const v = room.queue.find((v) => v.id === id);
    if (!v) return;
    v.votes = v.votes.includes(socket.id)
      ? v.votes.filter((i) => i !== socket.id)
      : [...v.votes, socket.id];
    room.queue.sort((a, b) => b.votes.length - a.votes.length);
    broadcast();
  });
  socket.on("playback", (d) => {
    if (
      !person() ||
      typeof d?.playing !== "boolean" ||
      !Number.isFinite(d.position) ||
      d.position < 0 ||
      d.position > 86400
    )
      return;
    room.playback = {
      ...room.playback,
      playing: d.playing,
      position: d.position,
      updatedAt: Date.now(),
    };
    broadcast();
  });
  socket.on("next", () => {
    if (room.participants[0]?.id !== socket.id)
      return error("Chỉ chủ rạp có thể chuyển bài.");
    const v = room.queue.shift();
    if (!v) return error("Hãy thêm video vào hàng chờ.");
    room.playback = {
      youtubeId: v.youtubeId,
      title: v.title,
      playing: true,
      position: 0,
      updatedAt: Date.now(),
    };
    broadcast();
  });
  socket.on("disconnect", () => {
    room.participants = room.participants.filter((p) => p.id !== socket.id);
    room.queue.forEach(
      (v) => (v.votes = v.votes.filter((id) => id !== socket.id)),
    );
    room.queue.sort((a, b) => b.votes.length - a.votes.length);
    broadcast();
  });
});
http.listen(process.env.PORT || 3001, () =>
  console.log("Backend: http://localhost:3001"),
);
