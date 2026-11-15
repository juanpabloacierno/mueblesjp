/**
 * Idiomas de la app: español neutro (por defecto) e inglés.
 *
 * Cada texto visible se escribe en los dos idiomas, uno al lado del otro:
 *   tr('Agrega un estante', 'Add a shelf')
 *   tr(`Faltan ${n} mm`, `${n} mm short`)
 * El idioma se elige con setLang() antes de dibujar; los textos que se calculan fuera de React
 * (avisos, pasos, lista de compras) leen el idioma activo en el momento en que se calculan.
 *
 * Los nombres de piezas del despiece y de la escena 3D son identificadores internos en español
 * (la lógica los compara). Para mostrarlos se pasan por pieceName().
 */

export type Lang = 'es' | 'en';

export const LANGS: { key: Lang; label: string; name: string }[] = [
  { key: 'es', label: 'ES', name: 'Español' },
  { key: 'en', label: 'EN', name: 'English' },
];

const LANG_KEY = 'mueblesjp:lang';
let current: Lang = 'es';

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

/** Texto en el idioma activo. */
export function tr(es: string, en: string): string {
  return current === 'en' ? en : es;
}

/** Idioma guardado, o el del navegador la primera vez. */
export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // Sin almacenamiento: se usa el del navegador.
  }
  if (typeof navigator !== 'undefined' && navigator.language && !navigator.language.toLowerCase().startsWith('es')) return 'en';
  return 'es';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Modo privado: no se recuerda, pero funciona.
  }
}

/** Locale para Intl (números, fechas). */
export function locale(): string {
  return current === 'en' ? 'en-US' : 'es';
}

/**
 * Nombre visible de cada pieza (clave: nombre interno). Si el español visible es igual al
 * interno, va vacío.
 */
const PIECES: Record<string, [es: string, en: string]> = {
  Lateral: ['', 'Side panel'],
  Techo: ['', 'Top'],
  Piso: ['', 'Bottom'],
  Zócalo: ['', 'Plinth'],
  'Zócalo trasero': ['', 'Back plinth'],
  'Lateral interior': ['', 'Inner side panel'],
  Faldón: ['', 'Modesty panel'],
  Fondo: ['', 'Back panel'],
  'Fondo (parte)': ['', 'Back panel (part)'],
  Divisor: ['', 'Divider'],
  'Divisor de maletero': ['', 'Top storage divider'],
  'Estante maletero': ['', 'Top storage shelf'],
  'Estante fijo': ['', 'Fixed shelf'],
  'Estante móvil': ['', 'Adjustable shelf'],
  'Estante zapatero': ['Estante para zapatos', 'Shoe shelf'],
  'Estante zapatero inclinado': ['Estante inclinado para zapatos', 'Slanted shoe shelf'],
  'Tope de zapatero': ['Tope para zapatos', 'Shoe stop'],
  Barra: ['Barra para zapatos', 'Shoe bar'],
  Barral: ['Barra de colgar', 'Hanging rod'],
  Puerta: ['', 'Door'],
  'Puerta corrediza': ['', 'Sliding door'],
  'Puerta de maletero': ['', 'Top storage door'],
  'Puerta corrediza de maletero': ['', 'Top storage sliding door'],
  'Frente de cajón': ['', 'Drawer front'],
  'Lateral de cajón': ['', 'Drawer side'],
  'Frente y contrafrente de cajón': ['', 'Drawer box front and back'],
  'Fondo de cajón': ['', 'Drawer bottom'],
  Tirador: ['', 'Handle'],
};

/** Nombre de una pieza para mostrar, en el idioma activo. */
export function pieceName(name: string): string {
  const entry = PIECES[name];
  if (!entry) return name;
  return current === 'en' ? entry[1] : entry[0] || name;
}
