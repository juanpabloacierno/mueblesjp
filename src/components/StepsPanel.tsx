import type { Step } from '../lib/steps';
import type { ShelfUnit } from '../lib/types';
import { CopyButton } from './ui';

interface Props {
  unit: ShelfUnit;
  steps: Step[];
  setDone: (key: string, done: boolean) => void;
  reset: () => void;
  notify: (msg: string) => void;
}

function stepsText(unit: ShelfUnit, steps: Step[]): string {
  return [`*Armado: ${unit.name}*`, ...steps.map((s, i) => `\n${i + 1}. *${s.title}*\n${s.detail}`)].join('\n');
}

export function StepsPanel({ unit, steps, setDone, reset, notify }: Props) {
  if (steps.length === 0) return <p className="empty-note">Corregí los errores de arriba para ver los pasos de armado.</p>;
  const done = steps.filter((s) => unit.progress[s.key]).length;
  return (
    <div className="card">
      <div className="card-title">
        <h3>Pasos de armado</h3>
        <p>
          {done} de {steps.length} hechos
        </p>
      </div>
      <div className="progress-bar" aria-hidden="true" style={{ marginBottom: 12 }}>
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 6 }}>
        <CopyButton className="btn btn-sm" label="Copiar pasos" text={() => stepsText(unit, steps)} onCopied={notify} />
        {done > 0 && (
          <button type="button" className="btn btn-sm" onClick={reset}>
            Empezar de nuevo
          </button>
        )}
      </div>
      <ol className="steps">
        {steps.map((s) => {
          const isDone = !!unit.progress[s.key];
          return (
            <li key={s.key} className={`step ${isDone ? 'done' : ''}`}>
              <div>
                <h4>{s.title}</h4>
                <p>{s.detail}</p>
              </div>
              <label className="step-check no-print" htmlFor={`step-${s.key}`}>
                <input id={`step-${s.key}`} type="checkbox" checked={isDone} onChange={(e) => setDone(s.key, e.target.checked)} />
                Hecho
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
