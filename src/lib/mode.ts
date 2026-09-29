/**
 * @file mode.ts
 * @description Qué funciones muestra la interfaz según la plataforma
 * (web o escritorio) y el modo (online u offline). Brief, secciones 4 y 6.
 */

import { useApp } from '../context/AppContext';
import type { AppPhase, AppState } from '../store/appStore';
import { isElectron } from './electron';

export interface ModeFlags {
  /** true en la app de escritorio. */
  isDesktop: boolean;
  /** Herramientas online (Workspace, Classroom, Moodle, Canva, Gamma). */
  onlineTools: boolean;
  /** Asistente de IA (solo en línea en v1). */
  ai: boolean;
  /** Aviso de conexión perdida durante una sesión online. */
  offlineNotice: boolean;
}

/**
 * - Web: sin cambios en esta fase (todo visible).
 * - Escritorio: las funciones online solo aparecen en una sesión online con conexión.
 */
export function getModeFlags(state: AppState, isDesktop: boolean): ModeFlags {
  if (!isDesktop) {
    return { isDesktop, onlineTools: true, ai: true, offlineNotice: false };
  }
  const online = state.sessionMode === 'online' && state.connection === 'online';
  return {
    isDesktop,
    onlineTools: online,
    ai: online,
    offlineNotice: state.sessionMode === 'online' && state.connection === 'offline',
  };
}

export function useModeFlags(): ModeFlags {
  const { state } = useApp();
  return getModeFlags(state, isElectron());
}

/** Pantalla inicial: la web empieza en el login; el escritorio, en la pantalla de inicio según la conexión. */
export function startPhase(isDesktop: boolean): AppPhase {
  return isDesktop ? 'desktop-start' : 'login';
}
