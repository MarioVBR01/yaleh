/**
 * @file workspace.ts
 * @description Dónde se guardan las fuentes, las notas y los resultados de la IA
 * (brief, sección 8.2):
 * - Web (con cuenta): Firestore.
 * - Escritorio (online u offline): SQLite, por IPC (la interfaz nunca abre la base).
 *   El escritorio no inicia sesión con Google; las fuentes llegan en el .yaleh.
 * - Sin cuenta (pruebas): en memoria.
 */

import { getElectronAPI, isElectron } from '../lib/electron';
import type { AppState, UploadedFile } from '../store/appStore';
import {
  deleteRemoteNote,
  getRemoteSourceText,
  listRemoteNotes,
  loadRemoteSources,
  removeRemoteSource,
  saveRemoteNote,
  saveRemoteSource,
  saveRemoteStudyItem,
  type NoteRecord,
} from './sources';

export type Note = NoteRecord;

export interface SourceInput {
  id: string;
  name: string;
  type: string;
  size: number;
}

export interface WorkspaceStore {
  kind: 'firestore' | 'local' | 'memory';
  addSource(source: SourceInput, text: string): Promise<void>;
  listSources(): Promise<UploadedFile[]>;
  getSourceText(sourceId: string): Promise<string>;
  removeSource(sourceId: string): Promise<void>;
  listNotes(): Promise<Note[]>;
  saveNote(note: { id: string; text: string; createdAt?: string }): Promise<void>;
  deleteNote(noteId: string): Promise<void>;
  saveStudyItem(item: { id: string; kind: string; content: unknown }): Promise<void>;
}

/** Texto de las fuentes ya leído (evita volver a descargarlo para cada pregunta a la IA). */
const textCache = new Map<string, string>();
const cacheKey = (workspaceId: string, sourceId: string) => `${workspaceId}/${sourceId}`;

function firestoreStore(uid: string, workspaceId: string): WorkspaceStore {
  return {
    kind: 'firestore',
    addSource: async (source, text) => {
      await saveRemoteSource(uid, workspaceId, source, text);
      textCache.set(cacheKey(workspaceId, source.id), text);
    },
    listSources: () => loadRemoteSources(uid, workspaceId),
    getSourceText: async sourceId => {
      const key = cacheKey(workspaceId, sourceId);
      if (!textCache.has(key)) textCache.set(key, await getRemoteSourceText(uid, workspaceId, sourceId));
      return textCache.get(key)!;
    },
    removeSource: async sourceId => {
      await removeRemoteSource(uid, workspaceId, sourceId);
      textCache.delete(cacheKey(workspaceId, sourceId));
    },
    listNotes: () => listRemoteNotes(uid, workspaceId),
    saveNote: async note => {
      const now = new Date().toISOString();
      await saveRemoteNote(uid, workspaceId, { id: note.id, text: note.text, createdAt: note.createdAt ?? now, updatedAt: now });
    },
    deleteNote: noteId => deleteRemoteNote(uid, workspaceId, noteId),
    saveStudyItem: item => saveRemoteStudyItem(uid, workspaceId, item),
  };
}

function localStore(workspaceId: string): WorkspaceStore {
  const api = getElectronAPI()!.workspace;
  return {
    kind: 'local',
    addSource: async (source, text) => {
      await api.addSource(workspaceId, source, text);
      textCache.set(cacheKey(workspaceId, source.id), text);
    },
    listSources: async () =>
      (await api.listSources(workspaceId)).map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        size: s.size,
        uploadedAt: new Date(s.createdAt),
        status: 'ready' as const,
        charCount: s.charCount,
      })),
    getSourceText: async sourceId => {
      const key = cacheKey(workspaceId, sourceId);
      if (!textCache.has(key)) textCache.set(key, await api.getSourceText(workspaceId, sourceId));
      return textCache.get(key)!;
    },
    removeSource: async sourceId => {
      await api.removeSource(workspaceId, sourceId);
      textCache.delete(cacheKey(workspaceId, sourceId));
    },
    listNotes: () => api.listNotes(workspaceId),
    saveNote: note => api.saveNote(workspaceId, { id: note.id, text: note.text }),
    deleteNote: noteId => api.deleteNote(workspaceId, noteId),
    // Sin IA en el modo offline (v1): no hay resultados que guardar.
    saveStudyItem: async () => {},
  };
}

const memory = new Map<string, { sources: Map<string, { info: UploadedFile; text: string }>; notes: Map<string, Note> }>();

function memoryStore(workspaceId: string): WorkspaceStore {
  if (!memory.has(workspaceId)) memory.set(workspaceId, { sources: new Map(), notes: new Map() });
  const ws = memory.get(workspaceId)!;
  return {
    kind: 'memory',
    addSource: async (source, text) => {
      ws.sources.set(source.id, {
        info: { ...source, uploadedAt: new Date(), status: 'ready', charCount: text.length },
        text,
      });
    },
    listSources: async () => [...ws.sources.values()].map(s => s.info),
    getSourceText: async sourceId => ws.sources.get(sourceId)?.text ?? '',
    removeSource: async sourceId => {
      ws.sources.delete(sourceId);
    },
    listNotes: async () => [...ws.notes.values()],
    saveNote: async note => {
      const now = new Date().toISOString();
      ws.notes.set(note.id, { id: note.id, text: note.text, createdAt: note.createdAt ?? now, updatedAt: now });
    },
    deleteNote: async noteId => {
      ws.notes.delete(noteId);
    },
    saveStudyItem: async () => {},
  };
}

/** Elige el almacenamiento según la plataforma, el modo y la cuenta. null si aún no hay espacio de trabajo. */
export function getWorkspaceStore(state: AppState): WorkspaceStore | null {
  const workspaceId = state.workspaceId;
  if (!workspaceId) return null;
  if (isElectron()) return localStore(workspaceId);
  if (state.session.uid) return firestoreStore(state.session.uid, workspaceId);
  return memoryStore(workspaceId);
}

/** Id nuevo para fuentes, notas y resultados (compatible con Firestore y SQLite). */
export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
