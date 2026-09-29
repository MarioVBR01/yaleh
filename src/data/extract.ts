/**
 * @file extract.ts
 * @description Extracción de texto en el cliente (brief, sección 8.4):
 * pdf.js para PDF, mammoth para DOCX y lectura directa para TXT.
 * Las librerías se cargan solo cuando hacen falta.
 */

import { matchesSignature, type SourceKind } from './file-types';

export class ExtractionError extends Error {}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')
      .replace(/[ \t]+\n/g, '\n');
    pages.push(text.trim());
  }
  await task.destroy();
  return pages.join('\n\n');
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const { default: mammoth } = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/** Devuelve el texto del archivo. Lanza ExtractionError con un mensaje para el estudiante. */
export async function extractText(file: File, kind: SourceKind): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (!matchesSignature(kind, new Uint8Array(buffer.slice(0, 8)))) {
    throw new ExtractionError('El contenido no corresponde a su extensión.');
  }

  let text: string;
  try {
    if (kind === 'pdf') text = await extractPdf(buffer);
    else if (kind === 'docx') text = await extractDocx(buffer);
    else text = new TextDecoder('utf-8').decode(buffer);
  } catch (error) {
    console.error(`No se pudo leer ${file.name}:`, error);
    throw new ExtractionError('No se pudo leer el archivo. ¿Está dañado o protegido?');
  }

  text = text.replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length === 0) {
    throw new ExtractionError(
      kind === 'pdf' ? 'No tiene texto: puede ser un PDF escaneado (no admitido en v1).' : 'El archivo no tiene texto.'
    );
  }
  return text;
}
