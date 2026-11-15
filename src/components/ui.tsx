import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { getLang, tr } from '../lib/i18n';

function toText(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '';
  return getLang() === 'en' ? String(value) : String(value).replace('.', ',');
}

function parse(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  hint?: ReactNode;
  placeholder?: string;
  /** Permite dejar el campo vacío (valor automático). */
  allowEmpty?: boolean;
  min?: number;
  id?: string;
}

export function NumberField({ label, value, onChange, suffix = 'mm', hint, placeholder, allowEmpty, min = 0, id }: NumberFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(toText(value));
  const focused = useRef(false);

  // Si el valor cambia desde afuera (otro mueble, un preset), se refleja salvo mientras se escribe.
  useEffect(() => {
    if (!focused.current) setText(toText(value));
  }, [value]);

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="input-wrap">
        <input
          id={inputId}
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={(e) => {
            focused.current = true;
            e.target.select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(toText(value));
          }}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            const n = parse(v);
            if (n === null) {
              if (allowEmpty && v.trim() === '') onChange(null);
              return;
            }
            if (n >= min) onChange(n);
          }}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export function TextField({ label, value, onChange, id, placeholder }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} className="input" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  hint?: ReactNode;
}

export function Segmented<T extends string>({ label, value, options, onChange, hint }: SegmentedProps<T>) {
  const labelId = useId();
  return (
    <div className="field">
      {label && (
        <span className="field-label" id={labelId}>
          {label}
        </span>
      )}
      <div className="segmented" role="radiogroup" aria-labelledby={label ? labelId : undefined}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

interface SwitchProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function Switch({ label, checked, onChange, id }: SwitchProps) {
  const autoId = useId();
  return (
    <label className="switch" htmlFor={id ?? autoId}>
      <input id={id ?? autoId} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const labelId = useId();
  return (
    <div className="field">
      <span className="field-label" id={labelId}>
        {label}
      </span>
      <div className="stepper" role="group" aria-labelledby={labelId}>
        <button type="button" aria-label={tr(`Menos ${label.toLowerCase()}`, `Fewer ${label.toLowerCase()}`)} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={tr(`Más ${label.toLowerCase()}`, `More ${label.toLowerCase()}`)} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

/** Copia texto al portapapeles; si el navegador no deja, muestra el texto para copiarlo a mano. */
export function CopyButton({ text, label, onCopied, className = 'btn' }: { text: () => string; label: string; onCopied: (msg: string) => void; className?: string }) {
  const [fallback, setFallback] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (fallback !== null) areaRef.current?.select();
  }, [fallback]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          const value = text();
          try {
            navigator.clipboard
              .writeText(value)
              .then(() => onCopied(tr('Copiado al portapapeles', 'Copied to clipboard')))
              .catch(() => setFallback(value));
          } catch {
            setFallback(value);
          }
        }}
      >
        <CopyIcon />
        {label}
      </button>
      {fallback !== null && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={tr('Copiar texto', 'Copy text')} onClick={() => setFallback(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{tr('Copia el texto', 'Copy the text')}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {tr(
                'El navegador no permitió copiar automáticamente. Ya está seleccionado: usa Copiar del menú o Ctrl+C.',
                'The browser did not allow copying automatically. The text is already selected: use Copy from the menu or Ctrl+C.',
              )}
            </p>
            <textarea ref={areaRef} readOnly value={fallback} aria-label={tr('Texto para copiar', 'Text to copy')} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setFallback(null)}>
                {tr('Listo', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
      <path d="M10.5 5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5H5" />
    </svg>
  );
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mueble'
  );
}
