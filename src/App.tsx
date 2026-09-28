/**
 * @file App.tsx
 * @description Componente raíz de la aplicación Safe Research Browser (SRB).
 * Gestiona el flujo de fases: Login → Dropzone → Timer → Kiosko.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import LoginPhase from './phases/LoginPhase';
import DropzonePhase from './phases/DropzonePhase';
import TimerSelectPhase from './phases/TimerSelectPhase';
import SessionCompletePhase from './phases/SessionCompletePhase';
import KioskLayout from './kiosk/KioskLayout';

/** Propiedades de animación de entrada para transiciones de fase */
const fadeIn = { opacity: 1, scale: 1 };
/** Propiedades de animación de salida para transiciones de fase */
const fadeOut = { opacity: 0, scale: 0.97 };

/**
 * Componente interno que renderiza la fase correcta según el estado global.
 */
function AppContent() {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AnimatePresence mode="wait">
        {state.phase === 'login' && (
          <motion.div
            key="login"
            className="min-h-screen"
            initial={fadeOut}
            animate={fadeIn}
            exit={fadeOut}
            transition={{ duration: 0.3 }}
          >
            <LoginPhase />
          </motion.div>
        )}

        {state.phase === 'dropzone' && (
          <motion.div
            key="dropzone"
            className="min-h-screen"
            initial={fadeOut}
            animate={fadeIn}
            exit={fadeOut}
            transition={{ duration: 0.3 }}
          >
            <DropzonePhase />
          </motion.div>
        )}

        {state.phase === 'timer-select' && (
          <motion.div
            key="timer"
            className="min-h-screen"
            initial={fadeOut}
            animate={fadeIn}
            exit={fadeOut}
            transition={{ duration: 0.3 }}
          >
            <TimerSelectPhase />
          </motion.div>
        )}

        {state.phase === 'kiosk' && (
          <motion.div
            key="kiosk"
            className="h-screen"
            initial={fadeOut}
            animate={fadeIn}
            exit={fadeOut}
            transition={{ duration: 0.3 }}
          >
            <KioskLayout />
          </motion.div>
        )}

        {state.phase === 'session-complete' && (
          <motion.div
            key="session-complete"
            className="min-h-screen"
            initial={fadeOut}
            animate={fadeIn}
            exit={fadeOut}
            transition={{ duration: 0.3 }}
          >
            <SessionCompletePhase />
          </motion.div>
        )}
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
