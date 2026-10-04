/**
 * @file mode.ts
 * @description Qué funciones muestra la interfaz según la plataforma
 * (web o escritorio) y el modo (online u offline). Brief, secciones 4 y 6.
 */

import { useMemo } from 'react';
import { createLocalProvider, geminiProvider, selectAssistant, type AssistantChoice, type AssistantProvider } from '../ai/provider';
import { useApp } from '../context/AppContext';
import type { AppPhase, AppState } from '../store/appStore';
import { getElectronAPI, isElectron } from './electron';

export interface ModeFlags {
  /** true en la app de escritorio. */
  isDesktop: boolean;
  /** Herramientas online (Workspace, Classroom, Moodle, Canva, Gamma). */
  onlineTools: boolean;
  /** Qué asistente de IA responde (revisión 1.8): en línea, sin conexión o ninguno. */
  assistant: AssistantChoice;
  /** Aviso de conexión perdida durante una sesión online. */
  offlineNotice: boolean;
}

/**
 * - Web: sin cambios en esta fase (todo visible).
 * - Escritorio: las herramientas online solo aparecen en una sesión online con conexión; el asistente
 * lo elige selectAssistant (en línea, sin conexión o ninguno).
 */
export function getModeFlags(state: AppState, isDesktop: boolean): ModeFlags {
  if (!isDesktop) {
    return { isDesktop, onlineTools: true, assistant: { kind: 'online' }, offlineNotice: false };
  }
  const online = state.sessionMode === 'online' && state.connection === 'online';
  return {
    isDesktop,
    onlineTools: online,
    assistant: selectAssistant({ isDesktop, sessionMode: state.sessionMode, connection: state.connection, localAi: state.localAi }),
    offlineNotice: state.sessionMode === 'online' && state.connection === 'offline',
  };
}

export function useModeFlags(): ModeFlags {
  const { state } = useApp();
  return getModeFlags(state, isElectron());
}

/** El proveedor del asistente elegido, o null si no hay ninguno. */
export function useAssistant(): AssistantProvider | null {
  const { assistant } = useModeFlags();
  return useMemo(() => {
    if (assistant.kind === 'online') return geminiProvider;
    const api = getElectronAPI();
    if (assistant.kind === 'local' && api) return createLocalProvider(api);
    return null;
  }, [assistant.kind]);
}

/** Pantalla inicial: la web empieza en el login; el escritorio, en la pantalla de inicio según la conexión. */
export function startPhase(isDesktop: boolean): AppPhase {
  return isDesktop ? 'desktop-start' : 'login';
}
