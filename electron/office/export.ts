/**
 * @file export.ts
 * @description Exportación de los editores de ofimática (brief, sección 6.1).
 * La hace el proceso principal y guarda directo en Documentos\YALEH, sin diálogo
 * del sistema (el explorador nunca se abre durante el kiosko). Funciona sin conexión.
 * - Documento (JSON de TipTap) → .docx (docx)
 * - Hoja de cálculo (celdas) → .xlsx (ExcelJS)
 * - Presentación (diapositivas) → .pptx (PptxGenJS)
 */

import fs from 'node:fs';
import path from 'node:path';
import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from 'docx';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import type { OfficeExportRequest, OfficeSlide, TipTapNode } from '../../shared/ipc-types';

// ─── Documento ───────────────────────────────────────────────────────────────

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;
const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function runs(nodes: TipTapNode[] | undefined): TextRun[] {
  return (nodes ?? []).flatMap(node => {
    if (node.type === 'hardBreak') return [new TextRun({ text: '', break: 1 })];
    if (node.type !== 'text' || !node.text) return [];
    const marks = new Set((node.marks ?? []).map(m => m.type));
    return [
      new TextRun({
        text: node.text,
        bold: marks.has('bold'),
        italics: marks.has('italic'),
        underline: marks.has('underline') ? {} : undefined,
        strike: marks.has('strike'),
        font: marks.has('code') ? 'Consolas' : undefined,
      }),
    ];
  });
}

function blockToParagraphs(node: TipTapNode, list?: { kind: 'bullet' | 'ordered'; level: number }): Paragraph[] {
  const alignment = ALIGN[String(node.attrs?.textAlign ?? '')];
  switch (node.type) {
    case 'paragraph':
      return [
        new Paragraph({
          children: runs(node.content),
          alignment,
          ...(list?.kind === 'bullet' ? { bullet: { level: list.level } } : {}),
          ...(list?.kind === 'ordered' ? { numbering: { reference: 'yaleh-ordered', level: list.level } } : {}),
        }),
      ];
    case 'heading': {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)));
      return [new Paragraph({ children: runs(node.content), heading: HEADINGS[level - 1], alignment })];
    }
    case 'bulletList':
    case 'orderedList': {
      const kind = node.type === 'bulletList' ? 'bullet' : 'ordered';
      const level = list ? list.level + 1 : 0;
      return (node.content ?? []).flatMap(item =>
        (item.content ?? []).flatMap(child => blockToParagraphs(child, { kind, level }))
      );
    }
    case 'blockquote':
      return (node.content ?? []).flatMap(child => blockToParagraphs(child, list));
    case 'codeBlock':
      return [new Paragraph({ children: [new TextRun({ text: (node.content ?? []).map(c => c.text ?? '').join(''), font: 'Consolas' })] })];
    case 'horizontalRule':
      return [new Paragraph({ children: [new TextRun('────────────────────')] })];
    default:
      return node.content ? node.content.flatMap(child => blockToParagraphs(child, list)) : [];
  }
}

export async function buildDocx(doc: TipTapNode): Promise<Buffer> {
  const paragraphs = (doc.content ?? []).flatMap(node => blockToParagraphs(node));
  const document = new Document({
    creator: 'YALEH',
    numbering: {
      config: [
        {
          reference: 'yaleh-ordered',
          levels: [0, 1, 2].map(level => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
          })),
        },
      ],
    },
    sections: [{ children: paragraphs.length > 0 ? paragraphs : [new Paragraph('')] }],
  });
  return Packer.toBuffer(document);
}

// ─── Hoja de cálculo ─────────────────────────────────────────────────────────

export async function buildXlsx(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YALEH';
  const sheet = workbook.addWorksheet('Hoja 1');
  rows.forEach((row, r) =>
    row.forEach((raw, c) => {
      const value = raw.trim();
      if (!value) return;
      const cell = sheet.getCell(r + 1, c + 1);
      if (value.startsWith('=')) cell.value = { formula: value.slice(1) };
      else if (/^-?\d+([.,]\d+)?$/.test(value)) cell.value = Number(value.replace(',', '.'));
      else cell.value = value;
    })
  );
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ─── Presentación ────────────────────────────────────────────────────────────

export async function buildPptx(slides: OfficeSlide[]): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'YALEH';
  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: s.background.replace('#', '') };
    slide.addText(s.title, { x: 0.6, y: 0.5, w: 12, h: 1.2, fontSize: 36, bold: true, color: 'FFFFFF' });
    slide.addText(s.content, { x: 0.6, y: 1.9, w: 12, h: 5, fontSize: 20, color: 'E2E8F0', valign: 'top' });
  }
  const data = await pptx.write({ outputType: 'nodebuffer' });
  return data as Buffer;
}

// ─── Archivo ─────────────────────────────────────────────────────────────────

const EXTENSIONS = { docx: 'docx', xlsx: 'xlsx', pptx: 'pptx' } as const;

/** Nombre con fecha y hora: "Documento 2026-10-03 15-30-12.docx" (sin caracteres inválidos en Windows). */
export function exportFileName(title: string, kind: OfficeExportRequest['kind'], date: Date = new Date()): string {
  const clean = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Archivo';
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(
    date.getMinutes()
  )}-${pad(date.getSeconds())}`;
  return `${clean} ${stamp}.${EXTENSIONS[kind]}`;
}

/** Guarda sin sobrescribir: si el nombre existe, agrega " (2)", " (3)", … */
export function saveUnique(directory: string, fileName: string, data: Buffer): string {
  fs.mkdirSync(directory, { recursive: true });
  const ext = path.extname(fileName);
  const base = fileName.slice(0, -ext.length);
  let target = path.join(directory, fileName);
  for (let i = 2; fs.existsSync(target); i++) target = path.join(directory, `${base} (${i})${ext}`);
  fs.writeFileSync(target, data);
  return target;
}

export async function exportOfficeFile(request: OfficeExportRequest, directory: string, now: Date = new Date()): Promise<string> {
  let data: Buffer;
  if (request.kind === 'docx') data = await buildDocx(request.document);
  else if (request.kind === 'xlsx') data = await buildXlsx(request.rows);
  else data = await buildPptx(request.slides);
  return saveUnique(directory, exportFileName(request.title, request.kind, now), data);
}
