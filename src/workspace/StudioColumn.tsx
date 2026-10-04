/**
 * @file StudioColumn.tsx
 * @description Columna "Estudio" (brief, secciones 5.2 y 7.3): resumen, cuestionario,
 * tarjetas e informe generados por la IA, y el recuadro de notas.
 * Los resultados se guardan en Firestore (studyItems) cuando hay cuenta.
 * Sin conexión, el modelo local (si está instalado) hace el resumen y las tarjetas; el cuestionario y
 * el informe siguen solo con conexión (revisión 1.8). Sin asistente: "Disponible próximamente"; las notas funcionan.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileBarChart, HelpCircle, Layers, ListChecks, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAIError } from '../ai/errors';
import type { AssistantProvider } from '../ai/provider';
import { STUDY_LABELS, type QuizQuestion, type StudyContent, type StudyKind } from '../ai/study-items';
import { useSourceTexts } from '../ai/useSourceTexts';
import { getWorkspaceStore, newId } from '../data/workspace';
import { useAssistant, useModeFlags } from '../lib/mode';
import AIUnavailable, { AssistantBadge } from './AIUnavailable';
import Markdown from './Markdown';
import NotesBox from './NotesBox';

const ACTIONS: { kind: StudyKind; icon: typeof ListChecks }[] = [
  { kind: 'summary', icon: ListChecks },
  { kind: 'quiz', icon: HelpCircle },
  { kind: 'flashcards', icon: Layers },
  { kind: 'report', icon: FileBarChart },
];

interface Item {
  id: string;
  content: StudyContent;
}

export default function StudioColumn() {
  const { assistant } = useModeFlags();
  const provider = useAssistant();
  return (
    <div className="h-full flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
      <h2 className="text-ink font-semibold text-sm flex items-center gap-2">
        Estudio {provider && <AssistantBadge label={provider.label} local={provider.kind === 'local'} />}
      </h2>
      {provider ? (
        <StudyTools provider={provider} />
      ) : (
        <AIUnavailable compact reason={assistant.kind === 'none' ? assistant.reason : undefined} />
      )}
      <NotesBox />
    </div>
  );
}

function StudyTools({ provider }: { provider: AssistantProvider }) {
  const { state, logActivity } = useApp();
  const { load, count } = useSourceTexts();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<StudyKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);

  const generate = async (kind: StudyKind) => {
    setBusy(kind);
    setError(null);
    setTokens(0);
    try {
      const content = await provider.study(kind, { loadSources: load, workspaceId: state.workspaceId }, setTokens);
      const item = { id: newId(), content };
      setItems(prev => [item, ...prev]);
      logActivity({ type: 'tool', label: `${STUDY_LABELS[kind]} generado`, icon: '✨' });
      getWorkspaceStore(state)
        ?.saveStudyItem({ id: item.id, kind, content: content.data })
        .catch(err => console.warn('No se pudo guardar el resultado:', err));
    } catch (err) {
      console.error(`No se pudo generar ${kind}:`, err);
      setError(describeAIError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ kind, icon: Icon }) => (
          <button
            key={kind}
            onClick={() => void generate(kind)}
            disabled={busy !== null || count === 0 || !provider.supports(kind)}
            title={provider.supports(kind) ? undefined : 'Solo disponible con conexión'}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-surface-raised text-xs text-ink-soft hover:text-ink hover:border-line-strong disabled:opacity-50"
          >
            {busy === kind ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} className="text-accent" />}
            {STUDY_LABELS[kind]}
          </button>
        ))}
      </div>
      {count === 0 && <p className="text-ink-subtle text-[11px]">Agrega una fuente para generar material de estudio.</p>}
      {provider.kind === 'local' && (
        <p className="text-ink-subtle text-[11px]">Sin conexión: resumen y tarjetas. El cuestionario y el informe necesitan conexión.</p>
      )}
      {busy && provider.kind === 'local' && (
        <p className="text-ink-muted text-[11px] flex items-center gap-2" aria-live="polite">
          <Loader2 size={12} className="animate-spin" />
          Generando en este equipo… {tokens > 0 ? `${tokens} tokens` : 'leyendo las fuentes'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
      {items.map(item => (
        <StudyCard key={item.id} content={item.content} />
      ))}
    </div>
  );
}

function StudyCard({ content }: { content: StudyContent }) {
  const [open, setOpen] = useState(true);
  return (
    <article className="rounded-xl border border-line bg-surface-raised">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <span className="text-ink text-xs font-semibold">{STUDY_LABELS[content.kind]}</span>
        {open ? <ChevronUp size={14} className="text-ink-subtle" /> : <ChevronDown size={14} className="text-ink-subtle" />}
      </button>
      {open && <div className="px-3 pb-3">{renderContent(content)}</div>}
    </article>
  );
}

function renderContent(content: StudyContent) {
  switch (content.kind) {
    case 'summary':
      return (
        <div className="text-sm text-ink-soft space-y-2">
          <h3 className="text-ink font-semibold">{content.data.title}</h3>
          <p>{content.data.overview}</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {content.data.keyPoints.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      );
    case 'quiz':
      return <Quiz questions={content.data.questions} />;
    case 'flashcards':
      return <Flashcards cards={content.data.cards} />;
    case 'report':
      return <Markdown text={content.data} />;
  }
}

function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="text-sm">
          <p className="text-ink font-medium mb-1.5">
            {i + 1}. {q.question}
          </p>
          <div className="space-y-1">
            {q.options.map((option, j) => {
              const chosen = answers[i] === j;
              const reveal = answers[i] !== undefined;
              const style = !reveal
                ? 'border-line hover:border-line-strong'
                : j === q.correctIndex
                  ? 'border-success bg-success/10'
                  : chosen
                    ? 'border-danger bg-danger/10'
                    : 'border-line opacity-60';
              return (
                <button
                  key={j}
                  disabled={reveal}
                  onClick={() => setAnswers(prev => ({ ...prev, [i]: j }))}
                  className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs text-ink-soft ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {answers[i] !== undefined && q.explanation && <p className="mt-1 text-[11px] text-ink-muted">{q.explanation}</p>}
        </div>
      ))}
      {answered > 0 && (
        <p className="text-xs text-ink-muted">
          Puntaje: {correct} de {answered} respondidas ({questions.length} preguntas)
        </p>
      )}
    </div>
  );
}

function Flashcards({ cards }: { cards: { front: string; back: string }[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  const go = (delta: number) => {
    setFlipped(false);
    setIndex(i => (i + delta + cards.length) % cards.length);
  };
  return (
    <div>
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-28 p-4 rounded-xl bg-canvas border border-line text-sm text-ink text-center"
        title="Voltear tarjeta"
      >
        <span className="block text-[10px] text-ink-subtle mb-1">{flipped ? 'Respuesta' : 'Pregunta'} · clic para voltear</span>
        {flipped ? card.back : card.front}
      </button>
      <div className="flex items-center justify-between mt-2 text-xs text-ink-muted">
        <button onClick={() => go(-1)} className="px-2 py-1 hover:text-ink">
          ← Anterior
        </button>
        <span>
          {index + 1} / {cards.length}
        </span>
        <button onClick={() => go(1)} className="px-2 py-1 hover:text-ink">
          Siguiente →
        </button>
      </div>
    </div>
  );
}
