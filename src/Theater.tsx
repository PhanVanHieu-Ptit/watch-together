import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Person } from "./types";
export function Theater({
  people,
  myId,
  onSeat,
  onFail,
}: {
  people: Person[];
  myId: string;
  onSeat: (n: number) => void;
  onFail: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null),
    cb = useRef(onSeat);
  cb.current = onSeat;
  const occupancy = people.map((p) => p.id + ":" + p.seat).join("|");
  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
    camera.position.set(0, 12.4, 18.5);
    camera.lookAt(0, 0, -1);
    scene.add(new THREE.AmbientLight(0xc4a5dc, 2));
    const light = new THREE.PointLight(0xab8aff, 100, 35);
    light.position.set(0, 8, -6);
    scene.add(light);
    const meshes: THREE.Mesh[] = [],
      geos: THREE.BufferGeometry[] = [],
      mats: THREE.Material[] = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const i = r * 10 + c,
          p = people.find((p) => p.seat === i),
          mine = p?.id === myId;
        const mat = new THREE.MeshStandardMaterial({
          color: mine ? 0xc8aaff : p ? 0x8c66b8 : 0x6c2d49,
          roughness: 0.75,
          emissive: mine ? 0x583b8a : 0x100510,
        });
        mats.push(mat);
        const group = new THREE.Group();
        group.position.set(
          (c - 4.5) * 1.06 + (c < 5 ? -0.45 : 0.45),
          r * 0.1,
          (r - 4.5) * 1.05,
        );
        const add = (
          w: number,
          h: number,
          d: number,
          x: number,
          y: number,
          z: number,
        ) => {
          const g = new THREE.BoxGeometry(w, h, d);
          geos.push(g);
          const m = new THREE.Mesh(g, mat);
          m.position.set(x, y, z);
          m.userData.seat = i;
          group.add(m);
          meshes.push(m);
        };
        add(0.78, 0.88, 0.24, 0, 0.45, 0.22);
        add(0.78, 0.19, 0.72, 0, 0.08, 0);
        add(0.12, 0.32, 0.72, -0.43, 0.23, 0);
        add(0.12, 0.32, 0.72, 0.43, 0.23, 0);
        if (p) {
          const g = new THREE.SphereGeometry(0.24, 12, 12),
            m = new THREE.MeshStandardMaterial({
              color: mine ? 0xe8d8ff : 0xc7a6bd,
            });
          geos.push(g);
          mats.push(m);
          const head = new THREE.Mesh(g, m);
          head.position.set(0, 1.08, 0.06);
          group.add(head);
        }
        scene.add(group);
      }
    const ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2();
    const click = (e: MouseEvent) => {
      const b = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(meshes)[0];
      if (hit) cb.current(hit.object.userData.seat);
    };
    renderer.domElement.addEventListener("click", click);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.fov = THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(THREE.MathUtils.degToRad(11)) *
              Math.max(1, 2.4 / camera.aspect),
          ),
      );
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.domElement.remove();
    };
  }, [occupancy, myId, onFail]);
  return (
    <div className="three-theater" ref={mount} aria-label="Rạp 3D 100 ghế" />
  );
}
