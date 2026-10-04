/**
 * @file ChatColumn.tsx
 * @description Columna "Chat" (brief, secciones 5.2 y 7): conversación con el asistente
 * sobre las fuentes del estudiante. Con conexión responde Gemini (y puede buscar en Wikipedia);
 * sin conexión, el modelo local si está instalado (revisión 1.8). Sin ninguno: "Disponible próximamente".
 * TODO: guardar el historial del chat en Firestore (hoy vive en memoria).
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpenText, Loader2, Send, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAIError } from '../ai/errors';
import type { ChatTurn } from '../ai/gemini';
import type { AssistantProvider } from '../ai/provider';
import { searchProvider, type SearchResult } from '../ai/search';
import { useSourceTexts } from '../ai/useSourceTexts';
import { useAssistant, useModeFlags } from '../lib/mode';
import AIUnavailable, { AssistantBadge } from './AIUnavailable';
import Markdown from './Markdown';

interface Message extends ChatTurn {
  id: number;
  /** Artículos usados en la respuesta (se muestran como texto, sin enlaces). */
  sources?: SearchResult[];
  error?: boolean;
}

const SUGGESTIONS = ['Explícame las ideas principales', '¿Qué conceptos debería repasar?', 'Dame un ejemplo práctico'];

export default function ChatColumn() {
  const { assistant } = useModeFlags();
  const provider = useAssistant();
  if (assistant.kind === 'none' || !provider) {
    return <AIUnavailable reason={assistant.kind === 'none' ? assistant.reason : undefined} />;
  }
  return <Chat key={provider.kind} provider={provider} />;
}

function Chat({ provider }: { provider: AssistantProvider }) {
  const { state, logActivity } = useApp();
  const { load, count } = useSourceTexts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<false | 'searching' | 'thinking'>(false);
  const [useWikipedia, setUseWikipedia] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const canSearch = provider.supports('wikipedia');

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setInput('');
    const history: ChatTurn[] = messages.filter(m => !m.error).map(({ role, text }) => ({ role, text }));
    const userMsg: Message = { id: nextId.current++, role: 'user', text: question };
    const answerId = nextId.current++;
    setMessages(prev => [...prev, userMsg]);

    try {
      let results: SearchResult[] = [];
      if (useWikipedia && canSearch) {
        setBusy('searching');
        try {
          results = await searchProvider.search(question);
        } catch (err) {
          console.warn('No se pudo buscar en Wikipedia:', err);
        }
      }
      setBusy('thinking');
      setMessages(prev => [...prev, { id: answerId, role: 'assistant', text: '', sources: results }]);
      abortRef.current = new AbortController();
      await provider.chat(
        { question, history, searchResults: results },
        { loadSources: load, workspaceId: state.workspaceId },
        partial => setMessages(prev => prev.map(m => (m.id === answerId ? { ...m, text: partial } : m))),
        abortRef.current.signal
      );
      logActivity({ type: 'search', label: `Pregunta al asistente: ${question.slice(0, 60)}`, icon: '💬' });
    } catch (err) {
      console.error('Error del asistente:', err);
      const errorText = describeAIError(err);
      setMessages(prev => [
        ...prev.filter(m => m.id !== answerId),
        { id: answerId, role: 'assistant', text: errorText, error: true },
      ]);
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-ink font-semibold text-sm flex items-center gap-2">
          Chat <AssistantBadge label={provider.label} local={provider.kind === 'local'} />
        </h2>
        <span className="text-ink-subtle text-[11px]">
          {count > 0 ? `Basado en ${count} fuente(s)` : 'Sin fuentes: tutor general'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-ink-muted text-sm mb-4">Pregúntale al asistente sobre tus materiales.</p>
            {provider.kind === 'local' && (
              <p className="text-ink-subtle text-[11px] mb-4">
                Responde el modelo instalado en este equipo: tus documentos no salen de la computadora. Es más lento
                que el asistente en línea.
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="px-3 py-1.5 rounded-full border border-line text-xs text-ink-soft hover:text-ink hover:border-line-strong"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-accent-strong text-ink text-sm whitespace-pre-wrap">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className={`max-w-[95%] px-3 py-2 rounded-2xl rounded-bl-sm ${m.error ? 'bg-danger/10 border border-danger/40' : 'bg-surface-raised'}`}>
              {m.text ? <Markdown text={m.text} /> : <Loader2 size={16} className="animate-spin text-ink-subtle" />}
              {m.sources && m.sources.length > 0 && m.text && (
                <div className="mt-2 pt-2 border-t border-line text-[11px] text-ink-subtle">
                  <p className="font-medium text-ink-muted mb-0.5">Fuentes consultadas:</p>
                  {m.sources.map(s => (
                    <p key={s.title}>
                      {s.title} — {s.sourceLabel}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {busy === 'searching' && (
          <p className="text-ink-subtle text-xs flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Buscando en Wikipedia…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault();
          void send(input);
        }}
      >
        {canSearch ? (
          <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
            <input type="checkbox" checked={useWikipedia} onChange={e => setUseWikipedia(e.target.checked)} />
            <BookOpenText size={13} /> Buscar también en Wikipedia
          </label>
        ) : (
          <p className="text-[11px] text-ink-subtle flex items-center gap-2">
            <BookOpenText size={13} /> La búsqueda en Wikipedia solo está disponible con conexión.
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 bg-canvas border border-line focus:border-accent rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          {busy === 'thinking' && provider.kind === 'local' ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="px-3 rounded-xl border border-line text-ink-soft hover:text-ink"
              title="Detener la respuesta"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || busy !== false}
              className="px-3 rounded-xl bg-accent-strong hover:bg-accent text-ink disabled:opacity-50"
              title="Enviar"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
