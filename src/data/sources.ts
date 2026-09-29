/**
 * @file sources.ts
 * @description Espacio de trabajo en Firestore (brief, sección 8.3):
 * users/{uid}/sessions/{sessionId}/sources/{sourceId}          nombre, tipo, tamaño
 * users/{uid}/sessions/{sessionId}/sources/{sourceId}/chunks/{n} texto extraído, en partes
 * users/{uid}/sessions/{sessionId}/notes/{noteId}
 * users/{uid}/sessions/{sessionId}/studyItems/{itemId}
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { splitText } from '@shared/text';
import { getDb } from '../firebase/app';
import type { UploadedFile } from '../store/appStore';

const sessionPath = (uid: string, sessionId: string) => ['users', uid, 'sessions', sessionId] as const;

export async function saveRemoteSource(
  uid: string,
  sessionId: string,
  source: { id: string; name: string; type: string; size: number },
  text: string
): Promise<void> {
  const db = getDb();
  const chunks = splitText(text);
  const sourceRef = doc(db, ...sessionPath(uid, sessionId), 'sources', source.id);
  // Cada parte pesa como máximo ~800 KB; un lote admite 10 MB, así que se escriben de a 8.
  for (let i = 0; i < chunks.length; i += 8) {
    const batch = writeBatch(db);
    chunks.slice(i, i + 8).forEach((chunk, j) => {
      batch.set(doc(sourceRef, 'chunks', String(i + j).padStart(4, '0')), { index: i + j, text: chunk });
    });
    await batch.commit();
  }
  // El documento de la fuente se escribe al final: si existe, sus partes están completas.
  await setDoc(sourceRef, {
    name: source.name,
    type: source.type,
    size: source.size,
    charCount: text.length,
    chunkCount: chunks.length,
    createdAt: serverTimestamp(),
  });
}

export async function loadRemoteSources(uid: string, sessionId: string): Promise<UploadedFile[]> {
  const snap = await getDocs(query(collection(getDb(), ...sessionPath(uid, sessionId), 'sources'), orderBy('createdAt')));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? 'Sin nombre'),
      type: String(data.type ?? ''),
      size: Number(data.size ?? 0),
      uploadedAt: data.createdAt?.toDate?.() ?? new Date(),
      status: 'ready' as const,
      charCount: Number(data.charCount ?? 0),
    };
  });
}

export async function getRemoteSourceText(uid: string, sessionId: string, sourceId: string): Promise<string> {
  const snap = await getDocs(
    query(collection(getDb(), ...sessionPath(uid, sessionId), 'sources', sourceId, 'chunks'), orderBy('index'))
  );
  return snap.docs.map(d => String(d.data().text ?? '')).join('');
}

export async function removeRemoteSource(uid: string, sessionId: string, sourceId: string): Promise<void> {
  const db = getDb();
  const chunks = await getDocs(collection(db, ...sessionPath(uid, sessionId), 'sources', sourceId, 'chunks'));
  const batch = writeBatch(db);
  chunks.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, ...sessionPath(uid, sessionId), 'sources', sourceId));
  await batch.commit();
}

export interface NoteRecord {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export async function listRemoteNotes(uid: string, sessionId: string): Promise<NoteRecord[]> {
  const snap = await getDocs(query(collection(getDb(), ...sessionPath(uid, sessionId), 'notes'), orderBy('createdAt')));
  return snap.docs.map(d => ({
    id: d.id,
    text: String(d.data().text ?? ''),
    createdAt: String(d.data().createdAt ?? ''),
    updatedAt: String(d.data().updatedAt ?? ''),
  }));
}

export async function saveRemoteNote(uid: string, sessionId: string, note: NoteRecord): Promise<void> {
  await setDoc(doc(getDb(), ...sessionPath(uid, sessionId), 'notes', note.id), note);
}

export async function deleteRemoteNote(uid: string, sessionId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(getDb(), ...sessionPath(uid, sessionId), 'notes', noteId));
}

export async function saveRemoteStudyItem(
  uid: string,
  sessionId: string,
  item: { id: string; kind: string; content: unknown }
): Promise<void> {
  await setDoc(doc(getDb(), ...sessionPath(uid, sessionId), 'studyItems', item.id), {
    kind: item.kind,
    // Firestore no admite arreglos anidados en todos los casos: se guarda como JSON.
    content: JSON.stringify(item.content),
    createdAt: serverTimestamp(),
  });
}
