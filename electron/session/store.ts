/**
 * @file store.ts
 * @description Interfaz del almacenamiento de sesiones y eventos, y sus
 * implementaciones en JSON (fase 2; hoy solo se usa para importar esos datos)
 * y en memoria (pruebas). La implementación en uso es SqliteSessionStore.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SessionMode } from '../../shared/ipc-types';

export type PersistedSessionStatus = 'active' | 'finished' | 'interrupted';

export interface PersistedSession {
  id: string;
  mode: SessionMode;
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
  | 'connection-lost'
  | 'connection-restored'
  | 'session-file-rejected'
  /** Solo en datos anteriores a la revisión 1.5 (enlaces yaleh://, ya eliminados). */
  | 'invalid-deeplink';

export interface SessionEvent {
  type: SessionEventType;
  /** Fecha y hora en formato ISO 8601. */
  at: string;
  sessionId?: string | null;
  detail?: string;
}

export interface SessionStore {
  /** Devuelve la sesión más reciente (la de inicio más tardío), o null. */
  loadSession(): PersistedSession | null;
  /** Crea la sesión o actualiza la que tiene el mismo id. */
  saveSession(session: PersistedSession): void;
  appendEvent(event: SessionEvent): void;
  listEvents(): SessionEvent[];
}

/** Máximo de eventos que se conservan en el archivo. */
const MAX_EVENTS = 1000;

/** La sesión que se debe conservar como "más reciente" al guardar `next`. */
function latestOf(current: PersistedSession | null, next: PersistedSession): PersistedSession {
  if (!current || current.id === next.id || next.startedAt >= current.startedAt) return next;
  return current;
}

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
    writeJsonAtomic(this.sessionFile, latestOf(this.loadSession(), session));
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
    this.session = { ...latestOf(this.session, session) };
  }

  appendEvent(event: SessionEvent): void {
    this.events.push(event);
  }

  listEvents(): SessionEvent[] {
    return [...this.events];
  }
}
