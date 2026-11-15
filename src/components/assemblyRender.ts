import * as THREE from 'three';
import { codeForBox, type AssemblyPlan, type AssemblyStep } from '../lib/assembly';
import type { SceneBox } from '../lib/scene';
import type { Piece } from '../lib/types';

/**
 * Dibuja cada paso del armado como en un manual: líneas negras sobre blanco, las piezas
 * nuevas resaltadas y separadas, con flechas hacia su lugar y la letra del despiece.
 */

const WIDTH = 960;
const HEIGHT = 720;
const NEW_FILL = 0xd5e8e0;
const NEW_EDGE = 0x1e6b57;
const OLD_EDGE = 0x262626;
const ARROW = 0xd9731a;

function meshFor(b: SceneBox, offset: THREE.Vector3, isNew: boolean): THREE.Object3D {
  const metal = b.finish === 'metal';
  let geom: THREE.BufferGeometry;
  if (b.shape === 'cylinder') {
    geom = new THREE.CylinderGeometry(b.h / 2, b.h / 2, b.w, 16);
    geom.rotateZ(Math.PI / 2);
  } else {
    geom = new THREE.BoxGeometry(b.w, b.h, b.d);
  }
  const fill = metal ? 0xdadde1 : isNew ? NEW_FILL : 0xffffff;
  const mat = new THREE.MeshLambertMaterial({ color: fill, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const mesh = new THREE.Mesh(geom, mat);
  if (!metal || b.shape !== 'cylinder') {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), new THREE.LineBasicMaterial({ color: isNew ? NEW_EDGE : OLD_EDGE }));
    mesh.add(edges);
  }
  mesh.position.set(b.x + b.w / 2 + offset.x, b.y + b.h / 2 + offset.y, b.z + b.d / 2 + offset.z);
  if (b.tilt) mesh.rotation.x = b.tilt;
  return mesh;
}

function arrow(from: THREE.Vector3, to: THREE.Vector3, size: number): THREE.Object3D {
  const g = new THREE.Group();
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1) return g;
  const mat = new THREE.MeshBasicMaterial({ color: ARROW, depthTest: false });
  const head = Math.min(size * 0.05, len * 0.4);
  const r = size * 0.007;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - head, 10), mat);
  shaft.position.y = (len - head) / 2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 3.2, head, 16), mat);
  cone.position.y = len - head / 2;
  g.add(shaft, cone);
  g.position.copy(from);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.renderOrder = 999;
  g.traverse((o) => (o.renderOrder = 999));
  return g;
}

/** Elige como mucho `n` elementos repartidos (para no llenar el dibujo de flechas). */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]);
}

function disposeAll(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
  });
}

function drawStep(
  renderer: THREE.WebGLRenderer,
  plan: AssemblyPlan,
  index: number,
  pieces: Piece[],
): string {
  const step: AssemblyStep = plan.steps[index];
  const before = new Set(plan.steps.slice(0, index).flatMap((s) => s.add));
  // En los pasos sin piezas nuevas (parar, fijar, terminar) se ve el mueble hasta ahí.
  const doneSoFar = step.add.length ? before : new Set(plan.steps.slice(0, index + 1).flatMap((s) => s.add));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-1, 2, step.view === 'atras' ? -1.5 : 1.5);
  scene.add(sun);

  const content = new THREE.Group();
  const offset = new THREE.Vector3(step.explode.x, step.explode.y, step.explode.z);
  const zero = new THREE.Vector3();
  for (const i of doneSoFar) content.add(meshFor(plan.scene[i], zero, false));
  const fixed = new Set(step.fixed ?? []);
  for (const i of step.add) content.add(meshFor(plan.scene[i], fixed.has(i) ? zero : offset, true));
  scene.add(content);

  // Cámara isométrica desde adelante (o desde atrás para el fondo), encuadrada.
  const box = new THREE.Box3().setFromObject(content);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  // Vista de tres cuartos; desde atrás, más de costado para que se vea el fondo separado.
  const dir = (step.view === 'atras' ? new THREE.Vector3(1.7, 0.75, -1.0) : new THREE.Vector3(1.25, 0.75, 1.5)).normalize();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, size * 10);
  camera.position.copy(center).add(dir.multiplyScalar(size * 3));
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const inv = camera.matrixWorldInverse;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    const p = c.clone().applyMatrix4(inv);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const aspect = WIDTH / HEIGHT;
  let w = (maxX - minX) * 1.12;
  let h = (maxY - minY) * 1.12;
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  camera.left = cx - w / 2;
  camera.right = cx + w / 2;
  camera.top = cy + h / 2;
  camera.bottom = cy - h / 2;
  camera.updateProjectionMatrix();

  // Flechas desde la pieza separada hasta su lugar.
  const movable = step.add.filter((i) => !fixed.has(i));
  const movers = movable.filter((i) => plan.scene[i].finish !== 'metal' || movable.every((j) => plan.scene[j].finish === 'metal'));
  if (offset.length() > 0) {
    for (const i of spread(movers, 5)) {
      const b = plan.scene[i];
      const c = new THREE.Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2);
      const from = c.clone().add(offset.clone().multiplyScalar(0.92));
      const to = c.clone().add(offset.clone().multiplyScalar(0.12));
      scene.add(arrow(from, to, size));
    }
  }

  renderer.render(scene, camera);

  // Letras del despiece sobre las piezas nuevas (una por letra).
  const out = document.createElement('canvas');
  out.width = WIDTH;
  out.height = HEIGHT;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(renderer.domElement, 0, 0, WIDTH, HEIGHT);
  const seen = new Set<string>();
  const placed: [number, number][] = [];
  for (const i of step.add) {
    const b = plan.scene[i];
    if (b.finish === 'metal') continue;
    const piece = codeForBox(b, pieces);
    if (!piece || seen.has(piece.code)) continue;
    seen.add(piece.code);
    const p = new THREE.Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2).add(fixed.has(i) ? zero : offset).project(camera);
    let x = ((p.x + 1) / 2) * WIDTH;
    const y = ((1 - p.y) / 2) * HEIGHT;
    // Si choca con otra letra, la corre a la derecha.
    while (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 42)) x += 44;
    placed.push([x, y]);
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e6b57';
    ctx.stroke();
    ctx.fillStyle = '#1e6b57';
    ctx.font = "700 22px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.code, x, y + 1);
  }

  disposeAll(scene);
  return out.toDataURL('image/png');
}

/** Genera las imágenes de todos los pasos, de a una por cuadro para no trabar la página. */
export async function renderAssembly(plan: AssemblyPlan, pieces: Piece[], onImage: (index: number, url: string) => void, isCancelled: () => boolean) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, canvas: document.createElement('canvas') });
  } catch {
    return false;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  try {
    for (let i = 0; i < plan.steps.length; i++) {
      if (isCancelled()) break;
      onImage(i, drawStep(renderer, plan, i, pieces));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return true;
}
