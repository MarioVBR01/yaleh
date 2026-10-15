import { describe, expect, it } from 'vitest';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { computeStats, formatDuration } from './stats';

// Viernes 3 de octubre de 2026, 18:00 (hora local).
const NOW = new Date(2026, 9, 3, 18, 0, 0);
const at = (daysAgo: number, hour = 10) => new Date(2026, 9, 3 - daysAgo, hour, 0, 0).getTime();

function session(overrides: Partial<SessionHistoryEntry>): SessionHistoryEntry {
  return {
    id: Math.random().toString(36).slice(2),
    mode: 'offline',
    startedAt: at(0),
    endsAt: at(0) + 3_000_000,
    durationSeconds: 50 * 60,
    studiedSeconds: 50 * 60,
    status: 'finished',
    focusLost: 0,
    connectionLost: 0,
    interruptions: 0,
    endReason: 'completed',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('sin sesiones: todo en cero', () => {
    const stats = computeStats([], NOW);
    expect(stats.perDay).toHaveLength(7);
    expect(stats.perWeek).toHaveLength(8);
    expect(stats).toMatchObject({ totalMinutes: 0, completed: 0, interrupted: 0, avgFocusLost: 0, sessions: 0 });
  });

  it('suma los minutos de las sesiones completadas por día y por semana', () => {
    const stats = computeStats(
      [
        session({ startedAt: at(0), durationSeconds: 25 * 60, studiedSeconds: 25 * 60 }),
        session({ startedAt: at(0, 15), durationSeconds: 50 * 60, studiedSeconds: 50 * 60 }),
        session({ startedAt: at(2), durationSeconds: 90 * 60, studiedSeconds: 90 * 60 }),
        session({ startedAt: at(10), durationSeconds: 30 * 60, studiedSeconds: 30 * 60 }),
      ],
      NOW
    );
    expect(stats.perDay.at(-1)).toMatchObject({ key: '2026-10-03', minutes: 75 });
    expect(stats.perDay.at(-3)).toMatchObject({ key: '2026-10-01', minutes: 90 });
    // Semana actual: lunes 28/09 → 75 + 90; semana anterior (21/09) → 30 del 23/09.
    expect(stats.perWeek.at(-1)).toMatchObject({ key: '2026-09-28', minutes: 165 });
    expect(stats.perWeek.at(-2)).toMatchObject({ key: '2026-09-21', minutes: 30 });
    expect(stats.totalMinutes).toBe(195);
  });

  it('interrumpidas y liberadas suman el tiempo realmente estudiado (ORION #11)', () => {
    const stats = computeStats(
      [
        session({ status: 'interrupted', endReason: null, studiedSeconds: 20 * 60 }),
        session({ endReason: 'dev-release', studiedSeconds: 10 * 60 }),
        session({}),
      ],
      NOW
    );
    expect(stats).toMatchObject({ totalMinutes: 80, completed: 1, interrupted: 1, other: 1, sessions: 3 });
    expect(stats.perDay.at(-1)?.minutes).toBe(80);
  });

  it('una sesión extendida suma lo original más la extensión; la sesión en curso no cuenta', () => {
    const stats = computeStats(
      [session({ durationSeconds: 40 * 60, studiedSeconds: 40 * 60 }), session({ status: 'active', endReason: null, studiedSeconds: 600 })],
      NOW
    );
    expect(stats.totalMinutes).toBe(40);
  });

  it('promedio de pérdidas de foco por sesión, sin la sesión en curso', () => {
    const stats = computeStats(
      [session({ focusLost: 3 }), session({ focusLost: 0 }), session({ status: 'interrupted', focusLost: 2, endReason: null }), session({ status: 'active', focusLost: 9, endReason: null })],
      NOW
    );
    expect(stats.avgFocusLost).toBe(1.7);
    expect(stats.sessions).toBe(3);
  });

  it('una sesión interrumpida y retomada que terminó cuenta como completada', () => {
    const stats = computeStats([session({ interruptions: 1 })], NOW);
    expect(stats.completed).toBe(1);
    expect(stats.totalMinutes).toBe(50);
  });
});

describe('formatDuration', () => {
  it('minutos y horas', () => {
    expect(formatDuration(25 * 60)).toBe('25 min');
    expect(formatDuration(90 * 60)).toBe('1 h 30 min');
    expect(formatDuration(120 * 60)).toBe('2 h');
  });
});
