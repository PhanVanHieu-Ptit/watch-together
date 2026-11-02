import type { Person } from '../types';
const names=['mèo béo','cẩu tặc','trộm chó','ông trùm bắp','bé báo','hết cứu','bún đậu mắm tôm','đang lag','mỏ hỗn','chúa hề','khứa này','ăn ké','ngáo ngơ','lười tắm','đạo diễn mõm'];
const colors=['#c9a985','#82b9b3','#98aaca','#bea0c7','#b6c98e','#ce9c88'];
/** Decorative bots are local, yield immediately to people and never participate in votes/chat. */
export function ambientPeople(people:Person[],now:number,enabled=true):Person[]{
  if(!enabled||people.length>=30)return [];
  const occupied=new Set(people.filter(p=>p.seat!=null).map(p=>p.seat));
  return names.map((name,i)=>{
    const period=(120+(i*37)%121)*1000,cycle=Math.floor((now+i*19017)/period);
    let seat=((i*7+cycle*37)%100+100)%100;
    while(occupied.has(seat))seat=(seat+17)%100;
    occupied.add(seat);
    return {id:`ambient-${i}`,name,seat,avatar:'',shirtColor:colors[i%colors.length],gender:i%3===0?'female':'male',isBot:true};
  });
}
