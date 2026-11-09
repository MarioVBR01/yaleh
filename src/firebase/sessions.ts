/**
 * @file sessions.ts
 * @description Espacio de trabajo de la web en Firestore: users/{uid}/sessions/{sessionId}
 * (brief, sección 8.3). Agrupa fuentes, notas y resultados de la IA. La sesión de
 * concentración viaja al escritorio en el archivo .yaleh (revisión 1.5).
 * Campos: title, createdAt, updatedAt, status ('draft' | 'exported'), durationSeconds, sourceCount,
 * sourceNames, totalSize, lastExportedAt y exportCount. "Mis sesiones" ordena por updatedAt: un borrador
 * vacío no lo tiene, así que no aparece.
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
import { removeRemoteSource, loadRemoteSources } from '../data/sources';
import { getDb } from './app';

/** Cuántas sesiones pasadas se muestran. */
const PAST_SESSIONS_LIMIT = 20;

/** Cuántas sesiones muestra "Mis sesiones". */
const MY_SESSIONS_LIMIT = 50;
export const SESSION_TITLE_MAX = 60;

export interface MySession {
  id: string;
  title: string | null;
  status: 'draft' | 'exported';
  durationSeconds: number | null;
  sourceCount: number;
  sourceNames: string[];
  totalSize: number;
  updatedAt: Date | null;
  lastExportedAt: Date | null;
  exportCount: number;
}

const sessionRef = (uid: string, sessionId: string) => doc(getDb(), 'users', uid, 'sessions', sessionId);
const sessionsCollection = (uid: string) => collection(getDb(), 'users', uid, 'sessions');

/** Título automático: el nombre del archivo sin extensión. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim().slice(0, SESSION_TITLE_MAX);
}

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

/** Registra una descarga del .yaleh. */
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
      updatedAt: serverTimestamp(),
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

/** Actualiza en el documento de la sesión lo que "Mis sesiones" muestra de sus fuentes. */
async function writeSessionSummary(uid: string, sessionId: string): Promise<void> {
  const ref = sessionRef(uid, sessionId);
  const [sources, snap] = await Promise.all([loadRemoteSources(uid, sessionId), getDoc(ref)]);
  await setDoc(
    ref,
    {
      sourceCount: sources.length,
      sourceNames: sources.map(s => s.name),
      totalSize: sources.reduce((total, s) => total + s.size, 0),
      updatedAt: serverTimestamp(),
      ...(!snap.data()?.title && sources[0] ? { title: titleFromFileName(sources[0].name) } : {}),
    },
    { merge: true }
  );
}

const summaryQueues = new Map<string, Promise<void>>();

/**
 * Las fuentes se guardan en paralelo: cada actualización espera a la anterior para que una lectura
 * vieja no pise a una más nueva.
 */
export function refreshSessionSummary(uid: string, sessionId: string): Promise<void> {
  const key = `${uid}/${sessionId}`;
  const next = (summaryQueues.get(key) ?? Promise.resolve()).catch(() => {}).then(() => writeSessionSummary(uid, sessionId));
  summaryQueues.set(key, next);
  return next;
}

export async function saveSessionDuration(uid: string, sessionId: string, durationSeconds: number): Promise<void> {
  await setDoc(sessionRef(uid, sessionId), { durationSeconds, updatedAt: serverTimestamp() }, { merge: true });
}

function toMySession(id: string, data: Record<string, any>): MySession {
  return {
    id,
    title: data.title ? String(data.title) : null,
    status: data.status === 'exported' ? 'exported' : 'draft',
    durationSeconds: data.durationSeconds ? Number(data.durationSeconds) : null,
    sourceCount: Number(data.sourceCount ?? (Array.isArray(data.sourceNames) ? data.sourceNames.length : 0)),
    sourceNames: Array.isArray(data.sourceNames) ? data.sourceNames.map(String) : [],
    totalSize: Number(data.totalSize ?? 0),
    updatedAt: data.updatedAt?.toDate?.() ?? null,
    lastExportedAt: data.lastExportedAt?.toDate?.() ?? null,
    exportCount: Number(data.exportCount ?? 0),
  };
}

/** Cuentas cuyas sesiones viejas ya se completaron en esta carga de la página. */
const completedAccounts = new Set<string>();

/** Las sesiones descargadas antes de "Mis sesiones" no tienen updatedAt ni título: se les completan. */
async function completeOldSessions(uid: string): Promise<void> {
  if (completedAccounts.has(uid)) return;
  const snap = await getDocs(query(sessionsCollection(uid), orderBy('lastExportedAt', 'desc'), limit(MY_SESSIONS_LIMIT)));
  await Promise.all(
    snap.docs
      .filter(d => !d.data().updatedAt)
      .map(d => {
        const data = d.data();
        const first = Array.isArray(data.sourceNames) ? data.sourceNames[0] : undefined;
        return setDoc(d.ref, { updatedAt: data.lastExportedAt, ...(!data.title && first ? { title: titleFromFileName(String(first)) } : {}) }, { merge: true });
      })
  );
  completedAccounts.add(uid);
}

/** Las sesiones de "Mis sesiones", de la más reciente a la más antigua. */
export async function listMySessions(uid: string): Promise<MySession[]> {
  // Si falla, se lista igual lo que ya tiene fecha; se reintenta en la próxima carga.
  await completeOldSessions(uid).catch(error => console.error('No se pudieron completar las sesiones anteriores:', error));
  const snap = await getDocs(query(sessionsCollection(uid), orderBy('updatedAt', 'desc'), limit(MY_SESSIONS_LIMIT)));
  // 'estimate': justo después de un cambio, la fecha del servidor puede estar pendiente.
  return snap.docs.map(d => toMySession(d.id, d.data({ serverTimestamps: 'estimate' })));
}

/** Cambia el título (recortado, de 1 a 60 caracteres) y devuelve el que quedó. */
export async function renameSession(uid: string, sessionId: string, title: string): Promise<string> {
  const clean = title.trim().slice(0, SESSION_TITLE_MAX).trim();
  if (!clean) throw new Error('El título no puede quedar vacío.');
  await setDoc(sessionRef(uid, sessionId), { title: clean, updatedAt: serverTimestamp() }, { merge: true });
  return clean;
}

/** Borra la sesión con sus fuentes (y sus partes), notas y resultados. El documento va al final: si algo falla, sigue en la lista. */
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const ref = sessionRef(uid, sessionId);
  const [sources, notes, studyItems] = await Promise.all([
    getDocs(collection(ref, 'sources')),
    getDocs(collection(ref, 'notes')),
    getDocs(collection(ref, 'studyItems')),
  ]);
  await Promise.all(sources.docs.map(source => removeRemoteSource(uid, sessionId, source.id)));
  await Promise.all([...notes.docs, ...studyItems.docs].map(item => deleteDoc(item.ref)));
  await deleteDoc(ref);
}

/** Borra un borrador que quedó sin usar. Una sesión ya descargada, con fuentes o con cambios no se toca. */
export async function discardEmptyDraft(uid: string, sessionId: string): Promise<void> {
  const ref = sessionRef(uid, sessionId);
  const snap = await getDoc(ref);
  if (snap.data()?.status !== 'draft' || snap.data()?.updatedAt) return;
  const sources = await getDocs(query(collection(ref, 'sources'), limit(1)));
  if (sources.empty) await deleteDoc(ref);
}
