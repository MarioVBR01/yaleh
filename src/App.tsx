/**
 * @file App.tsx
 * @description Componente raíz de la aplicación YALEH.
 * Gestiona el flujo de fases:
 * - Web: Login → Dropzone → Tiempo → Confirmación → Kiosko → Resumen.
 * - Escritorio: Inicio según la conexión → Dropzone → Tiempo → Confirmación → Kiosko → Resumen.
 *   El escritorio no tiene login propio. Al arrancar consulta al proceso principal
 *   si hay una sesión activa o interrumpida, y sigue el modo de conexión.
 */

import { useEffect, useMemo, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { getElectronAPI, isElectron } from './lib/electron';
import { watchUser } from './firebase/auth';
import { createDraftSession } from './firebase/sessions';
import { startPhase } from './lib/mode';
import { initialState, type AppPhase, type AppState } from './store/appStore';
import LoginPhase from './phases/LoginPhase';
import DesktopStartPhase from './phases/DesktopStartPhase';
import OnlineHandoffPhase from './phases/OnlineHandoffPhase';
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
  'online-handoff': OnlineHandoffPhase,
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

/**
 * Sincroniza el usuario de Google (Firebase Auth) con el estado global.
 * Web: al iniciar sesión pasa a la dropzone; al cerrarla vuelve al login.
 */
function useAuthSync() {
  const { state, dispatch } = useApp();
  const phase = state.phase;
  const signedIn = state.session.isAuthenticated;

  useEffect(() => {
    return watchUser(user => {
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

/** Escritorio: una sesión enviada desde la web (yaleh://sesion) abre la pantalla de preparación. */
function useSessionLinks() {
  const { state, dispatch } = useApp();
  const inKiosk = state.phase === 'kiosk';

  useEffect(() => {
    const api = getElectronAPI();
    if (!api || inKiosk) return;
    return api.onSessionLink(({ sessionId }) => {
      dispatch({ type: 'SET_LINKED_SESSION', payload: sessionId });
      dispatch({ type: 'SET_PHASE', payload: 'online-handoff' });
    });
  }, [inKiosk, dispatch]);
}

/**
 * Componente interno que renderiza la fase correcta según el estado global.
 */
function AppContent() {
  const { state } = useApp();
  useSessionRecovery();
  useConnectionMode();
  useAuthSync();
  useWebWorkspace();
  useSessionLinks();

  // El escritorio nunca muestra el login de la web.
  const phase = getElectronAPI() && state.phase === 'login' ? 'desktop-start' : state.phase;
  const Phase = PHASE_COMPONENTS[phase];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className={phase === 'kiosk' ? 'h-screen' : 'min-h-screen'}
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
    };
  }, []);

  return (
    <AppProvider initial={initial}>
      <AppContent />
    </AppProvider>
  );
}
