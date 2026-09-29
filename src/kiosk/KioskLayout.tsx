/**
 * @file KioskLayout.tsx
 * @description Layout principal del Modo Kiosko de YALEH.
 * Orquesta la Barra Lateral, el Workspace Central y la Barra Inferior.
 * Gestiona el renderizado de pestañas y la persistencia de estado entre ellas.
 *
 * El bloqueo y el tiempo los controla el proceso principal de Electron: aquí
 * solo se muestra el tiempo que envía. En el navegador (sin bloqueo) queda un
 * temporizador local como vista previa.
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TOOL_LINKS } from '@shared/config';
import SideBar from './SideBar';
import BottomBar from './BottomBar';
import WorkspaceView from '../workspace/WorkspaceView';
import WebViewPanel from '../panels/WebViewPanel';
import OfflineEditorPanel from '../panels/OfflineEditorPanel';
import HistoryPanel from '../panels/HistoryPanel';
import PomodoroPanel from '../panels/PomodoroPanel';
import DownloadsPanel from '../panels/DownloadsPanel';
import StatsPanel from '../panels/StatsPanel';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import { useModeFlags } from '../lib/mode';
import type { Tab } from '../store/appStore';

/**
 * Renderiza el contenido correcto según el tipo de la pestaña activa.
 * Preserva el estado al cambiar entre pestañas sin desmontar los componentes.
 */
function TabContent({ tab }: { tab: Tab }) {
  switch (tab.type) {
    case 'dashboard':
      return <WorkspaceView />;
    case 'workspace-url':
      return <WebViewPanel url={tab.url ?? ''} title={tab.title} />;
    case 'offline-editor':
      return <OfflineEditorPanel editorType={tab.editorType || 'docs'} />;
    case 'history':
      return <HistoryPanel />;
    case 'pomodoro':
      return <PomodoroPanel />;
    case 'downloads':
      return <DownloadsPanel />;
    case 'stats':
      return <StatsPanel />;
    default:
      return <WorkspaceView />;
  }
}

export default function KioskLayout() {
  const { state, openTab, dispatch } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);

  const api = getElectronAPI();
  const { onlineTools, offlineNotice } = useModeFlags();

  /**
   * Escritorio: el proceso principal envía el tiempo restante cada segundo y
   * avisa cuando la sesión termina (ya con el equipo liberado).
   */
  useEffect(() => {
    if (!api) return;
    const offTick = api.onSessionTick(({ remainingSeconds }) => {
      dispatch({ type: 'SYNC_TIME', payload: remainingSeconds });
    });
    const offEnded = api.onSessionEnded(() => {
      dispatch({ type: 'END_SESSION' });
    });
    return () => {
      offTick();
      offEnded();
    };
  }, [api, dispatch]);

  /** Navegador: temporizador local solo como vista previa (no bloquea nada). */
  useEffect(() => {
    if (api || !state.kioskActive || state.timeRemaining <= 0) return;
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(interval);
  }, [api, state.kioskActive, state.timeRemaining, dispatch]);

  /**
   * Navegador: al llegar a cero se muestra el resumen. Sin duración (espacio de
   * trabajo de la web sin sesión de concentración) no hay temporizador.
   */
  useEffect(() => {
    if (!api && state.sessionDuration > 0 && state.timeRemaining === 0 && state.phase === 'kiosk') {
      dispatch({ type: 'END_SESSION' });
    }
  }, [api, state.sessionDuration, state.timeRemaining, state.phase, dispatch]);

  /**
   * Abre el diálogo de nueva pestaña.
   */
  const handleNewTab = useCallback(() => {
    setShowNewTabDialog(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden select-none">

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

          {/* Conexión perdida en una sesión online: el kiosko sigue bloqueado y el tiempo corre. */}
          {offlineNotice && (
            <div
              role="status"
              className="absolute top-0 inset-x-0 z-20 px-4 py-2 bg-warning/15 border-b border-warning/40 text-ink-soft text-sm text-center"
            >
              Sin conexión: puedes seguir con los módulos locales
            </div>
          )}

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
              <TabContent tab={tab} />
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
              {onlineTools && (
                <>
              <p className="text-slate-400 text-sm mb-5">Herramientas autorizadas</p>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
                {TOOL_LINKS.map(site => (
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
                </>
              )}

              {!onlineTools && (
                <p className="text-slate-400 text-sm">
                  Sin conexión: las herramientas online no están disponibles. Usa el menú lateral para abrir los
                  módulos locales.
                </p>
              )}

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
