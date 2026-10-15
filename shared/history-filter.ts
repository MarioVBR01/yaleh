/**
 * @file history-filter.ts
 * @description Filtros del historial (ORION #23): rango de fechas y cantidad de sesiones.
 * Lo usan la interfaz (la tabla) y el proceso principal (el PDF exporta lo mismo que se ve).
 */

import type { SessionHistoryEntry } from './ipc-types';

export const HISTORY_PAGE_SIZES = [10, 20, 30, 50] as const;

export interface HistoryFilter {
  /** Fechas "AAAA-MM-DD" (hora local), inclusivas. Vacías = sin límite. */
  from?: string | null;
  to?: string | null;
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

/** Sesiones dentro del rango (más recientes primero, como vienen) y hasta `limit`. */
export function filterSessions(entries: SessionHistoryEntry[], filter: HistoryFilter = {}): SessionHistoryEntry[] {
  const { from, to, limit } = filter;
  const inRange = entries.filter(s => {
    const day = localDateKey(s.startedAt);
    return (!from || day >= from) && (!to || day <= to);
  });
  return limit ? inRange.slice(0, limit) : inRange;
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
  const limit = f.limit;
  if (limit !== undefined && limit !== null && !(HISTORY_PAGE_SIZES as readonly unknown[]).includes(limit)) throw new Error('Cantidad no válida.');
  return { from: date(f.from), to: date(f.to), limit: (limit as number | null | undefined) ?? null };
}
