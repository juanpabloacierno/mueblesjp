import { describe, expect, it } from 'vitest';
import { PRESETS, createFromPreset } from './defaults';
import { buildScene, sceneBounds } from './scene';
import { computeShelfUnit } from './shelf';

function scene(key: string) {
  const unit = createFromPreset(PRESETS.find((p) => p.key === key)!);
  const r = computeShelfUnit(unit);
  return { unit, r, boxes: buildScene(unit, r) };
}

describe('escena 3D', () => {
  it('la biblioteca ocupa su ancho, alto y profundidad', () => {
    const { boxes } = scene('biblioteca');
    const b = sceneBounds(boxes);
    expect([b.min.x, b.min.y, b.min.z]).toEqual([0, 0, 0]);
    expect([b.max.x, b.max.y, b.max.z]).toEqual([800, 1800, 300]);
    expect(boxes.filter((x) => x.name === 'Estante móvil')).toHaveLength(4);
    // Estantes apoyados contra el fondo clavado (3 mm).
    expect(boxes.find((x) => x.name === 'Estante móvil')).toMatchObject({ z: 3, d: 297, w: 762, x: 19 });
  });

  it('las puertas superpuestas van delante del frente y giran sobre su lado', () => {
    const { boxes } = scene('biblioteca-puertas');
    const doors = boxes.filter((x) => x.name === 'Puerta');
    expect(doors.map((d) => [d.z, d.hinge, d.pivotX])).toEqual([
      [350, 'izquierda', 1.5],
      [350, 'derecha', 798.5],
    ]);
    // El tirador gira con su puerta.
    const handles = boxes.filter((x) => x.name === 'Tirador');
    expect(handles.map((h) => h.pivotX)).toEqual([1.5, 798.5]);
  });

  it('placard: colores por grupo, barrales, cajones, zapatero y corredizas', () => {
    const { unit, r } = scene('placard-corredizo');
    unit.material.interior = { ...unit.material.interior, enabled: true, color: 'Blanco', body: 'interior' };
    unit.material.color = 'Roble';
    const boxes = buildScene(unit, r);
    expect(boxes.find((b) => b.name === 'Lateral')?.finish).toBe('interior');
    expect(boxes.find((b) => b.name === 'Puerta corrediza')?.finish).toBe('exterior');
    expect(boxes.find((b) => b.name === 'Puerta corrediza de maletero')?.finish).toBe('exterior');
    expect(boxes.filter((b) => b.name === 'Barral' && b.shape === 'cylinder')).toHaveLength(2);
    expect(boxes.filter((b) => b.name === 'Frente de cajón')).toHaveLength(3);
    expect(boxes.filter((b) => b.name === 'Estante zapatero inclinado').every((b) => (b.tilt ?? 0) > 0)).toBe(true);
    const leaves = boxes.filter((b) => b.name.startsWith('Puerta corrediza'));
    expect(boxes.filter((b) => b.name === 'Puerta corrediza de maletero')).toHaveLength(2);
    expect(leaves).toHaveLength(4);
    // Las hojas de adelante se corren al abrir; las de atrás quedan.
    expect(leaves.map((l) => l.slideX)).toEqual([0, -(892 - 30), 0, -(892 - 30)]);
  });
});
