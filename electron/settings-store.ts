/**
 * @file settings-store.ts
 * @description Configuración del escritorio en SQLite (ORION #7): tabla `settings`
 * (clave `app-settings`, JSON) y nombre del estudiante en `local_profile`.
 */

import type { DatabaseSync } from 'node:sqlite';
import { DEFAULT_SETTINGS, validateSettingsPatch, type AppSettings, type SettingsPatch } from '../shared/settings';
import { ensureLocalProfile, getSetting, setSetting } from './db/database';

const SETTINGS_KEY = 'app-settings';

/** Lee la configuración. Valores guardados inválidos o de versiones viejas se ignoran. */
export function loadSettings(db: DatabaseSync): AppSettings {
  const raw = getSetting(db, SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  let stored: Record<string, unknown>;
  try {
    stored = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const [key, value] of Object.entries(stored)) {
    if (key === 'exportDir') {
      if (value === null || (typeof value === 'string' && value.length > 0)) settings.exportDir = value as string | null;
      continue;
    }
    try {
      Object.assign(settings, validateSettingsPatch({ [key]: value }));
    } catch {
      // Valor guardado que ya no es válido: queda el predeterminado.
    }
  }
  return settings;
}

/** Aplica un cambio ya validado (y `exportDir`, que solo elige el proceso principal). */
export function saveSettings(db: DatabaseSync, patch: SettingsPatch): AppSettings {
  const next = { ...loadSettings(db), ...patch };
  setSetting(db, SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function getProfileName(db: DatabaseSync): string | null {
  const row = db.prepare('SELECT display_name FROM local_profile LIMIT 1').get() as { display_name: string | null } | undefined;
  return row?.display_name ?? null;
}

export function setProfileName(db: DatabaseSync, name: string | null): void {
  const id = ensureLocalProfile(db);
  db.prepare('UPDATE local_profile SET display_name = ? WHERE id = ?').run(name, id);
}
