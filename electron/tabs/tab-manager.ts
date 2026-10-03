/**
 * @file tab-manager.ts
 * @description Pestañas internas con WebContentsView (brief, sección 10).
 * Las herramientas (Workspace, Classroom, Moodle, Canva, Gamma) y el reproductor
 * de YouTube se cargan en vistas controladas por el proceso principal, no en iframes.
 *
 * La interfaz dibuja la barra de pestañas y avisa dónde mostrar la vista activa
 * (setBounds/show). Las ventanas nuevas y los enlaces de YouTube se convierten en
 * un "pedido de pestaña" para la interfaz, que aplica el límite de pestañas.
 */

import { randomUUID } from 'node:crypto';
import { WebContentsView, type BrowserWindow, type Rectangle } from 'electron';
import { LIMITS } from '../../shared/config';
import type { OpenTabResult } from '../../shared/ipc-types';
import { extractYouTubeId } from '../../shared/youtube';
import { resolveTabUrl } from './resolve';

export interface TabManagerDeps {
  window: () => BrowserWindow | null;
  send: (channel: string, payload: unknown) => void;
  playerPage: string;
  devTools: boolean;
  events: { updated: string; openRequest: string };
}

export class TabManager {
  private readonly views = new Map<string, WebContentsView>();
  private readonly bounds = new Map<string, Rectangle>();
  private active: string | null = null;

  constructor(private readonly deps: TabManagerDeps) {}

  open(rawUrl: string): OpenTabResult {
    const target = resolveTabUrl(rawUrl, this.deps.playerPage);
    if (!target) return { ok: false, message: 'Ese sitio no está permitido en YALEH.' };
    if (this.views.size >= LIMITS.maxTabs) {
      return { ok: false, message: `Llegaste al máximo de ${LIMITS.maxTabs} pestañas. Cierra una para abrir otra.` };
    }
    const win = this.deps.window();
    if (!win || win.isDestroyed()) return { ok: false, message: 'La ventana no está disponible.' };

    const id = randomUUID();
    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: this.deps.devTools,
        spellcheck: false,
      },
    });
    const wc = view.webContents;

    // Ventanas nuevas (window.open, target=_blank): si son de un sitio permitido o de
    // YouTube, la interfaz las abre como pestaña interna; lo demás se bloquea.
    wc.setWindowOpenHandler(({ url }) => {
      if (resolveTabUrl(url, this.deps.playerPage)) this.deps.send(this.deps.events.openRequest, { url });
      else console.warn(`[pestañas] Ventana nueva bloqueada: ${url.slice(0, 120)}`);
      return { action: 'deny' };
    });

    // Un enlace de YouTube dentro de la pestaña se abre en el reproductor propio.
    // (Los demás destinos no permitidos los bloquea guardWebContents en main.ts.)
    wc.on('will-navigate', (event, url) => {
      if (extractYouTubeId(url)) {
        event.preventDefault();
        this.deps.send(this.deps.events.openRequest, { url });
      }
    });

    wc.on('page-title-updated', (_event, title) => this.deps.send(this.deps.events.updated, { tabId: id, title }));
    wc.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
      // -3 = ERR_ABORTED (navegación cancelada, por ejemplo por la lista de sitios).
      if (isMainFrame && code !== -3) {
        this.deps.send(this.deps.events.updated, { tabId: id, error: 'No se pudo cargar la página. Revisa tu conexión.' });
      }
    });

    view.setVisible(false);
    win.contentView.addChildView(view);
    this.views.set(id, view);
    void wc.loadURL(target.url);

    return { ok: true, tabId: id, url: target.url, title: target.kind === 'youtube' ? 'YouTube' : '' };
  }

  setBounds(id: string, rect: Rectangle): void {
    this.bounds.set(id, rect);
    if (this.active === id) this.views.get(id)?.setBounds(rect);
  }

  /** Muestra solo la vista indicada (o ninguna, por ejemplo con un diálogo abierto). */
  show(id: string | null): void {
    this.active = id && this.views.has(id) ? id : null;
    for (const [viewId, view] of this.views) {
      const visible = viewId === this.active;
      if (visible) {
        const rect = this.bounds.get(viewId);
        if (rect) view.setBounds(rect);
      }
      view.setVisible(visible);
    }
  }

  close(id: string): void {
    const view = this.views.get(id);
    if (!view) return;
    this.views.delete(id);
    this.bounds.delete(id);
    if (this.active === id) this.active = null;
    const win = this.deps.window();
    if (win && !win.isDestroyed()) win.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }

  closeAll(): void {
    for (const id of [...this.views.keys()]) this.close(id);
  }

  count(): number {
    return this.views.size;
  }
}
