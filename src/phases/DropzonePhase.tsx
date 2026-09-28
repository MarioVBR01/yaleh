/**
 * @file DropzonePhase.tsx
 * @description Fase 2: Área de carga de archivos con Drag & Drop.
 * Soporta: .docx, .pdf, .pptx, .xls, .csv, .mp4
 * Límite máximo de 500MB totales.
 * El paso es opcional: el usuario puede continuar sin cargar archivos.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, FileSpreadsheet, Film, X, ArrowRight,
  CheckCircle, AlertTriangle, Shield, File
} from 'lucide-react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';
import { generateId, type UploadedFile } from '../store/appStore';

/** Formatos de archivo permitidos en el Dropzone */
const ALLOWED_TYPES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'application/pdf': { label: 'PDF', icon: <FileText size={14} />, color: 'text-red-400' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', icon: <FileText size={14} />, color: 'text-blue-400' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { label: 'PPTX', icon: <File size={14} />, color: 'text-orange-400' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', icon: <FileSpreadsheet size={14} />, color: 'text-emerald-400' },
  'text/csv': { label: 'CSV', icon: <FileSpreadsheet size={14} />, color: 'text-green-400' },
  'video/mp4': { label: 'MP4', icon: <Film size={14} />, color: 'text-purple-400' },
};

/** Tamaño máximo total permitido (shared/config.ts) */
const MAX_TOTAL_SIZE = LIMITS.maxUploadBytes;
const MAX_TOTAL_LABEL = formatBytes(MAX_TOTAL_SIZE);

/**
 * Formatea bytes a una unidad legible (KB, MB, GB).
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Calcula el porcentaje de uso del espacio máximo disponible.
 */
function calcUsagePercent(files: UploadedFile[]): number {
  const total = files.reduce((acc, f) => acc + f.size, 0);
  return Math.min((total / MAX_TOTAL_SIZE) * 100, 100);
}

export default function DropzonePhase() {
  const { state, dispatch, addFiles, removeFile, logActivity } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Procesa los archivos seleccionados o arrastrados,
   * validando tipo, tamaño individual y tamaño total acumulado.
   */
  const processFiles = useCallback(
    async (rawFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(rawFiles);
      const valid: UploadedFile[] = [];
      const errors: string[] = [];

      const currentTotal = state.uploadedFiles.reduce((a, f) => a + f.size, 0);

      for (const file of fileArray) {
        // Validar tipo permitido
        if (!ALLOWED_TYPES[file.type]) {
          errors.push(`"${file.name}" — tipo no permitido.`);
          continue;
        }
        // Validar tamaño acumulado
        if (currentTotal + valid.reduce((a, f) => a + f.size, 0) + file.size > MAX_TOTAL_SIZE) {
          errors.push(`"${file.name}" — supera el límite de ${MAX_TOTAL_LABEL}.`);
          continue;
        }

        valid.push({
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
        });

        // Registrar actividad
        logActivity({
          type: 'file',
          label: `Archivo cargado: ${file.name}`,
          detail: formatBytes(file.size),
          icon: '📄',
        });
      }

      if (valid.length > 0) addFiles(valid);
      if (errors.length > 0) setError(errors.join(' | '));
    },
    [state.uploadedFiles, addFiles, logActivity]
  );

  /** Manejador de evento drag-over */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /** Manejador de evento drag-leave */
  const handleDragLeave = () => setIsDragging(false);

  /** Manejador de evento drop */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  /** Manejador de selección manual de archivos */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  /** Avanza a la fase de selección de tiempo */
  const handleContinue = () => {
    dispatch({ type: 'SET_PHASE', payload: 'timer-select' });
  };

  const usagePercent = calcUsagePercent(state.uploadedFiles);
  const totalSize = state.uploadedFiles.reduce((a, f) => a + f.size, 0);

  const getFileIcon = (type: string) => ALLOWED_TYPES[type]?.icon ?? <File size={14} />;
  const getFileColor = (type: string) => ALLOWED_TYPES[type]?.color ?? 'text-slate-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-px bg-blue-500/50" />
            <Shield size={16} className="text-blue-400" />
            <div className="w-8 h-px bg-blue-500/50" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Material de Estudio</h1>
          <p className="text-slate-400 text-sm">
            Carga tus documentos académicos para la sesión. Este paso es <strong className="text-blue-400">opcional</strong>.
          </p>
        </div>

        {/* Panel principal */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          {/* Área de Dropzone */}
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
            }`}
            animate={{ borderColor: isDragging ? '#60a5fa' : '#475569' }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.mp4"
              className="hidden"
              onChange={handleFileInput}
            />

            <motion.div
              animate={{ y: isDragging ? -8 : 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                <Upload size={28} className="text-blue-400" />
              </div>
            </motion.div>

            <p className="text-white font-medium mb-1">
              {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
            </p>
            <p className="text-slate-500 text-sm mb-4">o haz clic para seleccionar</p>

            {/* Formatos permitidos */}
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(ALLOWED_TYPES).map(([, info]) => (
                <span
                  key={info.label}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs ${info.color}`}
                >
                  {info.icon}
                  {info.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Mensaje de error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista de archivos cargados */}
          <AnimatePresence>
            {state.uploadedFiles.length > 0 && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Barra de uso */}
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>{state.uploadedFiles.length} archivo(s) cargado(s)</span>
                  <span>{formatBytes(totalSize)} / {MAX_TOTAL_LABEL}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className={`h-full rounded-full ${usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                {/* Lista de archivos */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {state.uploadedFiles.map(file => (
                    <motion.div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 group"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className={`flex-shrink-0 ${getFileColor(file.type)}`}>
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                      </div>
                      <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6">
            <motion.button
              onClick={handleContinue}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {state.uploadedFiles.length > 0 ? (
                <>Continuar con {state.uploadedFiles.length} archivo(s) <ArrowRight size={16} /></>
              ) : (
                <>Continuar sin archivos <ArrowRight size={16} /></>
              )}
            </motion.button>
          </div>

          <p className="text-center text-slate-600 text-xs mt-3">
            Puedes agregar más archivos durante la sesión desde el panel de Descargas.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
