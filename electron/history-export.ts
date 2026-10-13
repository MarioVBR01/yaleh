/**
 * @file history-export.ts
 * @description Exportar el historial de sesiones a PDF (ORION #8).
 * El proceso principal arma el documento con los datos de SQLite (no con lo que mande la
 * interfaz) y lo guarda en Documentos\YALEH, sin diálogo del sistema (se puede durante el kiosko).
 * El PDF lo genera `printToPDF` de Electron en una ventana oculta sin red ni JavaScript
 * (ver main.ts); aquí solo se arma el HTML, que se prueba aparte.
 */

import type { SessionHistoryEntry } from '../shared/ipc-types';
import { computeStats, formatDuration } from '../src/lib/stats';
import { exportFileName, saveUnique } from './office/export';

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function sessionStatusText(s: SessionHistoryEntry): string {
  if (s.status === 'active') return 'En curso';
  if (s.status === 'interrupted') return 'Interrumpida';
  return s.endReason === 'dev-release' ? 'Liberada (desarrollo)' : 'Completada';
}

const formatDate = (ms: number) => new Date(ms).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });

/** Documento HTML del historial (autocontenido: sin scripts ni recursos externos). */
export function buildHistoryHtml(entries: SessionHistoryEntry[], generatedAt: Date = new Date(), studentName: string | null = null): string {
  const stats = computeStats(entries, generatedAt);
  const rows = entries
    .map(
      s => `<tr>
        <td>${escapeHtml(formatDate(s.startedAt))}</td>
        <td>${escapeHtml(formatDuration(s.durationSeconds))}</td>
        <td>${s.mode === 'online' ? 'Con conexión' : 'Sin conexión'}</td>
        <td class="status-${s.status}">${escapeHtml(sessionStatusText(s))}</td>
        <td class="num">${s.focusLost}</td>
        <td class="num">${s.connectionLost}</td>
        <td class="num">${s.interruptions}</td>
      </tr>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Historial de sesiones — YALEH</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 24px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #475569; margin-bottom: 16px; }
  .summary { display: flex; gap: 12px; margin-bottom: 16px; }
  .summary div { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; }
  .summary strong { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; }
  td.num, th.num { text-align: right; }
  .status-interrupted { color: #b91c1c; }
  .status-finished { color: #047857; }
  .empty { color: #475569; padding: 16px 0; }
</style>
</head>
<body>
  <h1>Historial de sesiones — YALEH</h1>
  <p class="meta">${studentName ? `Estudiante: ${escapeHtml(studentName)} · ` : ''}Generado el ${escapeHtml(formatDate(generatedAt.getTime()))} · ${entries.length} sesiones</p>
  <div class="summary">
    <div>Completadas<strong>${stats.completed}</strong></div>
    <div>Interrumpidas<strong>${stats.interrupted}</strong></div>
    <div>Minutos de concentración<strong>${escapeHtml(formatDuration(stats.totalMinutes * 60))}</strong></div>
    <div>Pérdidas de foco por sesión<strong>${String(stats.avgFocusLost).replace('.', ',')}</strong></div>
  </div>
  ${
    entries.length === 0
      ? '<p class="empty">Todavía no hay sesiones.</p>'
      : `<table>
    <thead><tr>
      <th>Fecha</th><th>Duración</th><th>Modo</th><th>Estado</th>
      <th class="num">Pérdidas de foco</th><th class="num">Cortes de red</th><th class="num">Interrupciones</th>
    </tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>`
  }
</body>
</html>`;
}

/** Genera el PDF con `renderPdf` y lo guarda sin sobrescribir. Devuelve la ruta. */
export async function exportHistoryPdf(
  entries: SessionHistoryEntry[],
  directory: string,
  renderPdf: (html: string) => Promise<Buffer>,
  now: Date = new Date(),
  studentName: string | null = null
): Promise<string> {
  const pdf = await renderPdf(buildHistoryHtml(entries, now, studentName));
  return saveUnique(directory, exportFileName('Historial de sesiones', 'pdf', now), pdf);
}
