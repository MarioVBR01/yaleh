/**
 * @file DropzonePhase.tsx
 * @description Carga de materiales con arrastrar y soltar (brief, sección 8.4).
 * Formatos v1: PDF con texto, DOCX y TXT, validados por extensión, tipo MIME y
 * firma. El texto se extrae en el cliente y se guarda en partes en Firestore
 * (online) o SQLite (escritorio offline). Límite total: shared/config.ts.
 * El paso es opcional: se puede continuar sin archivos.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, ArrowRight, CheckCircle, AlertTriangle, Shield, Loader2, LayoutGrid } from 'lucide-react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';
import { ACCEPT_ATTRIBUTE } from '../data/file-types';
import { useIngest } from '../data/useIngest';
import { isElectron } from '../lib/electron';
import { formatBytes } from '../utils/format';

const MAX_TOTAL_LABEL = formatBytes(LIMITS.maxUploadBytes);
const FORMATS = ['PDF', 'DOCX', 'TXT'];

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

  /** Web: ir al espacio de trabajo (Fuentes · Chat · Estudio) sin iniciar una sesión de concentración. */
  const goToWorkspace = () => {
    dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
    dispatch({ type: 'START_KIOSK' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-px bg-blue-500/50" />
            <Shield size={16} className="text-blue-400" />
            <div className="w-8 h-px bg-blue-500/50" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Material de Estudio</h1>
          <p className="text-slate-400 text-sm">
            Carga tus documentos para trabajar con el asistente. Este paso es <strong className="text-blue-400">opcional</strong>.
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => ready && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              ready ? 'cursor-pointer' : 'cursor-wait opacity-70'
            } ${isDragging ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'}`}
            animate={{ borderColor: isDragging ? '#60a5fa' : '#475569' }}
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
              {ready ? <Upload size={28} className="text-blue-400" /> : <Loader2 size={28} className="text-blue-400 animate-spin" />}
            </div>
            <p className="text-white font-medium mb-1">
              {!ready ? 'Preparando tu espacio de trabajo…' : isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
            </p>
            <p className="text-slate-500 text-sm mb-4">o haz clic para seleccionar</p>
            <div className="flex flex-wrap justify-center gap-2">
              {FORMATS.map(label => (
                <span key={label} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-blue-300">
                  <FileText size={12} /> {label}
                </span>
              ))}
            </div>
          </motion.div>

          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                role="alert"
                className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-red-400 text-xs space-y-1">
                  {errors.map(e => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {state.uploadedFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{state.uploadedFiles.length} archivo(s)</span>
                <span>
                  {formatBytes(totalSize)} / {MAX_TOTAL_LABEL}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full ${usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {state.uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 group">
                    <FileText size={14} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className={`text-xs ${file.status === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
                        {file.status === 'extracting'
                          ? 'Extrayendo texto…'
                          : file.status === 'error'
                            ? file.error
                            : `${formatBytes(file.size)} · ${(file.charCount ?? 0).toLocaleString('es')} caracteres`}
                      </p>
                    </div>
                    {file.status === 'extracting' && <Loader2 size={14} className="text-blue-400 animate-spin flex-shrink-0" />}
                    {file.status === 'ready' && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                    {file.status === 'error' && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        void remove(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-1"
                      title="Quitar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {!isElectron() && (
              <motion.button
                onClick={goToWorkspace}
                disabled={!ready || extracting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LayoutGrid size={16} /> Ir al espacio de trabajo
              </motion.button>
            )}
            <motion.button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })}
              disabled={extracting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {extracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Extrayendo texto…
                </>
              ) : (
                <>
                  Configurar sesión de concentración <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
