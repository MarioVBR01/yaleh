/**
 * @file text.ts
 * @description División del texto extraído en partes (brief, sección 8.2):
 * cada documento de Firestore admite como máximo 1 MiB.
 */

/**
 * Caracteres por parte. En UTF-8 un carácter ocupa hasta 4 bytes:
 * 200 000 × 4 = 800 000 bytes, con margen para los demás campos del documento.
 */
export const CHUNK_MAX_CHARS = 200_000;

/** Divide el texto en partes de como máximo `maxChars`, cortando en un salto de línea o espacio si es posible. */
export function splitText(text: string, maxChars: number = CHUNK_MAX_CHARS): string[] {
  if (text.length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
      if (cut > maxChars * 0.5) end = start + cut + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
