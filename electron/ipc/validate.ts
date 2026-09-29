/**
 * @file validate.ts
 * @description Validación de los mensajes IPC: origen del remitente y argumentos.
 */

import { EXTERNAL_OPEN_ORIGINS } from '../../shared/config';
import type { SessionMode } from '../../shared/ipc-types';

export interface SenderTrust {
  /** URL `file://` del index.html de la interfaz empaquetada. */
  appIndexUrl: string;
  /** Origen del servidor de Vite; null cuando la app está empaquetada. */
  devServerOrigin: string | null;
  /** Orígenes web de YALEH aceptados (se habilitan en la fase 4). */
  trustedWebOrigins: readonly string[];
}

function normalizeFileUrl(url: URL): string {
  // Windows no distingue mayúsculas en las rutas; Chromium puede cambiar la letra de unidad.
  return decodeURIComponent(url.pathname).toLowerCase();
}

/** Devuelve true si el mensaje viene de la interfaz propia de YALEH. */
export function isTrustedSenderUrl(rawUrl: string | undefined, trust: SenderTrust): boolean {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol === 'file:') {
    const expected = new URL(trust.appIndexUrl);
    return expected.protocol === 'file:' && normalizeFileUrl(url) === normalizeFileUrl(expected);
  }
  if (trust.devServerOrigin && url.origin === trust.devServerOrigin) return true;
  return trust.trustedWebOrigins.includes(url.origin);
}

/** Valida la duración pedida por la interfaz. Lanza un error si no es válida. */
export function parseDurationSeconds(value: unknown, minSeconds: number, maxSeconds: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('La duración debe ser un número entero de segundos.');
  }
  if (value < minSeconds || value > maxSeconds) {
    throw new Error('La duración está fuera del rango permitido.');
  }
  return value;
}

/** Solo se pueden abrir en el navegador del sistema las páginas HTTPS de la web de YALEH. */
export function isAllowedExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  return EXTERNAL_OPEN_ORIGINS.includes(url.origin);
}

/** Valida el modo de sesión pedido por la interfaz. */
export function parseSessionMode(value: unknown): SessionMode {
  if (value !== 'online' && value !== 'offline') {
    throw new Error('Modo de sesión no válido.');
  }
  return value;
}
