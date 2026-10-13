/**
 * @file HistoryPanel.tsx
 * @description Historial de sesiones del escritorio (fase 10), leído de SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 */

import { Clock, RefreshCw } from 'lucide-react';
import { useSessionHistory } from '@/lib/useSessionHistory';
import SessionTable from './SessionTable';

export default function HistoryPanel() {
  const { available, entries, loading, error, reload } = useSessionHistory();

  let empty = 'Todavía no hay sesiones.';
  if (!available) empty = 'El historial se guarda en la aplicación de escritorio.';
  else if (loading) empty = 'Cargando…';

  return (
    <div className="h-full flex flex-col bg-canvas">
      <div className="p-5 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink mb-1">📋 Historial de sesiones</h1>
          <p className="text-ink-muted text-sm">
            {available ? `${entries.length} sesiones guardadas en este equipo` : 'Disponible en la aplicación de escritorio'}
          </p>
        </div>
        {available && (
          <button
            onClick={() => void reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-surface-raised border-line text-ink-muted hover:text-ink"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-subtle">
            <Clock size={40} className="opacity-30" />
            <p className="text-sm">{empty}</p>
          </div>
        ) : (
          <SessionTable entries={entries} />
        )}
      </div>
    </div>
  );
}
