/**
 * @file KioskLayout.tsx
 * @description Layout principal del Modo Kiosko del SRB.
 * Orquesta la Barra Superior, Barra Lateral, Workspace Central y Barra Inferior.
 * Gestiona el renderizado de pestañas y la persistencia de estado entre ellas.
 * Aplica el bloqueo de teclas del sistema operativo (simulado en web).
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from './TopBar';
import SideBar from './SideBar';
import BottomBar from './BottomBar';
import Dashboard from '../panels/Dashboard';
import WebViewPanel from '../panels/WebViewPanel';
import OfflineEditorPanel from '../panels/OfflineEditorPanel';
import EncartaPanel from '../panels/EncartaPanel';
import AIWorkPanel from '../panels/AIWorkPanel';
import HistoryPanel from '../panels/HistoryPanel';
import PomodoroPanel from '../panels/PomodoroPanel';
import DownloadsPanel from '../panels/DownloadsPanel';
import StatsPanel from '../panels/StatsPanel';
import SettingsPanel from '../panels/SettingsPanel';
import { useApp } from '../context/AppContext';
import { isElectron, deactivateKiosk } from '../lib/electron';
import type { Tab } from '../store/appStore';

/** Interfaz del diálogo de nueva pestaña */
const NEW_TAB_SITES = [
  { name: 'Wikipedia', url: 'https://es.wikipedia.org', icon: '🌐' },
  { name: 'Google Scholar', url: 'https://scholar.google.com', icon: '🔬' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '📐' },
  { name: 'Coursera', url: 'https://www.coursera.org', icon: '🎓' },
  { name: 'SciELO', url: 'https://www.scielo.org', icon: '📄' },
  { name: 'TED Talks', url: 'https://www.ted.com', icon: '🎤' },
  { name: 'Duolingo', url: 'https://www.duolingo.com', icon: '🦉' },
  { name: 'Moodle', url: 'https://moodle.org', icon: '🏫' },
  { name: 'NotebookLM', url: 'https://notebooklm.google.com', icon: '📓' },
  { name: 'Pexels', url: 'https://www.pexels.com', icon: '📷' },
];

/**
 * Renderiza el contenido correcto según el tipo de la pestaña activa.
 * Preserva el estado al cambiar entre pestañas sin desmontar los componentes.
 */
function TabContent({ tab }: { tab: Tab }) {
  switch (tab.type) {
    case 'dashboard':
      return <Dashboard />;
    case 'workspace-url':
      return <WebViewPanel url={tab.url || 'https://es.wikipedia.org'} title={tab.title} />;
    case 'offline-editor':
      return <OfflineEditorPanel editorType={tab.editorType || 'docs'} />;
    case 'encarta':
      return <EncartaPanel />;
    case 'ai-work':
      return <AIWorkPanel />;
    case 'history':
      return <HistoryPanel />;
    case 'pomodoro':
      return <PomodoroPanel />;
    case 'downloads':
      return <DownloadsPanel />;
    case 'stats':
      return <StatsPanel />;
    default:
      return <Dashboard />;
  }
}

export default function KioskLayout() {
  const { state, openTab, dispatch } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);
  const [refKey, setRefKey] = useState(0);

  /**
   * Intercepta combinaciones de teclado del sistema en modo kiosko.
   * En Electron real, esto se implementa con globalShortcut.register() en main.js.
   * En entorno web, bloqueamos lo que el navegador permite interceptar.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.kioskActive) return;

      // Bloquear Alt+Tab (parcial en web)
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      }
      // Bloquear F11 (pantalla completa)
      if (e.key === 'F11') {
        e.preventDefault();
      }
      // Bloquear Escape en modo kiosko
      if (e.key === 'Escape' && state.kioskActive) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [state.kioskActive]);

  /**
   * Maneja el temporizador de la sesión de estudio.
   * - Decrementa timeRemaining cada segundo si kioskActive y timeRemaining > 0
   * - Dispara END_SESSION cuando timeRemaining llega a cero
   * - Desactiva el modo kiosko en Electron cuando la sesión termina
   */
  useEffect(() => {
    if (!state.kioskActive || state.timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.kioskActive, state.timeRemaining, dispatch]);

  /**
   * Cuando el tiempo llega a cero, muestra la pantalla de resumen.
   * Primero desactiva el modo kiosko en Electron, luego cambia de fase.
   * IMPORTANTE: No depender de kioskActive, solo de timeRemaining === 0
   */
  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === 'kiosk') {
      (async () => {
        // Desactivar modo kiosko en Electron primero
        if (isElectron()) {
          await deactivateKiosk();
        }
        // DESPUÉS, cambiar a la fase de sesión completada
        dispatch({ type: 'SET_PHASE', payload: 'session-complete' });
      })();
    }
  }, [state.timeRemaining, state.phase, dispatch]);

  /**
   * Recarga el contenido de la pestaña activa forzando re-render.
   */
  const handleRefresh = useCallback(() => {
    setRefKey(prev => prev + 1);
  }, []);

  /**
   * Abre el diálogo de nueva pestaña.
   */
  const handleNewTab = useCallback(() => {
    setShowNewTabDialog(true);
  }, []);



  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden select-none">

      {/* ── BARRA SUPERIOR ─────────────────────────────────────────────── */}
      <TopBar
        onOpenSettings={() => setShowSettings(true)}
        onRefresh={handleRefresh}
      />

      {/* ── ZONA CENTRAL: Sidebar + Workspace ──────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Botón de colapso de sidebar */}
        <div className="relative flex-shrink-0">
          <SideBar collapsed={sidebarCollapsed} />
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-300 hover:text-white text-xs flex items-center justify-center z-30 transition-all shadow-lg"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        {/* ── WORKSPACE CENTRAL (Pestañas) ──────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-hidden relative">

          {/*
           * Renderiza TODAS las pestañas pero solo muestra la activa.
           * Esto preserva el estado (editores, formularios, reproductores)
           * al cambiar entre pestañas sin desmontarlos.
           */}
          {state.tabs.map(tab => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${tab.id === state.activeTabId ? 'z-10' : 'z-0 pointer-events-none'}`}
              style={{ display: tab.id === state.activeTabId ? 'block' : 'none' }}
            >
              <TabContent key={`${tab.id}-${refKey}`} tab={tab} />
            </div>
          ))}

          {/* Estado vacío */}
          {state.tabs.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-600">
              <p className="text-sm">Abre una nueva pestaña para comenzar</p>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA INFERIOR ──────────────────────────────────────────────── */}
      <BottomBar onNewTab={handleNewTab} />

      {/* ── PANEL DE CONFIGURACIÓN ──────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* ── DIÁLOGO DE NUEVA PESTAÑA ────────────────────────────────────── */}
      <AnimatePresence>
        {showNewTabDialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewTabDialog(false)}
          >
            <motion.div
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-white font-bold text-lg mb-1">Nueva Pestaña</h2>
              <p className="text-slate-400 text-sm mb-5">Sitios académicos disponibles</p>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
                {NEW_TAB_SITES.map(site => (
                  <motion.button
                    key={site.url}
                    onClick={() => {
                      openTab({ type: 'workspace-url', title: site.name, url: site.url, icon: site.icon });
                      setShowNewTabDialog(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700 text-left transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-xl">{site.icon}</span>
                    <span className="text-slate-300 text-sm font-medium">{site.name}</span>
                  </motion.button>
                ))}
              </div>

              {/* Opciones especiales */}
              <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-2">
                <motion.button
                  onClick={() => {
                    openTab({ type: 'encarta', title: 'Enciclopedia Offline', icon: '📖' });
                    setShowNewTabDialog(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-500/20 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  📖 Enciclopedia
                </motion.button>
                <motion.button
                  onClick={() => {
                    openTab({ type: 'ai-work', title: 'Trabajo con IA', icon: '🤖' });
                    setShowNewTabDialog(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  🤖 Trabajo con IA
                </motion.button>
              </div>

              <button
                onClick={() => setShowNewTabDialog(false)}
                className="mt-4 w-full py-2.5 rounded-xl text-slate-500 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
