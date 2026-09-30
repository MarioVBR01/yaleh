/**
 * @file session-file.ts
 * @description Archivo de sesión .yaleh (brief, revisión 1.5): une la web y el
 * escritorio, al estilo de Safe Exam Browser. La web lo crea con el texto ya
 * extraído de las fuentes; el escritorio lo valida y abre la sesión.
 *
 * El checksum SHA-256 solo sirve para detectar archivos dañados: el propio
 * estudiante crea su archivo, así que no protege contra manipulaciones.
 * Este módulo no depende de Node ni del DOM: el SHA-256 se inyecta.
 */

import { LIMITS } from './config';

export const SESSION_FILE_FORMAT = 'yaleh-session';
export const SESSION_FILE_VERSION = 1;
export const SESSION_FILE_EXTENSION = '.yaleh';

export interface SessionFileSource {
  id: string;
  name: string;
  type: string;
  size: number;
  text: string;
}

export interface SessionFilePayload {
  format: typeof SESSION_FILE_FORMAT;
  version: typeof SESSION_FILE_VERSION;
  sessionId: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601: createdAt + 24 horas. */
  expiresAt: string;
  /** Solo para mostrar. */
  createdBy: { name: string; email: string };
  durationSeconds: number;
  sources: SessionFileSource[];
}

export interface SessionFile extends SessionFilePayload {
  /** SHA-256 (hex) de canonicalPayload(). */
  checksum: string;
}

export type Sha256 = (text: string) => string | Promise<string>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Texto sobre el que se calcula el checksum: los campos en un orden fijo,
 * para que la web y el escritorio obtengan exactamente la misma cadena.
 */
export function canonicalPayload(p: SessionFilePayload): string {
  return JSON.stringify({
    format: p.format,
    version: p.version,
    sessionId: p.sessionId,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    createdBy: { name: p.createdBy.name, email: p.createdBy.email },
    durationSeconds: p.durationSeconds,
    sources: p.sources.map(s => ({ id: s.id, name: s.name, type: s.type, size: s.size, text: s.text })),
  });
}

/** Crea el archivo (web). Devuelve el objeto listo para serializar. */
export async function createSessionFile(
  input: {
    sessionId: string;
    durationSeconds: number;
    createdBy: { name: string; email: string };
    sources: SessionFileSource[];
    now?: Date;
  },
  sha256: Sha256
): Promise<SessionFile> {
  const now = input.now ?? new Date();
  const payload: SessionFilePayload = {
    format: SESSION_FILE_FORMAT,
    version: SESSION_FILE_VERSION,
    sessionId: input.sessionId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + LIMITS.sessionFileTtlHours * 3_600_000).toISOString(),
    createdBy: input.createdBy,
    durationSeconds: input.durationSeconds,
    sources: input.sources,
  };
  return { ...payload, checksum: await sha256(canonicalPayload(payload)) };
}

export type SessionFileErrorCode =
  | 'too-large'
  | 'invalid'
  | 'version'
  | 'duration'
  | 'checksum'
  | 'expired'
  | 'used';

export const SESSION_FILE_ERRORS: Record<SessionFileErrorCode, string> = {
  'too-large': 'El archivo de sesión es demasiado grande (máximo 50 MB).',
  invalid: 'Este no es un archivo de sesión de YALEH válido.',
  version: 'Este archivo de sesión es de una versión de YALEH no compatible.',
  duration: 'La duración de la sesión no es válida (entre 1 y 180 minutos).',
  checksum: 'El archivo de sesión está dañado: su contenido no coincide con la suma de verificación.',
  expired: 'Este archivo de sesión caducó (vale 24 horas desde que se creó). Descarga uno nuevo en la web de YALEH.',
  used: 'Este archivo de sesión ya se usó. Descarga uno nuevo en la web de YALEH.',
};

export type SessionFileValidation =
  | { ok: true; file: SessionFile }
  | { ok: false; code: SessionFileErrorCode; message: string };

const fail = (code: SessionFileErrorCode): SessionFileValidation => ({ ok: false, code, message: SESSION_FILE_ERRORS[code] });

const isText = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isIsoDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Valida el contenido de un .yaleh: tamaño, formato, versión, duración,
 * fechas, fuentes, checksum y caducidad. El uso único lo comprueba el escritorio.
 */
export async function validateSessionFile(
  raw: string,
  options: { sha256: Sha256; now?: Date }
): Promise<SessionFileValidation> {
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > LIMITS.maxSessionFileBytes) return fail('too-large');

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail('invalid');
  }
  if (!data || typeof data !== 'object' || data.format !== SESSION_FILE_FORMAT) return fail('invalid');
  if (data.version !== SESSION_FILE_VERSION) return fail('version');

  const createdBy = data.createdBy as Record<string, unknown> | undefined;
  const sources = data.sources;
  if (
    typeof data.sessionId !== 'string' ||
    !ID_PATTERN.test(data.sessionId) ||
    !isIsoDate(data.createdAt) ||
    !isIsoDate(data.expiresAt) ||
    !createdBy ||
    typeof createdBy.name !== 'string' ||
    typeof createdBy.email !== 'string' ||
    typeof data.checksum !== 'string' ||
    !Array.isArray(sources)
  ) {
    return fail('invalid');
  }

  const duration = data.durationSeconds;
  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < LIMITS.minSessionMinutes * 60 ||
    duration > LIMITS.maxSessionMinutes * 60
  ) {
    return fail('duration');
  }

  const validSources = sources.every(s => {
    const src = s as Record<string, unknown>;
    return (
      typeof src.id === 'string' &&
      ID_PATTERN.test(src.id) &&
      isText(src.name, 300) &&
      typeof src.type === 'string' &&
      src.type.length <= 200 &&
      typeof src.size === 'number' &&
      Number.isFinite(src.size) &&
      src.size >= 0 &&
      typeof src.text === 'string'
    );
  });
  if (!validSources) return fail('invalid');

  const file = data as unknown as SessionFile;
  const expected = await options.sha256(canonicalPayload(file));
  if (expected !== file.checksum) return fail('checksum');

  const now = (options.now ?? new Date()).getTime();
  const expiresAt = Date.parse(file.expiresAt);
  const maxLifetime = LIMITS.sessionFileTtlHours * 3_600_000 + 5 * 60_000; // 5 min de tolerancia de reloj
  if (now > expiresAt || expiresAt - Date.parse(file.createdAt) > maxLifetime) return fail('expired');

  return { ok: true, file };
}

/** Nombre sugerido para la descarga: YALEH-sesion-2026-09-29-1530.yaleh */
export function sessionFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `YALEH-sesion-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${SESSION_FILE_EXTENSION}`;
}
