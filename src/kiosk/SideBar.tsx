/**
 * @file SideBar.tsx
 * @description Barra Lateral Izquierda del entorno Kiosko de YALEH.
 * Contiene: Inicio, Google Workspace, Ofimática Offline, Historial,
 * Pomodoro, Descargas, Resumen/Estadísticas y Configuración.
 * Soporta menús desplegables internos (App Drawers).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FileEdit, History, Clock, Download,
  BarChart2, ChevronRight, ChevronDown, Settings
} from 'lucide-react';
import { WORKSPACE_LINKS, type ToolLink } from '@shared/config';
import { useApp } from '../context/AppContext';
import { useModeFlags } from '../lib/mode';
import { signOut } from '../firebase/auth';

/** Estilo de cada app de Google Workspace; la lista viene de shared/config.ts. */
const WORKSPACE_STYLES: Record<string, string> = {
  docs: 'text-blue-400',
  sheets: 'text-emerald-400',
  slides: 'text-orange-400',
};

/** Configuración de editores Offline (Quill/Luckysheet embebidos) */
const OFFLINE_EDITORS = [
  {
    id: 'docs',
    label: 'Documento (.docx)',
    icon: '📄',
    editorType: 'docs' as const,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'sheets',
    label: 'Hoja de cálculo (.xlsx)',
    icon: '📋',
    editorType: 'sheets' as const,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'slides',
    label: 'Presentación (.pptx)',
    icon: '🎭',
    editorType: 'slides' as const,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
];

interface SideBarProps {
  collapsed: boolean;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick: () => void;
  collapsed: boolean;
  badge?: number;
}

/**
 * Componente individual de ítem de navegación en la barra lateral.
 */
function NavItem({
  icon, label, active, hasChildren, isOpen, onClick, collapsed, badge
}: NavItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
        active
          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      title={collapsed ? label : undefined}
    >
      <span className={`flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
              {badge}
            </span>
          )}
          {hasChildren && (
            <span className="flex-shrink-0 text-slate-600">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </>
      )}
      {/* Tooltip para modo colapsado */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
          {label}
        </div>
      )}
    </motion.button>
  );
}

export default function SideBar({ collapsed }: SideBarProps) {
  const { state, dispatch, openTab, logActivity } = useApp();
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const { isDesktop, onlineTools } = useModeFlags();

  /**
   * Alterna el panel desplegable de una categoría (Workspace/Offline).
   */
  const toggleDrawer = (id: string) => {
    setOpenDrawer(prev => (prev === id ? null : id));
  };

  /**
   * Abre un servicio de Google Workspace en nueva pestaña.
   * En la web verifica que el usuario esté autenticado antes de proceder.
   * En el escritorio no hay login propio (fase 4).
   */
  const handleWorkspaceOpen = (app: ToolLink) => {
    if (!isDesktop && !state.session.isAuthenticated) {
      dispatch({ type: 'SET_PHASE', payload: 'login' });
      return;
    }
    openTab({
      type: 'workspace-url',
      title: app.name,
      url: app.url,
      icon: app.icon,
    });
    logActivity({ type: 'tool', label: `${app.name} abierto`, icon: app.icon });
  };

  /**
   * Abre el editor offline local en una nueva pestaña.
   * Funciona 100% sin conexión utilizando editores JS embebidos.
   */
  const handleOfflineEditor = (editor: typeof OFFLINE_EDITORS[0]) => {
    openTab({
      type: 'offline-editor',
      title: editor.label,
      icon: editor.icon,
      editorType: editor.editorType,
    });
    logActivity({ type: 'tool', label: `${editor.label} abierto (Offline)`, icon: editor.icon });
  };

  /** Abre la vista de historial de actividad */
  const handleHistory = () => {
    openTab({ type: 'history', title: 'Historial', icon: '📋' });
    logActivity({ type: 'tool', label: 'Historial consultado', icon: '📋' });
  };

  /** Abre el temporizador Pomodoro */
  const handlePomodoro = () => {
    openTab({ type: 'pomodoro', title: 'Pomodoro', icon: '⏱️' });
    logActivity({ type: 'tool', label: 'Pomodoro abierto', icon: '⏱️' });
  };

  /** Abre el panel de descargas/archivos */
  const handleDownloads = () => {
    openTab({ type: 'downloads', title: 'Mis Archivos', icon: '📁' });
    logActivity({ type: 'tool', label: 'Panel de descargas abierto', icon: '📁' });
  };

  /** Abre el dashboard de estadísticas */
  const handleStats = () => {
    openTab({ type: 'stats', title: 'Estadísticas', icon: '📊' });
    logActivity({ type: 'tool', label: 'Estadísticas consultadas', icon: '📊' });
  };

  /** Regresa al Dashboard principal */
  const handleHome = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'dashboard' });
  };

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);

  return (
    <div
      className={`h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo superior */}
      <div className={`p-3 border-b border-slate-800 flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">YA</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white text-xs font-bold leading-tight">YALEH</p>
            <p className="text-slate-500 text-[10px]">Entorno de estudio</p>
          </div>
        )}
      </div>

      {/* Usuario de Google (nombre y foto) */}
      {state.session.isAuthenticated && (
        <div className={`px-3 py-2 border-b border-slate-800 flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          {state.session.avatar ? (
            <img
              src={state.session.avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-surface-raised text-ink text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {state.session.initials}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-ink text-xs font-medium truncate">{state.session.displayName}</p>
              {!isDesktop && (
                <button onClick={() => void signOut()} className="text-ink-subtle hover:text-ink text-[10px]">
                  Cerrar sesión
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">

        {/* Inicio */}
        <NavItem
          icon={<Home size={18} />}
          label="Inicio"
          active={activeTab?.type === 'dashboard'}
          onClick={handleHome}
          collapsed={collapsed}
        />

        {/* Google Workspace (solo con conexión) */}
        {onlineTools && (
        <div>
          <NavItem
            icon={<span className="text-base">🌐</span>}
            label="Google Workspace"
            hasChildren
            isOpen={openDrawer === 'workspace'}
            onClick={() => toggleDrawer('workspace')}
            collapsed={collapsed}
          />
          <AnimatePresence>
            {openDrawer === 'workspace' && !collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-3 mt-1 space-y-1 overflow-hidden border-l border-slate-700/50 pl-3"
              >
                {WORKSPACE_LINKS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => handleWorkspaceOpen(app)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-all hover:bg-slate-800 ${WORKSPACE_STYLES[app.id] ?? ''}`}
                  >
                    <span>{app.icon}</span>
                    <span className="text-slate-300 hover:text-white">{app.name}</span>
                  </button>
                ))}
                {!isDesktop && !state.session.isAuthenticated && (
                  <p className="text-[10px] text-amber-400/70 px-2 pb-1">
                    ⚠️ Requiere inicio de sesión
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Ofimática Offline */}
        <div>
          <NavItem
            icon={<FileEdit size={18} />}
            label="Ofimática Offline"
            hasChildren
            isOpen={openDrawer === 'offline'}
            onClick={() => toggleDrawer('offline')}
            collapsed={collapsed}
          />
          <AnimatePresence>
            {openDrawer === 'offline' && !collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-3 mt-1 space-y-1 overflow-hidden border-l border-slate-700/50 pl-3"
              >
                {OFFLINE_EDITORS.map(editor => (
                  <button
                    key={editor.id}
                    onClick={() => handleOfflineEditor(editor)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-all hover:bg-slate-800 ${editor.color}`}
                  >
                    <span>{editor.icon}</span>
                    <span className="text-slate-300 hover:text-white">{editor.label}</span>
                  </button>
                ))}
                <div className="px-2 py-1">
                  <span className="text-[10px] text-emerald-400/70">✓ Funciona sin internet</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Historial */}
        <NavItem
          icon={<History size={18} />}
          label="Historial"
          active={activeTab?.type === 'history'}
          onClick={handleHistory}
          collapsed={collapsed}
          badge={state.activityHistory.length > 0 ? state.activityHistory.length : undefined}
        />

        {/* Pomodoro */}
        <NavItem
          icon={<Clock size={18} />}
          label="Pomodoro"
          active={activeTab?.type === 'pomodoro'}
          onClick={handlePomodoro}
          collapsed={collapsed}
        />

        {/* Descargas */}
        <NavItem
          icon={<Download size={18} />}
          label="Descargas"
          active={activeTab?.type === 'downloads'}
          onClick={handleDownloads}
          collapsed={collapsed}
          badge={state.uploadedFiles.length > 0 ? state.uploadedFiles.length : undefined}
        />

        {/* Estadísticas */}
        <NavItem
          icon={<BarChart2 size={18} />}
          label="Resumen"
          active={activeTab?.type === 'stats'}
          onClick={handleStats}
          collapsed={collapsed}
        />

        {/* Configuración: botón visible; su función se define después (brief 5.3) */}
        <NavItem
          icon={<Settings size={18} />}
          label="Configuración (próximamente)"
          onClick={() => {}}
          collapsed={collapsed}
        />
      </nav>

      {/* Footer de la sidebar */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Modo Kiosko Activo</span>
          </div>
        </div>
      )}
    </div>
  );
}
