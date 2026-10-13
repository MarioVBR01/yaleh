// @vitest-environment node
/**
 * ORION #7: configuración en SQLite, validación compartida y borrado del historial.
 */

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isKioskSafePatch, normalizeProfileName, validateSettingsPatch } from '../shared/settings';
import { setSetting } from './db/database';
import { clearSessionHistory, listSessionHistory } from './db/history';
import { runMigrations } from './db/migrations';
import { SqliteSessionStore } from './db/sqlite-session-store';
import { getProfileName, loadSettings, saveSettings, setProfileName } from './settings-store';

function setup() {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  return { db, store: new SqliteSessionStore(db) };
}

describe('validateSettingsPatch', () => {
  it('acepta valores válidos', () => {
    expect(validateSettingsPatch({ defaultSessionMinutes: 50, endWarningMinutes: 10, allowExtend: false, localAiGpu: 'cpu', textScale: 'large', reduceMotion: true })).toEqual({
      defaultSessionMinutes: 50, endWarningMinutes: 10, allowExtend: false, localAiGpu: 'cpu', textScale: 'large', reduceMotion: true,
    });
    expect(validateSettingsPatch({ defaultSessionMinutes: null })).toEqual({ defaultSessionMinutes: null });
  });

  it('rechaza valores fuera de rango, opciones desconocidas y la carpeta (solo la elige el proceso principal)', () => {
    expect(() => validateSettingsPatch({ defaultSessionMinutes: 500 })).toThrow(/entre 1 y 180/);
    expect(() => validateSettingsPatch({ endWarningMinutes: 3 })).toThrow();
    expect(() => validateSettingsPatch({ textScale: 'enorme' })).toThrow();
    expect(() => validateSettingsPatch({ exportDir: 'C:\\' })).toThrow(/desconocida/);
    expect(() => validateSettingsPatch({ allowedSites: [] })).toThrow(/desconocida/);
  });

  it('durante la sesión solo es inofensivo el tamaño del texto y las animaciones', () => {
    expect(isKioskSafePatch({ textScale: 'xlarge', reduceMotion: true })).toBe(true);
    expect(isKioskSafePatch({ allowExtend: true })).toBe(false);
    expect(isKioskSafePatch({ textScale: 'large', defaultSessionMinutes: 10 })).toBe(false);
  });

  it('normaliza el nombre del estudiante', () => {
    expect(normalizeProfileName('  Ana   María ')).toBe('Ana María');
    expect(normalizeProfileName('   ')).toBeNull();
    expect(() => normalizeProfileName('x'.repeat(61))).toThrow(/60/);
  });
});

describe('settings-store', () => {
  it('sin nada guardado devuelve los valores predeterminados', () => {
    expect(loadSettings(setup().db)).toEqual(DEFAULT_SETTINGS);
  });

  it('guarda y combina cambios', () => {
    const { db } = setup();
    saveSettings(db, { textScale: 'large' });
    saveSettings(db, { exportDir: 'D:\\Estudio' });
    expect(loadSettings(db)).toMatchObject({ textScale: 'large', exportDir: 'D:\\Estudio', allowExtend: true });
  });

  it('ignora valores guardados inválidos o JSON dañado', () => {
    const { db } = setup();
    setSetting(db, 'app-settings', JSON.stringify({ textScale: 'enorme', endWarningMinutes: 10, viejo: 1 }));
    expect(loadSettings(db)).toEqual({ ...DEFAULT_SETTINGS, endWarningMinutes: 10 });
    setSetting(db, 'app-settings', '{roto');
    expect(loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('nombre del estudiante en local_profile', () => {
    const { db } = setup();
    expect(getProfileName(db)).toBeNull();
    setProfileName(db, 'Ana');
    expect(getProfileName(db)).toBe('Ana');
    setProfileName(db, null);
    expect(getProfileName(db)).toBeNull();
  });
});

describe('clearSessionHistory', () => {
  it('borra sesiones y eventos, conserva la sesión en curso y el uso único de los .yaleh', () => {
    const { db, store } = setup();
    const at = new Date().toISOString();
    store.saveSession({ id: 'done', mode: 'offline', startedAt: 1, endsAt: 2, durationSeconds: 60, status: 'finished' });
    store.saveSession({ id: 'cut', mode: 'offline', startedAt: 3, endsAt: 4, durationSeconds: 60, status: 'interrupted' });
    store.saveSession({ id: 'now', mode: 'online', startedAt: 5, endsAt: 9e12, durationSeconds: 60, status: 'active' });
    store.appendEvent({ type: 'focus-lost', at, sessionId: 'done' });
    store.appendEvent({ type: 'session-file-rejected', at, detail: 'x' });
    store.appendEvent({ type: 'session-started', at, sessionId: 'now' });

    expect(clearSessionHistory(db)).toBe(2);
    expect(listSessionHistory(db).map(s => s.id)).toEqual(['now']);
    expect(store.listEvents().map(e => e.type)).toEqual(['session-started']);
    // Un .yaleh ya usado no se puede volver a abrir aunque se haya borrado el historial.
    expect(store.hasSession('done')).toBe(true);
    expect(store.hasSession('nuevo')).toBe(false);
  });
});
