/**
 * @file main.ts
 * @description Página auth-desktop.html (brief, sección 4.5).
 * La abre el escritorio en el navegador del sistema con un `state` aleatorio.
 * Inicia sesión con Google y devuelve el ID token de Google y el mismo `state`
 * por yaleh://auth. El escritorio valida el state y usa signInWithCredential.
 */

import '../index.css';
import { describeAuthError, getGoogleIdTokenWithPopup } from '../firebase/auth';

const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const message = document.getElementById('message')!;
const button = document.getElementById('signin') as HTMLButtonElement;
const returnLink = document.getElementById('return') as HTMLAnchorElement;

const state = new URLSearchParams(window.location.search).get('state');

if (!state || !STATE_PATTERN.test(state)) {
  message.textContent = 'Este enlace no es válido. Vuelve a YALEH y pulsa "Iniciar sesión con Google" otra vez.';
  button.hidden = true;
} else {
  button.addEventListener('click', async () => {
    button.disabled = true;
    message.textContent = 'Abriendo Google…';
    try {
      const idToken = await getGoogleIdTokenWithPopup();
      const link = `yaleh://auth?token=${encodeURIComponent(idToken)}&state=${encodeURIComponent(state)}`;
      returnLink.href = link;
      returnLink.classList.remove('hidden');
      button.hidden = true;
      message.textContent = 'Listo. Vuelve a YALEH (tu navegador puede pedirte permiso para abrirla).';
      window.location.href = link;
    } catch (error) {
      console.error(error);
      message.textContent = describeAuthError(error);
      button.disabled = false;
    }
  });
}
