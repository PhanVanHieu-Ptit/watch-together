import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Person, Chat } from "./types";
import { createCharacter, characterSignature, animateCharacter, aislePath, type Character } from "./theater/character";
import { SEATS } from "./seats";

type Props = { people: Person[]; myId: string; onSeat: (id: number) => void; onFail: () => void;
  view: "overview" | "seat" | "screen" | "audience"; messages?:Chat[]; energetic?:boolean; bpm?:number; laser?:boolean; onStage?:(spot:number)=>void; quality: "high" | "smooth"; screen: React.RefObject<HTMLDivElement | null> };
export function Theater(props: Props) {
  const mount=useRef<HTMLDivElement>(null),latest=useRef(props),refresh=useRef<(()=>void)|null>(null);latest.current=props;
  useEffect(()=>{
    const el=mount.current!,high=props.quality==='high';let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:high?'high-performance':'low-power'});}catch{latest.current.onFail();return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,high?2:1.5));renderer.setClearColor('#100e10');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#100e10',.0045);
    const camera=new THREE.PerspectiveCamera(48,1,.1,150);
    scene.add(new THREE.HemisphereLight('#d6e1ec','#29221e',2.65));
    const key=new THREE.PointLight('#b9d4e8',150,55,1.5);key.position.set(0,8,-7);scene.add(key);
    const fill=new THREE.PointLight('#f3b57c',80,40,1.7);fill.position.set(0,15,9);scene.add(fill);
    const box=new THREE.BoxGeometry(1,1,1),rounded=new RoundedBoxGeometry(1,1,1,3,.09),sphere=new THREE.SphereGeometry(1,16,12);
    const geometries:THREE.BufferGeometry[]=[box,rounded,sphere],materials:THREE.Material[]=[],cache=new Map<string,THREE.Material>();
    const mat=(color:string,basic=false)=>{const key=color+basic;let m=cache.get(key);if(!m){m=basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.8});cache.set(key,m);materials.push(m);}return m;};
    const cube=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,round=false,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(round?rounded:box,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
    const glow=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{const m=cube(x,y,z,w,h,d,color);m.material=mat(color,true);return m;};
    const ball=(x:number,y:number,z:number,r:number,color:string,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(sphere,mat(color));m.position.set(x,y,z);m.scale.setScalar(r);parent.add(m);return m;};
    cube(0,-.35,7.5,30,.6,34,'#252321');
    for(let r=0;r<10;r++){
      cube(0,r*.34-.12,-1+r*2,27,.24,2,r%2?'#31282a':'#2c2527');
      for(const x of [-8.8,-4.7,1.15,6.75]){glow(x,r*.34+.025,-1+r*2,.045,.035,1.65,'#c28c58');for(const dx of[-.32,.32])glow(x+dx,r*.34+.08,-1+r*2-.96,.13,.05,.03,'#ffd7a0');}
    }
    cube(0,2.94,19.45,27,.24,2.9,'#2c2527');cube(0,.1,-7,29,.4,6,'#282727');glow(0,.34,-6,25,.05,.06,'#b0804f');cube(0,8.5,-12,30,18,.5,'#191b1b');
    for(const side of[-1,1]){
      cube(side*15,8,5,.35,18,35,'#212324');
      for(let z=-8;z<24;z+=3.5){cube(side*14.79,7.5,z,.12,10,2.5,'#2b2d2c');glow(side*14.7,8,z+1.6,.06,9,.04,'#a97a51');}
      for(const z of[-5,1.5,8,14.5,21]){
        const lamp=new THREE.Group();lamp.position.set(side*14.45,12.4,z);lamp.lookAt(-side*5,1,z+2);scene.add(lamp);
        cube(0,0,0,.5,.5,.55,'#101212',true,lamp);const lens=ball(0,0,.29,.2,'#f3c58a',lamp);lens.scale.z=.15;lens.material=mat('#f3c58a',true);
        const wash=new THREE.Mesh(new THREE.PlaneGeometry(2.2,7.2),new THREE.MeshBasicMaterial({color:'#dca96d',transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));geometries.push(wash.geometry);materials.push(wash.material);wash.position.set(side*14.77,8.8,z);wash.rotation.y=Math.PI/2;scene.add(wash);
      }
      const x=side*12.7;cube(x,4.3,-9,2,7.8,1.5,'#101212',true);cube(x,7.4,-8.2,1.1,.45,.1,'#494a42');
      for(const y of[1.65,3.75,5.85]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.61,.09,12,32),mat('#434644'));geometries.push(ring.geometry);ring.position.set(x,y,-8.21);scene.add(ring);const speaker=ball(x,y,-8.2,.53,'#191d1c');speaker.scale.z=.25;const center=ball(x,y,-8.04,.2,'#373b38');center.scale.z=.4;}
    }
    cube(0,7.9,-10.8,22.2,12.7,.4,'#080909',true);glow(0,7.9,-10.55,21.7,12.2,.06,'#9c5148');glow(0,7.9,-10.49,21.25,11.95,.03,'#231419');
    const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=100;const ctx=signCanvas.getContext('2d');if(ctx){ctx.fillStyle='#252726';ctx.fillRect(0,0,512,100);ctx.fillStyle='#ffe3bd';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText('W E T U B E  C I N É',256,66);const texture=new THREE.CanvasTexture(signCanvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture});materials.push(material);const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.65),material);geometries.push(sign.geometry);sign.position.set(0,1.05,-9.9);scene.add(sign);}
    const chairs:THREE.Mesh[]=[],backs:THREE.Mesh[]=[];
    const groups=new Map<string,typeof SEATS>();
    for(const seat of SEATS){const group=groups.get(seat.cluster)||[];group.push(seat);groups.set(seat.cluster,group);}
    for(const seats of groups.values()){
      const first=seats[0],last=seats.at(-1)!,center=(first.x+last.x)/2,width=(seats.length-1)*1.35+1.2;
      const color=seats.length===1?'#9b2934':seats.length===2?'#852330':'#6d1d29';
      cube(center,first.y+.42,first.z,width,.48,1.25,color,true);
      for(const side of[-1,1]){cube(center+side*(width/2+.12),first.y+.79,first.z,.21,.63,1.3,'#2d1d22',true);cube(center+side*(width/2+.12),first.y+1.13,first.z-.1,.24,.1,.68,'#59232c',true);}
      for(const seat of seats){
        const back=cube(seat.x,seat.y+.94,seat.z+.44,1.19,.95,.27,color,true);back.userData.seat=seat.seatId;chairs.push(back);backs[seat.seatId]=back;
        const cushion=cube(seat.x,seat.y+.72,seat.z-.1,1.16,.16,1.03,color,true);cushion.userData.seat=seat.seatId;chairs.push(cushion);
        cube(seat.x,seat.y+1.1,seat.z+.586,.37,.13,.01,'#a9aa96');
      }
    }
    const disco=ball(0,15.6,-.5,.69,'#727e76');disco.material=new THREE.MeshStandardMaterial({color:'#939c93',metalness:.95,roughness:.18,flatShading:true});materials.push(disco.material);cube(0,17,-.5,.045,2.1,.045,'#6e736f');
    const tileGeometry=new THREE.PlaneGeometry(.115,.12);geometries.push(tileGeometry);
    for(let row=1;row<12;row++)for(let col=0;col<24;col++){const theta=row/12*Math.PI,phi=col/24*Math.PI*2;const tile=new THREE.Mesh(tileGeometry,mat((row+col)%3?'#727e76':'#e4e9df'));tile.position.set(.706*Math.sin(theta)*Math.cos(phi),.706*Math.cos(theta),.706*Math.sin(theta)*Math.sin(phi));tile.lookAt(tile.position.clone().multiplyScalar(2));disco.add(tile);}
    const actors=new Map<string,Character>();
    const labels=document.createElement('div');labels.className='avatar-labels';el.appendChild(labels);
    const stageSpots=[-4.6,0,4.6].map((x,i)=>{
      const geometry=new THREE.TorusGeometry(.72,.05,10,40);geometries.push(geometry);
      const ring=new THREE.Mesh(geometry,mat('#f04b45',true));ring.position.set(x,.39,-6.9);ring.rotation.x=Math.PI/2;ring.userData.stage=i;scene.add(ring);return ring;
    });
    const stagePosition=(spot:number)=>new THREE.Vector3([-4.6,0,4.6][spot],.4,-6.9);
    const reconcile=()=>{
      const people=latest.current.people,ids=new Set(people.map(p=>p.id));
      for(const[id,actor]of actors)if(!ids.has(id)){scene.remove(actor.group);actor.label.remove();actor.dispose();actors.delete(id);}
      for(const person of people){
        let actor=actors.get(person.id);
        if(actor&&actor.signature!==characterSignature(person)){scene.remove(actor.group);actor.label.remove();actor.dispose();actors.delete(person.id);actor=undefined;}
        const seat=person.seat!=null?SEATS[person.seat]:null;
        if(!seat&&person.stageSpot==null)continue;
        const target=person.stageSpot!=null?stagePosition(person.stageSpot):new THREE.Vector3(seat!.x,seat!.y,seat!.z);
        if(!actor){actor=createCharacter(person,{cube,sphere,material:mat,geometries,materials});actor.group.position.copy(target);actor.target.copy(target);scene.add(actor.group);labels.appendChild(actor.label);actors.set(person.id,actor);}
        else if(actor.target.distanceToSquared(target)>.001){actor.path=aislePath(actor.group.position,target);actor.target.copy(target);actor.seat=person.seat;}
        actor.group.visible=!(latest.current.view==='seat'&&person.id===latest.current.myId);
      }
      backs.forEach((back,i)=>back.material=mat(people.some(p=>p.id===latest.current.myId&&p.seat===i)?'#f04b45':SEATS[i].size===1?'#9b2934':SEATS[i].size===2?'#852330':'#6d1d29'));
    };
    const beamGeometry=new THREE.CylinderGeometry(.02,.08,24,6,1,true);geometries.push(beamGeometry);
    const beams=Array.from({length:12},(_,i)=>{
      const material=new THREE.MeshBasicMaterial({color:['#a0ffb0','#a4adff','#ff81b5','#f09b73'][i%4],transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});materials.push(material);
      const beam=new THREE.Mesh(beamGeometry,material);scene.add(beam);return beam;
    });
    const projectScreen=(w:number,h:number)=>{const target=latest.current.screen.current;if(!target)return;const model=new THREE.Matrix4().compose(new THREE.Vector3(-10.6,13.8625,-10.44),new THREE.Quaternion(),new THREE.Vector3(21.2/1280,-11.925/720,1));const viewport=new THREE.Matrix4().set(w/2,0,0,w/2,0,-h/2,0,h/2,0,0,1,0,0,0,0,1);const m=viewport.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(model);target.style.transform=`matrix3d(${m.elements.map(v=>v/m.elements[15]).join(',')})`;};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const desiredPosition=new THREE.Vector3(),desiredLook=new THREE.Vector3(),look=new THREE.Vector3(0,5,-3);
    let width=0,height=0,first=true,yaw=0,pitch=0,zoom=1,frame=0,lastTime=0,disposed=false,dragged=false;
    const pointers=new Map<number,{x:number;y:number}>();let pinchDistance=0;
    const resize=()=>{width=el.clientWidth;height=el.clientHeight;if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;}};
    const updateCamera=(delta:number)=>{
      const {people,myId,view}=latest.current,me=people.find(p=>p.id===myId),seat=me?.seat!=null?SEATS[me.seat]:null;
      camera.fov=view==='audience'?82:48;
      if(view==='screen'){
        const distance=Math.max(11.925/(2*Math.tan(THREE.MathUtils.degToRad(24))),21.2/(2*Math.tan(THREE.MathUtils.degToRad(24))*camera.aspect))*1.08;
        desiredPosition.set(0,7.9,-10.44+distance);desiredLook.set(0,7.9,-10.44);
      }else if(view==='audience'){desiredPosition.set(0,12,-9.5);desiredLook.set(0,3.2,10.5);}
      else if(view==='seat'&&seat){desiredPosition.set(seat.x,seat.y+2.15,seat.z+.15);desiredLook.set(seat.x*.1,7.6,-10);}
      else{const mobile=width/height<1.15;desiredPosition.set(mobile?2:7,mobile?18:14.4,mobile?39:29);desiredLook.set(0,mobile?6:5,-3);}
      desiredPosition.sub(desiredLook).multiplyScalar(zoom).add(desiredLook);desiredPosition.x+=Math.sin(yaw)*4;desiredLook.x+=Math.sin(yaw)*7;desiredLook.y+=pitch*12;
      const ease=first||reduced.matches?1:1-Math.exp(-delta*9);camera.position.lerp(desiredPosition,ease);look.lerp(desiredLook,ease);camera.lookAt(look);
      camera.updateProjectionMatrix();camera.updateMatrixWorld();first=false;
      latest.current.screen.current?.style.setProperty('visibility',view==='audience'?'hidden':'visible');
      el.dataset.camera=view;el.dataset.zoom=String(zoom);
    };
    const position=new THREE.Vector3();
    const render=(timestamp:number)=>{
      if(disposed)return;
      if(!high&&timestamp-lastTime<1000/30){frame=requestAnimationFrame(render);return;}
      const delta=lastTime?Math.min((timestamp-lastTime)/1000,.05):1/60;lastTime=timestamp;
      if(width&&height&&!document.hidden){
        updateCamera(delta);const time=timestamp/1000,now=Date.now();
        for(const person of latest.current.people){
          const actor=actors.get(person.id);if(!actor)continue;
          if(reduced.matches&&actor.path.length){actor.group.position.copy(actor.target);actor.path=[];}
          animateCharacter(actor,person,time,delta,reduced.matches);
          actor.label.dataset.emote=actor.group.userData.emote||'';actor.label.dataset.walking=String(actor.walking);
          position.copy(actor.group.position);position.y+=2.8;position.project(camera);
          actor.label.style.left=`${(position.x+1)*width/2}px`;actor.label.style.top=`${(1-position.y)*height/2}px`;
          const message=latest.current.messages?.slice().reverse().find(m=>m.userId===person.id&&now-m.createdAt<Math.min(8000,2000+m.text.length*45));
          const bubble=message?.text||'';
          if(actor.label.dataset.bubble!==bubble){actor.label.dataset.bubble=bubble;actor.label.replaceChildren();const name=document.createElement('span');name.className='avatar-name';name.textContent=person.name+(person.isBot?' · BOT':'');actor.label.appendChild(name);if(bubble){const text=document.createElement('span');text.className='avatar-bubble';text.textContent=bubble;actor.label.appendChild(text);}}
          actor.label.hidden=person.isBot&&!bubble||!actor.group.visible||position.z>1||position.z< -1;
        }
        const party=!!latest.current.energetic&&!!latest.current.laser&&!reduced.matches;
        const beat=time*(latest.current.bpm||128)/60;
        beams.forEach((beam,i)=>{beam.visible=party;if(party){beam.position.set(Math.sin(time*.4+i)*8,8,1);beam.rotation.set(Math.sin(time*.7+i)*.8,0,Math.cos(time*.5+i)*.7);}});
        disco.rotation.y=party?time*.45:0;fill.intensity=party?80+Math.sin(beat*Math.PI*2)*35:80;
        renderer.render(scene,camera);projectScreen(width,height);el.dataset.frames=String((Number(el.dataset.frames)||0)+1);
      }
      frame=requestAnimationFrame(render);
    };
    refresh.current=reconcile;
    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
    const select=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects([...chairs,...stageSpots])[0];if(hit){if(hit.object.userData.stage!=null)latest.current.onStage?.(hit.object.userData.stage);else latest.current.onSeat(hit.object.userData.seat);}};
    const down=(e:PointerEvent)=>{dragged=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);if(pointers.size===2){const[a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}};
    const move=(e:PointerEvent)=>{const previous=pointers.get(e.pointerId);if(!previous)return;const dx=e.clientX-previous.x,dy=e.clientY-previous.y;if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoom=THREE.MathUtils.clamp(zoom*pinchDistance/Math.max(1,distance),.55,1.8);pinchDistance=distance;dragged=true;}else{yaw=THREE.MathUtils.clamp(yaw-dx*.004,-1.2,1.2);pitch=THREE.MathUtils.clamp(pitch+dy*.003,-.6,.6);}};
    const up=(e:PointerEvent)=>{if(!dragged&&pointers.size===1)select(e);pointers.delete(e.pointerId);if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);};
    const cancel=(e:PointerEvent)=>{pointers.delete(e.pointerId);dragged=true;};
    const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.55,1.8);};
    const lost=(e:Event)=>{e.preventDefault();latest.current.onFail();};
    const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);el.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('webglcontextlost',lost);
    const observer=new ResizeObserver(resize);observer.observe(el);resize();reconcile();frame=requestAnimationFrame(render);
    return()=>{disposed=true;cancelAnimationFrame(frame);refresh.current=null;observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);el.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',lost);labels.remove();geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m instanceof THREE.MeshBasicMaterial)m.map?.dispose();m.dispose();});renderer.dispose();renderer.forceContextLoss();canvas.remove();const target=latest.current.screen.current;if(target){target.style.removeProperty('transform');target.style.removeProperty('visibility');}};
  },[props.quality]);
  useEffect(()=>refresh.current?.(),[props.people,props.myId,props.view]);
  return <div className="three-theater" ref={mount} aria-label="Rạp 3D 100 ghế, gồm bot minh họa; kéo để xoay, cuộn để zoom, dùng sơ đồ ghế để thao tác bàn phím"/>;
}
