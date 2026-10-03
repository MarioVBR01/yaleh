/**
 * @file validate.ts
 * @description Validación de los mensajes IPC: origen del remitente y argumentos.
 */

import type { OfficeExportRequest, OfficeSlide, TipTapNode } from '../../shared/ipc-types';

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

/** Rectángulo de una pestaña interna: números finitos, sin negativos y de tamaño razonable. */
export function parseBounds(value: unknown): { x: number; y: number; width: number; height: number } {
  const b = value as Record<string, unknown> | null;
  const keys = ['x', 'y', 'width', 'height'] as const;
  if (!b || typeof b !== 'object' || !keys.every(k => typeof b[k] === 'number' && Number.isFinite(b[k] as number))) {
    throw new Error('Posición de pestaña no válida.');
  }
  const [x, y, width, height] = keys.map(k => Math.max(0, Math.min(20_000, Math.round(b[k] as number))));
  return { x, y, width, height };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_OFFICE_JSON = 10_000_000;

/** Valida el pedido de exportación de ofimática (tipo, título, tamaño y forma de los datos). */
export function parseOfficeRequest(value: unknown): OfficeExportRequest {
  const req = value as Record<string, unknown> | null;
  if (!req || typeof req !== 'object') throw new Error('Pedido de exportación no válido.');
  if (JSON.stringify(req).length > MAX_OFFICE_JSON) throw new Error('El archivo es demasiado grande para exportarlo.');
  const title = typeof req.title === 'string' ? req.title.slice(0, 100) : 'Archivo';

  if (req.kind === 'docx') {
    const doc = req.document as Record<string, unknown> | null;
    if (!doc || doc.type !== 'doc') throw new Error('Documento no válido.');
    return { kind: 'docx', title, document: doc as unknown as TipTapNode };
  }
  if (req.kind === 'xlsx') {
    const rows = req.rows;
    if (
      !Array.isArray(rows) ||
      rows.length > 5000 ||
      !rows.every(r => Array.isArray(r) && r.length <= 200 && r.every(c => typeof c === 'string' && c.length <= 32767))
    ) {
      throw new Error('Hoja de cálculo no válida.');
    }
    return { kind: 'xlsx', title, rows: rows as string[][] };
  }
  if (req.kind === 'pptx') {
    const slides = req.slides;
    if (
      !Array.isArray(slides) ||
      slides.length === 0 ||
      slides.length > 300 ||
      !slides.every(s => {
        const slide = s as Record<string, unknown>;
        return typeof slide.title === 'string' && typeof slide.content === 'string' && typeof slide.background === 'string' && HEX_COLOR.test(slide.background);
      })
    ) {
      throw new Error('Presentación no válida.');
    }
    return { kind: 'pptx', title, slides: slides as OfficeSlide[] };
  }
  throw new Error('Tipo de archivo no válido.');
}
