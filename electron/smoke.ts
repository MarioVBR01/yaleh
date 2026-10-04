/**
 * @file smoke.ts
 * @description Prueba de humo del escritorio (npm run smoke:electron). Solo sin empaquetar.
 * Abre la versión compilada sin ventana visible, con una carpeta de datos temporal, y comprueba:
 * 1. Que la interfaz carga con la CSP, el preload expone electronAPI y la IPC responde.
 * 2. Que SQLite tiene sus migraciones.
 * 3. Que un archivo .yaleh caducado y uno inválido se rechazan por IPC sin bloquear
 *    y quedan registrados (session-file-rejected).
 * 4. Un recorrido local real: bienvenida → "Iniciar" → dropzone → extracción de un TXT y
 *    un PDF (pdf.js desde file://) → rechazo de un DOCX dañado (mammoth) → filas en SQLite.
 * 5. Con conexión: pestañas internas reales (TabManager) — un enlace de youtube.com se abre
 *    en el reproductor propio con el video cargado, y un sitio no permitido se rechaza.
 * 6. Exportación de ofimática real: .docx, .xlsx y .pptx en DocumentosYALEH (aquí, la carpeta temporal).
 * 7. Que el historial de sesiones (fase 10) responde por IPC.
 * No activa el kiosko.
 */

import { webContents, type BrowserWindow } from 'electron';
import type { DatabaseSync } from 'node:sqlite';

/**
 * Código que se ejecuta en la página: crea un .yaleh caducado con un checksum válido
 * (misma serialización que shared/session-file.ts) y otro inválido, y los envía por IPC.
 * Ninguno debe iniciar la sesión.
 */
const SESSION_FILE_SCRIPT = `(async () => {
  const hex = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const created = new Date(Date.now() - 48 * 3600000);
  const payload = {
    format: 'yaleh-session', version: 1, sessionId: 'smokeExpired1',
    createdAt: created.toISOString(), expiresAt: new Date(created.getTime() + 24 * 3600000).toISOString(),
    createdBy: { name: 'Prueba', email: 'prueba@tecba.edu.bo' }, durationSeconds: 120,
    sources: [{ id: 'src1', name: 'a.txt', type: 'text/plain', size: 1, text: 'hola' }],
  };
  const expired = JSON.stringify({ ...payload, checksum: await hex(JSON.stringify(payload)) });
  const r1 = await window.electronAPI.openSessionFileContent(expired);
  const r2 = await window.electronAPI.openSessionFileContent('esto no es un .yaleh');
  const state = await window.electronAPI.getSessionState();
  return { expiredRejected: !r1.ok && /caducó/.test(r1.message), invalidRejected: !r2.ok, stillIdle: state.status === 'idle' };
})()`;

/** Exporta un documento, una hoja y una presentación por IPC (los guarda el proceso principal). */
const OFFICE_SCRIPT = `(async () => {
  const api = window.electronAPI;
  const doc = await api.exportOffice({ kind: 'docx', title: 'Prueba', document: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hola YALEH' }] } ] } });
  const sheet = await api.exportOffice({ kind: 'xlsx', title: 'Prueba', rows: [['1', '=A1*2']] });
  const deck = await api.exportOffice({ kind: 'pptx', title: 'Prueba', slides: [{ title: 'Uno', content: 'Dos', background: '#1e293b' }] });
  return { doc, sheet, deck };
})()`;

/** Código que se ejecuta en la página: genera archivos y los entrega a la dropzone. */
const INGEST_SCRIPT = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const byText = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
  const startButton = () => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Iniciar');
  for (let i = 0; i < 20 && !startButton(); i++) await wait(250);
  const start = startButton();
  if (!start) return { error: 'no apareció la bienvenida' };
  start.click();
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
            history: window.electronAPI ? Array.isArray(await window.electronAPI.listSessionHistory()) : false,
          }))()`
        );
        const migrations = (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
          r => r.version
        );
        // Pestañas internas (solo con conexión: el reproductor está en Firebase Hosting).
        let tabsCheck: Record<string, unknown> = { skipped: base.connection !== 'online' };
        if (base.connection === 'online') {
          const opened = await win.webContents.executeJavaScript(`(async () => ({
            youtube: await window.electronAPI.tabs.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
            blocked: await window.electronAPI.tabs.open('https://es.wikipedia.org/'),
          }))()`);
          await new Promise(r => setTimeout(r, 6000));
          const player = webContents.getAllWebContents().find(wc => wc.getURL().includes('/youtube.html?v=dQw4w9WgXcQ'));
          const embed = player?.mainFrame.framesInSubtree.find(fr => fr.url.includes('youtube-nocookie.com/embed/'));
          tabsCheck = {
            playerTab: opened.youtube.ok && String(opened.youtube.url).includes('youtube.html'),
            blocked: !opened.blocked.ok,
            embedLoaded: Boolean(embed),
          };
          if (opened.youtube.ok) await win.webContents.executeJavaScript(`window.electronAPI.tabs.close('${opened.youtube.tabId}')`);
        }
        const tabsOk = tabsCheck.skipped === true || (tabsCheck.playerTab && tabsCheck.blocked && tabsCheck.embedLoaded);

        const office = await win.webContents.executeJavaScript(OFFICE_SCRIPT);
        const officeOk = ['doc', 'sheet', 'deck'].every(
          k => office[k].ok && /YALEH[\\/]Prueba .+\.(docx|xlsx|pptx)$/.test(office[k].path)
        );

        const sessionFile = await win.webContents.executeJavaScript(SESSION_FILE_SCRIPT);
        const rejectedEvents = (
          db.prepare("SELECT COUNT(*) AS n FROM session_events WHERE type = 'session-file-rejected'").get() as { n: number }
        ).n;
        const sessionFileOk =
          sessionFile.expiredRejected && sessionFile.invalidRejected && sessionFile.stillIdle && rejectedEvents === 2;
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
          base.history &&
          migrations.length > 0 &&
          ingestOk &&
          sessionFileOk &&
          tabsOk &&
          officeOk &&
          errors.length === 0;
        console.log(`[smoke] ${JSON.stringify({ ok, ...base, migrations, tabs: tabsCheck, officeOk, sessionFile, rejectedEvents, ingest, sources, errors })}`);
        finish(ok);
      } catch (error) {
        console.log(`[smoke] ${JSON.stringify({ ok: false, error: String(error), errors })}`);
        finish(false);
      }
    }, 2000);
  });
}

