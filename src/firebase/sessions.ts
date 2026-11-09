/**
 * @file sessions.ts
 * @description Espacio de trabajo de la web en Firestore: users/{uid}/sessions/{sessionId}
 * (brief, sección 8.3). Agrupa fuentes, notas y resultados de la IA. La sesión de
 * concentración viaja al escritorio en el archivo .yaleh (revisión 1.5).
 * Al descargar el .yaleh la sesión pasa a 'exported' y aparece en "Tus sesiones pasadas".
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDb } from './app';

/** Cuántas sesiones pasadas se muestran. */
const PAST_SESSIONS_LIMIT = 20;

export interface PastSession {
  id: string;
  lastExportedAt: Date | null;
  durationSeconds: number;
  sourceNames: string[];
}

/**
 * El registro es el primer ingreso con Google: guarda el perfil en users/{uid} y, solo si el documento
 * no existía, la fecha de creación de la cuenta.
 */
export async function ensureUserProfile(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<void> {
  const ref = doc(getDb(), 'users', user.uid);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

/** Crea una sesión en borrador y devuelve su id. */
export async function createDraftSession(uid: string) {
  const ref = doc(collection(getDb(), 'users', uid, 'sessions'));
  await setDoc(ref, {
    mode: 'online',
    status: 'draft',
    durationSeconds: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Registra una descarga del .yaleh: la sesión queda en "Tus sesiones pasadas", con esta fecha. */
export async function markSessionExported(
  uid: string,
  sessionId: string,
  info: { durationSeconds: number; sources: { name: string; size: number }[] }
): Promise<void> {
  await setDoc(
    doc(getDb(), 'users', uid, 'sessions', sessionId),
    {
      status: 'exported',
      durationSeconds: info.durationSeconds,
      lastExportedAt: serverTimestamp(),
      exportCount: increment(1),
      sourceNames: info.sources.map(s => s.name),
      sourceCount: info.sources.length,
      totalSize: info.sources.reduce((total, s) => total + s.size, 0),
    },
    { merge: true }
  );
}

/** Las últimas sesiones descargadas. Los borradores no tienen lastExportedAt: orderBy los deja fuera. */
export async function listPastSessions(uid: string): Promise<PastSession[]> {
  const snap = await getDocs(
    query(collection(getDb(), 'users', uid, 'sessions'), orderBy('lastExportedAt', 'desc'), limit(PAST_SESSIONS_LIMIT))
  );
  return snap.docs.map(d => {
    // 'estimate': justo después de descargar, la fecha del servidor puede estar pendiente.
    const data = d.data({ serverTimestamps: 'estimate' });
    return {
      id: d.id,
      lastExportedAt: data.lastExportedAt?.toDate?.() ?? null,
      durationSeconds: Number(data.durationSeconds ?? 0),
      sourceNames: Array.isArray(data.sourceNames) ? data.sourceNames.map(String) : [],
    };
  });
}

/** Borra un borrador que quedó sin usar. Una sesión ya descargada o con fuentes no se toca. */
export async function discardEmptyDraft(uid: string, sessionId: string): Promise<void> {
  const ref = doc(getDb(), 'users', uid, 'sessions', sessionId);
  const snap = await getDoc(ref);
  if (snap.data()?.status !== 'draft') return;
  const sources = await getDocs(query(collection(ref, 'sources'), limit(1)));
  if (sources.empty) await deleteDoc(ref);
}
