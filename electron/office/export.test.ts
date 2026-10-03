// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseOfficeRequest } from '../ipc/validate';
import { buildDocx, buildPptx, buildXlsx, exportFileName, exportOfficeFile, saveUnique } from './export';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-office-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const DOC = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Tortugas' }] },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', text: 'Son ' },
        { type: 'text', text: 'reptiles', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' longevos.', marks: [{ type: 'italic' }, { type: 'underline' }] },
      ],
    },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Caparazón' }] }] }],
    },
    {
      type: 'orderedList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Primero' }] }] }],
    },
  ],
};

describe('exportación de ofimática', () => {
  it('Documento (TipTap) → .docx con títulos, formato y listas', async () => {
    const buffer = await buildDocx(DOC);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Tortugas');
    expect(xml).toContain('reptiles');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('Caparazón');
    expect(xml).toContain('<w:numPr>');
  });

  it('Documento vacío → .docx válido', async () => {
    const zip = await JSZip.loadAsync(await buildDocx({ type: 'doc' }));
    expect(zip.file('word/document.xml')).toBeTruthy();
  });

  it('Hoja de cálculo → .xlsx con números, texto y fórmulas', async () => {
    const buffer = await buildXlsx([
      ['Nombre', 'Nota'],
      ['Ana', '85'],
      ['Luis', '92,5'],
      ['Promedio', '=AVERAGE(B2:B3)'],
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Hoja 1')!;
    expect(sheet.getCell('A1').value).toBe('Nombre');
    expect(sheet.getCell('B2').value).toBe(85);
    expect(sheet.getCell('B3').value).toBe(92.5);
    expect(sheet.getCell('B4').value).toMatchObject({ formula: 'AVERAGE(B2:B3)' });
  });

  it('Presentación → .pptx con una diapositiva por elemento', async () => {
    const buffer = await buildPptx([
      { title: 'Introducción', content: 'Las tortugas', background: '#1e293b' },
      { title: 'Hábitat', content: 'Mar y tierra', background: '#1e3a8a' },
    ]);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('ppt/slides/slide2.xml')).toBeTruthy();
    expect(await zip.file('ppt/slides/slide1.xml')!.async('string')).toContain('Introducción');
  });

  it('nombre con fecha y hora, sin caracteres inválidos en Windows', () => {
    expect(exportFileName('Mi informe: final?', 'docx', new Date(2026, 9, 3, 15, 7, 9))).toBe('Mi informe final 2026-10-03 15-07-09.docx');
    expect(exportFileName('   ', 'xlsx', new Date(2026, 0, 1, 0, 0, 0))).toBe('Archivo 2026-01-01 00-00-00.xlsx');
  });

  it('no sobrescribe archivos existentes', () => {
    const first = saveUnique(dir, 'a.docx', Buffer.from('1'));
    const second = saveUnique(dir, 'a.docx', Buffer.from('2'));
    expect(path.basename(first)).toBe('a.docx');
    expect(path.basename(second)).toBe('a (2).docx');
    expect(fs.readFileSync(first, 'utf8')).toBe('1');
  });

  it('exportOfficeFile guarda en la carpeta indicada (creándola) y devuelve la ruta', async () => {
    const target = path.join(dir, 'Documentos', 'YALEH');
    const saved = await exportOfficeFile({ kind: 'xlsx', title: 'Notas', rows: [['1']] }, target, new Date(2026, 9, 3, 10, 0, 0));
    expect(saved).toBe(path.join(target, 'Notas 2026-10-03 10-00-00.xlsx'));
    expect(fs.existsSync(saved)).toBe(true);
  });
});

describe('parseOfficeRequest', () => {
  it('acepta pedidos válidos', () => {
    expect(parseOfficeRequest({ kind: 'docx', title: 'Doc', document: DOC }).kind).toBe('docx');
    expect(parseOfficeRequest({ kind: 'pptx', title: 'P', slides: [{ title: 'a', content: 'b', background: '#000000' }] }).kind).toBe('pptx');
  });

  it.each([
    ['tipo desconocido', { kind: 'exe', title: 'x' }],
    ['documento sin raíz doc', { kind: 'docx', title: 'x', document: { type: 'paragraph' } }],
    ['celdas que no son texto', { kind: 'xlsx', title: 'x', rows: [[1, 2]] }],
    ['color inválido', { kind: 'pptx', title: 'x', slides: [{ title: 'a', content: 'b', background: 'red' }] }],
    ['presentación vacía', { kind: 'pptx', title: 'x', slides: [] }],
  ])('rechaza %s', (_name, req) => {
    expect(() => parseOfficeRequest(req)).toThrow();
  });
});
