/**
 * @file SideBar.tsx
 * @description Barra Lateral Izquierda del entorno Kiosko de YALEH.
 * Brief, sección 5.3: Espacio de trabajo, Estadísticas, Pomodoro, Herramientas
 * (solo con conexión), Historial de sesiones y Configuración (ORION #7).
 * La sección de Ofimática se eliminó (ORION #12). Se oculta con el botón lateral.
 * Diseño (ORION #31, docs/diseno/maquetas/espacio-de-trabajo.html): logo de 44 px, opción activa en
 * naranja suave con una línea a la izquierda y pie "Sesión protegida".
 * Soporta menús desplegables internos (App Drawers).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, History, Clock, Wrench,
  BarChart2, ChevronRight, ChevronDown, Settings, ShieldCheck
} from 'lucide-react';
import { TOOL_LINKS, WORKSPACE_LINKS, type ToolLink } from '@shared/config';
import { useApp } from '../context/AppContext';
import { useModeFlags } from '../lib/mode';
import { signOut } from '../firebase/auth';
import Logo from '../components/Logo';
import { useOpenExternalTab } from './useExternalTabs';

/** Estilo de cada app de Google Workspace; la lista viene de shared/config.ts. */
const WORKSPACE_STYLES: Record<string, string> = {
  docs: 'text-info',
  sheets: 'text-success',
  slides: 'text-accent-soft',
};

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
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${collapsed ? 'justify-center' : ''} ${
        active
          ? 'bg-accent/15 text-ink font-medium shadow-[inset_3px_0_0_var(--color-accent)]'
          : 'text-ink-soft hover:text-ink hover:bg-surface-raised'
      }`}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      title={collapsed ? label : undefined}
    >
      <span className={`flex-shrink-0 ${active ? 'text-accent' : 'text-ink-muted group-hover:text-ink'}`}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-accent text-on-accent text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
              {badge}
            </span>
          )}
          {hasChildren && (
            <span className="flex-shrink-0 text-ink-muted">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </>
      )}
      {/* Tooltip para modo colapsado */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-inverse text-on-inverse rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
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
  const openExternal = useOpenExternalTab();

  /**
   * Alterna el panel desplegable de una categoría (Workspace/Offline).
   */
  const toggleDrawer = (id: string) => {
    setOpenDrawer(prev => (prev === id ? null : id));
  };

  /**
   * Abre una herramienta autorizada (brief, sección 5.3):
   * en el navegador, en una pestaña nueva del navegador; en el kiosko, en una pestaña interna.
   */
  const handleToolOpen = (app: ToolLink) => {
    if (!isDesktop) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    } else {
      void openExternal(app.url, app.name, app.icon);
    }
    logActivity({ type: 'tool', label: `${app.name} abierto`, icon: app.icon });
  };

  /** Abre la vista de historial de actividad */
  const handleHistory = () => {
    openTab({ type: 'history', title: 'Historial de sesiones', icon: '📋' });
    logActivity({ type: 'tool', label: 'Historial de sesiones consultado', icon: '📋' });
  };

  /** Abre el temporizador Pomodoro */
  const handlePomodoro = () => {
    openTab({ type: 'pomodoro', title: 'Pomodoro', icon: '⏱️' });
    logActivity({ type: 'tool', label: 'Pomodoro abierto', icon: '⏱️' });
  };

  /** Abre el dashboard de estadísticas */
  const handleStats = () => {
    openTab({ type: 'stats', title: 'Estadísticas', icon: '📊' });
    logActivity({ type: 'tool', label: 'Estadísticas consultadas', icon: '📊' });
  };

  /** Regresa al espacio de trabajo (Fuentes · Chat · Estudio) */
  const handleHome = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'dashboard' });
  };

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);

  return (
    <div
      className={`h-full bg-surface border-r border-line flex flex-col transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-[248px]'
      }`}
    >
      {/* Logo superior */}
      <div className={`px-4 pt-[18px] pb-3 flex items-center gap-3 ${collapsed ? 'justify-center px-2' : ''}`}>
        <Logo size={collapsed ? 36 : 44} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-ink text-[22px] font-extrabold tracking-[0.04em] leading-none">YALEH</p>
            <p className="text-ink-muted text-xs mt-1">Entorno de estudio</p>
          </div>
        )}
      </div>

      {/* Usuario de Google (nombre y foto) */}
      {state.session.isAuthenticated && (
        <div className={`px-3 py-2 border-b border-line flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
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
      <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1 scrollbar-thin">

        {/* Espacio de trabajo */}
        <NavItem
          icon={<Home size={18} />}
          label="Espacio de trabajo"
          active={activeTab?.type === 'dashboard'}
          onClick={handleHome}
          collapsed={collapsed}
        />

        {/* Estadísticas */}
        <NavItem
          icon={<BarChart2 size={18} />}
          label="Estadísticas"
          active={activeTab?.type === 'stats'}
          onClick={handleStats}
          collapsed={collapsed}
        />

        {/* Pomodoro */}
        <NavItem
          icon={<Clock size={18} />}
          label="Pomodoro"
          active={activeTab?.type === 'pomodoro'}
          onClick={handlePomodoro}
          collapsed={collapsed}
        />

        {/* Herramientas (solo con conexión) */}
        {onlineTools && (
        <div>
          <NavItem
            icon={<Wrench size={18} />}
            label="Herramientas"
            hasChildren
            isOpen={openDrawer === 'tools'}
            onClick={() => toggleDrawer('tools')}
            collapsed={collapsed}
          />
          <AnimatePresence>
            {openDrawer === 'tools' && !collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-3 mt-1 space-y-1 overflow-hidden border-l border-line pl-3"
              >
                {[...WORKSPACE_LINKS, ...TOOL_LINKS].map(app => (
                  <button
                    key={app.id}
                    onClick={() => handleToolOpen(app)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-all hover:bg-surface-raised ${WORKSPACE_STYLES[app.id] ?? 'text-ink-soft'}`}
                  >
                    <span>{app.icon}</span>
                    <span className="text-ink-soft hover:text-ink">{app.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Historial de sesiones (SQLite, fase 10) */}
        <NavItem
          icon={<History size={18} />}
          label="Historial de sesiones"
          active={activeTab?.type === 'history'}
          onClick={handleHistory}
          collapsed={collapsed}
        />

        {/* Configuración (ORION #7): dentro de la sesión solo lo inofensivo */}
        {isDesktop && (
          <NavItem
            icon={<Settings size={18} />}
            label="Configuración"
            active={activeTab?.type === 'settings'}
            onClick={() => openTab({ type: 'settings', title: 'Configuración', icon: '⚙️' })}
            collapsed={collapsed}
          />
        )}
      </nav>

      {/* Pie: la sesión está protegida (ORION #31). Colapsada, solo el escudo. */}
      {isDesktop &&
        (collapsed ? (
          <div className="p-3 flex justify-center" title="Sesión protegida">
            <ShieldCheck size={18} className="text-accent" aria-label="Sesión protegida" />
          </div>
        ) : (
          <div data-testid="sidebar-foot" className="m-3.5 mt-2 p-3 rounded-xl bg-surface-raised text-xs text-ink-soft flex flex-col gap-1.5">
            <b className="flex items-center gap-1.5 text-ink font-medium">
              <ShieldCheck size={16} className="text-accent" /> Sesión protegida
            </b>
            Solo se abren los sitios de estudio permitidos. Si se corta internet, el asistente sin conexión sigue funcionando.
          </div>
        ))}
    </div>
  );
}
