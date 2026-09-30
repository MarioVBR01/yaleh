/**
 * @file validate.ts
 * @description Validación de los mensajes IPC: origen del remitente y argumentos.
 */


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

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Identificadores de sesión, fuente o nota. */
export function parseId(value: unknown, what = 'identificador'): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new Error(`${what} no válido.`);
  return value;
}

/** Máximo de texto por fuente (unos 20 millones de caracteres). */
export const MAX_SOURCE_CHARS = 20_000_000;

export function parseSourceInput(source: unknown, text: unknown) {
  const s = source as { id?: unknown; name?: unknown; type?: unknown; size?: unknown } | null;
  if (!s || typeof s !== 'object') throw new Error('Fuente no válida.');
  if (typeof s.name !== 'string' || s.name.length === 0 || s.name.length > 300) throw new Error('Nombre de archivo no válido.');
  if (typeof s.type !== 'string' || s.type.length > 200) throw new Error('Tipo de archivo no válido.');
  if (typeof s.size !== 'number' || !Number.isFinite(s.size) || s.size < 0) throw new Error('Tamaño no válido.');
  if (typeof text !== 'string' || text.length > MAX_SOURCE_CHARS) throw new Error('Texto no válido.');
  return { source: { id: parseId(s.id, 'Fuente'), name: s.name, type: s.type, size: s.size }, text };
}

export function parseNoteInput(note: unknown) {
  const n = note as { id?: unknown; text?: unknown } | null;
  if (!n || typeof n !== 'object') throw new Error('Nota no válida.');
  if (typeof n.text !== 'string' || n.text.length > 100_000) throw new Error('Texto de la nota no válido.');
  return { id: parseId(n.id, 'Nota'), text: n.text };
}
