import test from "node:test";
import assert from "node:assert/strict";
import { createBackend, youtubeMetadata } from "./index.js";
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
    "https://youtube.com/live/jfKfPfyJRdk",
  ])
    assert.equal(youtubeId(url), "jfKfPfyJRdk");
  for (const url of [
    "https://evil.test/watch?v=jfKfPfyJRdk",
    "https://youtube.com.evil.test/watch?v=jfKfPfyJRdk",
    "jfKfPfyJRdk",
    "ftp://youtube.com/watch?v=jfKfPfyJRdk",
    "https://youtube.com/anything?v=jfKfPfyJRdk",
    "https://youtube.com/watch?v=jfKfPfyJRdk&v=aqz-KE-bpKQ",
    "https://youtube.com@evil.test/watch?v=jfKfPfyJRdk",
    "https://youtube.com/embed/jfKfPfyJRdk/extra",
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
  const backend = createBackend({metadata: async () => ({title: "Trusted YouTube title"}), reconnectMs: 100});
  await new Promise(resolve => backend.http.listen(0, resolve));
  const port = backend.http.address().port;
  t.after(() => backend.close());
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
  const sessionPending = waitEvent(b, "session");
  b.emit("join", { name: "Minh", avatar: "🐼" });
  const session = await sessionPending;
  await pending;
  pending = waitEvent(b, "state", (r) => r.participants[0].seat === 44);
  a.emit("seat", 44);
  await pending;
  pending = waitEvent(b, "notice");
  b.emit("seat", 44);
  assert.match(await pending, /Ghế/);
  pending = waitEvent(b, "state", (r) => r.participants[0].shirtColor === "#336699");
  a.emit("appearance", { shirtColor: "#336699", bodyStyle: "cap" });
  assert.equal((await pending).participants[0].bodyStyle, "cap");
  pending = waitEvent(a, "notice");
  a.emit("appearance", { shirtColor: "bad", bodyStyle: "unknown" });
  assert.match(await pending, /Ngoại hình/);
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
  b.emit("vote", {id, voted: true});
  await pending;
  pending = waitEvent(a, "state", (r) => r.queue[0].votes.length === 0);
  b.emit("vote", {id, voted: false});
  await pending;
  pending = waitEvent(b, "notice");
  b.emit("next");
  assert.match(await pending, /chủ rạp/);
  pending = waitEvent(
    b,
    "state",
    (r) => r.playback.revision === 1,
  );
  a.emit("next", {revision: 0});
  state = await pending;
  assert.equal(state.queue.length, 0);
  const command = (socket, data) => new Promise(resolve => socket.emit("playback", data, resolve));
  const pause = () => new Promise(resolve => setTimeout(resolve, 270));
  assert.equal((await command(b, { type: "pause", revision: 1, isHost: true })).ok, false);
  await pause();
  pending = waitEvent(b, "state", r => r.playback.revision === 2);
  assert.equal((await command(a, {type: "seek", position: 42, revision: 1})).ok, true);
  state = await pending;
  assert.equal(state.playback.positionAtUpdate, 42);
  assert.equal((await command(a, {type: "pause", revision: 1})).ok, false);
  assert.equal((await command(a, {type: "pause", revision: 2})).ok, false); // rate limited
  await pause();
  pending = waitEvent(b, "state", r => r.playback.revision === 3);
  assert.equal((await command(a, {type: "pause", revision: 2})).ok, true);
  state = await pending;
  assert.equal(state.playback.status, "paused");
  assert.ok(state.playback.positionAtUpdate >= 42);
  await pause();
  assert.equal((await command(a, {type: "seek", position: -1, revision: 3})).ok, false);
  const snap = await new Promise(resolve => b.emit("snapshot", null, resolve));
  assert.equal(snap.playback.revision, 3);
  assert.ok(Number.isFinite(await new Promise(resolve => b.emit("clock", null, resolve))));
  b.disconnect();
  pending = waitEvent(b, "connect"); b.connect(); await pending;
  pending = waitEvent(b, "state"); b.emit("join", { name: "Minh", token: session.token }); await pending;
  const fresh = await new Promise(resolve => b.emit("snapshot", null, resolve));
  assert.deepEqual(fresh.playback, snap.playback);
  pending = waitEvent(b, "state", (r) => r.participants.length === 1);
  a.disconnect();
  state = await pending;
  assert.notEqual(state.participants[0].id, b.id);
});

const emit = (s, event, data) => new Promise((resolve, reject) => s.timeout(2000).emit(event, data, (err, result) => err ? reject(err) : resolve(result)));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
test("community concurrency, stable reconnect, input boundaries and outsiders", async t => {
  let release;
  const backend = createBackend({reconnectMs: 120, skipMs: 80, skipRatio: 1, metadata: async id => {
    if (id === "jfKfPfyJRdk") await new Promise(resolve => {release = resolve;});
    return {title: "Server verified " + id, author: "YouTube"};
  }});
  await new Promise(resolve => backend.http.listen(0, resolve));
  const address = "http://localhost:" + backend.http.address().port;
  const clients = [];
  t.after(async () => {clients.forEach(s => s.disconnect()); await backend.close();});
  async function connect(name, token) {
    const s = io(address, {autoConnect:false}); clients.push(s);
    const connected = waitEvent(s,"connect"); s.connect(); await connected;
    if (!name) return {s};
    const session = waitEvent(s,"session"), state = waitEvent(s,"state");
    s.emit("join", {name, token}); const identity = await session; await state;
    return {s, ...identity};
  }
  const a = await connect("A"), b = await connect("B"), outsider = await connect();
  const claims = await Promise.all([emit(a.s,"seat",44), emit(b.s,"seat",44)]);
  assert.equal(claims.filter(r => r.ok).length,1);
  const winner = claims[0].ok ? a : b, other = claims[0].ok ? b : a;
  assert.equal((await emit(winner.s,"seat",45)).ok,true);
  assert.equal((await emit(other.s,"seat",44)).ok,true);
  assert.equal((await emit(a.s,"chat","x".repeat(501))).ok,false);
  assert.equal((await emit(a.s,"chat","<img src=x onerror=alert(1)> 😊")).ok,true);
  assert.equal((await emit(a.s,"chat","spam")).ok,false);
  const message = backend.room.messages[0];
  assert.equal(message.userId,a.userId); assert.equal(message.displayName,"A"); assert.ok(message.createdAt);
  assert.equal((await emit(a.s,"queue:add",{url:"https://youtu.be/aqz-KE-bpKQ", title:"FORGED"})).ok,true);
  assert.match(backend.room.queue[0].title,/Server verified/);
  const id = backend.room.queue[0].id;
  const votes = await Promise.all([emit(b.s,"vote",{id,voted:true}),emit(b.s,"vote",{id,voted:true})]);
  assert.ok(votes.every(r => r.ok)); assert.deepEqual(backend.room.queue[0].votes,[b.userId]);
  assert.equal((await emit(b.s,"vote",{id,voted:false})).ok,true);
  for (const event of ["seat","chat","appearance","queue:add","vote","next","playback","ended","skip:vote"]) {
    assert.equal((await emit(outsider.s,event,{revision:0})).ok,false,event);
  }
  assert.deepEqual(await emit(outsider.s,"snapshot",null),{ok:false});
  const oldSeat = backend.room.participants.find(p => p.id === winner.userId).seat;
  winner.s.disconnect(); await delay(20);
  assert.equal((await emit(other.s,"seat",oldSeat)).ok,false);
  const resumed = await connect("spoofed name",winner.token);
  assert.equal(resumed.userId,winner.userId);
  assert.equal(backend.room.participants.find(p => p.id === winner.userId).seat,oldSeat);
  assert.equal(backend.room.participants.length,2);
  // A late asynchronous metadata response cannot add after disconnect.
  const late = emit(other.s,"queue:add",{url:"https://youtu.be/jfKfPfyJRdk"}).catch(() => null);
  while (!release) await delay(5);
  other.s.disconnect(); await delay(20); release(); await delay(20);
  assert.equal(backend.room.queue.length,1); void late;
  const second = await connect("B", other.token);
  const active = resumed.s;
  const p = backend.room.playback;
  p.status = "playing";
  const reports = await Promise.all([emit(active,"ended",{revision:p.revision,videoId:p.videoId}),emit(second.s,"ended",{revision:p.revision,videoId:p.videoId})]);
  assert.equal(reports.filter(r => r.ok).length,1);
  assert.equal(backend.room.playback.revision,1); assert.equal(backend.room.queue.length,0);
  await emit(active,"skip:vote",{revision:1,voted:true});
  assert.equal(backend.room.playback.revision,1);
  await delay(100);
  assert.equal(backend.room.skipVote,null);
  await emit(active,"skip:vote",{revision:1,voted:true});
  await emit(second.s,"skip:vote",{revision:1,voted:true});
  assert.equal(backend.room.playback.revision,2);
  second.s.disconnect();
  await delay(140);
  assert.equal(backend.room.participants.length,1);
});

test("bounded chat history and queue ties use original insertion order", async t => {
  const backend = createBackend();
  await new Promise(resolve => backend.http.listen(0, resolve));
  const s = io("http://localhost:"+backend.http.address().port, {autoConnect:false});
  t.after(async () => {s.disconnect(); await backend.close();});
  const connected = waitEvent(s,"connect"); s.connect(); await connected;
  const joined = waitEvent(s,"joined"); s.emit("join",{name:"History"}); const userId = await joined;
  backend.room.messages = Array.from({length:100}, (_,i) => ({id:String(i), text:"old"}));
  assert.equal((await emit(s,"chat","New 🌷")).ok,true);
  assert.equal(backend.room.messages.length,100);
  assert.equal(backend.room.messages[0].id,"1");
  backend.room.queue = [
    {id:"first",sequence:0,votes:[]},
    {id:"second",sequence:1,votes:[]},
  ];
  await emit(s,"vote",{id:"second",voted:true});
  assert.equal(backend.room.queue[0].id,"second");
  await emit(s,"vote",{id:"first",voted:true});
  assert.equal(backend.room.queue[0].id,"first");
  await emit(s,"vote",{id:"first",voted:true});
  assert.deepEqual(backend.room.queue[0].votes,[userId]);
  await emit(s,"vote",{id:"first",voted:false});
  await emit(s,"vote",{id:"second",voted:false});
  assert.deepEqual(backend.room.queue.map(v=>v.id),["first","second"]);
});

test("YouTube oEmbed supplies metadata from a fixed trusted endpoint", async t => {
  t.mock.method(globalThis,"fetch",async (url, options) => {
    assert.equal(new URL(url).origin,"https://www.youtube.com");
    assert.equal(new URL(url).pathname,"/oembed");
    assert.equal(new URL(url).searchParams.get("url"),"https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    assert.ok(options.signal);
    return {ok:true,json:async()=>({title:"Real title",author_name:"Author",html:"<script>unsafe</script>",thumbnail_url:"https://evil.test"})};
  });
  const metadata = await youtubeMetadata("aqz-KE-bpKQ");
  assert.equal(metadata.title,"Real title");
  assert.equal(metadata.author,"Author");
  assert.equal(metadata.html,undefined);
  assert.equal(metadata.thumbnail,"https://i.ytimg.com/vi/aqz-KE-bpKQ/mqdefault.jpg");
});

test("private rooms isolate simultaneous traffic and enforce admission, permissions and eviction", async t => {
  const backend = createBackend({metadata:async()=>({title:"Verified"}), reconnectMs:50});
  await new Promise(resolve=>backend.http.listen(0,resolve));
  const clients=[];
  t.after(async()=>{clients.forEach(s=>s.disconnect()); await backend.close();});
  const connect = async()=>{const s=io("http://localhost:"+backend.http.address().port,{autoConnect:false});clients.push(s);const p=waitEvent(s,"connect");s.connect();await p;return s;};
  const a=await connect(), b=await connect(), guest=await connect(), stranger=await connect();
  const ra=await emit(a,"room:create",{name:"Alpha",maxMembers:2,password:"secret"});
  const rb=await emit(b,"room:create",{name:"Beta",maxMembers:2});
  const join=async(s,id,name,password)=>{const p=waitEvent(s,"state");s.emit("join",{roomId:id,name,password});return p;};
  await join(a,ra.roomId,"A","secret");await join(b,rb.roomId,"B");
  let denied=waitEvent(stranger,"notice");stranger.emit("join",{roomId:ra.roomId,name:"Spy",password:"wrong"});await denied;
  assert.deepEqual(await emit(stranger,"snapshot",null),{ok:false});
  const sa=await join(guest,ra.roomId,"Guest","secret");
  assert.equal(JSON.stringify(sa).includes("secret"),false);
  let leaked=0;b.on("state",()=>leaked++);
  assert.equal((await emit(a,"seat",44)).ok,true);
  assert.equal((await emit(b,"seat",44)).ok,true);
  leaked=0;
  assert.equal((await emit(a,"chat","Alpha only")).ok,true);
  assert.equal((await emit(a,"queue:add",{url:"https://youtu.be/aqz-KE-bpKQ"})).ok,true);
  assert.equal((await emit(a,"playback",{type:"play",revision:0})).ok,true);
  await delay(30); assert.equal(leaked,0);
  const beta=await emit(b,"snapshot",null);
  assert.equal(beta.messages.length,0);assert.equal(beta.queue.length,0);assert.equal(beta.playback.revision,0);
  assert.equal((await emit(guest,"room:permissions",{chat:false})).ok,false);
  assert.equal((await emit(a,"room:permissions",{chat:false,addVideo:false,playback:true})).ok,true);
  assert.equal((await emit(guest,"chat","blocked")).ok,false);
  assert.equal((await emit(guest,"queue:add",{url:"https://youtu.be/aqz-KE-bpKQ"})).ok,false);
  assert.equal((await emit(guest,"playback",{type:"pause",revision:1})).ok,true);
  denied=waitEvent(stranger,"notice");stranger.emit("join",{roomId:ra.roomId,name:"Full",password:"secret"});assert.match(await denied,/đủ/);
  const removed=waitEvent(guest,"room:removed");assert.equal((await emit(a,"room:kick",sa.participants[1].id)).ok,true);await removed;
  assert.deepEqual(await emit(guest,"snapshot",null),{ok:false});
  assert.equal((await emit(guest,"chat","evicted")).ok,false);
  const c=await connect();await join(c,ra.roomId,"Successor","secret");
  a.disconnect();await delay(80);
  assert.equal((await emit(c,"snapshot",null)).participants[0].name,"Successor");
});

test("private admission limits and expiry remove room data", async t => {
  const backend=createBackend({roomTtlMs:300,emptyRoomMs:100});
  await new Promise(resolve=>backend.http.listen(0,resolve));
  const s=io("http://localhost:"+backend.http.address().port,{autoConnect:false});
  t.after(async()=>{s.disconnect();await backend.close();});
  const connected=waitEvent(s,"connect");s.connect();await connected;
  const ids=[];
  for(let i=0;i<5;i++) {const result=await emit(s,"room:create",{name:"Expiry",maxMembers:2});assert.equal(result.ok,true);ids.push(result.roomId);}
  assert.equal((await emit(s,"room:create",{name:"Limited",maxMembers:2})).ok,false);
  await delay(1050); // Separate the per-socket burst window from the per-IP admission window.
  for(let i=0;i<15;i++) {const denied=waitEvent(s,"notice");s.emit("join",{roomId:"unknown",name:"Probe"});await denied;}
  const denied=waitEvent(s,"notice");s.emit("join",{roomId:ids[0],name:"Limited"});assert.match(await denied,/quá nhiều/);
  await delay(230);
  for(const id of ids) assert.equal(backend.rooms.has(id),false);
  assert.equal(backend.rooms.has("community"),true);
});
