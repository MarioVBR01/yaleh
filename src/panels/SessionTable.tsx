/**
 * @file SessionTable.tsx
 * @description Tabla de sesiones del historial (SQLite): fecha, duración, tiempo estudiado, modo, estado, archivos,
 * pérdidas de foco, cortes de red e interrupciones. La usan el Historial (todas las sesiones)
 * y las Estadísticas (las 10 últimas, ORION #6).
 */

import type { SessionHistoryEntry } from '@shared/ipc-types';
import { formatDuration } from '@/lib/stats';

export function statusLabel(s: SessionHistoryEntry): { text: string; className: string } {
  if (s.status === 'active') return { text: 'En curso', className: 'bg-accent/10 border-accent/30 text-accent-soft' };
  if (s.status === 'interrupted') return { text: 'Interrumpida', className: 'bg-danger/10 border-danger/30 text-danger' };
  if (s.endReason === 'dev-release') {
    return { text: 'Liberada (desarrollo)', className: 'bg-warning/10 border-warning/30 text-warning' };
  }
  return { text: 'Completada', className: 'bg-success/10 border-success/30 text-success' };
}

export function formatSessionDate(ms: number): string {
  return new Date(ms).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Archivos de la sesión: los primeros y "+N" si son muchos; "—" si no hay (ORION #20). */
export function formatFiles(files: string[], shown = 2): string {
  if (files.length === 0) return '—';
  const extra = files.length - shown;
  return extra > 0 ? `${files.slice(0, shown).join(', ')} +${extra}` : files.join(', ');
}

export default function SessionTable({ entries }: { entries: SessionHistoryEntry[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-subtle border-b border-line">
          <th className="py-2 pr-3 font-medium">Fecha</th>
          <th className="py-2 pr-3 font-medium">Duración</th>
          <th className="py-2 pr-3 font-medium">Tiempo estudiado</th>
          <th className="py-2 pr-3 font-medium">Modo</th>
          <th className="py-2 pr-3 font-medium">Estado</th>
          <th className="py-2 pr-3 font-medium">Archivos</th>
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
              <td className="py-2 pr-3 whitespace-nowrap">{formatSessionDate(s.startedAt)}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDuration(s.durationSeconds)}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDuration(s.studiedSeconds)}</td>
              <td className="py-2 pr-3">{s.mode === 'online' ? 'Con conexión' : 'Sin conexión'}</td>
              <td className="py-2 pr-3">
                <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${status.className}`}>
                  {status.text}
                </span>
              </td>
              <td className="py-2 pr-3 max-w-[16rem] truncate" title={s.files.join('\n')}>
                {formatFiles(s.files)}
              </td>
              <td className="py-2 pr-3 text-right">{s.focusLost}</td>
              <td className="py-2 pr-3 text-right">{s.connectionLost}</td>
              <td className="py-2 text-right">{s.interruptions}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
