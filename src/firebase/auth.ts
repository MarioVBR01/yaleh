/**
 * @file auth.ts
 * @description Autenticación con Google (brief, secciones 4.5 y 5.1).
 * - Web: signInWithPopup.
 * - Escritorio: el ID token de Google llega por yaleh://auth desde el navegador
 *   del sistema y se usa con signInWithCredential.
 */

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
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

/**
 * Página auth-desktop: inicia sesión y devuelve el ID token de Google
 * (no el de Firebase), que es el que acepta signInWithCredential.
 */
export async function getGoogleIdTokenWithPopup(): Promise<string> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider());
  const idToken = GoogleAuthProvider.credentialFromResult(result)?.idToken;
  if (!idToken) throw new Error('Google no devolvió un ID token.');
  return idToken;
}

/** Escritorio: inicia sesión en Firebase con el ID token de Google. */
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const result = await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(idToken));
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
  return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
}
