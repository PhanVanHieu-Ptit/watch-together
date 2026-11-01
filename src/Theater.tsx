import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Person } from "./types";
import { SEATS } from "./seats";

type Props = { people: Person[]; myId: string; onSeat: (id: number) => void; onFail: () => void;
  view: "overview" | "seat"; quality: "high" | "smooth"; screen: React.RefObject<HTMLDivElement | null> };
export function Theater(props: Props) {
  const mount = useRef<HTMLDivElement>(null), latest = useRef(props);
  latest.current = props;
  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => {
    const el = mount.current!;
    const weak = navigator.hardwareConcurrency <= 4 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const high = props.quality === "high" && !weak;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: high, alpha: false, powerPreference: high ? "high-performance" : "low-power" }); }
    catch { latest.current.onFail(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 1.75 : 1));
    renderer.setClearColor(0x111211);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
    scene.fog = new THREE.Fog(0x111211, 26, 65);
    scene.add(new THREE.HemisphereLight(0x9aaec2, 0x252017, .8));
    const key = new THREE.PointLight(0xd8efb0, high ? 210 : 150, 35, 2);
    key.position.set(0, 6, -7); scene.add(key);
    if (high) { const fill = new THREE.PointLight(0xe5be98, 50, 22); fill.position.set(0, 5, 6); scene.add(fill); }
    const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
    const box = new THREE.BoxGeometry(1, 1, 1); geometries.push(box);
    const material = (color: number, emissive = 0) => { const m = new THREE.MeshStandardMaterial({ color, roughness: .88, emissive }); materials.push(m); return m; };
    const floor = material(0x20241f), wall = material(0x171b19), trim = material(0x87986a, 0x28381b);
    const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(box, mat); m.position.set(x,y,z); m.scale.set(w,h,d); scene.add(m); return m;
    };
    addBox(0,-.2,0,17,.35,25,floor);
    addBox(0,.22,-8,14,.8,4,wall); // raised stage
    addBox(0,.67,-6.03,13,.045,.07,trim);
    addBox(0,4.1,-9.15,12.5,7.2,.24,wall); // projection surround
    addBox(-8.3,4,0,.25,8,25,wall); addBox(8.3,4,0,.25,8,25,wall);
    for (let r=0;r<10;r++) {
      addBox(0,r*.16-.07,-3.5+r*1.12,15,.16,1.12,floor);
      for (const x of [-7.5,.9,7.5]) addBox(x,r*.16+.025,-3.9+r*1.12,.12,.025,.28,trim);
    }
    const chairMat = material(0xffffff), dummy = new THREE.Object3D(), color = new THREE.Color();
    const parts = [[.72,.82,.2,0,.67,.25],[.72,.18,.65,0,.29,0],[.09,.3,.7,-.4,.43,0],[.09,.3,.7,.4,.43,0]];
    const chairs = parts.map(([w,h,d,x,y,z]) => {
      const mesh = new THREE.InstancedMesh(box,chairMat,100);
      SEATS.forEach(s => { dummy.position.set(s.x+x,s.y+y,s.z+z); dummy.scale.set(w,h,d); dummy.updateMatrix(); mesh.setMatrixAt(s.seatId,dummy.matrix); });
      scene.add(mesh); return mesh;
    });
    const headGeo = new THREE.IcosahedronGeometry(.23,0); geometries.push(headGeo);
    const skin = material(0xe5be98), hair = material(0x302a29);
    const heads = new THREE.InstancedMesh(headGeo,skin,100), bodies = new THREE.InstancedMesh(box,chairMat,100), hats = new THREE.InstancedMesh(box,hair,100);
    scene.add(heads,bodies,hats);
    const projectScreen = (w: number, h: number) => {
      const target = latest.current.screen.current; if (!target) return;
      // CSS homogeneous transform: DOM pixels → world screen → camera clip → viewport.
      const model = new THREE.Matrix4().compose(new THREE.Vector3(-6,7.475,-9),new THREE.Quaternion(),new THREE.Vector3(12/960,-6.75/540,1));
      const viewport = new THREE.Matrix4().set(w/2,0,0,w/2, 0,-h/2,0,h/2, 0,0,1,0, 0,0,0,1);
      const m = viewport.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(model);
      const values = m.elements.map(v => v / m.elements[15]);
      target.style.transform = `matrix3d(${values.join(",")})`;
    };
    const render = () => {
      const {people,myId,view} = latest.current;
      const mine = people.find(p=>p.id===myId), seat = mine?.seat != null ? SEATS[mine.seat] : undefined;
      const w=el.clientWidth, h=el.clientHeight; if (!w || !h) return;
      renderer.setSize(w,h,false); camera.aspect=w/h;
      if (view === "seat" && seat) {
        camera.position.set(seat.x,seat.y+1.35,seat.z); camera.fov=65;
        camera.lookAt(0,4.1,-9);
        // Fit all screen corners, including YouTube's controls, even from a front corner seat.
        camera.updateMatrixWorld();
        let tangent = 0;
        for (const x of [-6,6]) for (const y of [.725,7.475]) {
          const corner = new THREE.Vector3(x,y,-9).applyMatrix4(camera.matrixWorldInverse);
          tangent = Math.max(tangent, Math.abs(corner.y / corner.z), Math.abs(corner.x / corner.z) / camera.aspect);
        }
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tangent * 1.3));
      } else {
        camera.position.set(0,12.8,19); camera.fov = w/h < 1.3 ? 66 : 48; camera.lookAt(0,1,-2.5);
      }
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      SEATS.forEach(s=>{
        const p=people.find(p=>p.seat===s.seatId);
        color.set(p?.id===myId ? 0xd8ef82 : p ? 0xe5be98 : 0x526346);
        chairs.forEach(mesh=>mesh.setColorAt(s.seatId,color));
      });
      let count=0;
      for (const p of people) {
        if (p.seat==null || !SEATS[p.seat] || (view==="seat" && p.id===myId)) continue;
        const s=SEATS[p.seat], style=p.bodyStyle ?? "classic";
        dummy.position.set(s.x,s.y+1.22,s.z); dummy.scale.set(1,style==="tall" ? 1.2 : 1,1); dummy.updateMatrix(); heads.setMatrixAt(count,dummy.matrix);
        dummy.position.set(s.x,s.y+.83,s.z); dummy.scale.set(style==="broad"?.61:.46,style==="tall"?.64:.5,.32); dummy.updateMatrix(); bodies.setMatrixAt(count,dummy.matrix); bodies.setColorAt(count,color.set(p.shirtColor ?? "#879fbb"));
        dummy.position.set(s.x,s.y+1.42,s.z); dummy.scale.set(.4,style==="cap"?.16:.07,.38); dummy.updateMatrix(); hats.setMatrixAt(count,dummy.matrix); count++;
      }
      [heads,bodies,hats].forEach(m=>{m.count=count; m.instanceMatrix.needsUpdate=true; m.computeBoundingSphere();});
      [...chairs,bodies].forEach(m=>{if(m.instanceColor)m.instanceColor.needsUpdate=true;});
      renderer.render(scene,camera); projectScreen(w,h);
    };
    refresh.current=render;
    const ray=new THREE.Raycaster(), mouse=new THREE.Vector2();
    const click=(e: MouseEvent)=>{ const b=renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1); ray.setFromCamera(mouse,camera); const hit=ray.intersectObjects(chairs)[0]; if(hit?.instanceId!=null)latest.current.onSeat(hit.instanceId); };
    const lost=(e:Event)=>{e.preventDefault(); latest.current.onFail();};
    renderer.domElement.addEventListener("click",click); renderer.domElement.addEventListener("webglcontextlost",lost);
    const observer=new ResizeObserver(render); observer.observe(el);
    render();
    return ()=>{ refresh.current=null; observer.disconnect(); renderer.domElement.removeEventListener("click",click); renderer.domElement.removeEventListener("webglcontextlost",lost); [...chairs,heads,bodies,hats].forEach(m=>m.dispose()); geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); const target=latest.current.screen.current; if(target)target.style.removeProperty("transform"); };
  },[props.quality]);
  useEffect(()=>{refresh.current?.();},[props.people,props.myId,props.view]);
  return <div className="three-theater" ref={mount} aria-label="Rạp 3D 100 ghế; dùng sơ đồ ghế để thao tác bàn phím" />;
}
