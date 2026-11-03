import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {io} from 'socket.io-client';
import {createBackend} from './index.js';
const event=(socket,type,accept=()=>true)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(type,listener);reject(Error('Timeout '+type));},4000);
  function listener(data){if(accept(data)){clearTimeout(timer);socket.off(type,listener);resolve(data);}}
  socket.on(type,listener);
});
const emit=(s,type,data)=>new Promise((resolve,reject)=>s.timeout(3000).emit(type,data,(err,result)=>err?reject(err):resolve(result)));
const listen=async b=>{await new Promise(resolve=>b.http.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${b.http.address().port}`;};
const connect=async(base,cookie)=>{const s=io(base,{autoConnect:false,extraHeaders:cookie?{Cookie:cookie}:{}});const ready=event(s,'connect');s.connect();await ready;return s;};
const enter=async(s,roomId,password,name='Guest')=>{const state=event(s,'state');s.emit('join',{name,roomId,password});return state;};
const post=async(base,action,body)=>{const response=await fetch(base+'/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
const video='https://youtu.be/aqz-KE-bpKQ';

test('persistent rooms: guest invite admission, durable playlists/password, owner identity after restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wetube-library-'));
  const options={accountsFile:join(dir,'accounts.json'),roomsFile:join(dir,'rooms.json'),metadata:async()=>({title:'Nhạc thử nghiệm'}),roomTtlMs:40,emptyRoomMs:40};
  let b=createBackend(options),base=await listen(b),sockets=[];
  try{
    const cookie=await post(base,'register',{username:'room_owner',password:'test-password',name:'Owner'});
    let owner=await connect(base,cookie);sockets.push(owner);
    const guest=await connect(base);sockets.push(guest);
    let notice=event(guest,'notice');guest.emit('join',{name:'Guest'});assert.match(await notice,/đăng nhập/);
    notice=event(guest,'notice');guest.emit('join',{name:'Guest',roomId:123});assert.match(await notice,/đăng nhập/);
    assert.equal((await emit(guest,'room:create',{name:'No',maxMembers:4,persistent:true})).ok,false);
    const created=await emit(owner,'room:create',{name:'Phòng cuối tuần',maxMembers:4,persistent:true,password:'room-secret'});assert.equal(created.ok,true);
    const id=created.roomId;
    notice=event(guest,'notice');guest.emit('join',{name:'Guest',roomId:id,password:'wrong'});assert.match(await notice,/mật khẩu/);
    let state=await enter(guest,id,'room-secret');assert.equal(state.persistent,true);assert.equal(state.hostId,null);assert.ok(!JSON.stringify(state).includes('room-secret'));
    assert.equal((await emit(guest,'room:permissions',{playback:true})).ok,false);
    state=await enter(owner,id,'room-secret');const ownerId=state.hostId;assert.ok(ownerId);assert.notEqual(ownerId,state.participants[0].id);
    assert.equal((await emit(owner,'queue:add',{url:video})).ok,true);
    assert.equal((await emit(guest,'playlist:save',{name:'Stolen'})).ok,false);
    assert.equal((await emit(owner,'playlist:save',{name:'Nhạc cuối tuần'})).ok,true);
    state=await emit(owner,'snapshot',null);const playlistId=state.playlists[0].id;assert.equal(state.playlists[0].videos[0].title,'Nhạc thử nghiệm');
    assert.equal((await emit(guest,'playlist:delete',{id:playlistId})).ok,false);
    assert.equal((await emit(owner,'playlist:load',{id:playlistId})).ok,true);assert.equal(b.rooms.get(id).queue.length,1);
    const saved=await readFile(options.roomsFile,'utf8');assert.ok(!saved.includes('room-secret'));assert.ok(!saved.includes('test-password'));assert.ok(JSON.parse(saved)[0].secret.hash);
    assert.equal((await fetch(base+'/api/rooms/mine')).status,401);
    let mine=await fetch(base+'/api/rooms/mine',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(mine.rooms[0].roomId,id);
    await new Promise(r=>setTimeout(r,80));assert.ok(b.rooms.has(id),'persistent room survives ordinary TTL');
    sockets.forEach(s=>s.disconnect());await b.close();b=createBackend(options);base=await listen(b);
    const guest2=await connect(base);sockets.push(guest2);state=await enter(guest2,id,'room-secret');assert.equal(state.hostId,null);assert.equal(state.playlists[0].id,playlistId);assert.equal(state.queue.length,0);
    const newCookie=await post(base,'login',{username:'room_owner',password:'test-password'});owner=await connect(base,newCookie);sockets.push(owner);state=await enter(owner,id,'room-secret');assert.ok(state.hostId);
    assert.equal((await emit(owner,'playlist:load',{id:playlistId})).ok,true);assert.equal(b.rooms.get(id).queue[0].youtubeId,'aqz-KE-bpKQ');
    assert.equal((await emit(owner,'playlist:delete',{id:playlistId})).ok,true);assert.equal(JSON.parse(await readFile(options.roomsFile,'utf8'))[0].playlists.length,0);
  }finally{sockets.forEach(s=>s.disconnect());await b.close();await rm(dir,{recursive:true,force:true});}
});

test('song game: secret answer, permissions, normalized scoring, duplicate rejection, reconnect and timed reveal',async()=>{
  const b=createBackend({gameRoundMs:1500,metadata:async()=>({title:'Actual song title'})});const base=await listen(b),sockets=[];
  try{
    const host=await connect(base),guest=await connect(base),outsider=await connect(base);sockets.push(host,guest,outsider);
    await enter(host,'community');let session=event(guest,'session');let state=await enter(guest,'community');const token=(await session).token;const guestId=state.participants[1].id;
    assert.equal((await emit(outsider,'game:start',{url:video,answer:'Answer',start:0})).ok,false);
    assert.equal((await emit(guest,'game:start',{url:video,answer:'Answer',start:0})).ok,false);
    assert.equal((await emit(host,'game:start',{url:video,answer:'!!!',start:0})).ok,false);
    assert.equal((await emit(host,'game:start',{url:video,answer:'Đường Đến Ngày Vinh Quang',start:12})).ok,true);
    state=await emit(guest,'snapshot',null);assert.equal(state.game.status,'playing');assert.equal(state.game.answer,undefined);assert.equal(state.playback.title,'🎵 Bài hát bí mật');assert.equal(state.playback.positionAtUpdate,12);
    assert.ok(!JSON.stringify(state).includes('Đường Đến'));assert.ok(!JSON.stringify(state).includes('Actual song title'));
    assert.equal((await emit(host,'game:guess',{answer:'duong den ngay vinh quang'})).ok,false);
    assert.equal((await emit(guest,'playback',{type:'pause',revision:state.playback.revision})).ok,false);
    assert.equal((await emit(guest,'game:guess',{answer:'  DUONG den ngay VINH quang!! '})).ok,true);
    state=await emit(guest,'snapshot',null);assert.equal(state.game.scores[0].userId,guestId);const points=state.game.scores[0].points;assert.ok(points>0&&points<=100);
    assert.equal((await emit(guest,'game:guess',{answer:'duong den ngay vinh quang'})).ok,false);
    guest.disconnect();const reconnect=await connect(base);sockets.push(reconnect);const restored=event(reconnect,'state');reconnect.emit('join',{roomId:'community',token,name:'Guest'});state=await restored;assert.equal(state.game.scores[0].points,points);assert.equal(state.participants.find(p=>p.id===guestId).connected,true);
    const finished=await event(host,'state',r=>r.game?.status==='finished');assert.equal(finished.game.answer,'Đường Đến Ngày Vinh Quang');assert.equal(finished.playback.status,'paused');
    assert.equal((await emit(reconnect,'game:guess',{answer:'duong den ngay vinh quang'})).ok,false);
    assert.equal((await emit(host,'game:start',{url:video,answer:'New answer',start:0})).ok,true);
    state=await emit(host,'snapshot',null);assert.equal(state.game.round,2);assert.equal(state.game.answer,undefined);assert.equal(state.game.scores[0].points,points);
    assert.equal((await emit(host,'game:stop',null)).ok,true);state=await emit(host,'snapshot',null);assert.equal(state.game.answer,'New answer');
  }finally{sockets.forEach(s=>s.disconnect());await b.close();}
});

test('room persistence failure returns a rejected create without leaving an orphan',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wetube-write-failure-')),file=join(dir,'rooms.json');
  const b=createBackend({roomsFile:file}),base=await listen(b);let s;
  try{
    const cookie=await post(base,'register',{username:'file_owner',password:'test-password',name:'Owner'});s=await connect(base,cookie);
    await mkdir(file);
    assert.equal((await emit(s,'room:create',{name:'Cannot save',maxMembers:4,persistent:true})).ok,false);assert.equal(b.rooms.size,1);
  }finally{s?.disconnect();await b.close();await rm(dir,{recursive:true,force:true});}
});
