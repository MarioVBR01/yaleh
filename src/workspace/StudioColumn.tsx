/**
 * @file StudioColumn.tsx
 * @description Columna "Estudio" (brief, secciones 5.2 y 7.3): resumen, cuestionario, tarjetas,
 * informe, mapa mental, tabla de datos, infografía y presentación (.pptx) generados por la IA
 * (los cuatro últimos: ORION #18), y el recuadro de notas.
 * Los resultados se guardan en Firestore (studyItems) cuando hay cuenta.
 * Sin conexión, el modelo local (si está instalado) hace todo menos la presentación, en versión corta
 * (revisión 1.8 y ORION #17). Sin asistente: "Disponible próximamente"; las notas funcionan.
 * Diseño (ORION #35): las 8 herramientas en dos columnas con ícono naranja (sin conexión, solo las del
 * asistente sin conexión), debajo "Generado en esta sesión" y las notas abajo de todo.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, FileBarChart, HelpCircle, Image, List, Loader2, Network, Presentation as PresentationIcon, Table } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAIError } from '../ai/errors';
import type { AssistantProvider } from '../ai/provider';
import { STUDY_LABELS, type QuizQuestion, type StudyContent, type StudyKind } from '../ai/study-items';
import { useSourceTexts } from '../ai/useSourceTexts';
import { getWorkspaceStore, newId } from '../data/workspace';
import { useAssistant, useModeFlags } from '../lib/mode';
import AIUnavailable, { AssistantBadge, LocalSlowNotice } from './AIUnavailable';
import Markdown from './Markdown';
import NotesBox from './NotesBox';
import { DataTable, Infographic, MindMap, Presentation } from './StudyVisuals';

/** Herramientas en el orden y con los nombres cortos del diseño (íconos de docs/diseno/README.md). */
const ACTIONS: { kind: StudyKind; label: string; icon: typeof List }[] = [
  { kind: 'summary', label: 'Resumen', icon: List },
  { kind: 'flashcards', label: 'Tarjetas', icon: Copy },
  { kind: 'quiz', label: 'Cuestionario', icon: HelpCircle },
  { kind: 'report', label: 'Informe', icon: FileBarChart },
  { kind: 'mindmap', label: 'Mapa mental', icon: Network },
  { kind: 'table', label: 'Tabla', icon: Table },
  { kind: 'presentation', label: 'Presentación', icon: PresentationIcon },
  { kind: 'infographic', label: 'Infografía', icon: Image },
];
const ICONS = Object.fromEntries(ACTIONS.map(a => [a.kind, a.icon])) as Record<StudyKind, typeof List>;

/** Detalle de un resultado: cuántos elementos tiene. */
function itemDetail(content: StudyContent): string | null {
  switch (content.kind) {
    case 'summary':
      return `${content.data.keyPoints.length} ideas clave`;
    case 'flashcards':
      return `${content.data.cards.length} tarjetas`;
    case 'quiz':
      return `${content.data.questions.length} preguntas`;
    case 'mindmap':
      return `${content.data.branches.length} ramas`;
    case 'table':
      return `${content.data.rows.length} filas`;
    case 'presentation':
      return `${content.data.slides.length} diapositivas`;
    default:
      return null;
  }
}

function timeAgo(createdAt: number, now = Date.now()): string {
  const minutes = Math.floor((now - createdAt) / 60_000);
  return minutes < 1 ? 'recién' : `hace ${minutes} min`;
}

interface Item {
  id: string;
  content: StudyContent;
  createdAt: number;
}

export default function StudioColumn() {
  const { assistant } = useModeFlags();
  const provider = useAssistant();
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-3">
        <h2 className="font-display text-[17px] font-bold text-ink flex items-center gap-2 flex-1">
          Estudio {provider && <AssistantBadge label={provider.label} local={provider.kind === 'local'} />}
        </h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3.5">
        {provider ? (
          <StudyTools provider={provider} />
        ) : (
          <AIUnavailable compact reason={assistant.kind === 'none' ? assistant.reason : undefined} />
        )}
      </div>
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
      const item = { id: newId(), content, createdAt: Date.now() };
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
      {/* Sin conexión, solo las herramientas que hace el asistente sin conexión (alcance del 2026-10-13). */}
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.filter(a => provider.supports(a.kind)).map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            onClick={() => void generate(kind)}
            disabled={busy !== null || count === 0}
            className="flex items-center gap-2.5 px-3 py-[11px] rounded-xl border border-line bg-canvas text-[13px] text-ink text-left hover:border-accent disabled:opacity-50 disabled:hover:border-line"
          >
            {busy === kind ? <Loader2 size={17} className="animate-spin text-accent-soft" /> : <Icon size={17} className="text-accent-soft flex-shrink-0" />}
            {label}
          </button>
        ))}
      </div>
      {count === 0 && <p className="text-ink-subtle text-[11px]">Agrega una fuente para generar material de estudio.</p>}
      {provider.kind === 'local' && (
        <>
          <LocalSlowNotice />
          <p className="text-ink-subtle text-[11px]">Sin conexión, en versión corta: resumen, 5 tarjetas, 5 preguntas, informe de una página, mapa mental, tabla e infografía. La presentación necesita conexión.</p>
        </>
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
      {items.length > 0 && (
        <p className="text-[11px] tracking-[0.08em] uppercase text-ink-muted mx-1 mt-1.5">Generado en esta sesión</p>
      )}
      {items.map(item => (
        <StudyCard key={item.id} content={item.content} createdAt={item.createdAt} />
      ))}
    </div>
  );
}

function StudyCard({ content, createdAt }: { content: StudyContent; createdAt: number }) {
  const [open, setOpen] = useState(true);
  const Icon = ICONS[content.kind];
  const detail = itemDetail(content);
  return (
    <article className="rounded-xl bg-surface-raised" data-testid="study-item">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
        <Icon size={17} className="text-accent-soft flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] text-ink">{STUDY_LABELS[content.kind]}</span>
          <small className="block text-[11.5px] text-ink-muted font-mono">
            {detail ? `${detail} · ` : ''}
            {timeAgo(createdAt)}
          </small>
        </span>
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
    case 'mindmap':
      return <MindMap data={content.data} />;
    case 'table':
      return <DataTable data={content.data} />;
    case 'infographic':
      return <Infographic data={content.data} />;
    case 'presentation':
      return <Presentation data={content.data} />;
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
