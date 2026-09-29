/**
 * @file window.ts
 * @description Bloqueo y liberación de la ventana principal durante la sesión.
 */

import { globalShortcut, type BrowserWindow } from 'electron';
import { BLOCKED_ACCELERATORS } from './shortcuts';

/** Pantalla completa en modo kiosko, sin menú y siempre al frente (nivel screen-saver). */
export function lockWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.removeMenu();
  win.setMinimizable(false);
  win.setClosable(false);
  win.setKiosk(true);
  win.setFullScreen(true);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.show();
  win.moveTop();
  win.focus();

  for (const accelerator of BLOCKED_ACCELERATORS) {
    if (globalShortcut.isRegistered(accelerator)) continue;
    if (!globalShortcut.register(accelerator, () => {})) {
      console.warn(`[kiosk] Windows no permitió registrar ${accelerator}`);
    }
  }
}

export function unlockWindow(win: BrowserWindow): void {
  for (const accelerator of BLOCKED_ACCELERATORS) {
    globalShortcut.unregister(accelerator);
  }
  if (win.isDestroyed()) return;
  win.setAlwaysOnTop(false);
  win.setVisibleOnAllWorkspaces(false);
  win.setKiosk(false);
  win.setFullScreen(false);
  win.setClosable(true);
  win.setMinimizable(true);
}

/** Recupera el foco y el primer plano (tras una pérdida de foco durante la sesión). */
export function reclaimFocus(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (!win.isFullScreen()) win.setFullScreen(true);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.show();
  win.moveTop();
  win.focus();
}
