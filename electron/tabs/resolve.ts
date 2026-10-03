/**
 * @file resolve.ts
 * @description Qué se carga en una pestaña interna (brief, secciones 6.2 y 10):
 * - un sitio de la lista de sitios permitidos, tal cual;
 * - un enlace de YouTube, en el reproductor propio de YALEH;
 * - cualquier otra cosa se bloquea.
 */

import { isUrlAllowed } from '../../shared/allowlist';
import { extractYouTubeId, playerUrl } from '../../shared/youtube';

export type TabTarget = { kind: 'web'; url: string } | { kind: 'youtube'; url: string; videoId: string };

export function resolveTabUrl(rawUrl: string, playerPage: string): TabTarget | null {
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048) return null;
  const videoId = extractYouTubeId(rawUrl);
  if (videoId) return { kind: 'youtube', url: playerUrl(playerPage, videoId), videoId };
  return isUrlAllowed(rawUrl) ? { kind: 'web', url: rawUrl } : null;
}
