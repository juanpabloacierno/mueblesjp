import { useEffect, useMemo, useState } from 'react';
import type { AssemblyPlan } from '../lib/assembly';
import type { Piece, ShelfUnit } from '../lib/types';
import { HardwareChip, PieceCard } from './ManualParts';
import { CopyButton } from './ui';

interface Props {
  unit: ShelfUnit;
  plan: AssemblyPlan;
  pieces: Piece[];
  setDone: (key: string, done: boolean) => void;
  reset: () => void;
  notify: (msg: string) => void;
}

function manualText(unit: ShelfUnit, plan: AssemblyPlan): string {
  const lines = [`*Armado: ${unit.name}*`];
  if (plan.prep.length) {
    lines.push('', '_Antes de armar_');
    plan.prep.forEach((s) => lines.push(`• *${s.title}*: ${s.detail}`));
  }
  plan.steps.forEach((s, i) => {
    lines.push('', `*${i + 1}. ${s.title}*`);
    const need = [...s.pieces.map((p) => `${p.code} ×${p.qty}`), ...s.hardware.map((h) => `${h.label} ×${h.qty}`)];
    if (need.length) lines.push(`Necesitás: ${need.join(', ')}`);
    if (s.detail) lines.push(s.detail);
  });
  return lines.join('\n');
}

/** Clave de lo que cambia el dibujo: si solo se tilda un paso, no se vuelve a dibujar. */
function drawingKey(plan: AssemblyPlan, pieces: Piece[]): string {
  return JSON.stringify([plan.scene, plan.steps.map((s) => [s.add, s.explode, s.view]), pieces.map((p) => [p.code, p.name, p.length, p.width])]);
}

export function StepsPanel({ unit, plan, pieces, setDone, reset, notify }: Props) {
  const [images, setImages] = useState<(string | undefined)[]>([]);
  const [failed, setFailed] = useState(false);
  const key = useMemo(() => drawingKey(plan, pieces), [plan, pieces]);

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setFailed(false);
    // El dibujante usa three.js: se carga aparte, recién cuando se abre esta pestaña.
    import('./assemblyRender')
      .then(({ renderAssembly }) =>
        renderAssembly(
          plan,
          pieces,
          (i, url) => {
            if (!cancelled) setImages((prev) => Object.assign([...prev], { [i]: url }));
          },
          () => cancelled,
        ),
      )
      .then((ok) => {
        if (!cancelled && ok === false) setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // Solo se vuelve a dibujar si cambia la geometría (no al tildar un paso).
  }, [key]);

  if (plan.steps.length === 0) return <p className="empty-note">Corregí los errores de arriba para ver las instrucciones de armado.</p>;

  const all = [...plan.prep.map((s) => s.key), ...plan.steps.map((s) => s.key)];
  const done = all.filter((k) => unit.progress[k]).length;
  const groups: { title: string; list: Piece[] }[] = unit.material.interior.enabled
    ? [
        { title: 'Melamina exterior', list: pieces.filter((p) => p.material === 'melamina' && p.finish !== 'interior') },
        { title: 'Melamina interior', list: pieces.filter((p) => p.finish === 'interior') },
        { title: 'Fondo', list: pieces.filter((p) => p.material === 'fondo') },
      ]
    : [
        { title: 'Melamina', list: pieces.filter((p) => p.material === 'melamina') },
        { title: 'Fondo', list: pieces.filter((p) => p.material === 'fondo') },
      ];

  return (
    <div className="panel-body manual">
      <div className="card">
        <div className="card-title">
          <h3>Instrucciones de armado</h3>
          <p>
            {done} de {all.length} pasos hechos
          </p>
        </div>
        <div className="progress-bar" aria-hidden="true" style={{ marginBottom: 12 }}>
          <span style={{ width: `${(done / all.length) * 100}%` }} />
        </div>
        <div className="toolbar no-print">
          <CopyButton className="btn btn-sm" label="Copiar instrucciones" text={() => manualText(unit, plan)} onCopied={notify} />
          {done > 0 && (
            <button type="button" className="btn btn-sm" onClick={reset}>
              Empezar de nuevo
            </button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="card-title">
          <h3>Piezas</h3>
          <p>Las letras son las mismas del despiece. En naranja, los cantos con tapacanto.</p>
        </div>
        {groups
          .filter((g) => g.list.length)
          .map((g) => (
            <div key={g.title} className="piece-group">
              {groups.filter((x) => x.list.length).length > 1 && <h4 className="piece-group-title">{g.title}</h4>}
              <div className="piece-grid">
                {g.list.map((p) => (
                  <PieceCard key={p.code} piece={p} />
                ))}
              </div>
            </div>
          ))}
        {plan.hardware.length > 0 && (
          <>
            <h4 className="piece-group-title">Herrajes</h4>
            <div className="hw-grid">
              {plan.hardware.map((h) => (
                <HardwareChip key={h.label} h={h} />
              ))}
            </div>
          </>
        )}
      </section>

      {plan.prep.length > 0 && (
        <section className="card">
          <div className="card-title">
            <h3>Antes de armar</h3>
          </div>
          <ul className="prep-list">
            {plan.prep.map((s) => (
              <li key={s.key} className={unit.progress[s.key] ? 'done' : ''}>
                <label className="step-check" htmlFor={`step-${s.key}`}>
                  <input id={`step-${s.key}`} type="checkbox" checked={!!unit.progress[s.key]} onChange={(e) => setDone(s.key, e.target.checked)} />
                </label>
                <div>
                  <h4>{s.title}</h4>
                  <p>{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="manual-steps">
        {plan.steps.map((s, i) => {
          const isDone = !!unit.progress[s.key];
          const img = images[i];
          return (
            <li key={s.key} className={`manual-step card ${isDone ? 'done' : ''}`}>
              <div className="manual-step-head">
                <span className="manual-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h4>{s.title}</h4>
                <label className="step-check no-print" htmlFor={`step-${s.key}`}>
                  <input id={`step-${s.key}`} type="checkbox" checked={isDone} onChange={(e) => setDone(s.key, e.target.checked)} />
                  Hecho
                </label>
              </div>
              <div className="manual-figure">
                {img ? (
                  <img src={img} alt={`Paso ${i + 1}: ${s.title}`} width={960} height={720} />
                ) : (
                  <div className="manual-placeholder">{failed ? 'Este navegador no puede dibujar los pasos (WebGL desactivado).' : 'Dibujando…'}</div>
                )}
              </div>
              {(s.pieces.length > 0 || s.hardware.length > 0) && (
                <div className="manual-need">
                  {s.pieces.map((p) => (
                    <span key={p.code} className="need-piece" title={p.name}>
                      <span className="code">{p.code}</span>
                      <span className="num">{p.qty}×</span>
                      <span className="need-name">{p.name}</span>
                    </span>
                  ))}
                  {s.hardware.map((h) => (
                    <HardwareChip key={h.label} h={h} />
                  ))}
                </div>
              )}
              {s.detail && <p className="manual-text">{s.detail}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
