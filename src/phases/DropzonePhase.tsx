/**
 * @file DropzonePhase.tsx
 * @description Carga de materiales con arrastrar y soltar (brief, sección 8.4).
 * Formatos v1: PDF con texto, DOCX y TXT, validados por extensión, tipo MIME y
 * firma. El texto se extrae en el cliente y se guarda en partes en Firestore
 * (online) o SQLite (escritorio offline). Límite total: shared/config.ts.
 * El paso es opcional: se puede continuar sin archivos.
 * Diseño (ORION #38, docs/diseno/maquetas/web.html, pantalla 2): "¿Con qué vas a estudiar?", zona grande
 * para arrastrar, archivos con tamaño y X, barra de uso, "Seguir sin archivos" y "Continuar".
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertTriangle, Loader2 } from 'lucide-react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';
import { ACCEPT_ATTRIBUTE } from '../data/file-types';
import { useIngest } from '../data/useIngest';
import { formatBytes } from '../utils/format';

const MAX_TOTAL_LABEL = formatBytes(LIMITS.maxUploadBytes);

export default function DropzonePhase() {
  const { state, dispatch } = useApp();
  const { ingest, remove, ready } = useIngest();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    setErrors([]);
    const result = await ingest(files);
    setErrors(result.errors);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (ready) void processFiles(e.dataTransfer.files);
  };

  const totalSize = state.uploadedFiles.reduce((a, f) => a + f.size, 0);
  const usagePercent = Math.min((totalSize / LIMITS.maxUploadBytes) * 100, 100);
  const extracting = state.uploadedFiles.some(f => f.status === 'extracting');

  const readyCount = state.uploadedFiles.filter(f => f.status === 'ready').length;
  const hasFiles = state.uploadedFiles.length > 0;
  const goNext = () => dispatch({ type: 'SET_PHASE', payload: 'timer-select' });

  return (
    <div className="min-h-full bg-canvas flex flex-col items-center px-4 py-10 lg:py-12 gap-7">
      <motion.div className="text-center max-w-[640px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl sm:text-[40px] leading-[1.05] font-extrabold tracking-tight text-ink">¿Con qué vas a estudiar?</h1>
        <p className="mt-2.5 text-base text-ink-soft">Subí los documentos de tu sesión. Es opcional: también podés estudiar sin archivos.</p>
      </motion.div>

      <div className="w-full max-w-[640px] bg-surface border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-5">
        <div
          role="button"
          tabIndex={0}
          aria-label="Elegir archivos"
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => ready && inputRef.current?.click()}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && ready) inputRef.current?.click();
          }}
          data-testid="dropzone"
          className={`border-2 border-dashed rounded-[18px] p-8 sm:p-[34px] flex flex-col items-center gap-2 text-center bg-canvas transition-colors ${
            ready ? 'cursor-pointer' : 'cursor-wait opacity-70'
          } ${isDragging ? 'border-accent bg-accent/10' : 'border-line hover:border-accent'}`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            data-testid="dropzone-input"
            onChange={e => e.target.files && void processFiles(e.target.files)}
          />
          <span className="w-14 h-14 rounded-2xl bg-accent/15 text-accent-soft grid place-items-center">
            {ready ? <Upload size={26} /> : <Loader2 size={26} className="animate-spin" />}
          </span>
          <b className="text-base font-medium text-ink">
            {!ready ? 'Preparando tu espacio de trabajo…' : isDragging ? 'Soltá los archivos acá' : 'Arrastrá tus archivos acá'}
          </b>
          <small className="text-[13px] text-ink-muted">o hacé clic para elegirlos · PDF, Word o texto</small>
        </div>

        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div
              role="alert"
              className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertTriangle size={14} className="text-danger mt-0.5 flex-shrink-0" />
              <div className="text-danger text-xs space-y-1">
                {errors.map(e => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasFiles && (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {state.uploadedFiles.map(file => (
              <div key={file.id} data-testid="file-row" className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-line">
                <span className="w-[34px] h-10 rounded-md bg-accent/15 text-accent-soft grid place-items-center flex-shrink-0">
                  {file.status === 'extracting' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : file.status === 'error' ? (
                    <AlertTriangle size={16} className="text-danger" />
                  ) : (
                    <FileText size={16} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-medium text-ink truncate">{file.name}</b>
                  <small className={`text-xs ${file.status === 'error' ? 'text-danger' : 'text-ink-muted'}`}>
                    {file.status === 'extracting'
                      ? `${formatBytes(file.size)} · extrayendo texto…`
                      : file.status === 'error'
                        ? file.error
                        : `${formatBytes(file.size)} · texto listo`}
                  </small>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    void remove(file.id);
                  }}
                  className="p-1 rounded-lg text-ink-muted hover:text-danger"
                  title="Quitar"
                  aria-label={`Quitar ${file.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-ink-muted" data-testid="usage">
          <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${usagePercent}%` }} />
          </div>
          <span className="font-mono">
            {formatBytes(totalSize)} de {MAX_TOTAL_LABEL}
          </span>
        </div>

        {/* "Seguir sin archivos" cuando no hay archivos; "Continuar" con los archivos listos. */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={goNext}
            disabled={hasFiles}
            title={hasFiles ? 'Ya cargaste archivos: continuá con ellos' : undefined}
            className="h-12 px-5 rounded-[14px] text-[15px] text-ink-soft hover:text-ink hover:bg-surface-raised disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Seguir sin archivos
          </button>
          <button
            onClick={goNext}
            disabled={!hasFiles || extracting || readyCount === 0}
            className="flex-1 h-12 px-5 rounded-[14px] text-[15px] font-medium bg-accent hover:bg-accent-strong text-on-accent flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {extracting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Extrayendo texto…
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
