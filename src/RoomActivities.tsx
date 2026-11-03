import {useEffect, useState} from 'react';
import type {Room} from './types';
type Action=(event:string,data?:any,done?:(ok:boolean)=>void)=>boolean;
export function RoomActivities({room,myId,ready,now,action}:{room:Room;myId:string;ready:boolean;now:number;action:Action}) {
  const [url,setUrl]=useState(''),[answer,setAnswer]=useState(''),[start,setStart]=useState(0),[guess,setGuess]=useState(''),[playlistName,setPlaylistName]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
  const host=room.hostId===myId,game=room.game,playing=game?.status==='playing';
  useEffect(()=>{setGuess('');setFeedback('');},[game?.id]);
  const send=(event:string,data:any,success:()=>void=()=>{})=>{
    setBusy(true);setFeedback('');
    if(!action(event,data,ok=>{setBusy(false);if(ok)success();else setFeedback('Chưa thực hiện được. Xem thông báo của rạp và thử lại.');}))setBusy(false);
  };
  return <section className="room-activities" aria-label="Trò chơi và playlist">
    <h3>🎵 Đoán bài hát</h3>
    <p>Chủ phòng chọn bài, cả hội nghe và đoán trong 30 giây. Không phân biệt hoa thường hoặc dấu tiếng Việt.</p>
    {game&&<div className="game-status" aria-live="polite"><strong>Vòng {game.round} · {playing?`${Math.max(0,Math.ceil((game.endsAt-now)/1000))} giây`:'Đã kết thúc'}</strong>{!playing&&<p>Đáp án: <b>{game.answer}</b></p>}{playing&&<p>{game.correctIds.length} người đã đoán đúng.</p>}</div>}
    {playing?(game.hostId===myId?<><p>Bạn là người ra câu hỏi vòng này.</p>{host&&<button disabled={!ready||busy} onClick={()=>send('game:stop',null)}>Kết thúc vòng</button>}</>:game.correctIds.includes(myId)?<p role="status">🎉 Bạn đã đoán đúng! Đợi vòng tiếp theo nhé.</p>:<form onSubmit={e=>{e.preventDefault();send('game:guess',{answer:guess},()=>{setGuess('');setFeedback('🎉 Chính xác! Điểm đã được cộng.');});}}><label>Đáp án của bạn<input required maxLength={120} value={guess} onChange={e=>setGuess(e.target.value)} autoComplete="off"/></label><button className="primary" disabled={!ready||busy}>Gửi đáp án</button></form>):host?<form onSubmit={e=>{e.preventDefault();send('game:start',{url,answer,start},()=>{setAnswer('');setUrl('');});}}><label>Link bài hát YouTube<input type="url" required maxLength={2048} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…"/></label><label>Đáp án chính xác<input required maxLength={120} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Tên bài hát"/></label><label>Bắt đầu từ giây<input type="number" min={0} max={86400} required value={start} onChange={e=>setStart(Number(e.target.value))}/></label><button className="primary" disabled={!ready||busy}>{busy?'Đang chuẩn bị…':'Mở vòng 30 giây'}</button><small>Người ra câu hỏi không được tính điểm. Bài đang xem sẽ được thay bằng bài bí mật.</small></form>:<p>Chờ chủ phòng mở vòng chơi.</p>}
    {!!game?.scores.length&&<><h4>Bảng điểm buổi chơi</h4><ol>{game.scores.map(s=><li key={s.userId}>{s.name} <strong>{s.points} điểm</strong></li>)}</ol></>}
    {feedback&&<p role="status">{feedback}</p>}
    {room.persistent&&<><h3>💿 Playlist của phòng</h3>{host&&<form onSubmit={e=>{e.preventDefault();send('playlist:save',{name:playlistName},()=>{setPlaylistName('');setFeedback('Đã lưu hàng chờ thành playlist.');});}}><label>Tên playlist<input required maxLength={60} value={playlistName} onChange={e=>setPlaylistName(e.target.value)}/></label><button disabled={!ready||busy||!room.queue.length||playing}>Lưu hàng chờ</button></form>}{!room.playlists?.length&&<p>Chưa có playlist. Chủ phòng có thể lưu hàng chờ để nghe lại.</p>}{room.playlists?.map(p=><div className="saved-playlist" key={p.id}><span>{p.name} · {p.videos.length} bài</span>{host&&<div><button disabled={!ready||busy||playing} onClick={()=>send('playlist:load',{id:p.id},()=>setFeedback('Đã thêm playlist vào hàng chờ.'))}>Thêm vào hàng chờ</button><button disabled={!ready||busy||playing} onClick={()=>send('playlist:delete',{id:p.id})}>Xóa</button></div>}</div>)}</>}
  </section>;
}
export function SavedRooms() {
  const [rooms,setRooms]=useState<{roomId:string;name:string;playlistCount:number;passwordRequired:boolean}[]>([]),[error,setError]=useState('');
  useEffect(()=>{const abort=new AbortController();fetch('/api/rooms/mine',{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('Đăng nhập để xem phòng cố định của bạn.');setRooms((await r.json()).rooms);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
  return <section className="room-activities"><h3>Phòng cố định của bạn</h3>{error?<p>{error}</p>:!rooms.length?<p>Chưa có phòng cố định. Tạo một phòng bên dưới để giữ link và playlist.</p>:rooms.map(r=><p key={r.roomId}><a href={'?room='+r.roomId}>{r.name}</a> · {r.playlistCount} playlist {r.passwordRequired?'· Có mật khẩu':''}</p>)}</section>;
}
