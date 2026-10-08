/**
 * @file App.tsx
 * @description Componente raíz de la aplicación YALEH.
 * Gestiona el flujo de fases:
 * - Web: Login → Dropzone → Espacio de trabajo (IA) → Tiempo → Confirmación → descarga del .yaleh.
 * - Escritorio: Bienvenida → Dropzone → Tiempo → Confirmación → Kiosko → Resumen,
 *   o Bienvenida → archivo .yaleh → Kiosko (la sesión empieza de inmediato).
 *   El escritorio no inicia sesión con Google. Al arrancar consulta al proceso principal
 *   si hay una sesión activa o interrumpida, y sigue el modo de conexión.
 */

import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { getElectronAPI, isElectron } from './lib/electron';
import { watchUser } from './firebase/auth';
import { createDraftSession } from './firebase/sessions';
import { startPhase } from './lib/mode';
import { applyOpenedSessionFile } from './lib/session-file';
import { initialState, type AppPhase, type AppState } from './store/appStore';
import LoginPhase from './phases/LoginPhase';
import WebAccountBar from './phases/WebAccountBar';
import DesktopStartPhase from './phases/DesktopStartPhase';
import DropzonePhase from './phases/DropzonePhase';
import TimerSelectPhase from './phases/TimerSelectPhase';
import ConfirmSessionPhase from './phases/ConfirmSessionPhase';
import ResumeSessionPhase from './phases/ResumeSessionPhase';
import SessionCompletePhase from './phases/SessionCompletePhase';
import KioskLayout from './kiosk/KioskLayout';

/** Propiedades de animación de entrada para transiciones de fase */
const fadeIn = { opacity: 1, scale: 1 };
/** Propiedades de animación de salida para transiciones de fase */
const fadeOut = { opacity: 0, scale: 0.97 };

const PHASE_COMPONENTS: Record<AppPhase, ComponentType> = {
  login: LoginPhase,
  'desktop-start': DesktopStartPhase,
  dropzone: DropzonePhase,
  'timer-select': TimerSelectPhase,
  'confirm-session': ConfirmSessionPhase,
  'resume-offer': ResumeSessionPhase,
  kiosk: KioskLayout,
  'session-complete': SessionCompletePhase,
};

/**
 * En el escritorio, recupera el estado de la sesión que lleva el proceso principal:
 * una sesión interrumpida que se puede retomar, o una sesión activa (si la interfaz se recargó).
 */
function useSessionRecovery() {
  const { dispatch } = useApp();

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;
    void api.getSessionState().then(snapshot => {
      if (snapshot.status === 'resumable') {
        dispatch({ type: 'SET_PHASE', payload: 'resume-offer' });
      } else if (snapshot.status === 'active') {
        dispatch({
          type: 'RESUME_SESSION',
          payload: {
            durationSeconds: snapshot.durationSeconds,
            remainingSeconds: snapshot.remainingSeconds,
            mode: snapshot.mode,
          },
        });
      }
    });
  }, [dispatch]);
}

/**
 * En el escritorio, sigue el modo de conexión que decide el proceso principal.
 * Los eventos online/offline del navegador solo piden una nueva comprobación.
 */
function useConnectionMode() {
  const { dispatch } = useApp();

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;
    // 'unknown' se ignora: es el estado inicial y no debe pisar un cambio que llegó antes.
    void api.getConnectionMode().then(mode => {
      if (mode !== 'unknown') dispatch({ type: 'SET_CONNECTION', payload: mode });
    });
    const off = api.onConnectionChange(({ mode }) => dispatch({ type: 'SET_CONNECTION', payload: mode }));
    const recheck = () => void api.recheckConnection();
    window.addEventListener('online', recheck);
    window.addEventListener('offline', recheck);
    return () => {
      off();
      window.removeEventListener('online', recheck);
      window.removeEventListener('offline', recheck);
    };
  }, [dispatch]);
}

/** Escritorio: estado del asistente sin conexión (requisitos, descarga, instalación). */
function useLocalAiStatus() {
  const { dispatch } = useApp();

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;
    void api.localAi.getStatus().then(status => dispatch({ type: 'SET_LOCAL_AI', payload: status }));
    return api.localAi.onStatus(status => dispatch({ type: 'SET_LOCAL_AI', payload: status }));
  }, [dispatch]);
}

/**
 * Sincroniza el usuario de Google (Firebase Auth) con el estado global.
 * Web: al iniciar sesión pasa a la dropzone; al cerrarla vuelve al login.
 */
function useAuthSync() {
  const { state, dispatch } = useApp();
  const phase = state.phase;
  const signedIn = state.session.isAuthenticated;

  // Al cambiar de cuenta o cerrar sesión se descartan los archivos y el borrador de la cuenta anterior.
  const lastUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return watchUser(user => {
      dispatch({ type: 'SET_AUTH_CHECKED' });
      const uid = user?.uid ?? null;
      if (!isElectron() && lastUid.current !== undefined && lastUid.current !== uid) {
        dispatch({ type: 'SET_FILES', payload: [] });
        dispatch({ type: 'SET_WORKSPACE', payload: null });
        dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
      }
      lastUid.current = uid;
      if (user) {
        const name = user.displayName ?? user.email ?? 'Estudiante';
        dispatch({
          type: 'SET_SESSION',
          payload: {
            isAuthenticated: true,
            isAnonymous: false,
            uid: user.uid,
            displayName: name,
            email: user.email ?? undefined,
            avatar: user.photoURL ?? undefined,
            initials: name
              .split(' ')
              .map(part => part[0])
              .join('')
              .toUpperCase()
              .slice(0, 2),
          },
        });
      } else if (!isElectron()) {
        dispatch({ type: 'SET_SESSION', payload: { isAuthenticated: false, isAnonymous: false } });
      }
    });
  }, [dispatch]);

  // Web: el login lleva a la dropzone; sin sesión se vuelve al login.
  useEffect(() => {
    if (isElectron()) return;
    if (signedIn && phase === 'login') dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
    if (!signedIn && phase !== 'login') dispatch({ type: 'SET_PHASE', payload: 'login' });
  }, [signedIn, phase, dispatch]);
}

/** Web: crea la sesión en borrador en Firestore (agrupa fuentes, notas y resultados). */
function useWebWorkspace() {
  const { state, dispatch } = useApp();
  const uid = state.session.uid;
  const workspaceId = state.workspaceId;
  const profile = { displayName: state.session.displayName ?? null, email: state.session.email ?? null };

  useEffect(() => {
    if (isElectron() || !uid || workspaceId) return;
    let cancelled = false;
    createDraftSession(uid, profile)
      .then(id => {
        if (!cancelled) dispatch({ type: 'SET_WORKSPACE', payload: id });
      })
      .catch(error => console.error('No se pudo crear la sesión en Firestore:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, workspaceId, dispatch]);
}

/**
 * Escritorio: un .yaleh abierto desde fuera de la app (argumentos de arranque o
 * segunda instancia). Si es válido, la sesión ya empezó; si no, se muestra el
 * motivo en la bienvenida.
 */
function useSessionFileResults() {
  const { state, dispatch } = useApp();
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;
    return api.onSessionFileResult(result => {
      // Con una sesión en curso el proceso principal ya rechazó el archivo: no se sale del kiosko.
      if (!result.ok && phaseRef.current === 'kiosk') return;
      applyOpenedSessionFile(dispatch, result);
      if (!result.ok) dispatch({ type: 'SET_PHASE', payload: 'desktop-start' });
    });
  }, [dispatch]);
}

/**
 * Componente interno que renderiza la fase correcta según el estado global.
 */
function AppContent() {
  const { state } = useApp();
  useSessionRecovery();
  useConnectionMode();
  useLocalAiStatus();
  useAuthSync();
  useWebWorkspace();
  useSessionFileResults();

  // El escritorio nunca muestra el login de la web.
  const phase = getElectronAPI() && state.phase === 'login' ? 'desktop-start' : state.phase;
  const Phase = PHASE_COMPONENTS[phase];
  // Web: con qué cuenta se entró, y cerrar sesión o cambiar de cuenta (BUG-002).
  const showAccount = !getElectronAPI() && state.session.isAuthenticated && phase !== 'login';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {showAccount && <WebAccountBar />}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className={phase === 'kiosk' ? 'h-screen' : 'h-screen overflow-y-auto'}
          initial={fadeOut}
          animate={fadeIn}
          exit={fadeOut}
          transition={{ duration: 0.3 }}
        >
          <Phase />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Componente raíz con el proveedor de contexto.
 */
export default function App() {
  const initial = useMemo<AppState>(() => {
    const isDesktop = getElectronAPI() !== null;
    return {
      ...initialState,
      phase: startPhase(isDesktop),
      connection: isDesktop ? 'unknown' : 'online',
      // Web: hasta que Firebase diga si hay una sesión guardada (BUG-002).
      authChecked: isDesktop,
    };
  }, []);

  return (
    <AppProvider initial={initial}>
      <AppContent />
    </AppProvider>
  );
}
