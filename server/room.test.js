import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { createRoom, selectSeat, youtubeId } from "./room.js";
test("100 seats: rejects invalid positions and competing claims; moving releases old seat", () => {
  const r = createRoom();
  r.participants = [
    { id: "a", seat: null },
    { id: "b", seat: null },
  ];
  assert.equal(selectSeat(r, "a", 44), true);
  assert.equal(selectSeat(r, "b", 44), false);
  for (const n of [-1, 100, 1.5, "3", null])
    assert.equal(selectSeat(r, "a", n), false);
  assert.equal(selectSeat(r, "a", 99), true);
  assert.equal(selectSeat(r, "b", 44), true);
  assert.equal(selectSeat(r, "outsider", 1), false);
});
test("YouTube parser accepts supported formats and rejects unrelated hosts", () => {
  for (const url of [
    "https://youtu.be/jfKfPfyJRdk",
    "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    "https://youtube.com/shorts/jfKfPfyJRdk",
    "jfKfPfyJRdk",
  ])
    assert.equal(youtubeId(url), "jfKfPfyJRdk");
  for (const url of [
    "https://evil.test/watch?v=jfKfPfyJRdk",
    "https://youtube.com.evil.test/watch?v=jfKfPfyJRdk",
    "hello",
    "",
  ])
    assert.equal(youtubeId(url), null);
});
const waitEvent = (socket, event, predicate = () => true) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error("Timed out: " + event));
    }, 5000);
    const handler = (data) => {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(data);
      }
    };
    socket.on(event, handler);
  });
test("two real Socket.IO clients share seats, chat, queue, votes and playback; host-only next", async (t) => {
  const port = 31347,
    server = spawn(process.execPath, ["server/index.js"], {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
    server.once("exit", (code) => {
      if (code) reject(new Error("Server exited " + code));
    });
  });
  const a = io("http://localhost:" + port, { autoConnect: false }),
    b = io("http://localhost:" + port, { autoConnect: false });
  t.after(() => {
    a.disconnect();
    b.disconnect();
  });
  let pending = waitEvent(a, "connect");
  a.connect();
  await pending;
  pending = waitEvent(a, "state");
  a.emit("join", { name: "Linh", avatar: "🐱" });
  await pending;
  pending = waitEvent(b, "connect");
  b.connect();
  await pending;
  pending = waitEvent(a, "state", (r) => r.participants.length === 2);
  b.emit("join", { name: "Minh", avatar: "🐼" });
  await pending;
  pending = waitEvent(b, "state", (r) => r.participants[0].seat === 44);
  a.emit("seat", 44);
  await pending;
  pending = waitEvent(b, "notice");
  b.emit("seat", 44);
  assert.match(await pending, /Ghế/);
  pending = waitEvent(b, "state", (r) => r.messages.length === 1);
  a.emit("chat", "Chào cả hội");
  assert.equal((await pending).messages[0].text, "Chào cả hội");
  pending = waitEvent(b, "state", (r) => r.queue.length === 1);
  a.emit("queue:add", {
    url: "https://youtu.be/aqz-KE-bpKQ",
    title: "Big Buck Bunny",
  });
  let state = await pending;
  const id = state.queue[0].id;
  pending = waitEvent(a, "state", (r) => r.queue[0].votes.length === 1);
  b.emit("vote", id);
  await pending;
  pending = waitEvent(a, "state", (r) => r.queue[0].votes.length === 0);
  b.emit("vote", id);
  await pending;
  pending = waitEvent(b, "notice");
  b.emit("next");
  assert.match(await pending, /chủ rạp/);
  pending = waitEvent(
    b,
    "state",
    (r) => r.playback.youtubeId === "aqz-KE-bpKQ",
  );
  a.emit("next");
  state = await pending;
  assert.equal(state.queue.length, 0);
  pending = waitEvent(a, "state", (r) => r.playback.position === 42);
  b.emit("playback", { playing: false, position: 42 });
  assert.equal((await pending).playback.playing, false);
  pending = waitEvent(b, "state", (r) => r.participants.length === 1);
  a.disconnect();
  state = await pending;
  assert.equal(state.participants[0].id, b.id);
});
