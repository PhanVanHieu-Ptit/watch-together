import {useState,type CSSProperties} from 'react';
import {Check,ArrowRight} from 'lucide-react';
export type AccountProfile={name:string;username:string;configured?:boolean;gender?:'male'|'female';shirtColor?:string};
const colors=['#b8cd8e','#cf9a80','#9aaed2','#c7a0ca','#d7bc75','#8bc6c0'];
export function ProfileForm({user,onSave}:{user:AccountProfile;onSave:(user:AccountProfile)=>void}){
  const [name,setName]=useState(user.name),[gender,setGender]=useState(user.gender||'male'),[color,setColor]=useState(user.shirtColor||colors[0]),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  return <form className="profile-form" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{const response=await fetch('/api/auth/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,gender,shirtColor:color})});const result=await response.json();if(!response.ok)throw Error(result.error||'Chưa lưu được ngoại hình.');onSave(result.user);}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được ngoại hình.');}finally{setSaving(false);}}}>
    <span className="eyebrow">WETUBE CINÉ / CÙNG NHAU</span><h2>Bạn sẽ là ai trong rạp?</h2><p>Tên của bạn được in trên áo. Tin nhắn sẽ hiện trên đầu nhân vật.</p>
    <div className="character-preview" style={{'--shirt':color} as CSSProperties}><div className={'mini-character '+gender}><div className="mini-hair"/><div className="mini-head"/><div className="mini-body"><span>{name||'Tên bạn'}</span></div><div className="mini-arm left"/><div className="mini-arm right"/><div className="mini-legs"/></div><div className="character-shadow"/><span>XEM TỪ PHÍA SAU</span></div>
    <label>Tên in trên áo<input autoFocus value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={18} placeholder="Mọi người gọi bạn là gì?"/></label>
    <fieldset><legend>Giới tính / ngoại hình</legend><div className="profile-segmented">{(['male','female'] as const).map(value=><button key={value} type="button" className={gender===value?'selected':''} aria-pressed={gender===value} onClick={()=>setGender(value)}>{value==='male'?'Nam':'Nữ'}{gender===value&&<Check size={16}/>}</button>)}</div></fieldset>
    <fieldset><legend>Màu áo</legend><div className="profile-colors">{colors.map(value=><button key={value} type="button" style={{background:value}} className={color===value?'selected':''} aria-label={'Áo màu '+value} aria-pressed={color===value} onClick={()=>setColor(value)}>{color===value&&<Check size={18}/>}</button>)}</div></fieldset>
    {error&&<p className="entry-error" role="alert">{error}</p>}<button className="primary" disabled={saving}>{saving?'Đang lưu…':'Vào rạp thôi'}<ArrowRight size={18}/></button>
  </form>;
}
