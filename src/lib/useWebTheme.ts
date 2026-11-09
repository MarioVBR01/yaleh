/**
 * @file useWebTheme.ts
 * @description Web: modo claro u oscuro. Se guarda en este navegador; sin preferencia guardada, sigue al
 * sistema. El escritorio usa su propia configuración (Modo nocturno).
 */

import { useCallback, useState } from 'react';

export const WEB_THEME_KEY = 'yaleh-web-theme';
export type WebTheme = 'light' | 'dark';

function storedTheme(): WebTheme | null {
  try {
    const value = localStorage.getItem(WEB_THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** La preferencia guardada o, si no hay, la del sistema. */
export function preferredWebTheme(): WebTheme {
  return storedTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyWebTheme(theme: WebTheme): void {
  document.documentElement.dataset.theme = theme;
}

/** El tema que tiene la página ahora. */
function currentWebTheme(): WebTheme {
  const applied = document.documentElement.dataset.theme;
  return applied === 'light' || applied === 'dark' ? applied : preferredWebTheme();
}

export function useWebTheme(): { theme: WebTheme; toggle: () => void } {
  const [theme, setTheme] = useState<WebTheme>(currentWebTheme);

  const toggle = useCallback(() => {
    const next: WebTheme = currentWebTheme() === 'dark' ? 'light' : 'dark';
    applyWebTheme(next);
    setTheme(next);
    try {
      localStorage.setItem(WEB_THEME_KEY, next);
    } catch {
      // Sin almacenamiento (ventana privada): el tema dura lo que la pantalla.
    }
  }, []);

  return { theme, toggle };
}
