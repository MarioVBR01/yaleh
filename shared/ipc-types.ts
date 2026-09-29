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
  connectionGet: 'connection:get',
  connectionRecheck: 'connection:recheck',
  appClose: 'app:close',
  appOpenExternal: 'app:open-external',
} as const;

/** Eventos que el proceso principal envía a la interfaz (webContents.send). */
export const IPC_EVENT = {
  sessionTick: 'session:tick',
  sessionEnded: 'session:ended',
  connectionChanged: 'connection:changed',
  authToken: 'auth:token-received',
  sessionLink: 'deeplink:session',
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

/** Modo de una sesión: con la web y las herramientas en línea, o solo con módulos locales. */
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

export interface SessionLinkPayload {
  sessionId: string;
}

/** API expuesta por el preload en `window.electronAPI`. */
export interface ElectronAPI {
  /** Versión de la aplicación de escritorio. */
  version: string;
  getAppInfo: () => Promise<AppInfo>;
  /** Inicia la sesión; el proceso principal bloquea el equipo. */
  startSession: (durationSeconds: number, mode: SessionMode) => Promise<SessionSnapshot>;
  getSessionState: () => Promise<SessionSnapshot>;
  /** Retoma una sesión interrumpida (estado `resumable`). */
  resumeSession: () => Promise<SessionSnapshot>;
  /** Descarta la sesión interrumpida; queda registrada como tal. */
  discardResume: () => Promise<SessionSnapshot>;
  onSessionTick: (callback: (payload: SessionTickPayload) => void) => () => void;
  onSessionEnded: (callback: (payload: SessionEndedPayload) => void) => () => void;
  /** Modo de conexión actual según el proceso principal. */
  getConnectionMode: () => Promise<ConnectionMode>;
  /** Fuerza una nueva comprobación de la conexión y devuelve el resultado. */
  recheckConnection: () => Promise<ConnectionMode>;
  onConnectionChange: (callback: (payload: ConnectionChangedPayload) => void) => () => void;
  /** Cierra la aplicación. Se rechaza mientras la sesión está activa. */
  closeApp: () => Promise<void>;
  /** Abre la web de YALEH en el navegador del sistema. Otras URL se rechazan. */
  openExternal: (url: string) => Promise<boolean>;
  onAuthToken: (callback: (token: string) => void) => () => void;
  onSessionLink: (callback: (payload: SessionLinkPayload) => void) => () => void;
}
