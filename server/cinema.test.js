import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {io} from 'socket.io-client';
import {createBackend} from './index.js';
const emit=(s,event,data)=>new Promise(resolve=>s.timeout(3000).emit(event,data,(err,result)=>resolve(err?{ok:false,error:err.message}:result)));
const event=(s,type,accept=()=>true)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(type,listener);reject(Error('Timed out: '+type));},4000);function listener(data){if(accept(data)){clearTimeout(timer);s.off(type,listener);resolve(data);}}s.on(type,listener);});
test('cinema: emotes and stage are shared, exclusive and membership-protected',async()=>{
 const b=createBackend();await new Promise(resolve=>b.http.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${b.http.address().port}`;
 const a=io(base),c=io(base),outsider=io(base);
 try{
  await Promise.all([a,c,outsider].map(s=>event(s,'connect')));
  let joined=event(a,'joined');a.emit('join',{name:'Người A'});const aid=await joined;
  joined=event(c,'joined');c.emit('join',{name:'Người B'});await joined;
  assert.equal((await emit(a,'emote',{kind:'wave'})).ok,false);
  await emit(a,'seat',0);await emit(c,'seat',1);
  const shared=event(c,'state',r=>r.participants.some(p=>p.id===aid&&p.emote?.kind==='wave'));
  assert.equal((await emit(a,'emote',{kind:'wave'})).ok,true);await shared;
  assert.equal((await emit(a,'emote',{kind:'invalid'})).ok,false);
  assert.equal((await emit(outsider,'emote',{kind:'wave'})).ok,false);
  assert.equal((await emit(outsider,'stage',{spot:0})).ok,false);
  assert.equal((await emit(a,'stage',{spot:0})).ok,true);assert.equal((await emit(c,'stage',{spot:0})).ok,false);
  assert.equal((await emit(c,'stage',{spot:-1})).ok,false);
  assert.equal((await emit(a,'seat',2)).ok,true);assert.equal((await emit(c,'stage',{spot:0})).ok,true);
  const before=b.room.participants[0].shirtColor;
  assert.equal((await emit(a,'appearance',{shirtColor:'#336699',gender:'invalid'})).ok,false);assert.equal(b.room.participants[0].shirtColor,before);
  assert.equal((await emit(a,'chat','😊'.repeat(161))).ok,false);assert.equal((await emit(a,'chat','😊'.repeat(160))).ok,true);
 }finally{a.disconnect();c.disconnect();outsider.disconnect();await b.close();}
});
test('cinema: metadata preview and countdown start a queued energetic video once',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cinema-queue-'));
 const b=createBackend({accountsFile:join(dir,'accounts.json'),nextVideoDelayMs:25,metadata:async()=>({title:'Video đã xác minh',author:'QA'})});
 await new Promise(resolve=>b.http.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${b.http.address().port}`;let s;
 try{
  const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'queue_test',password:'qa-password',name:'Queue Test'})});
  const cookie=response.headers.get('set-cookie').split(';')[0];s=io(base,{extraHeaders:{Cookie:cookie}});await event(s,'connect');const joined=event(s,'joined');s.emit('join',{name:'Queue Test'});await joined;
  assert.equal(b.room.playback.videoId,'');
  assert.equal((await emit(s,'queue:preview',{url:'https://evil.test/foo'})).ok,false);
  const preview=await emit(s,'queue:preview',{url:'https://youtu.be/aqz-KE-bpKQ'});assert.equal(preview.video.title,'Video đã xác minh');
  assert.equal((await emit(s,'queue:add',{url:'https://youtu.be/aqz-KE-bpKQ',energetic:true,bpm:300})).ok,false);
  const playing=event(s,'state',r=>r.playback.status==='playing');
  assert.equal((await emit(s,'queue:add',{url:'https://youtu.be/aqz-KE-bpKQ',energetic:true,bpm:140})).ok,true);
  assert.ok(b.room.nextAt);const state=await playing;assert.equal(state.playback.bpm,140);assert.equal(state.playback.energetic,true);assert.equal(state.queue.length,0);assert.equal(state.playback.revision,1);
 }finally{s?.disconnect();await b.close();await rm(dir,{recursive:true,force:true});}
});
