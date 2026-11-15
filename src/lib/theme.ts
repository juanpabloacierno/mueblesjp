/** Modo claro u oscuro elegido por el usuario. Sin elección, la app sigue al sistema. */
export type Theme = 'light' | 'dark';

const THEME_KEY = 'mueblesjp:theme';

export function loadTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme | null): void {
  try {
    if (theme) localStorage.setItem(THEME_KEY, theme);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Modo privado: no se recuerda, pero funciona.
  }
}

/** Aplica el tema a la página: sin elección se borra el atributo y manda el sistema. */
export function applyTheme(theme: Theme | null): void {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
}
