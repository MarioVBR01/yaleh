/**
 * @file ChatColumn.tsx
 * @description Columna "Chat" (brief, secciones 5.2 y 7): conversación con el asistente
 * sobre las fuentes del estudiante. Con conexión responde Gemini (y puede buscar en Wikipedia);
 * sin conexión, el modelo local si está instalado (revisión 1.8). Sin ninguno: "Disponible próximamente".
 * Diseño (ORION #35): pregunta en burbuja oscura a la derecha, respuesta con el ícono del asistente y
 * la cita con el nombre de los archivos usados (sin páginas: eso queda para la versión 2).
 * TODO: guardar el historial del chat en Firestore (hoy vive en memoria).
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpenText, FileText, Loader2, Send, Sparkles, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAIError } from '../ai/errors';
import type { ChatTurn } from '../ai/gemini';
import type { AssistantProvider } from '../ai/provider';
import { searchProvider, type SearchResult } from '../ai/search';
import { useSourceTexts } from '../ai/useSourceTexts';
import { useAssistant, useModeFlags } from '../lib/mode';
import AIUnavailable, { AssistantBadge, LocalSlowNotice } from './AIUnavailable';
import Markdown from './Markdown';

interface Message extends ChatTurn {
  id: number;
  /** Artículos usados en la respuesta (se muestran como texto, sin enlaces). */
  sources?: SearchResult[];
  /** Archivos del estudiante en los que se basó la respuesta (solo el nombre). */
  cites?: string[];
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
      const cites = state.uploadedFiles.filter(f => f.status === 'ready').map(f => f.name);
      setMessages(prev => [...prev, { id: answerId, role: 'assistant', text: '', sources: results, cites }]);
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
      <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-3">
        <h2 className="font-display text-[17px] font-bold text-ink flex items-center gap-2 flex-1">
          Chat <AssistantBadge label={provider.label} local={provider.kind === 'local'} />
        </h2>
        <span className="text-ink-muted text-[11px]">
          {count > 0 ? `Basado en ${count} fuente(s)` : 'Sin fuentes: tutor general'}
        </span>
      </div>

      {provider.kind === 'local' && (
        <div className="mx-6 mb-2">
          <LocalSlowNotice />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-1 pb-4 flex flex-col gap-[18px]" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-ink-muted text-sm mb-4">Pregúntale al asistente sobre tus materiales.</p>
            {provider.kind === 'local' && (
              <p className="text-ink-subtle text-[11px] mb-4">
                Responde el modelo instalado en este equipo: tus documentos no salen de la computadora. Responde
                breve; si necesitas más, pídele "explícame en detalle".
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="px-3 py-[7px] rounded-full border border-line text-[13px] text-ink-soft hover:text-ink hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m =>
          m.role === 'user' ? (
            <p
              key={m.id}
              data-testid="msg-user"
              className="self-end max-w-[70%] px-3.5 py-2.5 rounded-[16px_16px_4px_16px] bg-ink text-canvas text-sm whitespace-pre-wrap"
            >
              {m.text}
            </p>
          ) : (
            <div key={m.id} data-testid="msg-ai" className="flex gap-3 max-w-[92%]">
              <span className="w-8 h-8 rounded-[10px] bg-accent/15 text-accent-soft grid place-items-center flex-shrink-0" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <div className={`min-w-0 text-ink ${m.error ? 'px-3 py-2 rounded-xl bg-danger/10 border border-danger/40' : ''}`}>
                {m.text ? <Markdown text={m.text} /> : <Loader2 size={16} className="animate-spin text-ink-subtle mt-2" />}
                {!m.error && m.text && m.cites && m.cites.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.cites.map(name => (
                      <span key={name} data-testid="cite" className="inline-flex items-center gap-1 text-[11px] text-ink-muted bg-surface-raised rounded-md px-1.5 py-0.5 max-w-full">
                        <FileText size={12} className="flex-shrink-0" />
                        <span className="truncate">{name}</span>
                      </span>
                    ))}
                  </div>
                )}
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
        className="mx-4 mb-4 rounded-2xl border border-line bg-canvas pl-4 pr-2.5 py-2.5 flex flex-col gap-2 focus-within:border-accent"
        onSubmit={e => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-center gap-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {busy === 'thinking' && provider.kind === 'local' ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="w-10 h-10 rounded-xl border border-line text-ink-soft hover:text-ink grid place-items-center"
              title="Detener la respuesta"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || busy !== false}
              className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-strong text-on-accent grid place-items-center disabled:opacity-50"
              title="Enviar"
              aria-label="Enviar"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          )}
        </div>
        {canSearch ? (
          <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
            <input type="checkbox" checked={useWikipedia} onChange={e => setUseWikipedia(e.target.checked)} className="accent-[var(--color-accent)]" />
            <BookOpenText size={14} /> Buscar también en Wikipedia
          </label>
        ) : (
          <p className="text-[11px] text-ink-subtle flex items-center gap-1.5">
            <BookOpenText size={14} /> La búsqueda en Wikipedia solo está disponible con conexión.
          </p>
        )}
      </form>
    </div>
  );
}
