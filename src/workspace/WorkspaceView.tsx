/**
 * @file WorkspaceView.tsx
 * @description Vista principal estilo NotebookLM (brief, sección 5.2):
 * Fuentes · Chat · Estudio. En pantallas angostas las columnas pasan a pestañas.
 * Reemplaza al Dashboard del MVP.
 */

import { useState } from 'react';
import { BookOpen, MessageSquare, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModeFlags } from '../lib/mode';
import ChatColumn from './ChatColumn';
import SourcesColumn from './SourcesColumn';
import StudioColumn from './StudioColumn';

type Column = 'sources' | 'chat' | 'studio';

const COLUMNS: { id: Column; label: string; icon: typeof FileText }[] = [
  { id: 'sources', label: 'Fuentes', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'studio', label: 'Estudio', icon: BookOpen },
];

export default function WorkspaceView() {
  const { state, dispatch } = useApp();
  const { isDesktop } = useModeFlags();
  const [active, setActive] = useState<Column>('chat');
  const firstName = (state.session.displayName ?? '').split(' ')[0];

  /** En pantallas anchas se ven las tres columnas; en angostas, solo la pestaña activa. */
  const visibility = (column: Column) => (active === column ? 'flex' : 'hidden lg:flex');

  return (
    <div className="h-full flex flex-col bg-canvas">
      {!isDesktop && (
        <header className="px-5 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-ink text-lg font-bold">¡Hola{firstName ? `, ${firstName}` : ''}! 👋</h1>
            <p className="text-ink-muted text-xs">
              Carga tus materiales, pregúntale al asistente y prepara tu sesión de concentración.
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent-strong hover:bg-accent text-ink transition-colors"
          >
            Iniciar sesión de concentración
          </button>
        </header>
      )}

      <nav className="lg:hidden flex gap-1 px-3 pt-3" role="tablist" aria-label="Columnas del espacio de trabajo">
        {COLUMNS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium ${
              active === id ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)_minmax(260px,1.2fr)] gap-3 p-3">
        <section aria-label="Fuentes" className={`${visibility('sources')} flex-col min-h-0 bg-surface border border-line rounded-2xl p-3`}>
          <SourcesColumn />
        </section>
        <section aria-label="Chat" className={`${visibility('chat')} flex-col min-h-0 bg-surface border border-line rounded-2xl p-3`}>
          <ChatColumn />
        </section>
        <section aria-label="Estudio" className={`${visibility('studio')} flex-col min-h-0 bg-surface border border-line rounded-2xl p-3`}>
          <StudioColumn />
        </section>
      </div>
    </div>
  );
}
