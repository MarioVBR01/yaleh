/**
 * @file store.ts
 * @description Almacenamiento del estado de la sesión y del registro de eventos.
 * Implementación temporal en archivos JSON dentro de `app.getPath('userData')`;
 * en la fase 3 se reemplaza por SQLite detrás de la misma interfaz.
 */

import fs from 'node:fs';
import path from 'node:path';

export type PersistedSessionStatus = 'active' | 'finished' | 'interrupted';

export interface PersistedSession {
  id: string;
  /** Inicio de la sesión (epoch en milisegundos). */
  startedAt: number;
  /** Momento en que termina la sesión (epoch en milisegundos). */
  endsAt: number;
  durationSeconds: number;
  status: PersistedSessionStatus;
}

export type SessionEventType =
  | 'session-started'
  | 'session-finished'
  | 'session-interrupted'
  | 'session-resumed'
  | 'focus-lost'
  | 'dev-release'
  | 'invalid-deeplink';

export interface SessionEvent {
  type: SessionEventType;
  /** Fecha y hora en formato ISO 8601. */
  at: string;
  sessionId?: string | null;
  detail?: string;
}

export interface SessionStore {
  loadSession(): PersistedSession | null;
  saveSession(session: PersistedSession): void;
  appendEvent(event: SessionEvent): void;
  listEvents(): SessionEvent[];
}

/** Máximo de eventos que se conservan en el archivo. */
const MAX_EVENTS = 1000;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[store] No se pudo leer ${file}:`, error);
    }
    return fallback;
  }
}

/** Escribe primero en un archivo temporal y luego lo renombra, para no dejar JSON a medias. */
function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export class JsonSessionStore implements SessionStore {
  private readonly sessionFile: string;
  private readonly eventsFile: string;

  constructor(directory: string) {
    fs.mkdirSync(directory, { recursive: true });
    this.sessionFile = path.join(directory, 'session.json');
    this.eventsFile = path.join(directory, 'events.json');
  }

  loadSession(): PersistedSession | null {
    return readJson<PersistedSession | null>(this.sessionFile, null);
  }

  saveSession(session: PersistedSession): void {
    writeJsonAtomic(this.sessionFile, session);
  }

  appendEvent(event: SessionEvent): void {
    const events = this.listEvents();
    events.push(event);
    writeJsonAtomic(this.eventsFile, events.slice(-MAX_EVENTS));
  }

  listEvents(): SessionEvent[] {
    const events = readJson<unknown>(this.eventsFile, []);
    return Array.isArray(events) ? (events as SessionEvent[]) : [];
  }
}

/** Almacenamiento en memoria (pruebas). */
export class MemorySessionStore implements SessionStore {
  session: PersistedSession | null = null;
  events: SessionEvent[] = [];

  loadSession(): PersistedSession | null {
    return this.session ? { ...this.session } : null;
  }

  saveSession(session: PersistedSession): void {
    this.session = { ...session };
  }

  appendEvent(event: SessionEvent): void {
    this.events.push(event);
  }

  listEvents(): SessionEvent[] {
    return [...this.events];
  }
}
