/**
 * @file stats.ts
 * @description Estadísticas de concentración a partir del historial de SQLite (fase 10).
 *
 * Minutos de concentración: solo cuentan las sesiones que terminaron al cumplirse el
 * tiempo (su duración completa). Las interrumpidas y las liberadas con la salida de
 * desarrollo no cuentan, porque no se registra cuánto tiempo duraron en realidad.
 */

import type { SessionHistoryEntry } from '@shared/ipc-types';

export interface DayBucket {
  /** Clave "AAAA-MM-DD" (hora local). */
  key: string;
  /** Etiqueta corta, por ejemplo "lun 29". */
  label: string;
  minutes: number;
}

export interface SessionStats {
  perDay: DayBucket[];
  perWeek: DayBucket[];
  totalMinutes: number;
  completed: number;
  interrupted: number;
  /** Terminadas con la salida de desarrollo (solo sin empaquetar). */
  other: number;
  /** Promedio de pérdidas de foco por sesión (sin contar la sesión en curso). */
  avgFocusLost: number;
  sessions: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Lunes de la semana de `d`. */
const startOfWeek = (d: Date) => {
  const day = startOfDay(d);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
};

export function isCompleted(s: SessionHistoryEntry): boolean {
  return s.status === 'finished' && s.endReason === 'completed';
}

export function computeStats(
  entries: SessionHistoryEntry[],
  now: Date = new Date(),
  options: { days?: number; weeks?: number } = {}
): SessionStats {
  const days = options.days ?? 7;
  const weeks = options.weeks ?? 8;
  const closed = entries.filter(s => s.status !== 'active');

  const today = startOfDay(now);
  const perDay: DayBucket[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    return {
      key: dayKey(d),
      label: d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' }),
      minutes: 0,
    };
  });
  const thisWeek = startOfWeek(now);
  const perWeek: DayBucket[] = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7 * (weeks - 1 - i));
    return { key: dayKey(d), label: d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }), minutes: 0 };
  });

  let totalMinutes = 0;
  for (const s of closed) {
    if (!isCompleted(s)) continue;
    const minutes = Math.round(s.durationSeconds / 60);
    totalMinutes += minutes;
    const started = new Date(s.startedAt);
    const day = perDay.find(b => b.key === dayKey(started));
    if (day) day.minutes += minutes;
    const week = perWeek.find(b => b.key === dayKey(startOfWeek(started)));
    if (week) week.minutes += minutes;
  }

  const completed = closed.filter(isCompleted).length;
  const interrupted = closed.filter(s => s.status === 'interrupted').length;
  const focusTotal = closed.reduce((sum, s) => sum + s.focusLost, 0);

  return {
    perDay,
    perWeek,
    totalMinutes,
    completed,
    interrupted,
    other: closed.length - completed - interrupted,
    avgFocusLost: closed.length > 0 ? Math.round((focusTotal / closed.length) * 10) / 10 : 0,
    sessions: closed.length,
  };
}

/** Duración legible: "50 min", "1 h 30 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

