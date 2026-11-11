"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { catalog, type Kind } from "@/lib/domain";
export default function Furniture({
  kind = "sofa2",
  character = true,
  game = false,
  onClean,
}: {
  kind?: Kind;
  character?: boolean;
  game?: boolean;
  onClean?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onClean);
  callback.current = onClean;
  const [failed, setFailed] = useState(false);
  const [remaining, setRemaining] = useState(6);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);
    setRemaining(6);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(4.4, 3.3, 5.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.6;
    controls.enableDamping = true;
    controls.enabled = !game;
    scene.add(new THREE.HemisphereLight(0xfff8ef, 0xb4b4a4, 2.6));
    const light = new THREE.DirectionalLight(0xfff4e4, 4);
    light.position.set(3, 7, 4);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -5;
    light.shadow.camera.right = 5;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -5;
    light.shadow.bias = -0.001;
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-4, 2, -3);
    scene.add(fill);
    const group = new THREE.Group();
    scene.add(group);
    const color = catalog.find((c) => c.id === kind)?.color || "#dfad80";
    const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const wood = new THREE.MeshStandardMaterial({
      color: "#70513d",
      roughness: 0.8,
    });
    const white = new THREE.MeshStandardMaterial({
      color: "#f5eddf",
      roughness: 0.9,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#3d392e",
      roughness: 0.7,
    });
    const materials = [fabric, wood, white, dark];
    const geometries: THREE.BufferGeometry[] = [];
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat = fabric,
      r = 0.1,
    ) {
      const geo = new RoundedBoxGeometry(
        w,
        h,
        d,
        3,
        Math.min(r, w / 3, h / 3, d / 3),
      );
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    }
    const mattress = kind.startsWith("mattress");
    const chair = kind === "chair";
    const stool = kind === "stool";
    const width = chair
      ? 1.35
      : stool
        ? 0.8
        : kind === "sofa3"
          ? 3.6
          : mattress
            ? kind === "mattress1"
              ? 1.5
              : 2.5
            : 2.8;
    if (mattress) {
      box(width, 0.45, 3, 0, 0.45, 0, white, 0.16);
      box(width + 0.04, 0.06, 3.04, 0, 0.43, 0, white, 0.02);
      for (let x = -width / 2 + 0.2; x < width / 2; x += 0.35)
        for (let z = -1.25; z < 1.5; z += 0.35)
          box(0.045, 0.012, 0.045, x, 0.681, z, fabric, 0.01);
    } else if (kind === "other") {
      box(1.8, 0.7, 1.4, 0, 0.55, 0);
      box(1.8, 0.12, 1.4, 0, 0.96, 0, white);
    } else {
      box(width, 0.35, 1.25, 0, 0.48, 0);
      const seats = chair || stool ? 1 : kind === "sofa3" ? 3 : 2;
      const padding = stool ? 0.02 : 0.28;
      for (let i = 0; i < seats; i++) {
        const w = (width - padding * 2) / seats;
        box(
          w - 0.04,
          0.26,
          1.05,
          -width / 2 + padding + w * (i + 0.5),
          0.78,
          0.12,
        );
        box(
          w - 0.04,
          0.83,
          0.28,
          -width / 2 + padding + w * (i + 0.5),
          1.24,
          -0.5,
        );
      }
      if (!stool) {
        box(0.28, 0.68, 1.38, -width / 2 + 0.12, 0.91, 0);
        box(0.28, 0.68, 1.38, width / 2 - 0.12, 0.91, 0);
      }
      for (const x of [-width / 2 + 0.22, width / 2 - 0.22])
        for (const z of [-0.43, 0.43])
          box(0.12, 0.3, 0.12, x, 0.19, z, wood, 0.025);
      if (kind === "corner") {
        box(1.1, 0.35, 1.2, width / 2 - 0.65, 0.48, 1.08);
        box(1.04, 0.26, 1.2, width / 2 - 0.65, 0.78, 1.08);
      }
      if (!stool) {
        const pillow = box(
          0.55,
          0.55,
          0.2,
          -width / 2 + 0.64,
          1.12,
          -0.17,
          white,
          0.12,
        );
        pillow.rotation.z = 0.17;
        pillow.rotation.x = -0.17;
      }
    }
    if (character) {
      const y = mattress ? 0.45 : 0.48;
      for (const x of [-0.15, 0.15]) {
        const eye = box(0.045, 0.07, 0.025, x, y, 0.65, dark, 0.015);
        if (mattress) eye.position.z = 1.51;
      }
      const smile = box(
        0.1,
        0.025,
        0.025,
        0,
        y - 0.1,
        mattress ? 1.51 : 0.65,
        dark,
        0.01,
      );
    }
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    geometries.push(floorGeo);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    materials.push(floorMat as unknown as THREE.MeshStandardMaterial);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    floor.receiveShadow = true;
    scene.add(floor);
    const spots: THREE.Mesh[] = [];
    if (game) {
      const spotMaterial = new THREE.MeshStandardMaterial({
        color: "#766452",
        transparent: true,
        opacity: 0.7,
        roughness: 1,
      });
      materials.push(spotMaterial);
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.CircleGeometry(0.12 + (i % 2) * 0.03, 20);
        geometries.push(geo);
        const spot = new THREE.Mesh(geo, spotMaterial);
        spot.rotation.x = -Math.PI / 2;
        spot.position.set(
          -0.8 + (i % 3) * 0.65,
          mattress ? 0.686 : 0.914,
          -0.1 + Math.floor(i / 3) * 0.5,
        );
        group.add(spot);
        spots.push(spot);
      }
    }
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function clean(e: PointerEvent) {
      if (!game) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(spots.filter((s) => s.visible));
      if (hit.length) {
        hit[0].object.visible = false;
        const left = spots.filter((s) => s.visible).length;
        setRemaining(left);
        if (!left) callback.current?.();
      }
    }
    const pointerMove = (e: PointerEvent) => {
      if (e.buttons) clean(e);
    };
    renderer.domElement.addEventListener("pointerdown", clean);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.style.touchAction = "none";
    function resize() {
      if (!element) return;
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = element.clientWidth / Math.max(1, element.clientHeight);
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = performance.now();
    function animate(t: number) {
      frame = requestAnimationFrame(animate);
      controls.update();
      if (!reduced && !game)
        group.position.y = Math.sin((t - start) / 1800) * 0.018;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    const contextLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, character, game]);
  return (
    <div className="furniture-wrap">
      <div
        ref={host}
        className="furniture"
        aria-label={"3D-модель: " + catalog.find((c) => c.id === kind)?.name}
      />
      {failed ? (
        <div className="fallback">
          <span>🛋</span>
          <p>
            3D недоступно на этом устройстве.
            <br />
            Выбор мебели и оформление работают.
          </p>
        </div>
      ) : (
        <span className="model-hint">
          {game
            ? remaining
              ? "Проведите по пятнам · осталось " + remaining
              : "Теперь чисто!"
            : "↔ Потяните, чтобы рассмотреть"}
        </span>
      )}
    </div>
  );
}
