import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
const derive = promisify(scrypt);
const cookieName = 'wetube_session';
export function installAuth(app, { file, consume }) {
  const users = new Map(), sessions = new Map(), registrations=new Map();
  const ready = file ? readFile(file, 'utf8').then(text => {
    for (const user of JSON.parse(text)) users.set(user.username.toLowerCase(), user);
  }).catch(error => { if (error.code !== 'ENOENT') throw error; }) : Promise.resolve();
  // Serialize registrations so concurrent requests cannot overwrite persisted accounts.
  let writes = Promise.resolve();
  const account = headers => {
    const token = (headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    const session = sessions.get(token);
    if (!session || session.expires <= Date.now()) { sessions.delete(token); return null; }
    return users.get(session.key) || null;
  };
  const publicUser = user => ({username:user.username,name:user.name,configured:!!user.configured,gender:user.gender||"male",shirtColor:user.shirtColor||"#b8cd8e"});
  app.get('/api/auth/me', async (req,res,next)=>{try {await ready;const user=account(req.headers);res.json({user:user?publicUser(user):null});}catch(e){next(e);}});
  app.post('/api/auth/:action', async (req,res,next)=>{
    try {
      await ready;
      if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) {
        // In development the Vite proxy preserves the browser origin on the same host.
        const origin = new URL(req.headers.origin);
        if (origin.hostname !== req.hostname) return res.status(403).json({error:'Nguồn yêu cầu không hợp lệ.'});
      }
      if (!consume('auth:'+req.ip,15)) return res.status(429).json({error:'Thử quá nhiều lần. Vui lòng chờ một phút.'});
      if (req.params.action === 'logout') {
        const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
        sessions.delete(token);res.clearCookie(cookieName,{path:'/'});return res.json({ok:true});
      }
      if(req.params.action==='profile'){
        const user=account(req.headers);if(!user)return res.status(401).json({error:'Bạn cần đăng nhập.'});
        const {name,gender,shirtColor}=req.body||{};
        if(typeof name!=='string'||name.trim().length<2||name.trim().length>18||!['male','female'].includes(gender)||!/^#[a-f0-9]{6}$/i.test(shirtColor||''))return res.status(400).json({error:'Thông tin ngoại hình chưa hợp lệ.'});
        const key=user.username.toLowerCase();
        const update=writes.then(async()=>{const record={...users.get(key),name:name.trim(),gender,shirtColor,configured:true};const updated=[...users.values()].map(value=>value.username.toLowerCase()===key?record:value);if(file){await writeFile(file+'.tmp',JSON.stringify(updated),{mode:0o600});await rename(file+'.tmp',file);}users.set(key,record);return record;});writes=update.catch(()=>{});
        return res.json({user:publicUser(await update)});
      }
      if (!['login','register'].includes(req.params.action)) return res.sendStatus(404);
      const {username,password,name} = req.body || {};
      if (typeof username!=='string'|| !/^[a-zA-Z0-9_]{4,24}$/.test(username)||typeof password!=='string'||password.length<6||password.length>128)
        return res.status(400).json({error:'Tài khoản gồm 4–24 chữ, số hoặc dấu _. Mật khẩu từ 6–128 ký tự.'});
      const key=username.toLowerCase();let user;
      if (req.params.action==='register') {
        if (typeof name!=='string'||!name.trim()||name.trim().length>24) return res.status(400).json({error:'Tên hiển thị từ 1–24 ký tự.'});
        const salt=randomBytes(16).toString('hex'), hash=Buffer.from(await derive(password,salt,64)).toString('hex');
        const save=async()=>{
          if(users.has(key)) return null;
          const now=Date.now(),history=(registrations.get(req.ip)||[]).filter(time=>now-time<86400000);
          if(history.length>=10||history.filter(time=>now-time<3600000).length>=3)return {limited:true};
          const record={username,name:name.trim(),salt,hash};
          if(file){await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify([...users.values(),record]),{mode:0o600});await rename(file+'.tmp',file);}
          users.set(key,record);registrations.set(req.ip,[...history,now]);return record;
        };
        const pending=writes.then(save);writes=pending.catch(()=>{});user=await pending;
        if(user?.limited)return res.status(429).json({error:'Mỗi mạng được tạo tối đa 3 tài khoản/giờ và 10 tài khoản/24 giờ.'});
        if(!user)return res.status(409).json({error:'Tài khoản đã tồn tại.'});
      } else {
        user=users.get(key);
        const hash=Buffer.from(await derive(password,user?.salt || 'missing-user-padding',64));
        if(!user||!timingSafeEqual(hash,Buffer.from(user.hash,'hex')))return res.status(401).json({error:'Tài khoản hoặc mật khẩu chưa đúng.'});
      }
      for(const [token,s] of sessions)if(s.expires<=Date.now())sessions.delete(token);
      const token=randomBytes(32).toString('hex');sessions.set(token,{key,expires:Date.now()+7*86400000});
      res.cookie(cookieName,token,{httpOnly:true,sameSite:'lax',secure:req.secure,path:'/',maxAge:7*86400000});
      res.json({user:publicUser(user)});
    } catch(e){next(e);}
  });
  return {account};
}
