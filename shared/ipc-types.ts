/**
 * @file ipc-types.ts
 * @description Contrato de los canales IPC entre el proceso principal y la interfaz.
 * El preload expone `window.electronAPI` con la forma de `ElectronAPI`.
 */

/** Canales invocables desde la interfaz (ipcRenderer.invoke → ipcMain.handle). */
export const IPC_INVOKE = {
  appGetInfo: 'app:get-info',
  sessionStart: 'session:start',
  sessionGetState: 'session:get-state',
  sessionResume: 'session:resume',
  sessionDiscardResume: 'session:discard-resume',
  sessionFileOpenDialog: 'session-file:open-dialog',
  sessionFileOpenContent: 'session-file:open-content',
  connectionGet: 'connection:get',
  connectionRecheck: 'connection:recheck',
  workspaceAddSource: 'workspace:add-source',
  workspaceListSources: 'workspace:list-sources',
  workspaceSourceText: 'workspace:source-text',
  workspaceRemoveSource: 'workspace:remove-source',
  workspaceListNotes: 'workspace:list-notes',
  workspaceSaveNote: 'workspace:save-note',
  workspaceDeleteNote: 'workspace:delete-note',
  tabsOpen: 'tabs:open',
  tabsClose: 'tabs:close',
  tabsShow: 'tabs:show',
  tabsSetBounds: 'tabs:set-bounds',
  appClose: 'app:close',
} as const;

/** Eventos que el proceso principal envía a la interfaz (webContents.send). */
export const IPC_EVENT = {
  sessionTick: 'session:tick',
  sessionEnded: 'session:ended',
  connectionChanged: 'connection:changed',
  /** Resultado de abrir un .yaleh que llegó por los argumentos de arranque o una segunda instancia. */
  sessionFileResult: 'session-file:result',
  /** Título o error de una pestaña interna. */
  tabsUpdated: 'tabs:updated',
  /** Una pestaña pidió abrir otra (ventana nueva o enlace de YouTube). */
  tabsOpenRequest: 'tabs:open-request',
} as const;

/**
 * Estado de la sesión de concentración.
 * - idle: no hay sesión.
 * - resumable: se encontró una sesión interrumpida con tiempo restante.
 * - active: el kiosko está bloqueado y el tiempo corre.
 * - finished: la última sesión terminó.
 */
export type SessionStatus = 'idle' | 'resumable' | 'active' | 'finished';

export type SessionEndReason = 'completed' | 'dev-release';

/** Modo de una sesión: con herramientas online e IA, o solo con módulos locales. */
export type SessionMode = 'online' | 'offline';

/** Estado de la conexión detectado por el proceso principal. `unknown` hasta la primera comprobación. */
export type ConnectionMode = 'online' | 'offline' | 'unknown';

export interface SessionSnapshot {
  status: SessionStatus;
  sessionId: string | null;
  mode: SessionMode | null;
  durationSeconds: number;
  remainingSeconds: number;
}

export interface AppInfo {
  version: string;
  /** false durante el desarrollo (electron:dev, electron:preview). */
  isPackaged: boolean;
}

export interface SessionTickPayload {
  remainingSeconds: number;
}

export interface SessionEndedPayload {
  reason: SessionEndReason;
}

export interface ConnectionChangedPayload {
  mode: ConnectionMode;
}

/** Fuente guardada en SQLite. */
export interface LocalSourceInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  charCount: number;
  createdAt: string;
}

export interface LocalNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resultado de abrir un archivo de sesión .yaleh. Si es válido, la sesión ya
 * empezó (equipo bloqueado); si no, `message` explica el motivo.
 */
export type OpenSessionFileResult =
  | {
      ok: true;
      snapshot: SessionSnapshot;
      sources: LocalSourceInfo[];
      createdBy: { name: string; email: string };
    }
  | { ok: false; message: string; canceled?: boolean };

/** Resultado de abrir una pestaña interna (WebContentsView). */
export type OpenTabResult = { ok: true; tabId: string; url: string; title: string } | { ok: false; message: string };

export interface TabUpdatedPayload {
  tabId: string;
  title?: string;
  error?: string;
}

export interface TabBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pestañas internas con WebContentsView, controladas por el proceso principal. */
export interface TabsAPI {
  /** Valida la URL (lista de sitios o YouTube) y crea la vista. */
  open: (url: string) => Promise<OpenTabResult>;
  close: (tabId: string) => Promise<void>;
  /** Muestra la vista indicada sobre la interfaz, o ninguna (null). */
  show: (tabId: string | null) => Promise<void>;
  /** Dónde dibujar la vista (coordenadas de la ventana, en píxeles CSS). */
  setBounds: (tabId: string, bounds: TabBounds) => Promise<void>;
  onUpdated: (callback: (payload: TabUpdatedPayload) => void) => () => void;
  onOpenRequest: (callback: (payload: { url: string }) => void) => () => void;
}

/** Datos del espacio de trabajo del escritorio, guardados por el proceso principal en SQLite. */
export interface LocalWorkspaceAPI {
  addSource: (
    workspaceId: string,
    source: { id: string; name: string; type: string; size: number },
    text: string
  ) => Promise<void>;
  listSources: (workspaceId: string) => Promise<LocalSourceInfo[]>;
  getSourceText: (workspaceId: string, sourceId: string) => Promise<string>;
  removeSource: (workspaceId: string, sourceId: string) => Promise<void>;
  listNotes: (workspaceId: string) => Promise<LocalNote[]>;
  saveNote: (workspaceId: string, note: { id: string; text: string }) => Promise<void>;
  deleteNote: (workspaceId: string, noteId: string) => Promise<void>;
}

/** API expuesta por el preload en `window.electronAPI`. */
export interface ElectronAPI {
  /** Versión de la aplicación de escritorio. */
  version: string;
  getAppInfo: () => Promise<AppInfo>;
  /**
   * Inicia una sesión local (flujo "Iniciar"); el proceso principal bloquea el equipo
   * y decide el modo según la conexión. `sessionId`: id local del espacio de trabajo.
   */
  startSession: (durationSeconds: number, sessionId?: string) => Promise<SessionSnapshot>;
  getSessionState: () => Promise<SessionSnapshot>;
  /** Retoma una sesión interrumpida (estado `resumable`). */
  resumeSession: () => Promise<SessionSnapshot>;
  /** Descarta la sesión interrumpida; queda registrada como tal. */
  discardResume: () => Promise<SessionSnapshot>;
  onSessionTick: (callback: (payload: SessionTickPayload) => void) => () => void;
  onSessionEnded: (callback: (payload: SessionEndedPayload) => void) => () => void;
  /** Abre el diálogo del sistema para elegir un .yaleh (solo fuera de la sesión). */
  openSessionFileDialog: () => Promise<OpenSessionFileResult>;
  /** Abre un .yaleh cuyo contenido ya se leyó (por ejemplo, arrastrado a la ventana). */
  openSessionFileContent: (content: string) => Promise<OpenSessionFileResult>;
  /** .yaleh abierto por los argumentos de arranque o por una segunda instancia. */
  onSessionFileResult: (callback: (result: OpenSessionFileResult) => void) => () => void;
  /** Modo de conexión actual según el proceso principal. */
  getConnectionMode: () => Promise<ConnectionMode>;
  /** Fuerza una nueva comprobación de la conexión y devuelve el resultado. */
  recheckConnection: () => Promise<ConnectionMode>;
  onConnectionChange: (callback: (payload: ConnectionChangedPayload) => void) => () => void;
  /** Cierra la aplicación. Se rechaza mientras la sesión está activa. */
  closeApp: () => Promise<void>;
  /** Fuentes y notas del escritorio (SQLite). */
  workspace: LocalWorkspaceAPI;
  /** Pestañas internas (herramientas y YouTube). */
  tabs: TabsAPI;
}
