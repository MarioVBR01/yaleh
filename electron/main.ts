/**
 * @file main.ts
 * @description Proceso principal de YALEH. Todo el bloqueo vive aquí
 * (brief, sección 9): la interfaz nunca decide si el kiosko se abre o se cierra.
 */

import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  net,
  powerMonitor,
  session,
  shell,
  type IpcMainInvokeEvent,
  type WebContents,
} from 'electron';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { CONNECTIVITY, DEV_SERVER_ORIGIN, LIMITS, YALEH_WEB_ORIGINS } from '../shared/config';
import { IPC_EVENT, IPC_INVOKE, type AppInfo, type SessionMode } from '../shared/ipc-types';
import { checkAuthState, createAuthState, type PendingAuth } from './auth-state';
import { ConnectivityMonitor, createHttpProbe } from './connectivity';
import { DATABASE_FILE_NAME, ensureLocalProfile, openDatabase } from './db/database';
import { importLegacyJson } from './db/import-json';
import { SqliteSessionStore } from './db/sqlite-session-store';
import { WorkspaceRepository } from './db/workspace-repository';
import { describeDeepLinkForLog, findDeepLinkInArgv, parseDeepLink, PROTOCOL_SCHEME } from './deeplink';
import {
  isAllowedExternalUrl,
  isTrustedSenderUrl,
  parseDurationSeconds,
  parseId,
  parseNoteInput,
  parseSessionMode,
  parseSourceInput,
  type SenderTrust,
} from './ipc/validate';
import { lockWindow, reclaimFocus, unlockWindow } from './kiosk/window';
import { DEV_ESCAPE_ACCELERATOR, isBlockedInput, isDevEscapeInput } from './kiosk/shortcuts';
import { isFrameUrlAllowed, isMainWindowNavigationAllowed, type NavigationContext } from './navigation-policy';
import { SessionController } from './session/controller';
import { runSmokeTest } from './smoke';

const isPackaged = app.isPackaged;
/** `electron . --dev-server` carga el servidor de Vite; sin la bandera, carga dist/. */
const useDevServer = !isPackaged && process.argv.includes('--dev-server');
/** Prueba de humo sin ventana visible (scripts/smoke-electron.mjs). Solo sin empaquetar. */
const isSmokeTest = !isPackaged && process.env.YALEH_SMOKE === '1';

// La prueba de humo usa una carpeta de datos temporal para no tocar la base real.
// scripts/smoke-electron.mjs la crea y la borra al terminar.
if (isSmokeTest) {
  app.setPath('userData', process.env.YALEH_SMOKE_USER_DATA ?? path.join(os.tmpdir(), `yaleh-smoke-${process.pid}`));
}

// Se empaqueta como CommonJS (dist-electron/main.cjs): __dirname es dist-electron/.
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
const INDEX_HTML = path.join(__dirname, '..', 'dist', 'index.html');
const APP_INDEX_URL = pathToFileURL(INDEX_HTML).href;

const senderTrust: SenderTrust = {
  appIndexUrl: APP_INDEX_URL,
  devServerOrigin: useDevServer ? DEV_SERVER_ORIGIN : null,
  // Fase 4: aceptar mensajes de la web de YALEH cargada en el kiosko.
  trustedWebOrigins: [],
};

const navigationContext: NavigationContext = {
  isAppUrl: url => isTrustedSenderUrl(url, senderTrust),
  allowDevServer: useDevServer,
};

let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
let osSessionEnding = false;
const pendingDeepLinks: string[] = [];

// ─── Sesión ──────────────────────────────────────────────────────────────────

let db: DatabaseSync;
let store: SqliteSessionStore;
let workspace: WorkspaceRepository;
let controller: SessionController;
let connectivity: ConnectivityMonitor;

// ─── Paso de la web al escritorio (brief, secciones 4.1 y 4.5) ───────────────

/** Intento de inicio de sesión del escritorio en curso (state enviado a auth-desktop.html). */
let pendingAuth: PendingAuth | null = null;
/** Última sesión recibida por yaleh://sesion. */
let linkedSessionId: string | null = null;
/** Sesión online preparada: el equipo ya está bloqueado, pero el tiempo aún no corre. */
let heldSessionId: string | null = null;

/** El equipo está bloqueado: sesión activa o sesión online preparada. */
function isLocked(): boolean {
  return controller.isActive() || heldSessionId !== null;
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
    onEnded: reason => send(IPC_EVENT.sessionEnded, { reason }),
  });
}

/**
 * Las sesiones online solo se inician con conexión y a partir de la sesión preparada
 * que llegó desde la web (yaleh://sesion). Sin empaquetar se permite además iniciar
 * una sesión online de prueba sin id (botón "Probar sesión online").
 */
function assertSessionModeAllowed(mode: SessionMode, sessionId: string | undefined): void {
  if (mode !== 'online') return;
  if (connectivity.getMode() !== 'online') throw new Error('No hay conexión para una sesión online.');
  if (heldSessionId !== null && sessionId === heldSessionId) return;
  if (!isPackaged && sessionId === undefined) return;
  throw new Error('Las sesiones online se inician desde la web de YALEH.');
}

function parseOptionalSessionId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error('Identificador de sesión no válido.');
  }
  return value;
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

  handle(IPC_INVOKE.sessionStart, (_event, durationSeconds, mode, sessionId) => {
    const seconds = parseDurationSeconds(durationSeconds, LIMITS.minSessionMinutes * 60, LIMITS.maxSessionMinutes * 60);
    const sessionMode = parseSessionMode(mode);
    const id = parseOptionalSessionId(sessionId);
    assertSessionModeAllowed(sessionMode, id);
    const snapshot = controller.start(seconds, sessionMode, id);
    // A partir de aquí el bloqueo lo lleva el controlador.
    heldSessionId = null;
    linkedSessionId = null;
    return snapshot;
  });

  handle(IPC_INVOKE.sessionPrepareOnline, (_event, sessionId) => {
    const id = parseOptionalSessionId(sessionId);
    if (controller.isActive()) throw new Error('Ya hay una sesión activa.');
    if (!id || id !== linkedSessionId) throw new Error('La sesión no coincide con el enlace recibido.');
    heldSessionId = id;
    if (mainWindow) lockWindow(mainWindow);
  });

  handle(IPC_INVOKE.sessionCancelOnline, () => {
    if (controller.isActive()) throw new Error('La sesión ya empezó: no se puede cancelar.');
    if (heldSessionId !== null && mainWindow) unlockWindow(mainWindow);
    heldSessionId = null;
    linkedSessionId = null;
  });

  handle(IPC_INVOKE.authBeginDesktop, async () => {
    pendingAuth = createAuthState();
    await shell.openExternal(`${YALEH_WEB_ORIGINS[0]}/auth-desktop.html?state=${pendingAuth.state}`);
  });
  handle(IPC_INVOKE.sessionGetState, () => controller.getSnapshot());
  handle(IPC_INVOKE.sessionResume, () => controller.resume());
  handle(IPC_INVOKE.sessionDiscardResume, () => controller.discardResume());

  handle(IPC_INVOKE.connectionGet, () => connectivity.getMode());
  handle(IPC_INVOKE.connectionRecheck, () => connectivity.check());

  // Espacio de trabajo offline (SQLite). La interfaz nunca abre la base.
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

  handle(IPC_INVOKE.appClose, () => {
    if (isLocked()) {
      throw new Error('No puedes cerrar YALEH mientras la sesión está activa.');
    }
    app.quit();
  });

  handle(IPC_INVOKE.appOpenExternal, async (_event, url) => {
    if (!isAllowedExternalUrl(url)) {
      console.warn('[ipc] openExternal rechazado');
      return false;
    }
    await shell.openExternal(url);
    return true;
  });
}

// ─── Enlaces yaleh:// ────────────────────────────────────────────────────────

function handleDeepLink(raw: string): void {
  if (!rendererReady) {
    pendingDeepLinks.push(raw);
    return;
  }
  const link = parseDeepLink(raw);
  if (!link) {
    const detail = describeDeepLinkForLog(raw);
    store.appendEvent({ type: 'invalid-deeplink', at: new Date().toISOString(), detail });
    console.warn(`[deeplink] Enlace ignorado: ${detail}`);
    return;
  }
  if (link.kind === 'auth') {
    const check = checkAuthState(pendingAuth, link.state);
    if (check !== 'ok') {
      store.appendEvent({ type: 'invalid-deeplink', at: new Date().toISOString(), detail: `yaleh://auth (state: ${check})` });
      console.warn(`[deeplink] yaleh://auth rechazado: state ${check}`);
      return;
    }
    pendingAuth = null;
    send(IPC_EVENT.authToken, link.token);
  } else {
    if (isLocked()) {
      console.warn('[deeplink] yaleh://sesion ignorado: ya hay una sesión en curso');
      return;
    }
    linkedSessionId = link.sessionId;
    send(IPC_EVENT.sessionLink, { sessionId: link.sessionId });
  }
}

function registerProtocol(): void {
  if (isPackaged) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  } else {
    // En desarrollo, Windows debe lanzar electron.exe con la carpeta del proyecto.
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1] ?? '.')]);
  }
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

  // Fase 8: las ventanas nuevas se abrirán como pestañas internas. Por ahora se deniegan.
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
    const pending = pendingDeepLinks.splice(0);
    pending.forEach(handleDeepLink);
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
  registerProtocol();
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

  const initialLink = findDeepLinkInArgv(process.argv);
  if (initialLink) handleDeepLink(initialLink);
}

// Debe ejecutarse antes de whenReady: una segunda instancia entrega su enlace y termina.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const link = findDeepLinkInArgv(argv);
    if (link) handleDeepLink(link);
  });

  // macOS entrega los enlaces con open-url.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
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
