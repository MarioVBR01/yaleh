/**
 * @file OfflineEditorPanel.tsx
 * @description Editores de ofimática de YALEH (brief, sección 6.1). Funcionan sin conexión.
 * - Documento: TipTap → .docx
 * - Hoja de cálculo: cuadrícula de celdas → .xlsx
 * - Presentación: editor de diapositivas del MVP → .pptx
 * La exportación la hace el proceso principal y guarda en Documentos\YALEH, sin
 * diálogo del sistema (el explorador nunca se abre durante el kiosko).
 */

import { useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, FileDown, Type, Heading1, Heading2, Plus, Trash2, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import type { OfficeExportRequest, TipTapNode } from '@shared/ipc-types';
import { getElectronAPI } from '../lib/electron';

interface OfflineEditorProps {
  editorType: 'docs' | 'sheets' | 'slides';
}

// ─── EXPORTACIÓN ──────────────────────────────────────────────────────────────

type ExportStatus = { state: 'idle' } | { state: 'saving' } | { state: 'saved'; path: string } | { state: 'error'; message: string };

function useExport() {
  const [status, setStatus] = useState<ExportStatus>({ state: 'idle' });
  const run = async (request: OfficeExportRequest) => {
    const api = getElectronAPI();
    if (!api) {
      setStatus({ state: 'error', message: 'La exportación está disponible en la app de escritorio.' });
      return;
    }
    setStatus({ state: 'saving' });
    const result = await api.exportOffice(request);
    setStatus(result.ok ? { state: 'saved', path: result.path } : { state: 'error', message: result.message });
  };
  return { status, run, clear: () => setStatus({ state: 'idle' }) };
}

function ExportButton({ label, status, onClick }: { label: string; status: ExportStatus; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={status.state === 'saving'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
    >
      {status.state === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Exportar {label}
    </button>
  );
}

function ExportMessage({ status, onClose }: { status: ExportStatus; onClose: () => void }) {
  if (status.state !== 'saved' && status.state !== 'error') return null;
  return (
    <div
      role={status.state === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2 px-3 py-2 text-xs border-b ${
        status.state === 'saved' ? 'bg-success/10 border-success/30 text-ink-soft' : 'bg-danger/10 border-danger/30 text-ink-soft'
      }`}
    >
      {status.state === 'saved' ? <CheckCircle size={13} className="text-success" /> : <AlertTriangle size={13} className="text-danger" />}
      <span className="flex-1 break-all">
        {status.state === 'saved' ? `Guardado en ${status.path}` : status.message}
      </span>
      <button onClick={onClose} className="underline text-ink-muted hover:text-ink">
        Cerrar
      </button>
    </div>
  );
}

function TitleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={60}
      placeholder="Nombre del archivo"
      title="Nombre del archivo"
      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 w-44 focus:outline-none focus:border-blue-500"
    />
  );
}

// ─── DOCUMENTO (TipTap) ───────────────────────────────────────────────────────

function TextEditor() {
  const [title, setTitle] = useState('Documento');
  const [, setVersion] = useState(0);
  const { status, run, clear } = useExport();
  const editor = useEditor({
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    content: '',
    editorProps: {
      attributes: {
        class: 'yaleh-doc min-h-[600px] bg-white text-gray-900 p-10 rounded-lg shadow-2xl focus:outline-none text-base leading-relaxed',
        'aria-label': 'Documento',
      },
    },
    // Vuelve a dibujar la barra (estado activo de los botones y conteo de palabras).
    onTransaction: () => setVersion(v => v + 1),
  });

  const words = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0;
  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'text-white bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`;
  const chain = (e: Editor) => e.chain().focus();

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-2">
        {editor && (
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarGroup>
              <button className={btn(editor.isActive('bold'))} title="Negrita" onClick={() => chain(editor).toggleBold().run()}><Bold size={14} /></button>
              <button className={btn(editor.isActive('italic'))} title="Cursiva" onClick={() => chain(editor).toggleItalic().run()}><Italic size={14} /></button>
              <button className={btn(editor.isActive('underline'))} title="Subrayado" onClick={() => chain(editor).toggleUnderline().run()}><Underline size={14} /></button>
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <button className={btn(editor.isActive('heading', { level: 1 }))} title="Título" onClick={() => chain(editor).toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></button>
              <button className={btn(editor.isActive('heading', { level: 2 }))} title="Subtítulo" onClick={() => chain(editor).toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></button>
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <button className={btn(editor.isActive({ textAlign: 'left' }))} title="Izquierda" onClick={() => chain(editor).setTextAlign('left').run()}><AlignLeft size={14} /></button>
              <button className={btn(editor.isActive({ textAlign: 'center' }))} title="Centro" onClick={() => chain(editor).setTextAlign('center').run()}><AlignCenter size={14} /></button>
              <button className={btn(editor.isActive({ textAlign: 'right' }))} title="Derecha" onClick={() => chain(editor).setTextAlign('right').run()}><AlignRight size={14} /></button>
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup>
              <button className={btn(editor.isActive('bulletList'))} title="Lista" onClick={() => chain(editor).toggleBulletList().run()}><List size={14} /></button>
              <button className={btn(editor.isActive('orderedList'))} title="Lista numerada" onClick={() => chain(editor).toggleOrderedList().run()}><ListOrdered size={14} /></button>
            </ToolbarGroup>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Type size={11} /> {words} palabras
              </span>
              <TitleInput value={title} onChange={setTitle} />
              <ExportButton
                label=".docx"
                status={status}
                onClick={() => void run({ kind: 'docx', title, document: editor.getJSON() as TipTapNode })}
              />
            </div>
          </div>
        )}
      </div>
      <ExportMessage status={status} onClose={clear} />
      <div className="flex-1 overflow-y-auto bg-slate-800 p-6 flex justify-center">
        <div className="w-full max-w-3xl">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// ─── HOJA DE CÁLCULO ──────────────────────────────────────────────────────────

const ROWS = 30;
const COLS = 12;
const COL_LETTERS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

/** Recorta filas y columnas vacías al final. */
export function trimGrid(cells: string[][]): string[][] {
  let lastRow = -1;
  let lastCol = -1;
  cells.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value.trim()) {
        lastRow = Math.max(lastRow, r);
        lastCol = Math.max(lastCol, c);
      }
    })
  );
  return cells.slice(0, lastRow + 1).map(row => row.slice(0, lastCol + 1));
}

function SpreadsheetEditor() {
  const [title, setTitle] = useState('Hoja de cálculo');
  const [cells, setCells] = useState<string[][]>(() => Array.from({ length: ROWS }, () => Array<string>(COLS).fill('')));
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const { status, run, clear } = useExport();

  const setCell = (row: number, col: number, value: string) =>
    setCells(prev => prev.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r)));

  const activeValue = activeCell ? cells[activeCell[0]][activeCell[1]] : '';

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-2 flex items-center gap-3">
        <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 min-w-[60px] text-center font-mono">
          {activeCell ? `${COL_LETTERS[activeCell[1]]}${activeCell[0] + 1}` : 'A1'}
        </div>
        <input
          value={activeValue}
          onChange={e => activeCell && setCell(activeCell[0], activeCell[1], e.target.value)}
          placeholder="Valor o fórmula (por ejemplo =SUM(A1:A5))"
          className="flex-1 bg-slate-800 border border-slate-700 rounded text-xs text-white px-3 py-1.5 focus:outline-none focus:border-blue-500"
        />
        <TitleInput value={title} onChange={setTitle} />
        <ExportButton label=".xlsx" status={status} onClick={() => void run({ kind: 'xlsx', title, rows: trimGrid(cells) })} />
      </div>
      <ExportMessage status={status} onClose={clear} />
      <div className="flex-1 overflow-auto bg-slate-900">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-10 min-w-10 h-8 bg-slate-800 border border-slate-700 text-slate-400 text-center sticky top-0 z-10" />
              {COL_LETTERS.map(letter => (
                <th key={letter} className="min-w-[100px] h-8 bg-slate-800 border border-slate-700 text-slate-400 text-center font-medium sticky top-0 z-10">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri}>
                <td className="h-7 bg-slate-800 border border-slate-700 text-slate-400 text-center font-mono w-10">{ri + 1}</td>
                {row.map((value, ci) => (
                  <td key={ci} className="h-7 border border-slate-700/50 p-0">
                    <input
                      value={value}
                      aria-label={`${COL_LETTERS[ci]}${ri + 1}`}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      onFocus={() => setActiveCell([ri, ci])}
                      className={`w-full h-full px-2 bg-transparent text-white text-xs focus:outline-none focus:bg-blue-500/10 ${
                        activeCell?.[0] === ri && activeCell?.[1] === ci ? 'ring-1 ring-inset ring-blue-500' : ''
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PRESENTACIÓN ─────────────────────────────────────────────────────────────

/** Fondos de las diapositivas: clase del editor y color equivalente en el .pptx. */
const SLIDE_BACKGROUNDS = [
  { className: 'from-slate-800 to-slate-900', color: '#1e293b' },
  { className: 'from-blue-800 to-blue-900', color: '#1e3a8a' },
  { className: 'from-purple-800 to-purple-900', color: '#581c87' },
  { className: 'from-emerald-800 to-emerald-900', color: '#065f46' },
  { className: 'from-red-800 to-red-900', color: '#7f1d1d' },
];

interface SlideItem {
  id: string;
  title: string;
  content: string;
  bg: number;
}

function PresentationEditor() {
  const [title, setTitle] = useState('Presentación');
  const [slides, setSlides] = useState<SlideItem[]>([
    { id: '1', title: 'Título de la presentación', content: 'Haz clic para editar el contenido de esta diapositiva.', bg: 0 },
  ]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const { status, run, clear } = useExport();

  const addSlide = () => {
    setSlides(prev => [
      ...prev,
      { id: Date.now().toString(), title: `Diapositiva ${prev.length + 1}`, content: 'Contenido de la diapositiva.', bg: prev.length % SLIDE_BACKGROUNDS.length },
    ]);
    setActiveSlide(slides.length);
  };

  const updateSlide = <K extends keyof SlideItem>(field: K, value: SlideItem[K]) =>
    setSlides(prev => prev.map((s, i) => (i === activeSlide ? { ...s, [field]: value } : s)));

  const deleteSlide = (index: number) => {
    if (slides.length === 1) return;
    const next = slides.filter((_, i) => i !== index);
    setSlides(next);
    setActiveSlide(Math.min(activeSlide, next.length - 1));
  };

  const exportPptx = () =>
    void run({
      kind: 'pptx',
      title,
      slides: slides.map(s => ({ title: s.title, content: s.content, background: SLIDE_BACKGROUNDS[s.bg].color })),
    });

  const current = slides[activeSlide];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <ExportMessage status={status} onClose={clear} />
      <div className="flex-1 min-h-0 flex">
        <div className="w-48 flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto p-2 flex flex-col gap-2">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => setActiveSlide(i)}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
                i === activeSlide ? 'border-blue-500' : 'border-transparent hover:border-slate-600'
              }`}
            >
              <div className={`h-20 bg-gradient-to-br ${SLIDE_BACKGROUNDS[slide.bg].className} p-2 flex flex-col justify-center`}>
                <p className="text-white text-[8px] font-bold truncate">{slide.title}</p>
                <p className="text-white/60 text-[7px] truncate mt-0.5">{slide.content}</p>
              </div>
              <div className="absolute bottom-0.5 left-1 text-white/40 text-[8px]">{i + 1}</div>
              {slides.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    deleteSlide(i);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500/80 rounded p-0.5 text-white"
                  title="Eliminar diapositiva"
                >
                  <Trash2 size={8} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSlide}
            className="flex items-center justify-center gap-1 py-2 rounded-lg border-2 border-dashed border-slate-700 text-slate-500 hover:border-blue-500/50 hover:text-blue-400 text-xs transition-all"
          >
            <Plus size={13} /> Añadir
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2">
            <span className="text-slate-500 text-xs">Fondo:</span>
            {SLIDE_BACKGROUNDS.map((bg, i) => (
              <button
                key={bg.color}
                onClick={() => updateSlide('bg', i)}
                title={bg.color}
                className={`w-5 h-5 rounded-full bg-gradient-to-br ${bg.className} border-2 transition-all ${
                  current?.bg === i ? 'border-white scale-110' : 'border-transparent'
                }`}
              />
            ))}
            <div className="ml-auto flex gap-2">
              <TitleInput value={title} onChange={setTitle} />
              <ExportButton label=".pptx" status={status} onClick={exportPptx} />
              <button
                onClick={() => setIsPresenting(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                {isPresenting ? '✕ Salir' : '▶ Presentar'}
              </button>
            </div>
          </div>

          {current && (
            <div className={`flex-1 flex items-center justify-center p-8 ${isPresenting ? 'bg-black' : 'bg-slate-950'}`}>
              <div
                className={`${isPresenting ? 'w-full h-full' : 'w-full max-w-2xl aspect-video'} bg-gradient-to-br ${
                  SLIDE_BACKGROUNDS[current.bg].className
                } rounded-2xl shadow-2xl overflow-hidden flex flex-col p-10 relative`}
              >
                <input
                  value={current.title}
                  onChange={e => updateSlide('title', e.target.value)}
                  className="text-4xl font-bold text-white bg-transparent border-none focus:outline-none mb-4 w-full"
                  placeholder="Título..."
                />
                <textarea
                  value={current.content}
                  onChange={e => updateSlide('content', e.target.value)}
                  className="flex-1 text-white/80 text-xl bg-transparent border-none focus:outline-none resize-none leading-relaxed"
                  placeholder="Contenido de la diapositiva..."
                />
                <div className="absolute bottom-3 right-4 text-white/30 text-sm">
                  {activeSlide + 1} / {slides.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUBCOMPONENTES UI ────────────────────────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="h-6 w-px bg-slate-700 mx-1" />;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const EDITOR_LABELS = {
  docs: { title: 'Documento', subtitle: 'Exporta a .docx', icon: '📄' },
  sheets: { title: 'Hoja de cálculo', subtitle: 'Exporta a .xlsx', icon: '📊' },
  slides: { title: 'Presentación', subtitle: 'Exporta a .pptx', icon: '🎭' },
};

export default function OfflineEditorPanel({ editorType }: OfflineEditorProps) {
  const info = EDITOR_LABELS[editorType];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xl">{info.icon}</span>
        <div>
          <p className="text-white font-bold text-sm">{info.title}</p>
          <p className="text-slate-500 text-xs">{info.subtitle} en Documentos\YALEH · Funciona sin conexión</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {editorType === 'docs' && <TextEditor />}
        {editorType === 'sheets' && <SpreadsheetEditor />}
        {editorType === 'slides' && <PresentationEditor />}
      </div>
    </div>
  );
}
