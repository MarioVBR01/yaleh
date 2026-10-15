// @vitest-environment node
/**
 * ORION #8: exportar el historial de sesiones a PDF (el HTML que se convierte y el guardado).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionHistoryEntry } from '../shared/ipc-types';
import { buildHistoryHtml, exportHistoryPdf } from './history-export';

const NOW = new Date(2026, 9, 13, 10, 0, 0);
const entry = (overrides: Partial<SessionHistoryEntry>): SessionHistoryEntry => ({
  id: 's1', mode: 'offline', startedAt: NOW.getTime() - 3_600_000, endsAt: NOW.getTime(), durationSeconds: 1500,
  studiedSeconds: 1500,
  status: 'finished', focusLost: 2, connectionLost: 0, interruptions: 0, endReason: 'completed', files: ['apuntes.pdf'], ...overrides,
});

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(d => fs.rmSync(d, { recursive: true, force: true })));

describe('buildHistoryHtml', () => {
  it('incluye el resumen y una fila por sesión con sus columnas', () => {
    const html = buildHistoryHtml([entry({}), entry({ id: 's2', status: 'interrupted', endReason: null, mode: 'online', focusLost: 4 })], NOW);
    expect(html).toContain('Historial de sesiones — YALEH');
    expect(html).toContain('2 sesiones');
    expect(html.match(/<tr>/g)).toHaveLength(3); // encabezado + 2 filas
    expect(html).toContain('Completada');
    expect(html).toContain('Interrumpida');
    expect(html).toContain('Con conexión');
    expect(html).toContain('25 min');
    expect(html).toContain('<th>Archivos</th>');
    expect(html).toContain('apuntes.pdf');
  });

  it('no tiene scripts ni recursos externos', () => {
    const html = buildHistoryHtml([entry({})], NOW);
    expect(html).not.toMatch(/<script|src=|href=/i);
    expect(html).toContain("default-src 'none'");
  });

  it('sin sesiones lo dice', () => {
    expect(buildHistoryHtml([], NOW)).toContain('Todavía no hay sesiones.');
  });
});

describe('exportHistoryPdf', () => {
  it('guarda el PDF con fecha y hora en el nombre, sin sobrescribir', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-hist-'));
    dirs.push(dir);
    const render = vi.fn(async (_html: string) => Buffer.from('%PDF-1.7 prueba'));
    const first = await exportHistoryPdf([entry({})], dir, render, NOW);
    const second = await exportHistoryPdf([entry({})], dir, render, NOW);
    expect(path.basename(first)).toBe('Historial de sesiones 2026-10-13 10-00-00.pdf');
    expect(path.basename(second)).toBe('Historial de sesiones 2026-10-13 10-00-00 (2).pdf');
    expect(fs.readFileSync(first, 'utf8')).toBe('%PDF-1.7 prueba');
    expect(render.mock.calls[0][0]).toContain('<table>');
  });
});
