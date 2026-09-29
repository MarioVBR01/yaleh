/**
 * @file app.ts
 * @description Inicialización de Firebase (brief, secciones 7.4 y 8).
 * Configuración en variables de entorno de Vite (.env, ver .env.example).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { YALEH_WEB_ORIGINS } from '@shared/config';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** false si falta la configuración (por ejemplo, en las pruebas). */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

/** true en la web publicada en Firebase Hosting. */
function isHostedWeb(): boolean {
  return typeof window !== 'undefined' && (YALEH_WEB_ORIGINS as readonly string[]).includes(window.location.origin);
}

/**
 * App Check (brief, sección 7.4). No debe bloquear nada si falla.
 * - Web publicada: reCAPTCHA Enterprise (Fraud Defense).
 * - Escritorio (file://) y localhost: reCAPTCHA no funciona fuera del dominio registrado;
 *   se usa el token de depuración si está configurado.
 * TODO(después de la presentación): quitar el token de depuración de la web publicada
 * (VITE_APPCHECK_DEBUG_ON_WEB) y activar el enforcement con reCAPTCHA.
 */
function initAppCheck(firebaseApp: FirebaseApp): void {
  const siteKey = env.VITE_APPCHECK_SITE_KEY;
  const debugToken = env.VITE_APPCHECK_DEBUG_TOKEN;
  const hosted = isHostedWeb();
  const useDebug = Boolean(debugToken) && (!hosted || env.VITE_APPCHECK_DEBUG_ON_WEB === 'true');

  try {
    if (useDebug) {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      // En modo depuración el proveedor no se usa; este evita cargar reCAPTCHA fuera del dominio.
      initializeAppCheck(firebaseApp, {
        provider: new CustomProvider({ getToken: () => Promise.reject(new Error('Proveedor no usado en depuración')) }),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (hosted && siteKey) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (error) {
    console.warn('[firebase] App Check no se pudo inicializar:', error);
  }
}

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error('Firebase no está configurado (.env).');
  if (!app) {
    app = initializeApp(firebaseConfig);
    initAppCheck(app);
  }
  return app;
}

export function getFirebaseApp(): FirebaseApp {
  return ensureApp();
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}
