/**
 * @file auth.ts
 * @description Autenticación con Google en la web (brief, sección 5.1): signInWithPopup.
 * El escritorio no inicia sesión con Google (revisión 1.5): recibe las fuentes en el .yaleh.
 */

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './app';

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** Web: ventana emergente de Google. */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider());
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/** Observa el usuario actual. Sin configuración de Firebase, informa null. */
export function watchUser(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function currentUser(): User | null {
  return isFirebaseConfigured ? getFirebaseAuth().currentUser : null;
}

/** Mensaje en español para los errores más comunes del inicio de sesión. */
export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Cerraste la ventana de Google antes de terminar.';
  }
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.';
  if (code === 'auth/network-request-failed') return 'No hay conexión. Revisa tu internet.';
  if (code === 'auth/invalid-credential') return 'La credencial de Google no es válida o expiró. Vuelve a intentarlo.';
  if (code === 'auth/unauthorized-domain') return 'Este dominio no está autorizado para iniciar sesión. Avisa al administrador de YALEH.';
  // El código ayuda a diagnosticar (BUG-001): se muestra junto al mensaje.
  return code
    ? `No se pudo iniciar sesión con Google (${code}). Inténtalo de nuevo.`
    : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
}
