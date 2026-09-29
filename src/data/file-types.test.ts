import { describe, expect, it } from 'vitest';
import { classifyFile, matchesSignature } from './file-types';

describe('classifyFile', () => {
  it.each([
    ['apuntes.pdf', 'application/pdf', 'pdf'],
    ['APUNTES.PDF', '', 'pdf'],
    ['tarea.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
    ['tarea.docx', 'application/octet-stream', 'docx'],
    ['notas.txt', 'text/plain', 'txt'],
  ])('%s (%s) → %s', (name, mime, kind) => {
    expect(classifyFile(name, mime)).toBe(kind);
  });

  it.each([
    ['formato no admitido', 'video.mp4', 'video/mp4'],
    ['presentación (no en v1)', 'clase.pptx', ''],
    ['extensión y MIME no coinciden', 'falso.pdf', 'image/png'],
    ['sin extensión', 'archivo', 'application/pdf'],
  ])('rechaza: %s', (_label, name, mime) => {
    expect(classifyFile(name, mime)).toBeNull();
  });
});

describe('matchesSignature', () => {
  const bytes = (s: string) => new Uint8Array([...s].map(c => c.charCodeAt(0)));

  it('PDF y DOCX se reconocen por sus primeros bytes', () => {
    expect(matchesSignature('pdf', bytes('%PDF-1.7'))).toBe(true);
    expect(matchesSignature('docx', bytes('PK\u0003\u0004'))).toBe(true);
  });

  it('rechaza un archivo renombrado', () => {
    expect(matchesSignature('pdf', bytes('PK\u0003\u0004'))).toBe(false);
    expect(matchesSignature('docx', bytes('%PDF'))).toBe(false);
  });
});
