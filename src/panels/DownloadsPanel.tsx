/**
 * @file DownloadsPanel.tsx
 * @description Panel explorador de archivos académicos cargados en el Dropzone.
 * Permite visualizar, abrir y eliminar archivos de la sesión actual.
 * Soporte para previsualización de PDFs y documentos de texto.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Film, Table, File, Trash2,
  Eye, Upload, FolderOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UploadedFile } from '../store/appStore';

/**
 * Retorna el ícono y color apropiado para cada tipo de archivo.
 */
function getFileDisplay(type: string): { icon: React.ReactNode; color: string; label: string } {
  if (type.includes('pdf')) return { icon: <FileText size={24} />, color: 'text-red-400', label: 'PDF' };
  if (type.includes('word') || type.includes('document')) return { icon: <FileText size={24} />, color: 'text-blue-400', label: 'DOCX' };
  if (type.includes('presentation')) return { icon: <File size={24} />, color: 'text-orange-400', label: 'PPTX' };
  if (type.includes('sheet') || type.includes('excel')) return { icon: <Table size={24} />, color: 'text-emerald-400', label: 'XLSX' };
  if (type.includes('csv')) return { icon: <Table size={24} />, color: 'text-green-400', label: 'CSV' };
  if (type.includes('mp4') || type.includes('video')) return { icon: <Film size={24} />, color: 'text-purple-400', label: 'MP4' };
  return { icon: <File size={24} />, color: 'text-slate-400', label: 'Archivo' };
}

/**
 * Formatea el tamaño en bytes a una representación legible.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Vista de archivo en modo grilla */
function FileCard({ file, onDelete }: { file: UploadedFile; onDelete: () => void }) {
  const display = getFileDisplay(file.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all"
    >
      {/* Ícono del tipo de archivo */}
      <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3 ${display.color}`}>
        {display.icon}
      </div>

      {/* Etiqueta del tipo */}
      <div className="absolute top-3 right-3">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 ${display.color}`}>
          {display.label}
        </span>
      </div>

      {/* Nombre del archivo */}
      <p className="text-white text-sm font-medium truncate mb-1" title={file.name}>
        {file.name}
      </p>
      <p className="text-slate-500 text-xs">{formatBytes(file.size)}</p>
      <p className="text-slate-600 text-xs">
        {new Date(file.uploadedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Acciones al hover */}
      <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
          title="Vista previa"
        >
          <Eye size={12} /> Ver
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
          title="Eliminar archivo"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export default function DownloadsPanel() {
  const { state, removeFile, dispatch } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');


  const totalSize = state.uploadedFiles.reduce((a, f) => a + f.size, 0);
  const usagePercent = Math.min((totalSize / (500 * 1024 * 1024)) * 100, 100);

  /**
   * Maneja la eliminación confirmada de un archivo.
   */
  const handleDelete = (id: string) => {
    removeFile(id);
  };

  /**
   * Abre el selector de archivos para cargar más documentos.
   * (En producción: ipcRenderer para abrir diálogo nativo de Electron)
   */
  const handleAddMore = () => {
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">📁 Mis Archivos</h1>
            <p className="text-slate-400 text-sm">
              {state.uploadedFiles.length} archivo(s) · {formatBytes(totalSize)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-white'}`}
              title="Vista cuadrícula"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </div>

        {/* Barra de uso de espacio */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Espacio utilizado</span>
            <span>{formatBytes(totalSize)} / 500 MB</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {state.uploadedFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <FolderOpen size={28} className="text-slate-600" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">No hay archivos cargados</p>
                <p className="text-slate-600 text-xs">Soporta PDF, DOCX, PPTX, XLSX, CSV y MP4</p>
              </div>
              <motion.button
                onClick={handleAddMore}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Upload size={16} />
                Cargar archivos
              </motion.button>
            </motion.div>
          ) : (
            <>
              {/* Cuadrícula de archivos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {state.uploadedFiles.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onDelete={() => handleDelete(file.id)}
                  />
                ))}

                {/* Botón agregar más */}
                <motion.button
                  onClick={handleAddMore}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 text-slate-500 hover:text-blue-400 transition-all min-h-[120px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload size={20} />
                  <span className="text-xs font-medium">Agregar más</span>
                </motion.button>
              </div>

              {/* Resumen por tipo */}
              <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-500 text-xs font-medium mb-2">Resumen por tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {['pdf', 'document', 'mp4'].map(type => {
                    const count = state.uploadedFiles.filter(f => f.type.includes(type)).length;
                    if (count === 0) return null;
                    const display = getFileDisplay(type);
                    return (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <span className={display.color}>{display.icon}</span>
                        <span className="text-slate-400">{count} {display.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
