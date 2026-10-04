/**
 * @file HistoryPanel.tsx
 * @description Historial de sesiones del escritorio (fase 10), leído de SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 */

import { Clock, RefreshCw } from 'lucide-react';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { formatDuration } from '@/lib/stats';
import { useSessionHistory } from '@/lib/useSessionHistory';

function statusLabel(s: SessionHistoryEntry): { text: string; className: string } {
  if (s.status === 'active') return { text: 'En curso', className: 'bg-accent/10 border-accent/30 text-accent-soft' };
  if (s.status === 'interrupted') return { text: 'Interrumpida', className: 'bg-danger/10 border-danger/30 text-danger' };
  if (s.endReason === 'dev-release') {
    return { text: 'Liberada (desarrollo)', className: 'bg-warning/10 border-warning/30 text-warning' };
  }
  return { text: 'Completada', className: 'bg-success/10 border-success/30 text-success' };
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
}

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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-subtle border-b border-line">
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Duración</th>
                <th className="py-2 pr-3 font-medium">Modo</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 pr-3 font-medium text-right">Pérdidas de foco</th>
                <th className="py-2 pr-3 font-medium text-right">Cortes de red</th>
                <th className="py-2 font-medium text-right">Interrupciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(s => {
                const status = statusLabel(s);
                return (
                  <tr key={s.id} className="border-b border-line/50 text-ink-soft">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(s.startedAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDuration(s.durationSeconds)}</td>
                    <td className="py-2 pr-3">{s.mode === 'online' ? 'Con conexión' : 'Sin conexión'}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">{s.focusLost}</td>
                    <td className="py-2 pr-3 text-right">{s.connectionLost}</td>
                    <td className="py-2 text-right">{s.interruptions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
