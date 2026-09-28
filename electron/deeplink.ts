/**
 * @file deeplink.ts
 * @description Enlaces `yaleh://`. Solo se aceptan:
 * - yaleh://auth?token=...&state=...   (la validación del state llega en la fase 4)
 * - yaleh://sesion?id=...
 * Todo lo demás se ignora (y el proceso principal lo registra).
 */

export const PROTOCOL_SCHEME = 'yaleh';

export type DeepLink =
  | { kind: 'auth'; token: string; state: string | null }
  | { kind: 'session'; sessionId: string };

const TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,8192}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function parseDeepLink(raw: string): DeepLink | null {
  if (typeof raw !== 'string' || raw.length > 10000) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${PROTOCOL_SCHEME}:`) return null;
  // Windows a veces agrega una barra final: yaleh://auth/?token=...
  if (url.pathname !== '' && url.pathname !== '/') return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();

  if (host === 'auth') {
    const token = url.searchParams.get('token');
    const state = url.searchParams.get('state');
    if (!token || !TOKEN_PATTERN.test(token)) return null;
    if (state !== null && !STATE_PATTERN.test(state)) return null;
    return { kind: 'auth', token, state };
  }

  if (host === 'sesion') {
    const id = url.searchParams.get('id');
    if (!id || !SESSION_ID_PATTERN.test(id)) return null;
    return { kind: 'session', sessionId: id };
  }

  return null;
}

/** Busca un enlace yaleh:// entre los argumentos con que Windows abre la app. */
export function findDeepLinkInArgv(argv: readonly string[]): string | undefined {
  return argv.find(arg => arg.toLowerCase().startsWith(`${PROTOCOL_SCHEME}://`));
}

/** Descripción segura para el registro: nunca incluye tokens ni parámetros. */
export function describeDeepLinkForLog(raw: string): string {
  const withoutQuery = String(raw).split(/[?#]/)[0];
  return withoutQuery.slice(0, 80);
}
