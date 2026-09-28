/**
 * @file appStore.ts
 * @description Store global de YALEH utilizando Context + useReducer.
 * Gestiona el estado completo: fase actual, sesión de usuario, pestañas,
 * archivos cargados y tiempo de sesión.
 */

export type AppPhase =
  | 'login'
  | 'dropzone'
  | 'timer-select'
  | 'kiosk'
  | 'session-complete';

export type TabType =
  | 'dashboard'
  | 'workspace-url'
  | 'offline-editor'
  | 'ai-work'
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
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  dataUrl?: string;
}

export interface UserSession {
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
      title: 'Inicio',
      icon: '🏠',
    },
  ],
  activeTabId: 'dashboard',
  activityHistory: [],
  activeSidePanel: null,
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
