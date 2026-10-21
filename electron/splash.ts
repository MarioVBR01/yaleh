/**
 * @file splash.ts
 * @description Pantalla de bienvenida al abrir YALEH (como las de otras aplicaciones de escritorio):
 * una ventana chica, sin bordes y centrada, con el logo, el nombre, la versión, el copyright y una
 * barra de carga. Se muestra apenas arranca la app y se cierra cuando la ventana principal ya está
 * dibujada (main.ts, revealMainWindow).
 * Aislada: partición propia que solo acepta su propia página (data:), sin JavaScript ni preload.
 */

import { BrowserWindow, session } from 'electron';

export const SPLASH_SIZE = { width: 560, height: 320 } as const;
/** Tiempo mínimo en pantalla, para que no aparezca y desaparezca de golpe. */
export const SPLASH_MIN_MS = 1500;

/** Mismo dibujo que src/assets/logo/logo-yaleh-modo-oscuro.svg (círculo con borde fino para fondo oscuro). */
const LOGO_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="132" height="132" aria-hidden="true">' +
  '<circle cx="46" cy="48" r="40" fill="#050505" stroke="#3A342E" stroke-width="1.5"/>' +
  '<g fill="#F7941D"><path d="M22 17Q22 26 31 26Q22 26 22 35Q22 26 13 26Q22 26 22 17Z"/><path d="M31 12Q31 17 36 17Q31 17 31 22Q31 17 26 17Q31 17 31 12Z"/>' +
  '<path d="M31 78Q31 65 42 62L48 68L54 62Q65 65 65 78Q48 82 31 78Z"/><ellipse cx="48" cy="50" rx="9.5" ry="10.5"/></g>' +
  '<path d="M37 36H59V43L48 47L37 43Z" fill="#F7941D" stroke="#050505" stroke-width="1.6"/>' +
  '<path d="M28 33L48 25.5L68 33L48 40Z" fill="#F7941D" stroke="#050505" stroke-width="1.2"/>' +
  '<path d="M31 33.5V44" stroke="#F7941D" stroke-width="1.8" stroke-linecap="round"/><path d="M31 43.5l2.3 3.2L31 50l-2.3-3.3Z" fill="#F7941D"/>' +
  '<path d="M42 62L48 68L54 62" fill="none" stroke="#050505" stroke-width="1.6"/><path d="M38 70V79" stroke="#050505" stroke-width="1.6"/>' +
  '<path d="M67 53L82 47.5L97 53V67C97 79 89 87 82 91C75 87 67 79 67 67Z" fill="#F7941D" stroke="#050505" stroke-width="2"/>' +
  '<path d="M77 66V61.5a5 5 0 0 1 10 0V66" fill="none" stroke="#111010" stroke-width="2.8"/><rect x="74" y="65" width="16" height="13" rx="2.6" fill="#111010"/></svg>';

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Página de la pantalla de bienvenida (solo HTML y CSS; los colores son los del modo oscuro del diseño). */
export function splashHtml(version: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>YALEH</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; overflow: hidden; }
  body { background: #100F0E; color: #F5F0EA; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
    border: 1px solid #322D28; display: flex; flex-direction: column; user-select: none; cursor: default; }
  .glow { position: absolute; left: 110px; top: 50%; width: 420px; height: 420px; transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(247,148,29,.16) 0%, rgba(247,148,29,0) 62%); pointer-events: none; }
  main { position: relative; flex: 1; display: flex; align-items: center; gap: 28px; padding: 0 40px; }
  h1 { font-size: 44px; font-weight: 800; letter-spacing: .03em; line-height: 1; }
  h1 span { color: #F7941D; }
  .tag { margin-top: 6px; font-size: 16px; color: #BDB3A8; font-weight: 300; }
  .meta { margin-top: 18px; font-size: 12px; color: #877D72; line-height: 1.55; }
  .meta b { color: #BDB3A8; font-weight: 600; }
  footer { position: relative; padding: 0 40px 22px; }
  .status { font-size: 12px; color: #BDB3A8; margin-bottom: 8px; }
  .track { height: 4px; border-radius: 4px; background: #221F1C; overflow: hidden; }
  .bar { height: 100%; width: 38%; border-radius: 4px; background: #F7941D; animation: load 1.4s ease-in-out infinite; }
  @keyframes load { 0% { transform: translateX(-110%); } 100% { transform: translateX(280%); } }
  @media (prefers-reduced-motion: reduce) { .bar { animation: none; width: 100%; opacity: .7; } }
</style></head>
<body>
  <div class="glow"></div>
  <main>
    ${LOGO_SVG}
    <div>
      <h1>YALEH<span>.</span></h1>
      <p class="tag">Entorno de estudio sin distracciones</p>
      <p class="meta"><b>Versión ${escapeHtml(version)} (x64)</b><br>© 2026 Mario Víctor Brañez Rodriguez · TECBA</p>
    </div>
  </main>
  <footer>
    <p class="status">Preparando tu entorno de estudio…</p>
    <div class="track"><div class="bar"></div></div>
  </footer>
</body></html>`;
}

/** Crea y muestra la pantalla de bienvenida. */
export function createSplash(version: string, icon?: string): BrowserWindow {
  const splashSession = session.fromPartition('yaleh-splash', { cache: false });
  splashSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('data:') }));
  const win = new BrowserWindow({
    ...SPLASH_SIZE,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'YALEH',
    backgroundColor: '#100F0E',
    icon,
    webPreferences: { session: splashSession, javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false, devTools: false },
  });
  win.once('ready-to-show', () => win.show());
  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(version))}`);
  return win;
}
