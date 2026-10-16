/**
 * @file history-filter.ts
 * @description Filtros del historial (ORION #23 y #36): rango de fechas (con atajos), estado, modo y
 * cantidad de sesiones, y el resumen de lo filtrado.
 * Lo usan la interfaz (la tabla) y el proceso principal (el PDF exporta lo mismo que se ve).
 */

import type { SessionHistoryEntry, SessionMode } from './ipc-types';

export const HISTORY_PAGE_SIZES = [10, 20, 30, 50] as const;

export const HISTORY_STATUSES = ['completed', 'interrupted', 'active'] as const;
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];
const STATUS_OF: Record<SessionHistoryEntry['status'], HistoryStatus> = { finished: 'completed', interrupted: 'interrupted', active: 'active' };

/** Atajos de fecha de un clic (ORION #36). */
export const DATE_PRESETS = ['all', 'today', '7d', 'month', 'custom'] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export interface HistoryFilter {
  /** Fechas "AAAA-MM-DD" (hora local), inclusivas. Vacías = sin límite. */
  from?: string | null;
  to?: string | null;
  /** Estado (ORION #36); null = todos. */
  status?: HistoryStatus | null;
  /** Modo de la sesión (ORION #36); null = los dos. */
  mode?: SessionMode | null;
  /** Cantidad máxima de sesiones; null = todas. */
  limit?: number | null;
}

export const DEFAULT_HISTORY_LIMIT = 10;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');

/** "AAAA-MM-DD" del inicio de la sesión, en hora local. */
export function localDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rango de un atajo ("all" y "custom": sin rango; las fechas propias las pone la vista). */
export function presetRange(preset: DatePreset, now = new Date()): { from: string | null; to: string | null } {
  const today = localDateKey(now.getTime());
  if (preset === 'today') return { from: today, to: today };
  if (preset === '7d') return { from: localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()), to: today };
  if (preset === 'month') return { from: localDateKey(new Date(now.getFullYear(), now.getMonth(), 1).getTime()), to: today };
  return { from: null, to: null };
}

/** Sesiones dentro del rango, el estado y el modo (más recientes primero, como vienen) y hasta `limit`. */
export function filterSessions(entries: SessionHistoryEntry[], filter: HistoryFilter = {}): SessionHistoryEntry[] {
  const { from, to, status, mode, limit } = filter;
  const matching = entries.filter(s => {
    const day = localDateKey(s.startedAt);
    return (!from || day >= from) && (!to || day <= to) && (!status || STATUS_OF[s.status] === status) && (!mode || s.mode === mode);
  });
  return limit ? matching.slice(0, limit) : matching;
}

export interface HistorySummary {
  sessions: number;
  studiedMinutes: number;
  /** Porcentaje entero de sesiones completadas (0 si no hay sesiones). */
  completedPercent: number;
}

/** Resumen de las sesiones filtradas (ORION #36). */
export function summarizeSessions(entries: SessionHistoryEntry[]): HistorySummary {
  const completed = entries.filter(s => s.status === 'finished').length;
  return {
    sessions: entries.length,
    studiedMinutes: Math.round(entries.reduce((sum, s) => sum + s.studiedSeconds, 0) / 60),
    completedPercent: entries.length ? Math.round((completed / entries.length) * 100) : 0,
  };
}

/** Valida un filtro que llega por IPC. Lanza un Error si no es válido. */
export function parseHistoryFilter(value: unknown): HistoryFilter {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Filtro no válido.');
  const f = value as Record<string, unknown>;
  const date = (v: unknown) => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string' || !DATE.test(v)) throw new Error('Fecha no válida.');
    return v;
  };
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], what: string): T | null => {
    if (v === undefined || v === null || v === '') return null;
    if (!(allowed as readonly unknown[]).includes(v)) throw new Error(`${what} no válido.`);
    return v as T;
  };
  const limit = f.limit;
  if (limit !== undefined && limit !== null && !(HISTORY_PAGE_SIZES as readonly unknown[]).includes(limit)) throw new Error('Cantidad no válida.');
  return {
    from: date(f.from),
    to: date(f.to),
    status: oneOf(f.status, HISTORY_STATUSES, 'Estado'),
    mode: oneOf(f.mode, ['online', 'offline'] as const, 'Modo'),
    limit: (limit as number | null | undefined) ?? null,
  };
}
