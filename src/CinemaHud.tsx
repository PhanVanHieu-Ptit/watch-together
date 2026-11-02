import {useState,useEffect} from 'react';
import {Armchair,ArrowDown,ArrowRight,AudioLines,Clapperboard,Captions,DoorOpen,Eye,EyeOff,ImagePlus,ListVideo,Maximize2,MessageCircle,Monitor,PersonStanding,Plus,Send,Shirt,Smile,Sparkles,Users,Volume2,VolumeX,Wallet,Heart} from 'lucide-react';
import type {Room} from './types';
export type CameraView='overview'|'seat'|'screen'|'audience';
type Props={
  active:boolean;view:CameraView;setView:(view:CameraView)=>void;hasSeat:boolean;seatLabel:string;
  hidden:boolean;collapsed:boolean;setCollapsed:(value:boolean)=>void;laser:boolean;setLaser:(value:boolean)=>void;
  muted:boolean;setMuted:(value:boolean)=>void;volume:number;setVolume:(value:number)=>void;captions:boolean;setCaptions:(value:boolean)=>void;
  tab:string;panel:boolean;openPanel:(tab:'queue'|'chat')=>void;queueCount:number;unread:number;
  text:string;setText:(text:string)=>void;send:()=>void;ready:boolean;canChat:boolean;
  openSeats:()=>void;openAdd:()=>void;openAppearance:()=>void;openPrivate:()=>void;openCommerce:(kind:'support'|'wallet'|'post')=>void;
  emote:(kind:'wave'|'clap'|'dance')=>void;notify:(message:string)=>void;
};
const emojis=['😊','😂','🥰','😎','🥺','😭','😴','🤔','❤️','💛','✨','🔥','🎶','🎉','👏','👋','🙌','🫶','💃','🍿','🐱','🐸','🌷','🌙'];
export function CinemaHud(p:Props){
  const [emotes,setEmotes]=useState(false),[emoji,setEmoji]=useState(false),[volumeOpen,setVolumeOpen]=useState(false);
  useEffect(()=>{
    if(!emotes&&!emoji&&!volumeOpen)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopImmediatePropagation();setEmotes(false);setEmoji(false);setVolumeOpen(false);}};
    const outside=(event:PointerEvent)=>{const target=event.target as Element|null;if(!target?.closest('.cinema-emote,.cinema-emoji-picker,.emoji-trigger,.cinema-volume,.volume-toggle')){setEmotes(false);setEmoji(false);setVolumeOpen(false);}};
    document.addEventListener('keydown',escape,true);document.addEventListener('pointerdown',outside);
    return()=>{document.removeEventListener('keydown',escape,true);document.removeEventListener('pointerdown',outside);};
  },[emotes,emoji,volumeOpen]);
  const camera=(view:CameraView)=>{if(view==='seat'&&!p.hasSeat){p.notify('Chọn ghế trước để xem từ chỗ của bạn.');return;}p.setView(view);};
  return <>
    <div className="cinema-camera hud-optional" role="group" aria-label="Góc nhìn camera">
      <button className={p.view==='overview'?'active':''} aria-label="Toàn cảnh rạp" aria-pressed={p.view==='overview'} onClick={()=>camera('overview')}><Maximize2 size={18}/></button>
      <button className={p.view==='seat'?'active':''} aria-label="Góc nhìn từ ghế" aria-pressed={p.view==='seat'} onClick={()=>camera('seat')}><Armchair size={18}/></button>
      <button className={p.view==='screen'?'active':''} aria-label="Tập trung màn hình" aria-pressed={p.view==='screen'} onClick={()=>camera('screen')}><Monitor size={18}/></button>
      <button className={p.view==='audience'?'active':''} aria-label="Nhìn từ màn chiếu về hàng ghế" aria-pressed={p.view==='audience'} onClick={()=>camera('audience')}><Users size={18}/></button>
    </div>
    <button className="cinema-private hud-optional" aria-label="Phòng riêng" onClick={p.openPrivate}><DoorOpen size={20}/><span>Phòng riêng</span></button>
    <div className="cinema-sound hud-optional" role="group" aria-label="Âm thanh và hiệu ứng">
      <button className={!p.laser?'dim':''} aria-label="Bật tắt hiệu ứng laser" aria-pressed={p.laser} onClick={()=>p.setLaser(!p.laser)}><AudioLines size={18}/></button>
      <button className={!p.captions?'dim':''} aria-label={p.captions?'Tắt phụ đề':'Bật phụ đề'} aria-pressed={p.captions} onClick={()=>p.setCaptions(!p.captions)}><Captions size={18}/></button>
      <button aria-label={p.muted?'Bật âm thanh':'Tắt âm thanh'} onClick={()=>p.setMuted(!p.muted)}>{p.muted||p.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
      <button className="volume-toggle" aria-label="Âm lượng của bạn" aria-expanded={volumeOpen} onClick={()=>setVolumeOpen(!volumeOpen)}>{p.muted?0:p.volume}%</button>
      {volumeOpen&&<div className="cinema-volume"><label>Âm lượng của bạn<input autoFocus type="range" min="0" max="100" value={p.volume} onChange={e=>{const value=Number(e.target.value);p.setVolume(value);p.setMuted(value===0);}}/></label><button onClick={()=>setVolumeOpen(false)}>Đóng</button></div>}
    </div>
    {p.active&&<>
      <nav className={'cinema-dock '+(p.collapsed?'collapsed':'')} aria-label="Chức năng trong rạp">
        <button className="dock-collapse" aria-expanded={!p.collapsed} aria-label={p.collapsed?'Mở các nút chức năng':'Thu gọn các nút chức năng'} onClick={()=>{p.setCollapsed(!p.collapsed);setEmotes(false);}}><ArrowDown size={18}/></button>
        <button className="hud-optional" aria-label="Chỗ ngồi" onClick={p.openSeats}><Armchair size={20}/><span>{p.hasSeat?p.seatLabel:'Chọn ghế'}</span></button>
        <button className="hud-optional" aria-label="Gửi video" onClick={p.openAdd}><Plus size={21}/><span>Gửi video</span></button>
        <button className="hud-optional" aria-label="Chiếu ảnh" onClick={()=>p.openCommerce('post')}><ImagePlus size={20}/><span>Chiếu ảnh</span></button>
        <button className={'hud-optional '+(p.panel&&p.tab==='queue'?'active':'')} aria-label="Hàng chờ" aria-expanded={p.panel&&p.tab==='queue'} onClick={()=>p.openPanel('queue')}><ListVideo size={20}/><span>Hàng chờ</span>{p.queueCount>0&&<b>{p.queueCount}</b>}</button>
        <button className={'dock-chat '+(p.panel&&p.tab==='chat'?'active':'')} aria-label="Trò chuyện" aria-expanded={p.panel&&p.tab==='chat'} onClick={()=>p.openPanel('chat')}><MessageCircle size={20}/><span>Trò chuyện</span>{p.unread>0&&<b aria-label="Tin chưa đọc">{p.unread}</b>}</button>
        {p.hasSeat&&<div className="cinema-emote hud-optional"><button aria-label="Tương tác" aria-expanded={emotes} onClick={()=>setEmotes(!emotes)}><PersonStanding size={20}/><span>Tương tác</span></button>{emotes&&<div className="cinema-emote-menu" role="menu">{([['wave','👋','Vẫy tay'],['clap','👏','Vỗ tay'],['dance','💃','Nhảy']] as const).map(([kind,icon,label])=><button key={kind} role="menuitem" onClick={()=>{p.emote(kind);setEmotes(false);}}><i>{icon}</i>{label}</button>)}</div>}</div>}
        <button className="hud-optional" aria-label="Ngoại hình" onClick={p.openAppearance}><Shirt size={20}/><span>Tủ đồ</span></button>
        <button className="donate-dock hud-optional" aria-label="Ủng hộ" onClick={()=>p.openCommerce('support')}><Heart size={19}/><span>Ủng hộ</span></button>
      </nav>
      <form className="cinema-quick-chat hud-optional" onSubmit={e=>{e.preventDefault();p.send();setEmoji(false);}}>
        <button type="button" className="emoji-trigger" aria-label="Chọn biểu tượng cảm xúc" aria-expanded={emoji} onClick={()=>setEmoji(!emoji)}><Smile size={21}/></button>
        <input aria-label="Tin nhắn cho cả rạp" value={p.text} onChange={e=>p.setText(Array.from(e.target.value).slice(0,160).join(''))} disabled={!p.canChat} placeholder={p.canChat?'Nói gì với cả rạp đi…':'Chủ phòng đã tắt quyền chat'}/>
        <small>{Array.from(p.text).length}/160</small><button type="submit" aria-label="Gửi chat nhanh" disabled={!p.ready||!p.text.trim()||!p.canChat}><Send size={17}/></button>
        {emoji&&<section className="cinema-emoji-picker" role="dialog" aria-label="Biểu tượng cảm xúc"><header><div><strong>Thêm chút cảm xúc</strong><span>Chọn emoji, rồi bấm gửi.</span></div><button type="button" onClick={()=>setEmoji(false)} aria-label="Đóng bảng biểu tượng">×</button></header><div>{emojis.map(emoji=><button key={emoji} type="button" aria-label={'Thêm '+emoji} onClick={()=>p.setText(Array.from(p.text+emoji).slice(0,160).join(''))}>{emoji}</button>)}</div></section>}
      </form>
    </>}
  </>;
}
