/**
 * @file file-types.ts
 * @description Formatos admitidos en v1 (brief, sección 8.4): PDF con texto, DOCX y TXT.
 * La validación no depende solo del tipo MIME: en Windows suele venir vacío o genérico.
 */

export type SourceKind = 'pdf' | 'docx' | 'txt';

const MIME_BY_KIND: Record<SourceKind, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
};

/** Tipos MIME que no dicen nada del contenido (se aceptan si la extensión es válida). */
const GENERIC_MIME = new Set(['', 'application/octet-stream']);

export const ACCEPT_ATTRIBUTE = '.pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Clasifica un archivo por su extensión y comprueba que el tipo MIME sea coherente. */
export function classifyFile(name: string, mime: string): SourceKind | null {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  const kind = (['pdf', 'docx', 'txt'] as const).find(k => k === extension);
  if (!kind) return null;
  if (GENERIC_MIME.has(mime) || MIME_BY_KIND[kind].includes(mime)) return kind;
  return null;
}

/** Comprueba la firma de los primeros bytes: PDF empieza con "%PDF" y DOCX es un ZIP ("PK"). */
export function matchesSignature(kind: SourceKind, firstBytes: Uint8Array): boolean {
  const ascii = String.fromCharCode(...firstBytes.slice(0, 4));
  if (kind === 'pdf') return ascii.startsWith('%PDF');
  if (kind === 'docx') return ascii.startsWith('PK');
  return true;
}
