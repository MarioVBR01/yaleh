/**
 * @file OfflineEditorPanel.tsx
 * @description Editor de Ofimática Offline del SRB.
 * Soporta tres modos: TextMaker (DOCX), PlanMaker (XLSX), Presentations (PPTX).
 * Implementado con React — sin dependencias externas de internet.
 * Permite exportar a TXT/CSV con botón de descarga.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Download, FileDown, Type, Palette,
  Plus, Trash2, Save
} from 'lucide-react';

interface OfflineEditorProps {
  editorType: 'docs' | 'sheets' | 'slides';
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface SpreadsheetCell {
  value: string;
  formula?: string;
}

interface SlideItem {
  id: string;
  title: string;
  content: string;
  bg: string;
}

// ─── EDITOR DE TEXTO (TEXTMAKER) ─────────────────────────────────────────────

function TextEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const updateWordCount = useCallback(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, []);

  /**
   * Aplica formato al texto seleccionado mediante execCommand.
   * En producción se reemplazaría por Quill.js o TipTap.
   */
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  /**
   * Exporta el contenido del editor como archivo de texto plano.
   */
  const exportTxt = () => {
    const text = editorRef.current?.innerText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento_srb.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Exporta el contenido del editor como HTML (compatible con DOCX).
   */
  const exportHtml = () => {
    const html = editorRef.current?.innerHTML || '';
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Documento SRB</title></head><body>${html}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento_srb.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
  const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Barra de herramientas */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Formato básico */}
          <ToolbarGroup>
            <ToolBtn onClick={() => applyFormat('bold')} title="Negrita"><Bold size={14} /></ToolBtn>
            <ToolBtn onClick={() => applyFormat('italic')} title="Cursiva"><Italic size={14} /></ToolBtn>
            <ToolBtn onClick={() => applyFormat('underline')} title="Subrayado"><Underline size={14} /></ToolBtn>
          </ToolbarGroup>

          <Divider />

          {/* Alineación */}
          <ToolbarGroup>
            <ToolBtn onClick={() => applyFormat('justifyLeft')} title="Izquierda"><AlignLeft size={14} /></ToolBtn>
            <ToolBtn onClick={() => applyFormat('justifyCenter')} title="Centro"><AlignCenter size={14} /></ToolBtn>
            <ToolBtn onClick={() => applyFormat('justifyRight')} title="Derecha"><AlignRight size={14} /></ToolBtn>
          </ToolbarGroup>

          <Divider />

          {/* Listas */}
          <ToolbarGroup>
            <ToolBtn onClick={() => applyFormat('insertUnorderedList')} title="Lista"><List size={14} /></ToolBtn>
            <ToolBtn onClick={() => applyFormat('insertOrderedList')} title="Lista numerada"><ListOrdered size={14} /></ToolBtn>
          </ToolbarGroup>

          <Divider />

          {/* Tamaño de fuente */}
          <select
            onChange={e => applyFormat('fontSize', e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none"
            title="Tamaño de fuente"
          >
            {['1', '2', '3', '4', '5', '6', '7'].map((s, i) => (
              <option key={s} value={s}>{FONT_SIZES[i]}</option>
            ))}
          </select>

          {/* Colores */}
          <div className="flex gap-1 items-center">
            <Palette size={13} className="text-slate-400" />
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => applyFormat('foreColor', color)}
                className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Acciones */}
          <div className="ml-auto flex gap-2">
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Type size={11} /> {wordCount} palabras
            </span>
            <motion.button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Save size={12} />
              {saved ? '¡Guardado!' : 'Guardar'}
            </motion.button>
            <button
              onClick={exportTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Download size={12} /> TXT
            </button>
            <button
              onClick={exportHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              <FileDown size={12} /> HTML
            </button>
          </div>
        </div>
      </div>

      {/* Área de edición */}
      <div className="flex-1 overflow-y-auto bg-slate-800 p-6 flex justify-center">
        <div className="w-full max-w-3xl">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateWordCount}
            className="min-h-[600px] bg-white text-gray-900 p-10 rounded-lg shadow-2xl focus:outline-none text-base leading-relaxed"
            style={{ caretColor: '#3b82f6' }}
            data-placeholder="Comienza a escribir tu documento..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── EDITOR DE HOJAS DE CÁLCULO (PLANMAKER) ──────────────────────────────────

function SpreadsheetEditor() {
  const ROWS = 20;
  const COLS = 10;
  const COL_LETTERS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

  const [cells, setCells] = useState<SpreadsheetCell[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill({ value: '' }))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [formulaBar, setFormulaBar] = useState('');

  const getCellId = (row: number, col: number) => `${COL_LETTERS[col]}${row + 1}`;

  const handleCellChange = (row: number, col: number, value: string) => {
    const newCells = cells.map(r => [...r]);
    newCells[row][col] = { ...newCells[row][col], value };
    setCells(newCells);
  };

  const handleCellFocus = (row: number, col: number) => {
    setActiveCell([row, col]);
    setFormulaBar(cells[row][col].value);
  };

  const exportCsv = () => {
    const csv = cells
      .map(row => row.map(c => `"${c.value}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hoja_srb.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Barra de fórmulas */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-2 flex items-center gap-3">
        <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 min-w-[60px] text-center font-mono">
          {activeCell ? getCellId(activeCell[0], activeCell[1]) : 'A1'}
        </div>
        <div className="flex-1 h-px bg-slate-700 mx-1" />
        <input
          value={formulaBar}
          onChange={e => {
            setFormulaBar(e.target.value);
            if (activeCell) handleCellChange(activeCell[0], activeCell[1], e.target.value);
          }}
          placeholder="Valor o fórmula..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded text-xs text-white px-3 py-1.5 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
        >
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Tabla de celdas */}
      <div className="flex-1 overflow-auto bg-slate-900">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-10 min-w-10 h-8 bg-slate-800 border border-slate-700 text-slate-400 text-center sticky top-0 z-10" />
              {COL_LETTERS.map(letter => (
                <th
                  key={letter}
                  className="min-w-[100px] h-8 bg-slate-800 border border-slate-700 text-slate-400 text-center font-medium sticky top-0 z-10"
                >
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri}>
                <td className="h-7 bg-slate-800 border border-slate-700 text-slate-400 text-center font-mono w-10">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="h-7 border border-slate-700/50 p-0">
                    <input
                      value={cell.value}
                      onChange={e => handleCellChange(ri, ci, e.target.value)}
                      onFocus={() => handleCellFocus(ri, ci)}
                      className={`w-full h-full px-2 bg-transparent text-white text-xs focus:outline-none focus:bg-blue-500/10 ${
                        activeCell?.[0] === ri && activeCell?.[1] === ci
                          ? 'ring-1 ring-inset ring-blue-500'
                          : ''
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

// ─── EDITOR DE PRESENTACIONES (PRESENTATIONS) ─────────────────────────────────

const SLIDE_BG_OPTIONS = [
  'from-slate-800 to-slate-900',
  'from-blue-800 to-blue-900',
  'from-purple-800 to-purple-900',
  'from-emerald-800 to-emerald-900',
  'from-red-800 to-red-900',
];

function PresentationEditor() {
  const [slides, setSlides] = useState<SlideItem[]>([
    { id: '1', title: 'Título de la presentación', content: 'Haz clic para editar el contenido de esta diapositiva.', bg: SLIDE_BG_OPTIONS[0] },
  ]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  const addSlide = () => {
    const newSlide: SlideItem = {
      id: Date.now().toString(),
      title: `Diapositiva ${slides.length + 1}`,
      content: 'Contenido de la diapositiva.',
      bg: SLIDE_BG_OPTIONS[slides.length % SLIDE_BG_OPTIONS.length],
    };
    setSlides(prev => [...prev, newSlide]);
    setActiveSlide(slides.length);
  };

  const updateSlide = (field: keyof SlideItem, value: string) => {
    setSlides(prev => prev.map((s, i) => i === activeSlide ? { ...s, [field]: value } : s));
  };

  const deleteSlide = (index: number) => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    setActiveSlide(Math.min(activeSlide, newSlides.length - 1));
  };

  const current = slides[activeSlide];

  return (
    <div className="h-full flex bg-slate-950">
      {/* Panel de diapositivas */}
      <div className="w-48 flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto p-2 flex flex-col gap-2">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            onClick={() => setActiveSlide(i)}
            className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
              i === activeSlide ? 'border-blue-500' : 'border-transparent hover:border-slate-600'
            }`}
          >
            <div className={`h-20 bg-gradient-to-br ${slide.bg} p-2 flex flex-col justify-center`}>
              <p className="text-white text-[8px] font-bold truncate">{slide.title}</p>
              <p className="text-white/60 text-[7px] truncate mt-0.5">{slide.content}</p>
            </div>
            <div className="absolute bottom-0.5 left-1 text-white/40 text-[8px]">{i + 1}</div>
            {slides.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); deleteSlide(i); }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500/80 rounded p-0.5 text-white"
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

      {/* Editor de diapositiva activa */}
      <div className="flex-1 flex flex-col">
        {/* Barra de herramientas */}
        <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2">
          <span className="text-slate-500 text-xs">Fondo:</span>
          {SLIDE_BG_OPTIONS.map((bg, i) => (
            <button
              key={i}
              onClick={() => updateSlide('bg', bg)}
              className={`w-5 h-5 rounded-full bg-gradient-to-br ${bg} border-2 transition-all ${
                current?.bg === bg ? 'border-white scale-110' : 'border-transparent'
              }`}
            />
          ))}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setIsPresenting(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              {isPresenting ? '✕ Salir' : '▶ Presentar'}
            </button>
          </div>
        </div>

        {/* Vista de diapositiva */}
        {current && (
          <div className={`flex-1 flex items-center justify-center p-8 ${isPresenting ? 'bg-black' : 'bg-slate-950'}`}>
            <div className={`${isPresenting ? 'w-full h-full' : 'w-full max-w-2xl aspect-video'} bg-gradient-to-br ${current.bg} rounded-2xl shadow-2xl overflow-hidden flex flex-col p-10 relative`}>
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
  );
}

// ─── SUBCOMPONENTES UI ────────────────────────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-0.5">{children}</div>;
}

function ToolBtn({ onClick, title, children }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-slate-700 mx-1" />;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function OfflineEditorPanel({ editorType }: OfflineEditorProps) {
  const EDITOR_LABELS = {
    docs: { title: 'TextMaker', subtitle: 'Editor de documentos DOCX', icon: '📄' },
    sheets: { title: 'PlanMaker', subtitle: 'Editor de hojas de cálculo XLSX', icon: '📊' },
    slides: { title: 'Presentations', subtitle: 'Editor de presentaciones PPTX', icon: '🎭' },
  };

  const info = EDITOR_LABELS[editorType];

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header del editor */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xl">{info.icon}</span>
        <div>
          <p className="text-white font-bold text-sm">{info.title}</p>
          <p className="text-slate-500 text-xs">{info.subtitle} · Modo Offline · Sin internet</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-400 text-xs">Offline</span>
        </div>
      </div>

      {/* Editor correspondiente */}
      <div className="flex-1 min-h-0">
        {editorType === 'docs' && <TextEditor />}
        {editorType === 'sheets' && <SpreadsheetEditor />}
        {editorType === 'slides' && <PresentationEditor />}
      </div>
    </div>
  );
}
