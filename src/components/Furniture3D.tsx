import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { materialFor } from '../lib/catalog';
import { backLook, decorLook, type DecorLook } from '../lib/decor';
import { tr } from '../lib/i18n';
import { buildScene, sceneBounds, type SceneBox, type SceneFinish } from '../lib/scene';
import type { ShelfUnit, ShelfUnitResult } from '../lib/types';
import { Segmented } from './ui';

type DoorMode = 'cerradas' | 'abiertas' | 'sin';

interface Props {
  unit: ShelfUnit;
  result: ShelfUnitResult;
}

/** Generador pseudoaleatorio con semilla: la veta sale igual cada vez. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

/** Textura de veta de madera dibujada en un canvas (vertical u horizontal). */
function woodTexture(hex: string, vertical: boolean, seed: number): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = rng(seed);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  // Vetas: líneas onduladas más claras y más oscuras.
  for (let i = 0; i < 70; i++) {
    const x0 = rand() * size;
    const amp = 2 + rand() * 9;
    const freq = 0.004 + rand() * 0.012;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = shade(hex, (rand() - 0.6) * 0.16);
    ctx.globalAlpha = 0.25 + rand() * 0.45;
    ctx.lineWidth = 0.6 + rand() * 2.4;
    ctx.beginPath();
    for (let y = 0; y <= size; y += 8) {
      const x = x0 + Math.sin(y * freq + phase) * amp;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (!vertical) {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
  }
  return tex;
}

/** Textura de aglomerado: puntitos de viruta. */
function speckleTexture(hex: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = rng(7);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = shade(hex, (rand() - 0.5) * 0.25);
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Looks {
  exterior: DecorLook;
  interior: DecorLook;
  fondo: DecorLook;
}

function cssColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function Furniture3D({ unit, result }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    movers: { obj: THREE.Object3D; box: SceneBox; base: THREE.Vector3 }[];
    render: () => void;
  } | null>(null);
  const [doorMode, setDoorMode] = useState<DoorMode>('cerradas');
  const [failed, setFailed] = useState(false);
  const progress = useRef(0);
  /** Ya se encuadró la cámara: los cambios del mueble no la mueven. */
  const framed = useRef(false);

  const boxes = useMemo(() => buildScene(unit, result), [unit, result]);
  const m = unit.material;
  const looks: Looks = useMemo(() => {
    const ext = materialFor(m, 'exterior');
    const int = materialFor(m, 'interior');
    return {
      exterior: decorLook(ext.brand, ext.color, ext.boardType, ext.hasGrain),
      interior: decorLook(int.brand, int.color, int.boardType, int.hasGrain),
      fondo: backLook(m.backType),
    };
  }, [m]);
  const rawType = { exterior: materialFor(m, 'exterior').boardType, interior: materialFor(m, 'interior').boardType };

  // --- Inicializa three.js una sola vez ---
  useEffect(() => {
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Luz ambiente de una habitación: da reflejos a los cromados y suaviza las sombras.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(32, 1, 10, 60000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a4, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    scene.add(fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: 0xd9d6d0, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40000, 20000), new THREE.MeshStandardMaterial({ color: 0xeceae6, roughness: 1 }));
    wall.position.set(0, 10000, -4);
    wall.receiveShadow = true;
    wall.name = 'wall';
    scene.add(wall);

    const group = new THREE.Group();
    scene.add(group);

    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    };
    controls.addEventListener('change', render);

    const resize = () => {
      const w = mount.clientWidth;
      const h = Math.max(320, Math.min(window.innerHeight * 0.7, w * 0.9));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    stateRef.current = { renderer, scene, camera, controls, group, movers: [], render };
    resize();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const mat = o.material as THREE.Material | THREE.Material[];
          (Array.isArray(mat) ? mat : [mat]).forEach((mm) => mm.dispose());
        }
      });
      mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // --- Arma el mueble cada vez que cambia ---
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { group, scene, camera, controls } = st;
    // Limpia lo anterior.
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        const mat = o.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((mm) => {
          const map = (mm as THREE.MeshStandardMaterial).map;
          if (map) map.dispose();
          mm.dispose();
        });
      }
    });
    group.clear();
    st.movers = [];

    const dark = getComputedStyle(document.documentElement).colorScheme.includes('dark');
    scene.background = new THREE.Color(cssColor('--surface', dark ? '#161e1b' : '#fbfcfb'));
    (scene.getObjectByName('floor') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.set(dark ? 0x2a2f2c : 0xd9d6d0);
    (scene.getObjectByName('wall') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.set(dark ? 0x323835 : 0xeceae6);

    // Materiales por terminación y sentido de veta.
    const cache = new Map<string, THREE.Material>();
    const materialOf = (finish: SceneFinish, vertical: boolean): THREE.Material => {
      const key = `${finish}-${vertical ? 'v' : 'h'}`;
      const hit = cache.get(key);
      if (hit) return hit;
      let mat: THREE.Material;
      if (finish === 'metal') {
        mat = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: 0.9, roughness: 0.22 });
      } else {
        const look = finish === 'fondo' ? looks.fondo : looks[finish];
        const type = finish === 'fondo' ? null : rawType[finish];
        const map = type === 'aglomerado' ? speckleTexture(look.hex) : look.wood ? woodTexture(look.hex, vertical, finish === 'exterior' ? 11 : 23) : null;
        mat = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : look.hex, map, roughness: 0.62, metalness: 0 });
      }
      cache.set(key, mat);
      return mat;
    };
    const edgeMat = new THREE.LineBasicMaterial({ color: dark ? 0x0b0f0d : 0x3a3530, transparent: true, opacity: dark ? 0.55 : 0.28 });

    for (const b of boxes) {
      const vertical = b.h >= Math.max(b.w, b.d);
      let geom: THREE.BufferGeometry;
      if (b.shape === 'cylinder') {
        geom = new THREE.CylinderGeometry(b.h / 2, b.h / 2, b.w, 20);
        geom.rotateZ(Math.PI / 2);
      } else {
        geom = new THREE.BoxGeometry(b.w, b.h, b.d);
      }
      const mesh = new THREE.Mesh(geom, materialOf(b.finish, vertical));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (b.shape !== 'cylinder') mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 25), edgeMat));
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const cz = b.z + b.d / 2;
      if (b.tilt) mesh.rotation.x = b.tilt;
      let obj: THREE.Object3D = mesh;
      if (b.hinge && b.pivotX !== undefined && b.pivotZ !== undefined) {
        // La puerta cuelga de un pivote en su eje de bisagras.
        const pivot = new THREE.Object3D();
        pivot.position.set(b.pivotX, 0, b.pivotZ);
        mesh.position.set(cx - b.pivotX, cy, cz - b.pivotZ);
        pivot.add(mesh);
        obj = pivot;
      } else {
        mesh.position.set(cx, cy, cz);
      }
      obj.userData.door = /^Puerta|^Tirador/.test(b.name) && !b.pullZ;
      group.add(obj);
      if (b.hinge || b.slideX || b.pullZ) st.movers.push({ obj, box: b, base: obj.position.clone() });
    }

    // Encuadre: vista de tres cuartos.
    const bounds = sceneBounds(boxes);
    const center = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, (bounds.min.z + bounds.max.z) / 2);
    const size = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
    // El mueble se dibuja centrado en x para que gire sobre sí mismo.
    group.position.set(-center.x, 0, -center.z);
    // La pared queda justo detrás del mueble (z = 0 de la escena es la cara de atrás).
    (scene.getObjectByName('wall') as THREE.Mesh).position.z = -center.z - 4;
    const target = new THREE.Vector3(0, center.y, 0);
    const dist = (size / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.35;
    if (!framed.current) {
      camera.position.copy(target).add(new THREE.Vector3(0.5, 0.12, 1).normalize().multiplyScalar(dist));
      controls.target.copy(target);
      framed.current = true;
    }
    controls.minDistance = size * 0.4;
    controls.maxDistance = size * 5;
    const sun = scene.children.find((o) => o instanceof THREE.DirectionalLight && o.castShadow) as THREE.DirectionalLight;
    sun.position.set(-size * 0.8, size * 1.6, size * 1.4);
    sun.target.position.set(0, center.y * 0.5, 0);
    const sc = sun.shadow.camera;
    sc.left = -size;
    sc.right = size;
    sc.top = size;
    sc.bottom = -size;
    sc.near = 10;
    sc.far = size * 5;
    sc.updateProjectionMatrix();
    const fill = scene.children.find((o) => o instanceof THREE.DirectionalLight && !o.castShadow) as THREE.DirectionalLight;
    fill.position.set(size * 1.2, size * 0.6, size);
    st.render();
  }, [boxes, looks]);

  // --- Puertas: animación entre cerradas y abiertas ---
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const goal = doorMode === 'abiertas' ? 1 : 0;
    const apply = (p: number) => {
      for (const { obj, box, base } of st.movers) {
        if (box.hinge) obj.rotation.y = (box.hinge === 'izquierda' ? -1 : 1) * p * THREE.MathUtils.degToRad(100);
        if (box.slideX) obj.position.x = base.x + p * box.slideX;
        if (box.pullZ) obj.position.z = base.z + p * box.pullZ;
      }
      st.group.children.forEach((o) => {
        if (o.userData.door) o.visible = doorMode !== 'sin';
      });
      st.render();
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      progress.current = goal;
      apply(goal);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = progress.current;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 450);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      progress.current = from + (goal - from) * eased;
      apply(progress.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [doorMode, boxes]);

  const hasDoors = result.doors.doors.length > 0 || result.drawers.length > 0;

  return (
    <div className="card">
      <div className="card-title">
        <h3>{tr('Vista 3D', '3D view')}</h3>
        <p>{tr('Arrastra para girar; pellizca o usa la rueda para acercar.', 'Drag to rotate; pinch or use the wheel to zoom.')}</p>
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 10, alignItems: 'center' }}>
        {hasDoors && (
          <div style={{ minWidth: 260 }}>
            <Segmented
              value={doorMode}
              onChange={setDoorMode}
              options={[
                { value: 'cerradas', label: tr('Cerrado', 'Closed') },
                { value: 'abiertas', label: tr('Abierto', 'Open') },
                { value: 'sin', label: tr('Sin puertas', 'No doors') },
              ]}
            />
          </div>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            const st = stateRef.current;
            if (!st) return;
            // Vuelve a encuadrar con la vista inicial.
            const bounds = sceneBounds(boxes);
            const size = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
            const target = new THREE.Vector3(0, (bounds.min.y + bounds.max.y) / 2, 0);
            const dist = (size / 2 / Math.tan(THREE.MathUtils.degToRad(st.camera.fov / 2))) * 1.35;
            st.camera.position.copy(target).add(new THREE.Vector3(0.5, 0.12, 1).normalize().multiplyScalar(dist));
            st.controls.target.copy(target);
            framed.current = true;
            st.render();
          }}
        >
          {tr('Centrar', 'Recenter')}
        </button>
        {!__SINGLE_FILE__ && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const st = stateRef.current;
              if (!st) return;
              st.renderer.render(st.scene, st.camera);
              st.renderer.domElement.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${unit.name || 'mueble'}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }, 'image/png');
            }}
          >
            {tr('Guardar imagen', 'Save image')}
          </button>
        )}
      </div>
      {failed ? (
        <p className="empty-note">{tr('Este navegador no puede mostrar 3D (WebGL desactivado).', 'This browser cannot show 3D (WebGL is disabled).')}</p>
      ) : (
        <div ref={mountRef} className="viewer3d" role="img" aria-label={tr(`Vista 3D de ${unit.name}`, `3D view of ${unit.name}`)} />
      )}
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: looks.exterior.hex }} /> Exterior: {materialFor(m, 'exterior').color || tr('sin color', 'no color')}
        </span>
        {m.interior.enabled && (
          <span>
            <i className="swatch" style={{ background: looks.interior.hex }} /> Interior: {m.interior.color}
          </span>
        )}
        <span className="muted">{tr('Colores aproximados: el tablero real puede verse distinto.', 'Approximate colors: the real board may look different.')}</span>
      </div>
    </div>
  );
}
