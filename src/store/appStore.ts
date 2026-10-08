/**
 * @file appStore.ts
 * @description Store global de YALEH utilizando Context + useReducer.
 * Gestiona el estado completo: fase actual, sesión de usuario, pestañas,
 * archivos cargados y tiempo de sesión.
 */

import { LIMITS } from '@shared/config';
import type { ConnectionMode, LocalAiStatus, SessionMode } from '@shared/ipc-types';

/** Mensaje al llegar al límite de pestañas (brief, sección 10). */
export const TAB_LIMIT_MESSAGE = `Llegaste al máximo de ${LIMITS.maxTabs} pestañas. Cierra una para abrir otra.`;

export type AppPhase =
  | 'login'
  | 'desktop-start'
  | 'dropzone'
  | 'timer-select'
  | 'confirm-session'
  | 'resume-offer'
  | 'kiosk'
  | 'session-complete';

export type TabType =
  | 'dashboard'
  | 'workspace-url'
  | 'offline-editor'
  | 'history'
  | 'pomodoro'
  | 'downloads'
  | 'stats';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  url?: string;
  icon?: string;
  editorType?: 'docs' | 'sheets' | 'slides';
  /** Pestañas internas (WebContentsView): error de carga informado por el proceso principal. */
  error?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  dataUrl?: string;
  /** Extracción de texto (fase 6). */
  status?: 'extracting' | 'ready' | 'error';
  /** Caracteres de texto extraído. */
  charCount?: number;
  /** Mensaje si la extracción o el guardado fallaron. */
  error?: string;
}

export interface UserSession {
  /** uid de Firebase Auth (sesiones con Google). */
  uid?: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  displayName?: string;
  email?: string;
  avatar?: string;
  initials?: string;
}

export interface AppState {
  /** Fase actual de la aplicación */
  phase: AppPhase;
  /** Sesión del usuario */
  session: UserSession;
  /** Archivos cargados en el Dropzone */
  uploadedFiles: UploadedFile[];
  /** Duración de la sesión de estudio en segundos */
  sessionDuration: number;
  /** Tiempo restante de la sesión en segundos */
  timeRemaining: number;
  /** Si el modo kiosko está activo */
  kioskActive: boolean;
  /** Pestañas abiertas */
  tabs: Tab[];
  /** ID de la pestaña activa */
  activeTabId: string;
  /** Historial de actividad */
  activityHistory: ActivityRecord[];
  /** Panel lateral activo */
  activeSidePanel: string | null;
  /** Conexión detectada por el proceso principal (escritorio). En la web se asume online. */
  connection: ConnectionMode;
  /** Modo de la sesión de concentración (escritorio). null en la web. */
  sessionMode: SessionMode | null;
  /**
   * Espacio de trabajo actual: id de la sesión en Firestore (online) o id local (offline).
   * Agrupa las fuentes, notas y resultados de la IA, y es el id de la sesión de concentración.
   */
  workspaceId: string | null;
  /** Escritorio: mensaje para la pantalla de bienvenida (por ejemplo, un .yaleh caducado o ya usado). */
  notice: string | null;
  /** Escritorio: estado del asistente sin conexión (null en la web o mientras se consulta). */
  localAi: LocalAiStatus | null;
  /**
   * Web: Firebase ya informó si hay una sesión guardada (BUG-002). Mientras es false, el login
   * muestra "Comprobando tu sesión…" en lugar del botón, para no aparecer y saltar a la dropzone.
   */
  authChecked: boolean;
}

export interface ActivityRecord {
  id: string;
  type: 'file' | 'tool' | 'site' | 'search';
  label: string;
  detail?: string;
  timestamp: Date;
  icon?: string;
}

export type AppAction =
  | { type: 'SET_PHASE'; payload: AppPhase }
  | { type: 'SET_SESSION'; payload: UserSession }
  | { type: 'ADD_FILES'; payload: UploadedFile[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_SESSION_DURATION'; payload: number }
  | { type: 'START_KIOSK' }
  | { type: 'TICK_TIMER' }
  | { type: 'SYNC_TIME'; payload: number }
  | {
      type: 'RESUME_SESSION';
      payload: { durationSeconds: number; remainingSeconds: number; mode: SessionMode | null };
    }
  | { type: 'SET_CONNECTION'; payload: ConnectionMode }
  | { type: 'SET_LOCAL_AI'; payload: LocalAiStatus }
  | { type: 'SET_AUTH_CHECKED' }
  | { type: 'SET_SESSION_MODE'; payload: SessionMode | null }
  | { type: 'SET_WORKSPACE'; payload: string | null }
  | { type: 'SET_NOTICE'; payload: string | null }
  | { type: 'UPDATE_TAB'; payload: { id: string } & Partial<Pick<Tab, 'title' | 'error' | 'url'>> }
  | { type: 'SET_FILES'; payload: UploadedFile[] }
  | { type: 'UPDATE_FILE'; payload: { id: string } & Partial<UploadedFile> }
  | { type: 'END_SESSION' }
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'ADD_ACTIVITY'; payload: ActivityRecord }
  | { type: 'SET_SIDE_PANEL'; payload: string | null };

/**
 * Genera un ID único para pestañas y registros.
 */
export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

/**
 * Estado inicial de la aplicación.
 */
export const initialState: AppState = {
  phase: 'login',
  session: {
    isAuthenticated: false,
    isAnonymous: false,
  },
  uploadedFiles: [],
  sessionDuration: 0,
  timeRemaining: 0,
  kioskActive: false,
  tabs: [
    {
      id: 'dashboard',
      type: 'dashboard',
      title: 'Espacio de trabajo',
      icon: '🏠',
    },
  ],
  activeTabId: 'dashboard',
  activityHistory: [],
  activeSidePanel: null,
  connection: 'online',
  sessionMode: null,
  workspaceId: null,
  notice: null,
  localAi: null,
  authChecked: true,
};

/**
 * Reducer principal de YALEH.
 * Procesa todas las acciones del sistema de forma inmutable.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'SET_SESSION':
      return { ...state, session: action.payload };

    case 'ADD_FILES':
      return {
        ...state,
        uploadedFiles: [...state.uploadedFiles, ...action.payload],
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter(f => f.id !== action.payload),
      };

    case 'SET_SESSION_DURATION':
      return {
        ...state,
        sessionDuration: action.payload,
        timeRemaining: action.payload,
      };

    case 'START_KIOSK':
      return { ...state, kioskActive: true, phase: 'kiosk' };

    case 'TICK_TIMER': {
      const newTime = Math.max(0, state.timeRemaining - 1);
      return {
        ...state,
        timeRemaining: newTime,
        kioskActive: newTime > 0,
      };
    }

    case 'SYNC_TIME': {
      // Tiempo restante informado por el proceso principal (escritorio).
      const remaining = Math.max(0, Math.floor(action.payload));
      return { ...state, timeRemaining: remaining, kioskActive: remaining > 0 };
    }

    case 'RESUME_SESSION':
      return {
        ...state,
        sessionDuration: action.payload.durationSeconds,
        timeRemaining: action.payload.remainingSeconds,
        kioskActive: true,
        sessionMode: action.payload.mode ?? state.sessionMode,
        phase: 'kiosk',
      };

    case 'SET_CONNECTION':
      return { ...state, connection: action.payload };
    case 'SET_LOCAL_AI':
      return { ...state, localAi: action.payload };
    case 'SET_AUTH_CHECKED':
      return state.authChecked ? state : { ...state, authChecked: true };

    case 'SET_SESSION_MODE':
      return { ...state, sessionMode: action.payload };

    case 'SET_WORKSPACE':
      return { ...state, workspaceId: action.payload };

    case 'UPDATE_TAB':
      return {
        ...state,
        tabs: state.tabs.map(t => (t.id === action.payload.id ? { ...t, ...action.payload } : t)),
      };

    case 'SET_NOTICE':
      return { ...state, notice: action.payload };

    case 'SET_FILES':
      return { ...state, uploadedFiles: action.payload };

    case 'UPDATE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map(f => (f.id === action.payload.id ? { ...f, ...action.payload } : f)),
      };

    case 'END_SESSION':
      return {
        ...state,
        kioskActive: false,
        timeRemaining: 0,
        phase: 'session-complete',
      };

    case 'ADD_TAB': {
      // Evitar duplicados de URL o tipo único
      const exists = state.tabs.find(
        t => t.url === action.payload.url && action.payload.url
      );
      if (exists) {
        return { ...state, activeTabId: exists.id };
      }
      if (state.tabs.length >= LIMITS.maxTabs) {
        return { ...state, notice: TAB_LIMIT_MESSAGE };
      }
      return {
        ...state,
        tabs: [...state.tabs, action.payload],
        activeTabId: action.payload.id,
      };
    }

    case 'CLOSE_TAB': {
      if (action.payload === 'dashboard') return state;
      const filtered = state.tabs.filter(t => t.id !== action.payload);
      const newActive =
        state.activeTabId === action.payload
          ? filtered[filtered.length - 1]?.id || 'dashboard'
          : state.activeTabId;
      return { ...state, tabs: filtered, activeTabId: newActive };
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.payload };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        activityHistory: [action.payload, ...state.activityHistory].slice(0, 200),
      };

    case 'SET_SIDE_PANEL':
      return { ...state, activeSidePanel: action.payload };

    default:
      return state;
  }
}
