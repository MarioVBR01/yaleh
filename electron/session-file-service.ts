/**
 * @file session-file-service.ts
 * @description Abre un archivo de sesión .yaleh en el escritorio (brief, revisión 1.5):
 * lo valida, comprueba que no se haya usado, guarda sus fuentes en SQLite y
 * empieza la sesión de inmediato (el equipo queda bloqueado).
 */

import { createHash } from 'node:crypto';
import type { LocalSourceInfo, OpenSessionFileResult, SessionMode, SessionSnapshot } from '../shared/ipc-types';
import { SESSION_FILE_ERRORS, validateSessionFile, type SessionFileSource } from '../shared/session-file';

export const sha256Hex = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

export interface OpenSessionFileDeps {
  /** Hay una sesión activa o el equipo ya está bloqueado. */
  isLocked: () => boolean;
  /** El sessionId ya está registrado en SQLite (archivo ya usado). */
  isUsed: (sessionId: string) => boolean;
  /** Guarda las fuentes en SQLite y devuelve la lista guardada. */
  saveSources: (sessionId: string, sources: SessionFileSource[]) => LocalSourceInfo[];
  /** Modo según la conexión en este momento. */
  currentMode: () => SessionMode;
  /** Empieza la sesión (bloquea el equipo). */
  start: (durationSeconds: number, mode: SessionMode, sessionId: string) => SessionSnapshot;
  now?: () => Date;
}

export async function openSessionFile(raw: string, deps: OpenSessionFileDeps): Promise<OpenSessionFileResult> {
  if (deps.isLocked()) return { ok: false, message: 'Ya hay una sesión en curso.' };

  const validation = await validateSessionFile(raw, { sha256: sha256Hex, now: deps.now?.() });
  if (!validation.ok) return { ok: false, message: validation.message };

  const file = validation.file;
  if (deps.isUsed(file.sessionId)) return { ok: false, message: SESSION_FILE_ERRORS.used };

  const sources = deps.saveSources(file.sessionId, file.sources);
  const snapshot = deps.start(file.durationSeconds, deps.currentMode(), file.sessionId);
  return { ok: true, snapshot, sources, createdBy: file.createdBy };
}

/** Busca un archivo .yaleh entre los argumentos con que se abrió la app. */
export function findSessionFileInArgv(argv: readonly string[]): string | undefined {
  return argv.find(arg => !arg.startsWith('-') && arg.toLowerCase().endsWith('.yaleh'));
}
