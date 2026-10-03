/**
 * @file WorkspaceView.tsx
 * @description Vista principal estilo NotebookLM (brief, sección 5.2):
 * Fuentes · Chat · Estudio. En pantallas angostas las columnas pasan a pestañas.
 * Reemplaza al Dashboard del MVP. Solo existe en el kiosko del escritorio (revisión 1.6).
 */

import { useState } from 'react';
import { BookOpen, MessageSquare, FileText } from 'lucide-react';
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
  const [active, setActive] = useState<Column>('chat');

  /** En pantallas anchas se ven las tres columnas; en angostas, solo la pestaña activa. */
  const visibility = (column: Column) => (active === column ? 'flex' : 'hidden lg:flex');

  return (
    <div className="h-full flex flex-col bg-canvas">

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
