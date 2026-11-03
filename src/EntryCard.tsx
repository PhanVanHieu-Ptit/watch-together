import { useState } from 'react';
import type {AccountProfile} from './ProfileForm';
import { ArrowRight, Armchair, Clapperboard, Eye, EyeOff, Users } from 'lucide-react';

type Props = { onGuest:(name:string)=>void; roomPasswordRequired: boolean; roomPassword: string; setRoomPassword: (password:string)=>void; joining: boolean; onAuthenticated: (user: AccountProfile) => void; onDemo: () => void };
export function EntryCard({roomPasswordRequired,roomPassword,setRoomPassword,joining,onAuthenticated,onDemo,onGuest}: Props) {
  const [guestEntry,setGuestEntry]=useState(roomPasswordRequired);
  const [register,setRegister]=useState(false),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[policy,setPolicy]=useState<'terms'|'privacy'|null>(null);
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setError('');
    try {
      if(register && data.get('password')!==data.get('passwordConfirm')) throw new Error('Mật khẩu xác nhận chưa khớp.');
      if(register && !data.get('consent')) throw new Error('Vui lòng đồng ý với điều khoản sử dụng.');
      const response=await fetch('/api/auth/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(data),name:String(data.get('username')||'')}),credentials:'same-origin'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Chưa mở được cửa rạp.');
      onAuthenticated(result.user);
    }catch(e){setError(e instanceof Error?e.message:'Không kết nối được máy chủ.');}finally{setBusy(false);}
  };
  return <div className="entry-overlay"><section className="welcome-card reference-entry" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Vào rạp" aria-busy={joining||busy}>
    <span className="eyebrow accent-text">VÉ VÀO RẠP CỦA BẠN</span>
    <h2>Video hay hơn<br/>khi <i>xem cùng nhau.</i></h2>
    <p>Một nhân vật nhỏ, một chỗ ngồi riêng.<br/>Vào rạp và mang theo gu của bạn.</p>
    <div className="entry-tabs" role="tablist" aria-label="Chọn cách vào rạp">
      {roomPasswordRequired&&<button role="tab" aria-selected={guestEntry} className={guestEntry?'active':''} onClick={()=>{setGuestEntry(true);setError('');}}>Vào nhanh</button>}
      <button role="tab" aria-selected={!guestEntry&&!register} className={!guestEntry&&!register?'active':''} onClick={()=>{setGuestEntry(false);setRegister(false);setError('');}}>Đăng nhập</button>
      <button role="tab" aria-selected={!guestEntry&&register} className={!guestEntry&&register?'active':''} onClick={()=>{setGuestEntry(false);setRegister(true);setError('');}}>Tạo tài khoản</button>
    </div>
    {!guestEntry&&<form onSubmit={submit}>
      <label>Tài khoản<span className="entry-input"><Users size={17}/><input name="username" required minLength={4} maxLength={24} pattern="[a-zA-Z0-9_]+" placeholder="Ít nhất 4 ký tự" autoComplete="username"/></span></label>
      <label>Mật khẩu<span className="entry-input"><input name="password" required minLength={6} maxLength={128} placeholder="Ít nhất 6 ký tự" type={showPassword?'text':'password'} autoComplete={register?'new-password':'current-password'}/><button type="button" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
      {register&&<><label>Xác nhận mật khẩu<span className="entry-input"><input name="passwordConfirm" required minLength={6} maxLength={128} type={showPassword?'text':'password'} placeholder="Nhập lại mật khẩu" autoComplete="new-password"/></span></label><label className="entry-consent"><input type="checkbox" name="consent" required/> <span>Tôi đã đọc và đồng ý với <button type="button" onClick={()=>setPolicy('terms')}>Điều khoản sử dụng</button> và <button type="button" onClick={()=>setPolicy('privacy')}>Chính sách quyền riêng tư</button>.</span></label></>}
      {register&&<p className="registration-limit">Mỗi mạng được tạo tối đa 3 tài khoản/giờ và 10 tài khoản/24 giờ.</p>}
      {roomPasswordRequired&&<label>Mật khẩu phòng (nếu có)<span className="entry-input"><input type="password" maxLength={128} value={roomPassword} onChange={e=>setRoomPassword(e.target.value)} autoComplete="off"/></span></label>}
      {error&&<p className="entry-error" role="alert">{error}</p>}
      <button className="primary join" disabled={joining||busy}>{joining||busy?'Đang mở cửa rạp…':register?'Tạo tài khoản':'Vào rạp thôi'}<ArrowRight size={18}/></button>
    </form>}
    {roomPasswordRequired&&guestEntry&&<form className="guest-entry" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);onGuest(String(data.get('guestName')||'').trim());}}><strong>Bạn được mời? Vào xem ngay</strong><label>Biệt danh<input name="guestName" required maxLength={24} placeholder="Bạn bè gọi bạn là gì?" autoComplete="nickname"/></label><label>Mật khẩu phòng (nếu có)<input type="password" maxLength={128} value={roomPassword} onChange={e=>setRoomPassword(e.target.value)} autoComplete="off"/></label><button className="primary" disabled={joining||busy}>Vào phòng với tư cách khách</button><small>Không cần tài khoản. Đăng ký sau để lưu hồ sơ và tạo phòng cố định.</small></form>}
    <p className="entry-policy"><button onClick={()=>setPolicy(policy==='terms'?null:'terms')}>Điều khoản sử dụng</button> · <button onClick={()=>setPolicy(policy==='privacy'?null:'privacy')}>Quyền riêng tư</button></p>
    {policy&&<div className="entry-explanation"><strong>{policy==='terms'?'Điều khoản sử dụng':'Quyền riêng tư'}</strong><p>{policy==='terms'?'Chia sẻ video được phép nhúng trên YouTube. Không gửi nội dung gây hại hoặc làm phiền người khác. Chủ phòng quản lý quyền và thành viên trong phòng.':'Tài khoản và mật khẩu đã băm được lưu trên máy chủ. Phiên đăng nhập dùng cookie HttpOnly. Chat và phiên khách lưu tạm trong RAM. Phòng cố định và playlist lưu trên máy chủ; tên và ngoại hình lưu trên thiết bị.'}</p><button onClick={()=>setPolicy(null)}>Đóng</button></div>}
    <div className="entry-note"><Armchair size={16}/><span>100 chỗ ngồi. Vô vàn câu chuyện.</span></div>
    <button className="entry-room" onClick={onDemo}><Clapperboard size={18}/>Video / Nghe nhạc<span className="sr-only"> — Khám phá demo trước</span></button>
  </section></div>;
}
