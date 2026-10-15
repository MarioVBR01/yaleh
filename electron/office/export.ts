/**
 * @file export.ts
 * @description Exportaciones que guarda el proceso principal, directo en la carpeta de
 * exportaciones (Documentos\YALEH por defecto), sin diálogo del sistema. Funciona sin conexión.
 * - Presentación (diapositivas) → .pptx (PptxGenJS). Los editores de ofimática se eliminaron
 *   (ORION #12); esta parte queda para la presentación generada por Gemini.
 * - exportFileName y saveUnique también los usa el PDF del historial (ORION #8).
 */

import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import type { OfficeExportRequest, OfficeSlide } from '../../shared/ipc-types';

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

const EXTENSIONS = { pptx: 'pptx', pdf: 'pdf' } as const;

/** Nombre con fecha y hora: "Presentación 2026-10-03 15-30-12.pptx" (sin caracteres inválidos en Windows). */
export function exportFileName(title: string, kind: keyof typeof EXTENSIONS, date: Date = new Date()): string {
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
  return saveUnique(directory, exportFileName(request.title, request.kind, now), await buildPptx(request.slides));
}
