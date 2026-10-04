/**
 * @file useSessionHistory.ts
 * @description Carga el historial de sesiones del escritorio (SQLite, por IPC).
 * En el navegador no hay historial: `available` es false.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { getElectronAPI } from './electron';

export function useSessionHistory() {
  const api = getElectronAPI();
  const [entries, setEntries] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(api));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      setEntries(await api.listSessionHistory());
      setError(null);
    } catch (e) {
      console.error('[history] No se pudo leer el historial:', e);
      setError('No se pudo leer el historial.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { available: Boolean(api), entries, loading, error, reload };
}
