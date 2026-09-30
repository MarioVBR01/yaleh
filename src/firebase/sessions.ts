/**
 * @file sessions.ts
 * @description Espacio de trabajo de la web en Firestore: users/{uid}/sessions/{sessionId}
 * (brief, sección 8.3). Agrupa fuentes, notas y resultados de la IA. La sesión de
 * concentración viaja al escritorio en el archivo .yaleh (revisión 1.5).
 */

import { doc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { getDb } from './app';

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
