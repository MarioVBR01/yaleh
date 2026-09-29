/**
 * @file sessions.ts
 * @description Sesiones en Firestore: users/{uid}/sessions/{sessionId} (brief, sección 8.3).
 */

import { doc, getDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { getDb } from './app';

export type RemoteSessionStatus = 'draft' | 'pending' | 'active' | 'finished';

export interface RemoteSession {
  id: string;
  mode: 'online';
  status: RemoteSessionStatus;
  durationSeconds: number | null;
}

function sessionRef(uid: string, sessionId: string) {
  return doc(getDb(), 'users', uid, 'sessions', sessionId);
}

/** Crea el perfil (si no existe) y una sesión en borrador; devuelve su id. */
export async function createDraftSession(uid: string, profile: { displayName: string | null; email: string | null }) {
  const db = getDb();
  await setDoc(doc(db, 'users', uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
  const ref = doc(collection(db, 'users', uid, 'sessions'));
  await setDoc(ref, {
    mode: 'online',
    status: 'draft',
    durationSeconds: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** La web la marca como pendiente justo antes de abrir el escritorio con yaleh://sesion. */
export async function markSessionPending(uid: string, sessionId: string, durationSeconds: number) {
  await setDoc(
    sessionRef(uid, sessionId),
    { status: 'pending', durationSeconds, requestedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function markSessionActive(uid: string, sessionId: string) {
  await setDoc(sessionRef(uid, sessionId), { status: 'active', startedAt: serverTimestamp() }, { merge: true });
}

export async function markSessionFinished(uid: string, sessionId: string) {
  await setDoc(sessionRef(uid, sessionId), { status: 'finished', endedAt: serverTimestamp() }, { merge: true });
}

export async function getRemoteSession(uid: string, sessionId: string): Promise<RemoteSession | null> {
  const snap = await getDoc(sessionRef(uid, sessionId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    mode: 'online',
    status: (data.status as RemoteSessionStatus) ?? 'draft',
    durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : null,
  };
}
