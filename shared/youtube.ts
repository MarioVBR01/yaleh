/**
 * @file youtube.ts
 * @description Enlaces de YouTube (brief, sección 6.2). youtube.com sigue bloqueado:
 * los videos se abren en el reproductor propio de YALEH, que inserta
 * youtube-nocookie.com/embed/<id>.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);

export function isValidVideoId(id: string | null | undefined): id is string {
  return typeof id === 'string' && VIDEO_ID.test(id);
}

/**
 * Devuelve el id del video si la URL es un enlace de YouTube reconocido:
 * youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, /embed/, /live/.
 */
export function extractYouTubeId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (url.pathname === '/watch') {
    candidate = url.searchParams.get('v');
  } else {
    const match = /^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname);
    candidate = match ? match[2] : null;
  }
  return isValidVideoId(candidate) ? candidate : null;
}

/** URL del reproductor propio de YALEH para un video. */
export function playerUrl(playerPage: string, videoId: string): string {
  const url = new URL(playerPage);
  url.searchParams.set('v', videoId);
  return url.toString();
}
