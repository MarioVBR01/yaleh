/**
 * @file App.tsx
 * @description Componente raíz de la aplicación YALEH.
 * Gestiona el flujo de fases: Login → Dropzone → Tiempo → Confirmación → Kiosko → Resumen.
 * En el escritorio, al arrancar consulta al proceso principal si hay una sesión
 * activa o interrumpida.
 */

import { useEffect, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { getElectronAPI } from './lib/electron';
import type { AppPhase } from './store/appStore';
import LoginPhase from './phases/LoginPhase';
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
          },
        });
      }
    });
  }, [dispatch]);
}

/**
 * Componente interno que renderiza la fase correcta según el estado global.
 */
function AppContent() {
  const { state } = useApp();
  useSessionRecovery();

  const Phase = PHASE_COMPONENTS[state.phase];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.phase}
          className={state.phase === 'kiosk' ? 'h-screen' : 'min-h-screen'}
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
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
