/**
 * @file session-file.ts
 * @description Archivo de sesión .yaleh en la interfaz (brief, revisión 1.5).
 * - Web: lo genera con el texto de las fuentes y lo descarga.
 * - Escritorio: aplica al estado una sesión que el proceso principal ya abrió.
 */

import type { Dispatch } from 'react';
import { LIMITS } from '@shared/config';
import type { OpenSessionFileResult } from '@shared/ipc-types';
import { createSessionFile, sessionFileName, type SessionFileSource } from '@shared/session-file';
import { newId, type WorkspaceStore } from '../data/workspace';
import type { AppAction, AppState } from '../store/appStore';
import { formatBytes } from '../utils/format';

/** SHA-256 en hexadecimal con la API del navegador. */
export async function sha256Web(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Web: arma el archivo con el texto ya extraído de las fuentes listas.
 * Cada descarga tiene su propio sessionId (cada archivo se usa una sola vez).
 */
export async function buildSessionFileBlob(
  state: AppState,
  store: WorkspaceStore | null
): Promise<{ blob: Blob; fileName: string }> {
  const ready = state.uploadedFiles.filter(f => f.status === 'ready' || f.status === undefined);
  const sources: SessionFileSource[] = store
    ? await Promise.all(
        ready.map(async f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          text: await store.getSourceText(f.id),
        }))
      )
    : [];

  const file = await createSessionFile(
    {
      sessionId: newId(),
      durationSeconds: state.sessionDuration,
      createdBy: { name: state.session.displayName ?? '', email: state.session.email ?? '' },
      sources,
    },
    sha256Web
  );
  const json = JSON.stringify(file);
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > LIMITS.maxSessionFileBytes) {
    throw new Error(
      `El texto de tus fuentes ocupa ${formatBytes(bytes)} y el archivo de sesión admite ${formatBytes(
        LIMITS.maxSessionFileBytes
      )}. Quita alguna fuente e inténtalo de nuevo.`
    );
  }
  return { blob: new Blob([json], { type: 'application/json' }), fileName: sessionFileName() };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Escritorio: el proceso principal ya validó el archivo, guardó las fuentes en
 * SQLite y empezó la sesión. La interfaz entra al kiosko con esos datos.
 */
export function applyOpenedSessionFile(dispatch: Dispatch<AppAction>, result: OpenSessionFileResult): void {
  if (!result.ok) {
    if (!result.canceled) dispatch({ type: 'SET_NOTICE', payload: result.message });
    return;
  }
  const { snapshot, sources, createdBy } = result;
  const name = createdBy.name || 'Estudiante';
  dispatch({ type: 'SET_NOTICE', payload: null });
  dispatch({ type: 'SET_WORKSPACE', payload: snapshot.sessionId });
  dispatch({ type: 'SET_SESSION_MODE', payload: snapshot.mode });
  dispatch({
    type: 'SET_SESSION',
    payload: {
      isAuthenticated: false,
      isAnonymous: true,
      displayName: name,
      email: createdBy.email || undefined,
      initials: name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    },
  });
  dispatch({
    type: 'SET_FILES',
    payload: sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      size: s.size,
      uploadedAt: new Date(s.createdAt || Date.now()),
      status: 'ready' as const,
      charCount: s.charCount,
    })),
  });
  dispatch({ type: 'SET_SESSION_DURATION', payload: snapshot.durationSeconds });
  dispatch({ type: 'START_KIOSK' });
  dispatch({ type: 'SYNC_TIME', payload: snapshot.remainingSeconds });
}
