/**
 * @file smoke.ts
 * @description Prueba de humo del escritorio (npm run smoke:electron). Solo sin empaquetar.
 * Abre la versión compilada sin ventana visible, con una carpeta de datos temporal, y comprueba:
 * 1. Que la interfaz carga con la CSP, el preload expone electronAPI y la IPC responde.
 * 2. Que SQLite tiene sus migraciones.
 * 3. Un recorrido offline real: modo offline → dropzone → extracción de un TXT y un PDF
 *    (pdf.js desde file://) → rechazo de un DOCX dañado (mammoth) → filas en SQLite.
 * No activa el kiosko.
 */

import type { BrowserWindow } from 'electron';
import type { DatabaseSync } from 'node:sqlite';

/** Código que se ejecuta en la página: genera archivos y los entrega a la dropzone. */
const INGEST_SCRIPT = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const byText = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
  for (let i = 0; i < 20 && !byText('modo offline') && !byText('Iniciar sesión offline'); i++) await wait(250);
  const offline = byText('Usar modo offline') || byText('Iniciar sesión offline');
  if (!offline) return { error: 'no apareció la pantalla de inicio' };
  offline.click();
  for (let i = 0; i < 20 && !document.querySelector('[data-testid=dropzone-input]'); i++) await wait(250);
  const input = document.querySelector('[data-testid=dropzone-input]');
  if (!input) return { error: 'no apareció la dropzone' };

  // PDF mínimo con una línea de texto (pdf.js reconstruye la tabla xref si hace falta).
  const content = 'BT /F1 18 Tf 20 100 Td (Hola YALEH tortuga) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + content.length + ' >>\\nstream\\n' + content + '\\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += (i + 1) + ' 0 obj\\n' + o + '\\nendobj\\n'; });
  const xref = pdf.length;
  pdf += 'xref\\n0 6\\n0000000000 65535 f \\n' + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \\n').join('');
  pdf += 'trailer\\n<< /Size 6 /Root 1 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF';

  const dt = new DataTransfer();
  dt.items.add(new File(['Apuntes de biología: las tortugas son reptiles.'], 'apuntes.txt', { type: 'text/plain' }));
  dt.items.add(new File([pdf], 'clase.pdf', { type: 'application/pdf' }));
  dt.items.add(new File(['PK' + '\\u0003\\u0004' + 'no es un docx real'], 'roto.docx', { type: '' }));
  dt.items.add(new File(['x'], 'video.mp4', { type: 'video/mp4' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));

  for (let i = 0; i < 60 && document.body.innerText.includes('Extrayendo texto'); i++) await wait(250);
  await wait(500);
  const text = document.body.innerText;
  return {
    txt: /apuntes\\.txt[\\s\\S]{0,80}caracteres/.test(text),
    pdf: /clase\\.pdf[\\s\\S]{0,80}caracteres/.test(text),
    docxRejected: /roto\\.docx[\\s\\S]{0,120}No se pudo leer/.test(text),
    mp4Rejected: text.includes('video.mp4') && text.includes('formato no admitido'),
  };
})()`;

export function runSmokeTest(win: BrowserWindow, db: DatabaseSync, finish: (ok: boolean) => void): void {
  const errors: string[] = [];
  win.webContents.on('console-message', details => {
    // La extracción registra con console.error el DOCX dañado a propósito.
    if (details.level === 'error' && !details.message.includes('roto.docx')) errors.push(details.message);
  });
  win.webContents.on('preload-error', (_event, _path, error) => errors.push(`preload: ${error.message}`));
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const base = await win.webContents.executeJavaScript(
          `(async () => ({
            rootChildren: document.getElementById('root')?.childElementCount ?? 0,
            hasApi: typeof window.electronAPI === 'object',
            version: window.electronAPI?.version ?? null,
            state: window.electronAPI ? await window.electronAPI.getSessionState() : null,
            connection: window.electronAPI ? await window.electronAPI.getConnectionMode() : null,
          }))()`
        );
        const migrations = (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
          r => r.version
        );
        const ingest = await win.webContents.executeJavaScript(INGEST_SCRIPT);
        const sources = db.prepare('SELECT name, char_count FROM sources ORDER BY name').all() as {
          name: string;
          char_count: number;
        }[];
        const ingestOk =
          ingest.txt && ingest.pdf && ingest.docxRejected && ingest.mp4Rejected &&
          sources.map(s => s.name).join(',') === 'apuntes.txt,clase.pdf';
        const ok =
          base.rootChildren > 0 &&
          base.hasApi &&
          base.state !== null &&
          base.connection !== null &&
          migrations.length > 0 &&
          ingestOk &&
          errors.length === 0;
        console.log(`[smoke] ${JSON.stringify({ ok, ...base, migrations, ingest, sources, errors })}`);
        finish(ok);
      } catch (error) {
        console.log(`[smoke] ${JSON.stringify({ ok: false, error: String(error), errors })}`);
        finish(false);
      }
    }, 2000);
  });
}

