/**
 * @file ChatColumn.tsx
 * @description Columna "Chat" (brief, secciones 5.2 y 7): conversación con Gemini
 * sobre las fuentes del estudiante; opcionalmente busca en Wikipedia y muestra las
 * fuentes como texto. Sin conexión o en modo offline: "Disponible próximamente".
 * TODO: guardar el historial del chat en Firestore (hoy vive en memoria).
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpenText, Loader2, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAIError } from '../ai/errors';
import { askTutor, type ChatTurn } from '../ai/gemini';
import { searchProvider, type SearchResult } from '../ai/search';
import { useSourceTexts } from '../ai/useSourceTexts';
import { useModeFlags } from '../lib/mode';
import AIUnavailable from './AIUnavailable';
import Markdown from './Markdown';

interface Message extends ChatTurn {
  id: number;
  /** Artículos usados en la respuesta (se muestran como texto, sin enlaces). */
  sources?: SearchResult[];
  error?: boolean;
}

const SUGGESTIONS = ['Explícame las ideas principales', '¿Qué conceptos debería repasar?', 'Dame un ejemplo práctico'];

export default function ChatColumn() {
  const { ai } = useModeFlags();
  if (!ai) return <AIUnavailable />;
  return <Chat />;
}

function Chat() {
  const { logActivity } = useApp();
  const { load, count } = useSourceTexts();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<false | 'searching' | 'thinking'>(false);
  const [useWikipedia, setUseWikipedia] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

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
      if (useWikipedia) {
        setBusy('searching');
        try {
          results = await searchProvider.search(question);
        } catch (err) {
          console.warn('No se pudo buscar en Wikipedia:', err);
        }
      }
      setBusy('thinking');
      const sources = await load();
      setMessages(prev => [...prev, { id: answerId, role: 'assistant', text: '', sources: results }]);
      await askTutor(question, history, sources, results, partial =>
        setMessages(prev => prev.map(m => (m.id === answerId ? { ...m, text: partial } : m)))
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
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-ink font-semibold text-sm">Chat</h2>
        <span className="text-ink-subtle text-[11px]">
          {count > 0 ? `Basado en ${count} fuente(s)` : 'Sin fuentes: tutor general'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-ink-muted text-sm mb-4">Pregúntale al asistente sobre tus materiales.</p>
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
        <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
          <input type="checkbox" checked={useWikipedia} onChange={e => setUseWikipedia(e.target.checked)} />
          <BookOpenText size={13} /> Buscar también en Wikipedia
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 bg-canvas border border-line focus:border-accent rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy !== false}
            className="px-3 rounded-xl bg-accent-strong hover:bg-accent text-ink disabled:opacity-50"
            title="Enviar"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
