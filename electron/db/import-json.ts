/**
 * @file import-json.ts
 * @description Migración única de los datos de la fase 2 (session.json y
 * events.json en userData/session/) a SQLite. Tras importarlos, los archivos
 * se renombran a `.migrated`, así que el siguiente arranque no hace nada.
 */

import fs from 'node:fs';
import path from 'node:path';
import { JsonSessionStore } from '../session/store';
import type { SqliteSessionStore } from './sqlite-session-store';

export interface JsonImportResult {
  sessionImported: boolean;
  eventsImported: number;
}

const FILES = ['session.json', 'events.json'] as const;

export function importLegacyJson(directory: string, target: SqliteSessionStore): JsonImportResult {
  const present = FILES.filter(name => fs.existsSync(path.join(directory, name)));
  if (present.length === 0) return { sessionImported: false, eventsImported: 0 };

  const legacy = new JsonSessionStore(directory);
  const session = legacy.loadSession();
  const events = legacy.listEvents();

  target.transaction(() => {
    if (session) {
      // En la fase 2 todas las sesiones eran locales: no existía el modo online.
      target.saveSession({ ...session, mode: session.mode ?? 'offline' });
    }
    for (const event of events) target.appendEvent(event);
  });

  for (const name of present) {
    const file = path.join(directory, name);
    fs.renameSync(file, `${file}.migrated`);
  }
  return { sessionImported: session !== null, eventsImported: events.length };
}
