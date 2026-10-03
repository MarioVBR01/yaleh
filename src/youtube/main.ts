/**
 * @file main.ts
 * @description Reproductor de YouTube propio de YALEH (brief, sección 6.2).
 * Se abre en una pestaña interna del kiosko con ?v=<id> e inserta el reproductor
 * oficial de youtube-nocookie.com. Se publica en Firebase Hosting porque YouTube
 * exige un Referer de un sitio HTTPS (si falta, muestra el "Error 153").
 * youtube.com sigue bloqueado: desde aquí no se puede navegar a YouTube.
 */

import '../index.css';
import { isValidVideoId } from '@shared/youtube';

const player = document.getElementById('player')!;
const message = document.getElementById('message')!;
const videoId = new URLSearchParams(window.location.search).get('v');

if (!isValidVideoId(videoId)) {
  player.remove();
  message.textContent = 'El enlace del video no es válido.';
} else {
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  iframe.title = 'Reproductor de YouTube';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.className = 'w-full h-full border-0';
  player.appendChild(iframe);
}
