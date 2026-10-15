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
import ExternalTabPanel from '../panels/ExternalTabPanel';
import HistoryPanel from '../panels/HistoryPanel';
import PomodoroPanel from '../panels/PomodoroPanel';
import SettingsView from '../settings/SettingsView';
import TimeWarningToast from './TimeWarningToast';
import { PomodoroProvider } from '../pomodoro/PomodoroContext';
import DownloadsPanel from '../panels/DownloadsPanel';
import StatsPanel from '../panels/StatsPanel';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import { useExternalTabsSync, useOpenExternalTab } from './useExternalTabs';
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
      return <ExternalTabPanel tab={tab} />;
    case 'history':
      return <HistoryPanel />;
    case 'pomodoro':
      return <PomodoroPanel />;
    case 'downloads':
      return <DownloadsPanel />;
    case 'stats':
      return <StatsPanel />;
    case 'settings':
      return <SettingsView inSession />;
    default:
      return <WorkspaceView />;
  }
}

export default function KioskLayout() {
  const { state, dispatch } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);

  const api = getElectronAPI();
  const { onlineTools, offlineNotice } = useModeFlags();
  // Las vistas de las pestañas internas se dibujan encima de la interfaz: se ocultan con el diálogo abierto.
  useExternalTabsSync({ overlayOpen: showNewTabDialog, onlineTools });
  const openExternal = useOpenExternalTab();

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
    // El Pomodoro vive en el kiosko (ORION #4): sigue corriendo fuera de su vista.
    <PomodoroProvider>
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
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/*
           * Avisos arriba del área de trabajo. Ocupan su propio lugar (no flotan): así la pestaña
           * externa (WebContentsView, que se dibuja encima de la interfaz) se achica y no los tapa.
           */}
          {/* Avisos de la interfaz, por ejemplo el límite de pestañas (ORION #21: fondo sólido). */}
          {state.notice && (
            <div
              role="alert"
              className="flex-shrink-0 px-4 py-2.5 bg-danger text-ink text-sm font-medium flex items-center justify-center gap-3"
            >
              <span>{state.notice}</span>
              <button
                onClick={() => dispatch({ type: 'SET_NOTICE', payload: null })}
                className="px-3 py-1 rounded-lg bg-ink text-canvas text-xs font-semibold hover:opacity-90"
              >
                Entendido
              </button>
            </div>
          )}
          {/* Conexión perdida en una sesión online: el kiosko sigue bloqueado y el tiempo corre. */}
          {offlineNotice && (
            <div role="status" className="flex-shrink-0 px-4 py-2 bg-warning/15 border-b border-warning/40 text-ink-soft text-sm text-center">
              Sin conexión: puedes seguir con los módulos locales
            </div>
          )}
          {/* Aviso de tiempo restante (ORION #13). */}
          <TimeWarningToast />
          <div className="flex-1 min-h-0 overflow-hidden relative">

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
                        void openExternal(site.url, site.name, site.icon);
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
    </PomodoroProvider>
  );
}
