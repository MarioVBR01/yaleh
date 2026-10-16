/**
 * @file BottomBar.tsx
 * @description Barra Inferior del entorno Kiosko de YALEH.
 * Contiene: Temporizador regresivo de sesión ("Quedan" + HH:MM:SS con anillo de progreso, solo lo
 * muestra; la cuenta la lleva KioskLayout) con el grupo naranja "Extender" en los últimos 5 minutos
 * (ORION #10 y #32: +15, +25, +50 a un clic y "…" para otros minutos),
 * el recuadro del Pomodoro (ORION #4), la batería en portátiles (ORION #40) y
 * Sistema de gestión de pestañas responsivas con botón "Nueva Pestaña".
 * Las pestañas reducen su ancho proporcionalmente al acumularse,
 * emulando el comportamiento nativo de Chrome/Firefox.
 */

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Home } from 'lucide-react';
import { EXTEND_ACTIVE_WINDOW_SECONDS } from '@shared/config';
import { getElectronAPI } from '../lib/electron';
import QuickExtend from './QuickExtend';
import { useApp } from '../context/AppContext';
import type { Tab } from '../store/appStore';
import PomodoroMini from '../pomodoro/PomodoroMini';
import { BatteryIndicator } from './battery';

/**
 * Formatea segundos totales al formato HH:MM:SS para el temporizador.
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/**
 * Calcula el porcentaje de tiempo restante sobre el total de la sesión.
 */
function calcTimePercent(remaining: number, total: number): number {
  if (total === 0) return 0;
  return (remaining / total) * 100;
}

interface BottomBarProps {
  onNewTab: () => void;
}

export default function BottomBar({ onNewTab }: BottomBarProps) {
  const { state, dispatch } = useApp();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const api = getElectronAPI();
  // Extender antes de que termine (ORION #10): últimos 5 minutos, si la configuración lo permite.
  const canExtendNow =
    Boolean(api) &&
    state.settings?.settings.allowExtend !== false &&
    state.sessionDuration > 0 &&
    state.timeRemaining > 0 &&
    state.timeRemaining <= EXTEND_ACTIVE_WINDOW_SECONDS;

  const extendNow = async (minutes: number) => {
    if (!api) return;
    setExtendError(null);
    try {
      const snapshot = await api.extendSession(minutes * 60);
      dispatch({
        type: 'RESUME_SESSION',
        payload: { durationSeconds: snapshot.durationSeconds, remainingSeconds: snapshot.remainingSeconds, mode: snapshot.mode },
      });
    } catch (err) {
      console.error('No se pudo extender la sesión:', err);
      setExtendError('No se pudo extender.');
    }
  };

  const timePercent = calcTimePercent(state.timeRemaining, state.sessionDuration);
  const isLowTime = state.timeRemaining < 300; // Menos de 5 minutos
  // Aviso antes de que termine (configuración, ORION #7).
  const warningMinutes = state.settings?.settings.endWarningMinutes ?? 0;
  const showEndWarning =
    warningMinutes > 0 && state.sessionDuration > 0 && state.timeRemaining > 0 && state.timeRemaining <= warningMinutes * 60;

  /**
   * Calcula el ancho máximo de cada pestaña en píxeles
   * en función del número total de pestañas abiertas.
   * Rango: 48px (mínimo colapsado) — 200px (máximo).
   */
  const getTabMaxWidth = (totalTabs: number): number => {
    if (totalTabs <= 3) return 200;
    if (totalTabs <= 6) return 150;
    if (totalTabs <= 10) return 100;
    return 60;
  };

  const tabMaxWidth = getTabMaxWidth(state.tabs.length);

  return (
    <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 relative z-40">
      {/* Barra de progreso del temporizador (naranja, ORION #32) */}
      <div className="h-0.5 bg-slate-800 relative overflow-hidden">
        <motion.div
          className="h-full bg-brand"
          style={{ width: `${timePercent}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      {/* Contenido principal de la barra (64 px, ORION #32) */}
      <div className="h-16 flex items-center gap-2.5 px-3">

        {/* Temporizador regresivo (no aparece en el espacio de trabajo de la web sin sesión) */}
        {state.sessionDuration > 0 && <SessionClock remaining={state.timeRemaining} percent={timePercent} low={isLowTime} />}

        {canExtendNow && (
          <>
            <QuickExtend onExtend={extendNow} />
            {extendError && <span role="alert" className="text-[11px] text-danger flex-shrink-0">{extendError}</span>}
          </>
        )}

        {showEndWarning && (
          <span role="alert" className="px-2 py-1 rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs font-medium flex-shrink-0">
            Quedan {Math.ceil(state.timeRemaining / 60)} min de sesión
          </span>
        )}

        {/* Batería: solo en portátiles (ORION #40) */}
        <BatteryIndicator />

        {/* Pomodoro: visible en toda la sesión cuando ya se usó (ORION #4) */}
        <PomodoroMini />

        {/* Separador */}
        <div className="h-6 w-px bg-slate-700/50 flex-shrink-0" />

        {/* Contenedor de pestañas responsivo */}
        <div
          ref={tabsContainerRef}
          className="flex-1 flex items-center gap-1 overflow-hidden"
        >
          <AnimatePresence initial={false}>
            {state.tabs.map(tab => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === state.activeTabId}
                maxWidth={tabMaxWidth}
                onActivate={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
                onClose={() => dispatch({ type: 'CLOSE_TAB', payload: tab.id })}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Botón Nueva Pestaña */}
        <motion.button
          onClick={onNewTab}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white text-xs font-medium transition-all flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={13} />
          <span className="hidden sm:block">Nueva Pestaña</span>
        </motion.button>
      </div>
    </div>
  );
}

/**
 * Reloj de la sesión (ORION #32): "Quedan" y el tiempo en monoespaciada de 20 px, con un anillo
 * de progreso. En los últimos minutos se pone naranja.
 */
function SessionClock({ remaining, percent, low }: { remaining: number; percent: number; low: boolean }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <div data-testid="session-clock" data-low={low} className="flex items-center gap-2 flex-shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="-rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3" className="stroke-slate-700" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, percent)) / 100)}
          className={low ? 'stroke-brand' : 'stroke-slate-300'}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="leading-none">
        <div className={`text-[10px] uppercase tracking-wide font-semibold ${low ? 'text-brand' : 'text-slate-400'}`}>Quedan</div>
        <div className={`font-mono text-[20px] font-bold tabular-nums ${low ? 'text-brand' : 'text-slate-100'}`}>{formatTime(remaining)}</div>
      </div>
    </div>
  );
}

/**
 * Componente individual de pestaña con cierre y activación.
 */
interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  maxWidth: number;
  onActivate: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, maxWidth, onActivate, onClose }: TabItemProps) {
  const isDashboard = tab.id === 'dashboard';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, width: 0 }}
      animate={{ opacity: 1, scale: 1, width: 'auto' }}
      exit={{ opacity: 0, scale: 0.8, width: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{ maxWidth: `${maxWidth}px`, minWidth: '44px' }}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer group transition-all flex-shrink-0 overflow-hidden ${
        isActive
          ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
          : 'bg-slate-800/50 border border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-300'
      }`}
      onClick={onActivate}
      title={tab.title}
    >
      {/* Ícono de la pestaña */}
      <span className="flex-shrink-0 text-sm leading-none">
        {isDashboard ? <Home size={13} /> : (tab.icon || '🌐')}
      </span>

      {/* Título de la pestaña — se oculta cuando el espacio es mínimo */}
      {maxWidth > 70 && (
        <span className="flex-1 truncate min-w-0">
          {tab.title}
        </span>
      )}

      {/* Botón de cierre — solo en pestañas no-dashboard */}
      {!isDashboard && (
        <motion.button
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
          className={`flex-shrink-0 rounded p-0.5 transition-all ${
            isActive
              ? 'opacity-60 hover:opacity-100 hover:bg-blue-500/20 text-blue-300'
              : 'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-slate-700 text-slate-400'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <X size={11} />
        </motion.button>
      )}
    </motion.div>
  );
}
