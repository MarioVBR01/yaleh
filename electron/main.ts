/**
 * @file main.ts
 * @description Proceso principal de YALEH. Todo el bloqueo vive aquí
 * (brief, sección 9): la interfaz nunca decide si el kiosko se abre o se cierra.
 *
 * La web y el escritorio funcionan por separado y se unen solo con un archivo
 * de sesión .yaleh (brief, revisión 1.5). El escritorio no inicia sesión con Google.
 */

import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  net,
  powerMonitor,
  session,
  type IpcMainInvokeEvent,
  type WebContents,
} from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { CONNECTIVITY, DEV_SERVER_ORIGIN, LIMITS, YOUTUBE_PLAYER_URL } from '../shared/config';
import {
  IPC_EVENT,
  IPC_INVOKE,
  type AppInfo,
  type OfficeExportResult,
  type OpenSessionFileResult,
  type SessionMode,
} from '../shared/ipc-types';
import { SESSION_FILE_ERRORS, SESSION_FILE_EXTENSION } from '../shared/session-file';
import { ConnectivityMonitor, createHttpProbe } from './connectivity';
import { DATABASE_FILE_NAME, ensureLocalProfile, openDatabase } from './db/database';
import { importLegacyJson } from './db/import-json';
import { SqliteSessionStore } from './db/sqlite-session-store';
import { WorkspaceRepository } from './db/workspace-repository';
import {
  isTrustedSenderUrl,
  parseBounds,
  parseDurationSeconds,
  parseId,
  parseNoteInput,
  parseOfficeRequest,
  parseSourceInput,
  type SenderTrust,
} from './ipc/validate';
import { lockWindow, reclaimFocus, unlockWindow } from './kiosk/window';
import { DEV_ESCAPE_ACCELERATOR, isBlockedInput, isDevEscapeInput } from './kiosk/shortcuts';
import { isFrameUrlAllowed, isMainWindowNavigationAllowed, type NavigationContext } from './navigation-policy';
import { SessionController } from './session/controller';
import { findSessionFileInArgv, openSessionFile } from './session-file-service';
import { runSmokeTest } from './smoke';
import { TabManager } from './tabs/tab-manager';
import { exportOfficeFile } from './office/export';

const isPackaged = app.isPackaged;
/** `electron . --dev-server` carga el servidor de Vite; sin la bandera, carga dist/. */
const useDevServer = !isPackaged && process.argv.includes('--dev-server');
/** Prueba de humo sin ventana visible (scripts/smoke-electron.mjs). Solo sin empaquetar. */
const isSmokeTest = !isPackaged && process.env.YALEH_SMOKE === '1';

// La prueba de humo usa una carpeta de datos temporal para no tocar la base real.
// scripts/smoke-electron.mjs la crea y la borra al terminar.
if (isSmokeTest) {
  app.setPath('userData', process.env.YALEH_SMOKE_USER_DATA ?? path.join(os.tmpdir(), `yaleh-smoke-${process.pid}`));
  // Las exportaciones de ofimática de la prueba van a la carpeta temporal, no a Documentos.
  app.setPath('documents', app.getPath('userData'));
}

// Se empaqueta como CommonJS (dist-electron/main.cjs): __dirname es dist-electron/.
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
const INDEX_HTML = path.join(__dirname, '..', 'dist', 'index.html');
const APP_INDEX_URL = pathToFileURL(INDEX_HTML).href;

const senderTrust: SenderTrust = {
  appIndexUrl: APP_INDEX_URL,
  devServerOrigin: useDevServer ? DEV_SERVER_ORIGIN : null,
  trustedWebOrigins: [],
};

const navigationContext: NavigationContext = {
  isAppUrl: url => isTrustedSenderUrl(url, senderTrust),
  allowDevServer: useDevServer,
};

let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
let osSessionEnding = false;
/** Archivos .yaleh recibidos antes de que la interfaz terminara de cargar. */
const pendingSessionFiles: string[] = [];

// ─── Sesión ──────────────────────────────────────────────────────────────────

let db: DatabaseSync;
let store: SqliteSessionStore;
let workspace: WorkspaceRepository;
let controller: SessionController;
let connectivity: ConnectivityMonitor;
let tabs: TabManager;

/** El equipo está bloqueado (sesión activa). */
function isLocked(): boolean {
  return controller.isActive();
}

/** El modo de una sesión lo decide el proceso principal según la conexión al empezar. */
function currentSessionMode(): SessionMode {
  return connectivity.getMode() === 'online' ? 'online' : 'offline';
}

function send(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createController(): SessionController {
  return new SessionController({
    store,
    minSeconds: LIMITS.minSessionMinutes * 60,
    maxSeconds: LIMITS.maxSessionMinutes * 60,
    lock: () => mainWindow && lockWindow(mainWindow),
    unlock: () => mainWindow && unlockWindow(mainWindow),
    onTick: remainingSeconds => send(IPC_EVENT.sessionTick, { remainingSeconds }),
    onEnded: reason => {
      // Al terminar la sesión se cierran las pestañas internas.
      tabs.closeAll();
      send(IPC_EVENT.sessionEnded, { reason });
    },
  });
}

function parseOptionalSessionId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return parseId(value, 'Identificador de sesión');
}

// ─── Archivo de sesión .yaleh ────────────────────────────────────────────────

/** Valida el .yaleh, guarda sus fuentes en SQLite y empieza la sesión (bloquea el equipo). */
async function openSessionFileContent(raw: string): Promise<OpenSessionFileResult> {
  const result = await openSessionFile(raw, {
    isLocked,
    isUsed: sessionId => store.hasSession(sessionId),
    saveSources: (sessionId, sources) => {
      for (const s of sources) {
        workspace.addSource(sessionId, { id: s.id, name: s.name, type: s.type, size: s.size }, s.text);
      }
      return workspace.listSources(sessionId);
    },
    currentMode: currentSessionMode,
    start: (durationSeconds, mode, sessionId) => controller.start(durationSeconds, mode, sessionId),
  });
  if (!result.ok) {
    store.appendEvent({ type: 'session-file-rejected', at: new Date().toISOString(), detail: result.message });
    console.warn(`[sesión] Archivo .yaleh rechazado: ${result.message}`);
  }
  return result;
}

/** Lee un .yaleh del disco respetando el límite de tamaño. */
async function openSessionFilePath(filePath: string): Promise<OpenSessionFileResult> {
  if (isLocked()) return { ok: false, message: 'Ya hay una sesión en curso.' };
  if (!filePath.toLowerCase().endsWith(SESSION_FILE_EXTENSION)) {
    return { ok: false, message: SESSION_FILE_ERRORS.invalid };
  }
  try {
    if (fs.statSync(filePath).size > LIMITS.maxSessionFileBytes) {
      return { ok: false, message: SESSION_FILE_ERRORS['too-large'] };
    }
    return await openSessionFileContent(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('[sesión] No se pudo leer el archivo .yaleh:', error);
    return { ok: false, message: 'No se pudo leer el archivo de sesión.' };
  }
}

/** .yaleh recibido por los argumentos de arranque o por una segunda instancia. */
function receiveSessionFile(filePath: string): void {
  if (!rendererReady) {
    pendingSessionFiles.push(filePath);
    return;
  }
  void openSessionFilePath(filePath).then(result => send(IPC_EVENT.sessionFileResult, result));
}

// ─── IPC ─────────────────────────────────────────────────────────────────────

/**
 * Registra un handler que solo acepta mensajes del marco principal de la
 * ventana de YALEH con la interfaz propia cargada.
 */
function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    const frame = event.senderFrame;
    const trusted =
      mainWindow !== null &&
      event.sender === mainWindow.webContents &&
      frame !== null &&
      frame.parent === null &&
      isTrustedSenderUrl(frame.url, senderTrust);
    if (!trusted) {
      console.warn(`[ipc] Mensaje rechazado en ${channel} desde ${frame?.url ?? 'origen desconocido'}`);
      throw new Error('Origen no autorizado.');
    }
    return listener(event, ...args);
  });
}

function registerIpcHandlers(): void {
  handle(IPC_INVOKE.appGetInfo, (): AppInfo => ({ version: app.getVersion(), isPackaged }));

  // Flujo local ("Iniciar"): el modo lo decide la conexión en este momento.
  handle(IPC_INVOKE.sessionStart, (_event, durationSeconds, sessionId) => {
    const seconds = parseDurationSeconds(durationSeconds, LIMITS.minSessionMinutes * 60, LIMITS.maxSessionMinutes * 60);
    return controller.start(seconds, currentSessionMode(), parseOptionalSessionId(sessionId));
  });
  handle(IPC_INVOKE.sessionGetState, () => controller.getSnapshot());
  handle(IPC_INVOKE.sessionResume, () => controller.resume());
  handle(IPC_INVOKE.sessionDiscardResume, () => controller.discardResume());

  // Archivo de sesión: el diálogo del sistema solo existe fuera de la sesión.
  handle(IPC_INVOKE.sessionFileOpenDialog, async (): Promise<OpenSessionFileResult> => {
    if (isLocked() || !mainWindow) return { ok: false, message: 'Ya hay una sesión en curso.' };
    const choice = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir archivo de sesión de YALEH',
      filters: [{ name: 'Sesión de YALEH', extensions: ['yaleh'] }],
      properties: ['openFile'],
    });
    if (choice.canceled || choice.filePaths.length === 0) return { ok: false, canceled: true, message: '' };
    return openSessionFilePath(choice.filePaths[0]);
  });
  handle(IPC_INVOKE.sessionFileOpenContent, async (_event, content): Promise<OpenSessionFileResult> => {
    if (typeof content !== 'string') return { ok: false, message: SESSION_FILE_ERRORS.invalid };
    return openSessionFileContent(content);
  });

  handle(IPC_INVOKE.connectionGet, () => connectivity.getMode());
  handle(IPC_INVOKE.connectionRecheck, () => connectivity.check());

  // Espacio de trabajo (SQLite). La interfaz nunca abre la base.
  handle(IPC_INVOKE.workspaceAddSource, (_event, workspaceId, source, text) => {
    const input = parseSourceInput(source, text);
    workspace.addSource(parseId(workspaceId, 'Sesión'), input.source, input.text);
  });
  handle(IPC_INVOKE.workspaceListSources, (_event, workspaceId) => workspace.listSources(parseId(workspaceId, 'Sesión')));
  handle(IPC_INVOKE.workspaceSourceText, (_event, workspaceId, sourceId) =>
    workspace.getSourceText(parseId(workspaceId, 'Sesión'), parseId(sourceId, 'Fuente'))
  );
  handle(IPC_INVOKE.workspaceRemoveSource, (_event, workspaceId, sourceId) =>
    workspace.removeSource(parseId(workspaceId, 'Sesión'), parseId(sourceId, 'Fuente'))
  );
  handle(IPC_INVOKE.workspaceListNotes, (_event, workspaceId) => workspace.listNotes(parseId(workspaceId, 'Sesión')));
  handle(IPC_INVOKE.workspaceSaveNote, (_event, workspaceId, note) =>
    workspace.saveNote(parseId(workspaceId, 'Sesión'), parseNoteInput(note))
  );
  handle(IPC_INVOKE.workspaceDeleteNote, (_event, workspaceId, noteId) =>
    workspace.deleteNote(parseId(workspaceId, 'Sesión'), parseId(noteId, 'Nota'))
  );

  // Ofimática: se guarda directo en Documentos\\YALEH, sin diálogo del sistema (brief, sección 6.1).
  handle(IPC_INVOKE.officeExport, async (_event, request): Promise<OfficeExportResult> => {
    try {
      const filePath = await exportOfficeFile(parseOfficeRequest(request), path.join(app.getPath('documents'), 'YALEH'));
      return { ok: true, path: filePath };
    } catch (error) {
      console.error('[ofimática] No se pudo exportar:', error);
      return { ok: false, message: error instanceof Error ? error.message : 'No se pudo exportar el archivo.' };
    }
  });

  // Pestañas internas (WebContentsView). La URL se valida aquí, no en la interfaz.
  handle(IPC_INVOKE.tabsOpen, (_event, url) => tabs.open(typeof url === 'string' ? url : ''));
  handle(IPC_INVOKE.tabsClose, (_event, tabId) => tabs.close(parseId(tabId, 'Pestaña')));
  handle(IPC_INVOKE.tabsShow, (_event, tabId) => tabs.show(tabId === null ? null : parseId(tabId, 'Pestaña')));
  handle(IPC_INVOKE.tabsSetBounds, (_event, tabId, bounds) => tabs.setBounds(parseId(tabId, 'Pestaña'), parseBounds(bounds)));

  handle(IPC_INVOKE.appClose, () => {
    if (isLocked()) {
      throw new Error('No puedes cerrar YALEH mientras la sesión está activa.');
    }
    app.quit();
  });
}

// ─── Seguridad de red y navegación ───────────────────────────────────────────

function installSessionGuards(): void {
  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest((details, callback) => {
    const isFrame = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame';
    if (isFrame && !isFrameUrlAllowed(details.url, navigationContext)) {
      console.warn(`[red] Bloqueado (${details.resourceType}): ${details.url.slice(0, 120)}`);
      callback({ cancel: true });
      return;
    }
    callback({});
  });

  const allowedPermissions = new Set(['fullscreen', 'clipboard-sanitized-write']);
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(allowedPermissions.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowedPermissions.has(permission));
}

function guardWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    const isMain = mainWindow !== null && contents === mainWindow.webContents;
    const allowed = isMain
      ? isMainWindowNavigationAllowed(url, navigationContext)
      : isFrameUrlAllowed(url, navigationContext);
    if (!allowed) {
      event.preventDefault();
      console.warn(`[navegación] Bloqueada: ${url.slice(0, 120)}`);
    }
  });

  // Ventanas nuevas: se deniegan. Las pestañas internas (tab-manager.ts) reemplazan este
  // manejador para convertir las de sitios permitidos en pestañas.
  contents.setWindowOpenHandler(({ url }) => {
    console.warn(`[navegación] Ventana nueva denegada: ${url.slice(0, 120)}`);
    return { action: 'deny' };
  });

  contents.on('will-attach-webview', event => event.preventDefault());

  contents.on('before-input-event', (event, input) => {
    if (!isPackaged && isDevEscapeInput(input)) {
      event.preventDefault();
      controller.forceRelease();
      return;
    }
    if (isLocked() && isBlockedInput(input)) {
      event.preventDefault();
    }
  });
}

// ─── Ventana ─────────────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: !isSmokeTest,
    backgroundColor: '#020617',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: !isPackaged,
      spellcheck: false,
    },
  });

  win.on('close', event => {
    if (isLocked() && !osSessionEnding) event.preventDefault();
  });

  // Al apagar o cerrar la sesión de Windows se permite cerrar; la sesión quedará
  // como "interrumpida" y se ofrecerá retomarla al volver a abrir la app.
  win.on('query-session-end', () => {
    osSessionEnding = true;
  });
  win.on('session-end', () => {
    osSessionEnding = true;
  });

  win.on('blur', () => {
    if (!isLocked()) return;
    controller.recordFocusLost();
    setTimeout(() => {
      if (isLocked()) reclaimFocus(win);
    }, 150);
  });
  win.on('minimize', () => {
    if (isLocked()) reclaimFocus(win);
  });
  win.on('leave-full-screen', () => {
    if (isLocked()) reclaimFocus(win);
  });

  win.webContents.on('did-finish-load', () => {
    rendererReady = true;
    pendingSessionFiles.splice(0).forEach(receiveSessionFile);
  });

  if (useDevServer) {
    void win.loadURL(DEV_SERVER_ORIGIN);
  } else {
    void win.loadFile(INDEX_HTML);
  }
  return win;
}

// ─── Prueba de humo (solo desarrollo) ────────────────────────────────────────

/** Cierra la base y termina (el script lanzador borra la carpeta temporal). */
function finishSmokeTest(ok: boolean): void {
  connectivity.stop();
  db.close();
  app.exit(ok ? 0 : 1);
}

// ─── Arranque ────────────────────────────────────────────────────────────────

/** Abre SQLite, importa los datos JSON de la fase 2 (una sola vez) y crea el perfil local. */
function openStorage(): void {
  const userData = app.getPath('userData');
  db = openDatabase(path.join(userData, DATABASE_FILE_NAME));
  store = new SqliteSessionStore(db);
  workspace = new WorkspaceRepository(db);
  const imported = importLegacyJson(path.join(userData, 'session'), store);
  if (imported.sessionImported || imported.eventsImported > 0) {
    console.log(`[db] Importados de la fase 2: sesión=${imported.sessionImported}, eventos=${imported.eventsImported}`);
  }
  ensureLocalProfile(db);
}

function startConnectivityMonitor(): void {
  connectivity = new ConnectivityMonitor({
    isOnline: () => net.isOnline(),
    probe: createHttpProbe(
      (url, init) => net.fetch(url, { ...init, cache: 'no-store' }),
      CONNECTIVITY.probeUrl,
      CONNECTIVITY.probeTimeoutMs
    ),
    intervalMs: CONNECTIVITY.recheckIntervalMs,
    onChange: (mode, previous) => {
      console.log(`[red] Modo: ${previous} → ${mode}`);
      controller.recordConnectionChange(mode, previous);
      send(IPC_EVENT.connectionChanged, { mode });
    },
  });
  void connectivity.start();
  // Al volver de la suspensión la red puede haber cambiado.
  powerMonitor.on('resume', () => void connectivity.check());
}

function bootstrap(): void {
  openStorage();
  controller = createController();
  tabs = new TabManager({
    window: () => mainWindow,
    send,
    playerPage: YOUTUBE_PLAYER_URL,
    devTools: !isPackaged,
    events: { updated: IPC_EVENT.tabsUpdated, openRequest: IPC_EVENT.tabsOpenRequest },
  });
  if (isPackaged) Menu.setApplicationMenu(null);

  installSessionGuards();
  app.on('web-contents-created', (_event, contents) => guardWebContents(contents));
  registerIpcHandlers();

  if (!isPackaged) {
    globalShortcut.register(DEV_ESCAPE_ACCELERATOR, () => controller.forceRelease());
  }

  // Sesión interrumpida por apagado, reinicio o cierre forzado.
  controller.recover();

  startConnectivityMonitor();
  mainWindow = createWindow();
  if (isSmokeTest) runSmokeTest(mainWindow, db, finishSmokeTest);

  // Archivo .yaleh con el que se abrió la app (asociación de archivos: fase 11).
  const initialFile = findSessionFileInArgv(process.argv.slice(1));
  if (initialFile) receiveSessionFile(initialFile);
}

// Debe ejecutarse antes de whenReady: una segunda instancia entrega su archivo y termina.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const file = findSessionFileInArgv(argv.slice(1));
    if (file) receiveSessionFile(file);
  });

  // macOS entrega los archivos abiertos con open-file.
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    receiveSessionFile(filePath);
  });

  app.whenReady().then(bootstrap);

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('will-quit', () => {
    controller?.dispose();
    connectivity?.stop();
    globalShortcut.unregisterAll();
    db?.close();
  });
}
