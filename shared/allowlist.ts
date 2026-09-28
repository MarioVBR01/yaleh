/**
 * @file allowlist.ts
 * @description Decide si una URL externa está en la lista de sitios permitidos.
 * La usan el proceso principal (bloqueo real) y la interfaz (mensajes al usuario).
 */

import { ALLOWED_SITES, DEV_SERVER_ORIGIN, type AllowedSite } from './config';

export interface AllowlistOptions {
  /** Permite el servidor de desarrollo de Vite (solo sin empaquetar). */
  allowDevServer?: boolean;
  /** Lista a usar; por defecto, la de `shared/config.ts`. */
  sites?: readonly AllowedSite[];
}

function matchesSite(url: URL, site: AllowedSite): boolean {
  const host = url.hostname.toLowerCase();
  const siteHost = site.host.toLowerCase();
  const hostOk =
    host === siteHost || (site.includeSubdomains === true && host.endsWith(`.${siteHost}`));
  if (!hostOk) return false;
  return site.pathPrefix === undefined || url.pathname.startsWith(site.pathPrefix);
}

/**
 * Devuelve true si `rawUrl` es una URL HTTPS de un sitio permitido
 * (o el servidor de desarrollo, si se habilita).
 */
export function isUrlAllowed(rawUrl: string, options: AllowlistOptions = {}): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (options.allowDevServer && url.origin === DEV_SERVER_ORIGIN) return true;

  if (url.protocol !== 'https:') return false;
  // Rechaza credenciales incrustadas (https://usuario@sitio) y puertos no estándar.
  if (url.username || url.password || url.port) return false;

  const sites = options.sites ?? ALLOWED_SITES;
  return sites.some(site => matchesSite(url, site));
}

/** Nombre de host legible para mensajes de la interfaz. */
export function displayHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}
