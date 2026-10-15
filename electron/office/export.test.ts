// @vitest-environment node
/**
 * Exportación a .pptx (queda para la presentación de Gemini; los editores se eliminaron, ORION #12),
 * nombre del archivo y guardado sin sobrescribir.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseOfficeRequest } from '../ipc/validate';
import { buildPptx, exportFileName, exportOfficeFile, saveUnique } from './export';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-office-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const SLIDES = [
  { title: 'Introducción', content: 'Las tortugas', background: '#1e293b' },
  { title: 'Hábitat', content: 'Mar y tierra', background: '#1e3a8a' },
];

describe('exportación', () => {
  it('Presentación → .pptx con una diapositiva por elemento', async () => {
    const zip = await JSZip.loadAsync(await buildPptx(SLIDES));
    expect(zip.file('ppt/slides/slide2.xml')).toBeTruthy();
    expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain('Introducción');
  });

  it('nombre con fecha y hora, sin caracteres inválidos en Windows', () => {
    expect(exportFileName('Mi informe: final?', 'pptx', new Date(2026, 9, 3, 15, 7, 9))).toBe('Mi informe final 2026-10-03 15-07-09.pptx');
    expect(exportFileName('   ', 'pdf', new Date(2026, 0, 1, 0, 0, 0))).toBe('Archivo 2026-01-01 00-00-00.pdf');
  });

  it('no sobrescribe archivos existentes', () => {
    const first = saveUnique(dir, 'a.pptx', Buffer.from('1'));
    const second = saveUnique(dir, 'a.pptx', Buffer.from('2'));
    expect(path.basename(first)).toBe('a.pptx');
    expect(path.basename(second)).toBe('a (2).pptx');
    expect(fs.readFileSync(first, 'utf8')).toBe('1');
  });

  it('exportOfficeFile guarda en la carpeta indicada (creándola) y devuelve la ruta', async () => {
    const target = path.join(dir, 'Documentos', 'YALEH');
    const saved = await exportOfficeFile({ kind: 'pptx', title: 'Tortugas', slides: SLIDES }, target, new Date(2026, 9, 3, 10, 0, 0));
    expect(saved).toBe(path.join(target, 'Tortugas 2026-10-03 10-00-00.pptx'));
    expect(fs.existsSync(saved)).toBe(true);
  });
});

describe('parseOfficeRequest', () => {
  it('acepta una presentación válida', () => {
    expect(parseOfficeRequest({ kind: 'pptx', title: 'P', slides: [{ title: 'a', content: 'b', background: '#000000' }] }).kind).toBe('pptx');
  });

  it.each([
    ['tipo desconocido', { kind: 'exe', title: 'x' }],
    ['documento (ya no existe el editor)', { kind: 'docx', title: 'x', document: { type: 'doc' } }],
    ['hoja de cálculo (ya no existe el editor)', { kind: 'xlsx', title: 'x', rows: [['1']] }],
    ['color inválido', { kind: 'pptx', title: 'x', slides: [{ title: 'a', content: 'b', background: 'red' }] }],
    ['presentación vacía', { kind: 'pptx', title: 'x', slides: [] }],
  ])('rechaza %s', (_name, req) => {
    expect(() => parseOfficeRequest(req)).toThrow();
  });
});
