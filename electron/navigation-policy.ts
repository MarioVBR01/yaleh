/**
 * @file navigation-policy.ts
 * @description Qué páginas y marcos pueden cargarse en la app de escritorio.
 */

import { isUrlAllowed } from '../shared/allowlist';

export interface NavigationContext {
  /** Devuelve true si la URL es la interfaz propia (index.html o servidor de Vite). */
  isAppUrl: (url: string) => boolean;
  allowDevServer: boolean;
}

/** Páginas y marcos (mainFrame / subFrame) que se permiten cargar. */
export function isFrameUrlAllowed(url: string, ctx: NavigationContext): boolean {
  if (ctx.isAppUrl(url)) return true;
  if (url === 'about:blank' || url.startsWith('devtools://')) return true;
  return isUrlAllowed(url, { allowDevServer: ctx.allowDevServer });
}

/**
 * Navegación de la ventana principal: solo puede mostrar la interfaz de YALEH.
 * Si navegara a un sitio permitido, el estudiante perdería la interfaz y el tiempo.
 */
export function isMainWindowNavigationAllowed(url: string, ctx: NavigationContext): boolean {
  return ctx.isAppUrl(url);
}
