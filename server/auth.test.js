import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from './index.js';
import {io} from 'socket.io-client';

test('accounts: persistence, password verification, cookie sessions, identity and guest rejection',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wetube-auth-')),file=join(dir,'accounts.json');
  let backend=createBackend({accountsFile:file});let socket;
  const listen=async()=>{await new Promise(resolve=>backend.http.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${backend.http.address().port}`;};
  let base=await listen();
  const post=(action,body,headers={})=>fetch(base+'/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  try{
    let response=await post('register',{username:'test_account',password:'qa-password',name:'Tên thật'});assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/HttpOnly/i);
    assert.deepEqual((await response.json()).user,{username:'test_account',name:'Tên thật',configured:false,gender:'male',shirtColor:'#b8cd8e'});
    response=await post('profile',{name:'Tên mới',gender:'female',shirtColor:'#8bc6c0'},{Cookie:cookie});assert.equal(response.status,200);assert.equal((await response.json()).user.configured,true);
    const saved=await readFile(file,'utf8');assert.ok(!saved.includes('qa-password'));assert.ok(JSON.parse(saved)[0].salt);
    assert.equal((await post('register',{username:'TEST_ACCOUNT',password:'qa-password',name:'Trùng'})).status,409);
    assert.equal((await post('login',{username:'test_account',password:'wrong-password'})).status,401);
    assert.equal((await post('register',{username:'bad name',password:'qa-password',name:'X'})).status,400);
    socket=io(base,{extraHeaders:{Cookie:cookie}});await new Promise(resolve=>socket.on('connect',resolve));
    const state=new Promise(resolve=>socket.once('state',resolve));socket.emit('join',{name:'Tên giả',avatar:'🐱'});
    const room=await state;assert.equal(room.participants[0].name,'Tên mới');socket.disconnect();
    const guest=io(base);await new Promise(resolve=>guest.on('connect',resolve));const notice=new Promise(resolve=>guest.once('notice',resolve));guest.emit('join',{name:'Guest'});assert.match(await notice,/đăng nhập/);guest.disconnect();
    assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}}).then(r=>r.json())).user.name,'Tên mới');
    await post('logout',{}, {Cookie:cookie});assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}}).then(r=>r.json())).user,null);
    for(const username of ['extra_one','extra_two'])assert.equal((await post('register',{username,password:'qa-password',name:'Quota QA'})).status,200);
    assert.equal((await post('register',{username:'extra_three',password:'qa-password',name:'Quota QA'})).status,429);
    await backend.close();backend=createBackend({accountsFile:file});base=await listen();
    response=await post('login',{username:'TEST_ACCOUNT',password:'qa-password'});assert.equal(response.status,200);assert.equal((await response.json()).user.gender,'female');
  }finally{socket?.disconnect();await backend.close();await rm(dir,{recursive:true,force:true});}
});
