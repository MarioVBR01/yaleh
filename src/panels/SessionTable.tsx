/**
 * @file SessionTable.tsx
 * @description Tabla de sesiones del historial (SQLite): fecha, tiempo estudiado de la duración, modo,
 * estado, archivos, pérdidas de foco, cortes de red e interrupciones. La usan el Historial (todas las
 * sesiones) y las Estadísticas (las 10 últimas, ORION #6).
 * Legibilidad (ORION #36): fecha y hora en dos líneas, "2 de 2 min" con barrita, "Sin archivos",
 * ceros en gris y 5 o más pérdidas de foco en rojo.
 */

import type { SessionHistoryEntry } from '@shared/ipc-types';

/** Desde cuántas pérdidas de foco se marcan en rojo. */
export const FOCUS_LOST_ALERT = 5;

export function statusLabel(s: SessionHistoryEntry): { text: string; className: string } {
  if (s.status === 'active') return { text: 'En curso', className: 'bg-accent/10 border-accent/30 text-accent-soft' };
  if (s.status === 'interrupted') return { text: 'Interrumpida', className: 'bg-danger/10 border-danger/30 text-danger' };
  if (s.endReason === 'dev-release') {
    return { text: 'Liberada (desarrollo)', className: 'bg-warning/10 border-warning/30 text-warning' };
  }
  return { text: 'Completada', className: 'bg-success/10 border-success/30 text-success' };
}

export function formatSessionDay(ms: number): string {
  return new Date(ms).toLocaleDateString('es-BO', { dateStyle: 'medium' });
}

export function formatSessionTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('es-BO', { timeStyle: 'short' });
}

/** "2 de 2 min": tiempo estudiado de la duración elegida (ORION #36). */
export function formatStudiedOf(s: SessionHistoryEntry): string {
  return `${Math.round(s.studiedSeconds / 60)} de ${Math.round(s.durationSeconds / 60)} min`;
}

/** Archivos de la sesión: los primeros y "+N" si son muchos; "Sin archivos" si no hay (ORION #20 y #36). */
export function formatFiles(files: string[], shown = 2): string {
  if (files.length === 0) return 'Sin archivos';
  const extra = files.length - shown;
  return extra > 0 ? `${files.slice(0, shown).join(', ')} +${extra}` : files.join(', ');
}

/** Contador: gris si es cero; rojo desde `alertAt`. */
function Count({ value, alertAt }: { value: number; alertAt?: number }) {
  const color = value === 0 ? 'text-ink-subtle' : alertAt !== undefined && value >= alertAt ? 'text-danger font-semibold' : 'text-ink-soft';
  return <span className={color}>{value}</span>;
}

export default function SessionTable({ entries }: { entries: SessionHistoryEntry[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-subtle border-b border-line">
          <th className="py-2 pr-3 font-medium">Fecha</th>
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
          const ratio = s.durationSeconds > 0 ? Math.min(1, s.studiedSeconds / s.durationSeconds) : 0;
          return (
            <tr key={s.id} className="border-b border-line/50 text-ink-soft align-middle">
              <td className="py-2 pr-3 whitespace-nowrap">
                <div className="text-ink">{formatSessionDay(s.startedAt)}</div>
                <div className="text-xs text-ink-subtle">{formatSessionTime(s.startedAt)}</div>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                <div>{formatStudiedOf(s)}</div>
                <div className="mt-1 h-1 w-24 rounded-full bg-line overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
                </div>
              </td>
              <td className="py-2 pr-3">{s.mode === 'online' ? 'Con conexión' : 'Sin conexión'}</td>
              <td className="py-2 pr-3">
                <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${status.className}`}>
                  {status.text}
                </span>
              </td>
              <td className={`py-2 pr-3 max-w-[16rem] truncate ${s.files.length === 0 ? 'text-ink-subtle' : ''}`} title={s.files.join('\n')}>
                {formatFiles(s.files)}
              </td>
              <td className="py-2 pr-3 text-right">
                <Count value={s.focusLost} alertAt={FOCUS_LOST_ALERT} />
              </td>
              <td className="py-2 pr-3 text-right">
                <Count value={s.connectionLost} />
              </td>
              <td className="py-2 text-right">
                <Count value={s.interruptions} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
