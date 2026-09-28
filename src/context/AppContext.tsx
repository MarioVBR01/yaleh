/**
 * @file AppContext.tsx
 * @description Contexto global de React para el estado de YALEH.
 * Provee el estado y el dispatcher a todos los componentes hijos,
 * incluyendo el hook personalizado useApp para acceso simplificado.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import {
  appReducer,
  initialState,
  generateId,
  type AppState,
  type AppAction,
  type Tab,
  type TabType,
  type UploadedFile,
  type ActivityRecord,
  type UserSession,
} from '../store/appStore';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  /** Abre una nueva pestaña o activa una existente */
  openTab: (config: {
    type: TabType;
    title: string;
    url?: string;
    icon?: string;
    editorType?: 'docs' | 'sheets' | 'slides';
  }) => void;
  /** Cierra una pestaña por ID */
  closeTab: (id: string) => void;
  /** Registra una actividad en el historial */
  logActivity: (record: Omit<ActivityRecord, 'id' | 'timestamp'>) => void;
  /** Inicia sesión de usuario */
  signIn: (user: UserSession) => void;
  /** Ingresar de forma anónima (offline) */
  signInAnonymous: () => void;
  /** Añade archivos al sistema */
  addFiles: (files: UploadedFile[]) => void;
  /** Elimina un archivo del sistema */
  removeFile: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Proveedor del contexto global de YALEH.
 * Envuelve toda la aplicación para proveer estado reactivo.
 * `initial` permite arrancar desde otro estado (usado en las pruebas).
 */
export function AppProvider({
  children,
  initial = initialState,
}: {
  children: ReactNode;
  initial?: AppState;
}) {
  const [state, dispatch] = useReducer(appReducer, initial);

  /**
   * Abre una nueva pestaña en el entorno kiosko.
   * Si ya existe una con la misma URL, la activa sin duplicar.
   */
  const openTab = useCallback(
    (config: {
      type: TabType;
      title: string;
      url?: string;
      icon?: string;
      editorType?: 'docs' | 'sheets' | 'slides';
      }) => {
      const newTab: Tab = {
        id: generateId(),
        ...config,
      };
      dispatch({ type: 'ADD_TAB', payload: newTab });
    },
    []
  );

  /**
   * Cierra una pestaña. La pestaña de Dashboard no puede cerrarse.
   */
  const closeTab = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_TAB', payload: id });
  }, []);

  /**
   * Registra una nueva actividad en el historial del usuario.
   */
  const logActivity = useCallback(
    (record: Omit<ActivityRecord, 'id' | 'timestamp'>) => {
      dispatch({
        type: 'ADD_ACTIVITY',
        payload: {
          ...record,
          id: generateId(),
          timestamp: new Date(),
        },
      });
    },
    []
  );

  /**
   * Autentica al usuario con sus credenciales.
   */
  const signIn = useCallback((user: UserSession) => {
    dispatch({ type: 'SET_SESSION', payload: user });
  }, []);

  /**
   * Permite ingreso anónimo para modo offline.
   */
  const signInAnonymous = useCallback(() => {
    dispatch({
      type: 'SET_SESSION',
      payload: {
        isAuthenticated: false,
        isAnonymous: true,
        displayName: 'Invitado',
        initials: 'IN',
      },
    });
  }, []);

  /**
   * Añade archivos cargados al estado global.
   */
  const addFiles = useCallback((files: UploadedFile[]) => {
    dispatch({ type: 'ADD_FILES', payload: files });
  }, []);

  /**
   * Elimina un archivo del estado global por su ID.
   */
  const removeFile = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: id });
  }, []);

  const value: AppContextValue = {
    state,
    dispatch,
    openTab,
    closeTab,
    logActivity,
    signIn,
    signInAnonymous,
    addFiles,
    removeFile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook personalizado para consumir el contexto de YALEH.
 * Lanza error si se usa fuera del proveedor.
 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp debe usarse dentro de <AppProvider>');
  }
  return ctx;
}
