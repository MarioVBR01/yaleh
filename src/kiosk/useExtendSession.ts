/**
 * @file useExtendSession.ts
 * @description Extender la sesión en curso desde el kiosko (barra inferior y aviso de tiempo,
 * ORION #32 y #33). Lo decide el proceso principal: suma los minutos sin liberar el kiosko.
 */

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';

export function useExtendSession() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  /** Hay API y la configuración permite extender. */
  const allowed = Boolean(api) && state.settings?.settings.allowExtend !== false;

  /** Rechaza si el proceso principal no pudo extender. */
  const extend = useCallback(
    async (minutes: number) => {
      if (!api) return;
      const snapshot = await api.extendSession(minutes * 60);
      dispatch({
        type: 'RESUME_SESSION',
        payload: { durationSeconds: snapshot.durationSeconds, remainingSeconds: snapshot.remainingSeconds, mode: snapshot.mode },
      });
    },
    [api, dispatch]
  );

  return { allowed, extend };
}
