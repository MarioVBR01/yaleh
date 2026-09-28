/**
 * @file BottomBar.tsx
 * @description Barra Inferior del entorno Kiosko de YALEH.
 * Contiene: Temporizador regresivo de sesión (HH:MM:SS, solo lo muestra;
 * la cuenta la lleva KioskLayout) y
 * Sistema de gestión de pestañas responsivas con botón "Nueva Pestaña".
 * Las pestañas reducen su ancho proporcionalmente al acumularse,
 * emulando el comportamiento nativo de Chrome/Firefox.
 */

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Tab } from '../store/appStore';

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

  const timePercent = calcTimePercent(state.timeRemaining, state.sessionDuration);
  const isLowTime = state.timeRemaining < 300; // Menos de 5 minutos

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
      {/* Barra de progreso del temporizador */}
      <div className="h-0.5 bg-slate-800 relative overflow-hidden">
        <motion.div
          className={`h-full transition-colors ${
            isLowTime ? 'bg-red-500' : timePercent > 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${timePercent}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      {/* Contenido principal de la barra */}
      <div className="h-10 flex items-center gap-2 px-3">

        {/* Temporizador regresivo */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex-shrink-0 ${
            isLowTime
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : 'bg-slate-800/60 border-slate-700 text-slate-300'
          }`}
        >
          <motion.div
            animate={isLowTime ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Clock size={12} />
          </motion.div>
          <span>{formatTime(state.timeRemaining)}</span>
        </div>

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
