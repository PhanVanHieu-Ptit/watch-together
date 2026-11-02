import * as THREE from 'three';
import type { Person } from '../types';

export type Character = {
  group: THREE.Group;
  head: THREE.Group;
  arms: [THREE.Group, THREE.Group];
  legs: [THREE.Group, THREE.Group];
  body: THREE.Group;
  signature: string;
  seat: number | null;
  target: THREE.Vector3;
  path: THREE.Vector3[];
  walking: boolean;
  label: HTMLDivElement;
  dispose:()=>void;
};
type Builder = {
  cube: (x:number,y:number,z:number,w:number,h:number,d:number,color:string,rounded?:boolean,parent?:THREE.Object3D)=>THREE.Mesh;
  sphere: THREE.BufferGeometry;
  material: (color:string,basic?:boolean)=>THREE.Material;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
};
export const characterSignature = (person:Person) => [person.name,person.shirtColor,person.bodyStyle,person.gender].join('|');
export function createCharacter(person:Person, builder:Builder):Character {
  const {cube,sphere,material,geometries,materials}=builder;
  const group=new THREE.Group(),body=new THREE.Group();group.add(body);
  const shirt=person.shirtColor||'#879fbb',skin='#cba07d',hairColor=person.gender==='female'?'#322a28':'#392d25';
  const broad=person.bodyStyle==='broad',tall=person.bodyStyle==='tall';
  cube(0,1.23,.02,broad?.84:.68,.83,.48,shirt,true,body);
  const head=new THREE.Group();head.position.set(0,1.99,0);body.add(head);
  const face=new THREE.Mesh(sphere,material(skin));face.scale.set(.33,.3498,.33);head.add(face);
  const hairGeometry=new THREE.SphereGeometry(.342,20,12,0,Math.PI*2,0,Math.PI*.46);geometries.push(hairGeometry);
  const ownedGeometry:THREE.BufferGeometry[]=[hairGeometry],ownedMaterials:THREE.Material[]=[];
  const hair=new THREE.Mesh(hairGeometry,material(hairColor));hair.position.y=.03;head.add(hair);
  if(person.gender==='female')cube(0,-.05,.27,.59,.45,.16,hairColor,true,head);
  if(person.bodyStyle==='cap'){cube(0,.28,0,.69,.16,.6,shirt,true,head);cube(0,.22,-.29,.65,.06,.34,shirt,true,head);}
  // The front of the avatar faces the projection screen (negative world Z).
  for(const x of[-.115,.115]){const eye=new THREE.Mesh(sphere,material('#272722'));eye.scale.set(.026,.034,.012);eye.position.set(x,.02,-.302);head.add(eye);}
  const arms=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(side*(broad?.5:.43),1.47,0);body.add(pivot);
    cube(0,-.17,-.04,.19,.44,.23,shirt,true,pivot);cube(0,-.43,-.08,.16,.22,.18,skin,true,pivot);return pivot;
  }) as [THREE.Group,THREE.Group];
  const legs=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(side*.19,.88,0);body.add(pivot);
    cube(0,-.11,-.27,.26,.27,.62,'#313c3b',true,pivot);cube(0,-.43,-.51,.23,.5,.25,'#313c3b',true,pivot);cube(0,-.69,-.6,.26,.16,.42,'#242725',true,pivot);return pivot;
  }) as [THREE.Group,THREE.Group];
  // A local canvas texture puts the actual display name on the shirt.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const context=canvas.getContext('2d');
  if(context){
    context.fillStyle=shirt;context.fillRect(0,0,256,64);context.fillStyle='#384236';context.textAlign='center';context.textBaseline='middle';let size=30;context.font=`600 ${size}px sans-serif`;
    while(context.measureText(person.name).width>236&&size>12)context.font=`600 ${--size}px sans-serif`;
    context.fillText(person.name,128,34);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const labelMaterial=new THREE.MeshBasicMaterial({map:texture});materials.push(labelMaterial);ownedMaterials.push(labelMaterial);
    const labelGeometry=new THREE.PlaneGeometry(.56,.14);geometries.push(labelGeometry);ownedGeometry.push(labelGeometry);
    const shirtLabel=new THREE.Mesh(labelGeometry,labelMaterial);shirtLabel.position.set(0,1.26,.266);body.add(shirtLabel);
  }
  if(tall)body.scale.y=1.12;
  const label=document.createElement('div');label.className='avatar-label';label.textContent=person.name;
  return {group,body,head,arms,legs,signature:characterSignature(person),seat:person.seat,target:new THREE.Vector3(),path:[],walking:false,label,dispose:()=>{
    for(const geometry of ownedGeometry){geometry.dispose();const index=geometries.indexOf(geometry);if(index>=0)geometries.splice(index,1);}
    for(const material of ownedMaterials){if(material instanceof THREE.MeshBasicMaterial)material.map?.dispose();material.dispose();const index=materials.indexOf(material);if(index>=0)materials.splice(index,1);}
  }};
}
export function animateCharacter(actor:Character,person:Person,time:number,delta:number,reducedMotion:boolean){
  const {group,body,head,arms,legs}=actor;
  const path=actor.path;
  if(path.length){
    const direction=path[0].clone().sub(group.position),distance=direction.length(),step=Math.min(delta,.05)*5;
    if(distance<=step){group.position.copy(path.shift()!);}else{group.position.addScaledVector(direction,step/distance);group.rotation.y=Math.atan2(-direction.x,-direction.z);}
    actor.walking=path.length>0;
  }else{actor.walking=false;group.rotation.y=person.stageSpot!=null?Math.PI:0;}
  const walking=actor.walking;
  const emote=person.emote && person.emote.until>Date.now()?person.emote.kind:null;
  const onStage=person.stageSpot!=null;
  const dance=!reducedMotion&&(emote==='dance'||onStage);
  const wave=!reducedMotion&&emote==='wave',clap=!reducedMotion&&emote==='clap';
  body.position.y=walking?.54: dance?.08+Math.sin(time*8)*.06:0;
  body.rotation.z=dance?Math.sin(time*5)*.12:0;
  head.rotation.y=!reducedMotion?Math.sin(time*.7+person.name.length)*.12:0;
  head.rotation.x=dance?Math.sin(time*8)*.12:0;
  legs.forEach((leg,i)=>{leg.rotation.x=walking?-.85+Math.sin(time*10+i*Math.PI)*.5:onStage?-.8:dance?Math.sin(time*8+i*Math.PI)*.15:0;});
  arms.forEach((arm,i)=>{const side=i===0?-1:1;
    arm.rotation.x=walking?Math.sin(time*10+i*Math.PI)*.4:dance?Math.sin(time*6+i)*.6:clap?-1.1:wave&&i===1?-1.5:0;
    arm.rotation.z=wave&&i===1?1.5+Math.sin(time*8)*.35:clap?side*(.4+Math.sin(time*12)*.2):dance?side*.8:0;
  });
  group.userData.walking=walking;group.userData.emote=emote;
}
/** Route via the aisle behind the row, avoiding walks straight through occupied sofas. */
export function aislePath(from:THREE.Vector3,to:THREE.Vector3):THREE.Vector3[]{
  const aisles=[-8.8,-4.7,1.15,6.75,10.5];
  const aisle=aisles.reduce((a,b)=>Math.abs(from.x-b)+Math.abs(to.x-b)<Math.abs(from.x-a)+Math.abs(to.x-a)?b:a);
  return [new THREE.Vector3(from.x,from.y,from.z+.9),new THREE.Vector3(aisle,from.y,from.z+.9),new THREE.Vector3(aisle,to.y,to.z+.9),new THREE.Vector3(to.x,to.y,to.z+.9),to.clone()];
}
