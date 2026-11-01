import { AsyncLocalStorage } from "node:async_hooks";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { pathToFileURL } from "node:url";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { avatars, createRoom, selectSeat, youtubeId, message } from "./room.js";
export function createBackend({ metadata = youtubeMetadata, reconnectMs = 30000, skipMs = 30000, skipRatio = 0.6, emptyRoomMs = 1800000, roomTtlMs = 86400000 } = {}) {
const sessions = new Map(), timers = new Map(), limits = new Map();
const app = express(),
  http = createServer(app),
  io = new Server(http),
  room = createRoom();
const rooms = new Map([["community", room]]), credentials = new Map(), admission = new Map();
room.roomId = "community"; room.name = "Rạp cộng đồng"; room.maxMembers = 100;
room.permissions = {chat: true, addVideo: true, playback: false};
const consume = (key, max) => {
  const now = Date.now(), entry = admission.get(key);
  if (!entry || entry.until <= now) { admission.set(key, {count: 1, until: now + 60000}); return true; }
  return ++entry.count <= max;
};
const purge = id => {
  const r = rooms.get(id); if (!r || id === "community") return;
  io.to(id).emit("room:removed", "Phòng đã hết hạn.");
  for (const socket of io.sockets.sockets.values()) if (socket.data.roomId === id) socket.disconnect(true);
  for (const [token, session] of sessions) if (session.roomId === id) { clearTimeout(timers.get(session.id)); timers.delete(session.id); limits.delete(session.id); sessions.delete(token); }
  rooms.delete(id); credentials.delete(id);
};
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) if (id !== "community" && (now >= r.expiresAt || (r.emptySince && now-r.emptySince >= emptyRoomMs))) purge(id);
  for (const [key, value] of admission) if (value.until <= now) admission.delete(key);
}, Math.min(1000, emptyRoomMs, roomTtlMs)); cleanup.unref();
app.get("/api/health", (_, res) =>
  res.json({ ok: true, participants: room.participants.length }),
);
app.use(express.static("dist"));
io.on("connection", (socket) => {
  let room = rooms.get("community");
const sortQueue = () => room.queue.sort((a,b) => b.votes.length-a.votes.length || a.sequence-b.sequence);
let sequence = 0;
const advance = () => {
  const v = room.queue.shift(), p = room.playback;
  room.skipVote = null;
  room.playback = v ? { videoId: v.youtubeId, title: v.title, status: "playing", positionAtUpdate: 0, updatedAtServer: Date.now(), revision: p.revision + 1 }
    : {...p, status: "paused", updatedAtServer: Date.now(), revision: p.revision + 1};
};
const snapshot = () => ({ ...room, serverTime: Date.now() });
const broadcast = () => io.to(room.roomId).emit("state", snapshot());
  socket.on("clock", (_, ack) => { if (typeof ack === "function") ack(Date.now()); });
  socket.on("snapshot", (_, ack) => { if (typeof ack === "function") ack(person() ? snapshot() : {ok:false}); });
  let userId = null;
  let lastCommand = 0;
  const control = (d) => {
    if (room.participants[0]?.id !== userId && !room.permissions.playback) { error("Chỉ chủ rạp có thể điều khiển phát, dừng và tua."); return false; }
    if (d?.revision !== room.playback.revision) { error("Trạng thái đã thay đổi. Hãy thử lại."); socket.emit("state", snapshot()); return false; }
    if (Date.now() - lastCommand < 250) { error("Thao tác quá nhanh. Hãy chờ một chút."); return false; }
    lastCommand = Date.now();
    return true;
  };
  let hits = 0,
    start = Date.now();
  socket.use((_, next) => {
    if (Date.now() - start > 1000) {
      hits = 0;
      start = Date.now();
    }
    if (++hits > 20) return next(new Error("Too many events"));
    next();
  });
  const requests = new AsyncLocalStorage();
  const person = () => room.participants.find((p) => p.id === userId),
    error = (t) => { if (requests.getStore()) requests.getStore().rejected = true; socket.emit("notice", t); };
  socket.on("room:create", (d, ack) => {
    const fail = text => {error(text); if (typeof ack === "function") ack({ok:false});};
    if (person()) return fail("Hãy rời phòng trước khi tạo phòng mới.");
    if (!consume("create:"+socket.handshake.address, 5)) return fail("Tạo phòng quá nhanh. Thử lại sau một phút.");
    if (typeof d?.name !== "string" || !d.name.trim() || d.name.length > 60 || !Number.isInteger(d.maxMembers) || d.maxMembers < 1 || d.maxMembers > 100 || (d.password !== undefined && (typeof d.password !== "string" || d.password.length > 128))) return fail("Thông tin phòng không hợp lệ.");
    const id = randomUUID(), r = createRoom();
    Object.assign(r, {roomId:id, name:d.name.trim(), maxMembers:d.maxMembers, permissions:{chat:true, addVideo:true, playback:false}, expiresAt:Date.now()+roomTtlMs, emptySince:Date.now()});
    if (d.password) { const salt = randomUUID(); credentials.set(id, {salt, hash:scryptSync(d.password,salt,32)}); }
    rooms.set(id,r);
    if (typeof ack === "function") ack({ok:true, roomId:id});
  });
  socket.on("join", (d) => {
    if (person()) return;
    const id = typeof d?.roomId === "string" ? d.roomId : "community";
    const target = rooms.get(id);
    if (!consume("join:"+socket.handshake.address, 15)) return error("Thử vào phòng quá nhiều. Thử lại sau một phút.");
    if (!target || (target.expiresAt && target.expiresAt <= Date.now())) return error("Không thể vào phòng. Kiểm tra link và mật khẩu.");
    const session = typeof d?.token === "string" ? sessions.get(d.token) : null;
    if (session && session.roomId === id) {
      room = target; socket.data.roomId = id; room.emptySince = null;
      if (session.socketId && io.sockets.sockets.get(session.socketId)?.connected) return error("Phiên này đang được sử dụng.");
      userId = session.id; session.socketId = socket.id;
      clearTimeout(timers.get(userId)); timers.delete(userId);
      person().connected = true;
      socket.join(room.roomId); socket.emit("session", {userId, roomId: room.roomId, token: d.token}); socket.emit("joined", userId); broadcast(); return;
    }
    const secret = credentials.get(id);
    if (secret && (typeof d?.password !== "string" || d.password.length > 128 || !timingSafeEqual(scryptSync(d.password,secret.salt,32),secret.hash))) return error("Không thể vào phòng. Kiểm tra link và mật khẩu.");
    if (target.participants.length >= target.maxMembers) return error("Phòng đã đủ người.");
    if (typeof d?.name !== "string" || !d.name.trim() || d.name.trim().length > 24)
      return error("Hãy nhập tên của bạn.");
    room = target; socket.data.roomId = id; room.emptySince = null;
    userId = randomUUID();
    const token = randomUUID();
    sessions.set(token, {id: userId, socketId: socket.id, roomId: room.roomId});
    room.participants.push({
      id: userId, connected: true,
      name: d.name.trim().slice(0, 24),
      avatar: avatars.includes(d.avatar) ? d.avatar : avatars[0],
      seat: null,
    });
    socket.join(room.roomId);
    socket.emit("session", {userId, roomId: room.roomId, token});
    socket.emit("joined", userId);
    broadcast();
  });
  const removeMember = id => {
    room.participants = room.participants.filter(p => p.id !== id);
    for (const v of room.queue) v.votes = v.votes.filter(voter => voter !== id);
    if (room.skipVote) room.skipVote.votes = room.skipVote.votes.filter(voter => voter !== id);
    sortQueue();
    for (const [token, session] of sessions) if (session.id === id) sessions.delete(token);
    clearTimeout(timers.get(id)); timers.delete(id); limits.delete(id);
    if (!room.participants.length) room.emptySince = Date.now();
    broadcast();
  };
  socket.on("room:permissions", d => {
    if (room.participants[0]?.id !== userId) return error("Chỉ chủ rạp được quản lý quyền.");
    if (!d || Object.keys(d).some(k => !["chat","addVideo","playback"].includes(k) || typeof d[k] !== "boolean")) return error("Quyền không hợp lệ.");
    Object.assign(room.permissions,d); broadcast();
  });
  socket.on("room:kick", id => {
    if (room.participants[0]?.id !== userId || id === userId) return error("Chỉ chủ rạp được mời thành viên rời phòng.");
    if (!room.participants.some(p => p.id === id)) return error("Không tìm thấy thành viên.");
    for (const s of io.sockets.sockets.values()) if (s.data.roomId === room.roomId && [...sessions.values()].some(v => v.id === id && v.socketId === s.id)) {s.emit("room:removed", "Chủ phòng đã mời bạn rời phòng."); s.leave(room.roomId);}
    removeMember(id);
  });
  socket.on("room:leave", () => {socket.leave(room.roomId); removeMember(userId); userId = null;});
  socket.on("seat", (s) => {
    if (!selectSeat(room, userId, s))
      return error("Ghế vừa có người chọn. Hãy chọn ghế khác.");
    broadcast();
  });
  socket.on("appearance", (d) => {
    const p = person();
    if (!p || !d || (d.shirtColor !== undefined && !/^#[0-9a-f]{6}$/i.test(d.shirtColor)) || (d.bodyStyle !== undefined && !["classic", "tall", "broad", "cap"].includes(d.bodyStyle))) return error("Ngoại hình không hợp lệ.");
    if (d.shirtColor !== undefined) p.shirtColor = d.shirtColor;
    if (d.bodyStyle !== undefined) p.bodyStyle = d.bodyStyle;
    broadcast();
  });
  socket.on("chat", (t) => {
    const p = person();
    if (room.participants[0]?.id !== userId && !room.permissions.chat) return error("Chủ phòng đã tắt quyền chat.");
    if (!p || typeof t !== "string" || !t.trim() || t.trim().length > 500) return error("Tin nhắn phải có từ 1 đến 500 ký tự.");
    if (Date.now() - (limits.get(userId)?.chat || 0) < 500)
      return error("Chờ một chút trước khi gửi tiếp nhé.");
    limits.set(userId, {...limits.get(userId), chat: Date.now()});
    room.messages.push(message(p, t.trim().slice(0, 500)));
    room.messages = room.messages.slice(-100);
    broadcast();
  });
  socket.on("queue:add", async (d) => {
    const p = person(), requestedRoom = room;
    if (room.participants[0]?.id !== userId && !room.permissions.addVideo) return error("Chủ phòng đã tắt quyền thêm video.");
    const id = youtubeId(typeof d?.url === "string" && d.url.length <= 2048 ? d.url : "");
    if (!id) throw new Error("Đường dẫn YouTube chưa hợp lệ.");
    if (Date.now() - (limits.get(userId)?.queue || 0) < 1000) throw new Error("Thêm video quá nhanh.");
    limits.set(userId, {...limits.get(userId), queue: Date.now()});
    const info = await metadata(id);
    if (room !== requestedRoom || person() !== p || !socket.connected || (room.participants[0]?.id !== userId && !room.permissions.addVideo)) throw new Error("Phiên đã ngắt kết nối.");
    if (room.queue.length >= 30 || room.queue.some(v => v.youtubeId === id)) throw new Error("Hàng chờ đầy hoặc video đã tồn tại.");
    room.queue.push({id: randomUUID(), youtubeId: id, ...info, addedBy: p.name, addedByUserId: userId, addedAt: Date.now(), sequence: sequence++, votes: []});
    sortQueue(); broadcast();
  });
  socket.on("vote", (d) => {
    if (!d || typeof d.id !== "string" || typeof d.voted !== "boolean") return error("Phiếu không hợp lệ.");
    const v = room.queue.find(v => v.id === d.id);
    if (!v) return error("Video không còn trong hàng chờ.");
    v.votes = v.votes.filter(id => id !== userId);
    if (d.voted) v.votes.push(userId);
    sortQueue(); broadcast();
  });
  socket.on("ended", (d) => {
    if (d?.revision !== room.playback.revision || d?.videoId !== room.playback.videoId || room.playback.status !== "playing") return error("Báo kết thúc đã cũ.");
    advance(); broadcast();
  });
  socket.on("skip:vote", (d) => {
    if (d?.revision !== room.playback.revision || typeof d?.voted !== "boolean") return error("Phiếu bỏ qua không hợp lệ.");
    if (!room.skipVote || room.skipVote.expiresAt <= Date.now()) {
      const ballot = {id: randomUUID(), expiresAt: Date.now()+skipMs, threshold: Math.max(1, Math.ceil(room.participants.filter(p => p.connected).length*skipRatio)), votes: []};
      room.skipVote = ballot;
      const ballotRoom = room;
      const timer = setTimeout(() => {if (rooms.get(ballotRoom.roomId) === ballotRoom && ballotRoom.skipVote?.id === ballot.id) {ballotRoom.skipVote = null; io.to(ballotRoom.roomId).emit("state", {...ballotRoom, serverTime:Date.now()});}}, skipMs); timer.unref();
    }
    const ballot = room.skipVote;
    ballot.votes = ballot.votes.filter(id => id !== userId);
    if (d.voted) ballot.votes.push(userId);
    if (ballot.votes.length >= ballot.threshold) advance();
    broadcast();
  });
  socket.on("playback", (d) => {
    if (!control(d)) return;
    if (!["play", "pause", "seek"].includes(d?.type) ||
        (d.type === "seek" && (!Number.isFinite(d.position) || d.position < 0 || d.position > 86400)))
      return error("Lệnh phát không hợp lệ.");
    const now = Date.now(), p = room.playback;
    const position = p.positionAtUpdate + (p.status === "playing" ? Math.max(0, now - p.updatedAtServer) / 1000 : 0);
    room.playback = { ...p,
      status: d.type === "play" ? "playing" : d.type === "pause" ? "paused" : p.status,
      positionAtUpdate: d.type === "seek" ? d.position : position,
      updatedAtServer: now, revision: p.revision + 1 };
    broadcast();
  });
  socket.on("next", (d) => {
    if (!control(d)) return;
    if (!room.queue.length) return error("Hãy thêm video vào hàng chờ.");
    advance();
    broadcast();
  });
  for (const event of ["room:permissions", "room:kick", "room:leave", "seat", "appearance", "chat", "queue:add", "vote", "playback", "next", "ended", "skip:vote"]) {
    const handler = socket.listeners(event)[0];
    socket.removeListener(event, handler);
    socket.on(event, (data, ack) => requests.run({rejected: false}, async () => {
      if (!person()) error("Bạn cần vào lại rạp để gửi dữ liệu.");
      else { try { await handler(data); } catch (e) { error(e.message || "Không thể xử lý dữ liệu."); } }
      if (typeof ack === "function") ack({ ok: !requests.getStore().rejected });
    }));
  }
  socket.on("disconnect", () => {
    if (!person()) return;
    person().connected = false;
    for (const session of sessions.values()) if (session.id === userId) session.socketId = null;
    timers.set(userId, setTimeout(() => {
      removeMember(userId);
    }, reconnectMs));
    broadcast();
  });
});
return {http, io, room, rooms, close: async () => {clearInterval(cleanup);for (const timer of timers.values()) clearTimeout(timer); await new Promise(resolve => io.close(resolve)); for (const timer of timers.values()) clearTimeout(timer);}};
}
export async function youtubeMetadata(id) {
  const response = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v="+id), {signal: AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error("Không lấy được metadata từ YouTube.");
  const data = await response.json();
  if (typeof data.title !== "string" || !data.title.trim()) throw new Error("Metadata YouTube không hợp lệ.");
  return {title: data.title.slice(0, 200), author: typeof data.author_name === "string" ? data.author_name.slice(0,120) : "", thumbnail: "https://i.ytimg.com/vi/"+id+"/mqdefault.jpg"};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const positive = (name, fallback) => {const n = Number(process.env[name]); return Number.isFinite(n) && n > 0 ? n : fallback;};
  const backend = createBackend({reconnectMs: positive("RECONNECT_GRACE_MS",30000), skipMs: positive("SKIP_VOTE_MS",30000), skipRatio: Math.min(1,positive("SKIP_VOTE_RATIO",0.6)), emptyRoomMs: positive("EMPTY_ROOM_MS",1800000), roomTtlMs: positive("ROOM_TTL_MS",86400000)});
  backend.http.listen(process.env.PORT || 3001, () => console.log("Backend: http://localhost:"+(process.env.PORT || 3001)));
}
