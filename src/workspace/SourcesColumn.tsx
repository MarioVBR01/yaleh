/**
 * @file SourcesColumn.tsx
 * @description Columna "Fuentes" (brief, sección 5.2): archivos cargados y su texto extraído.
 * El espacio de trabajo solo existe en el kiosko (revisión 1.6): las fuentes se cargan antes de la
 * sesión y aquí solo se muestran (ORION #45: sin zona para soltar ni botón para agregar; nunca se abre
 * el explorador de archivos y un archivo arrastrado sobre la columna no hace nada).
 * Diseño (ORION #35): cada archivo con ícono naranja, nombre, tamaño y la marca de que se usa.
 */

import { useState } from 'react';
import { AlertTriangle, Check, FileText, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore } from '../data/workspace';
import { formatBytes } from '../utils/format';

/** Ignora archivos arrastrados: el navegador no los abre y la columna no los carga. */
const ignoreDrop = {
  onDragOver: (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'none';
  },
  onDrop: (e: React.DragEvent) => e.preventDefault(),
};

export default function SourcesColumn() {
  const { state } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  const openPreview = async (id: string, name: string) => {
    const store = getWorkspaceStore(state);
    if (!store) return;
    setLoadingPreview(id);
    try {
      setPreview({ name, text: await store.getSourceText(id) });
    } catch (err) {
      console.error('No se pudo leer la fuente:', err);
      setError(`No se pudo abrir "${name}".`);
    } finally {
      setLoadingPreview(null);
    }
  };

  const readyCount = state.uploadedFiles.filter(f => f.status === 'ready').length;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="sources-column" {...ignoreDrop}>
      <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-3">
        <h2 className="font-display text-[17px] font-bold text-ink flex-1">Fuentes</h2>
        {state.uploadedFiles.length > 0 && (
          <span data-testid="sources-count" className="inline-flex items-center h-6 px-2.5 rounded-full bg-surface-raised text-ink-soft text-xs font-medium font-mono">
            {readyCount} de {state.uploadedFiles.length}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-3.5 mb-2 p-2 rounded-lg border border-danger/40 bg-danger/10 text-xs text-ink-soft">
          {error}
        </p>
      )}

      {preview ? (
        <div className="mx-3.5 mb-3.5 flex-1 min-h-0 flex flex-col rounded-xl border border-line bg-canvas">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
            <FileText size={14} className="text-accent-soft flex-shrink-0" />
            <span className="text-ink text-xs font-medium truncate flex-1">{preview.name}</span>
            <button onClick={() => setPreview(null)} className="text-ink-subtle hover:text-ink" title="Cerrar">
              <X size={14} />
            </button>
          </div>
          <pre className="flex-1 overflow-y-auto p-3 text-xs text-ink-soft whitespace-pre-wrap font-sans">{preview.text}</pre>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3.5 flex flex-col gap-2">
          {state.uploadedFiles.length === 0 && <p className="text-ink-muted text-xs px-1">No hay fuentes en esta sesión.</p>}
          {state.uploadedFiles.map(file => (
            <div
              key={file.id}
              data-testid="source-item"
              className={`flex items-center gap-3 p-3 rounded-xl border bg-canvas ${file.status === 'ready' ? 'border-accent' : file.status === 'error' ? 'border-danger/50' : 'border-line'}`}
            >
              <span className="w-9 h-11 rounded-md bg-accent/15 text-accent-soft grid place-items-center flex-shrink-0">
                {file.status === 'extracting' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : file.status === 'error' ? (
                  <AlertTriangle size={18} className="text-danger" />
                ) : (
                  <FileText size={18} />
                )}
              </span>
              <button
                onClick={() => file.status === 'ready' && void openPreview(file.id, file.name)}
                disabled={file.status !== 'ready'}
                className="flex-1 min-w-0 text-left"
                title={file.error ?? 'Ver el texto extraído'}
              >
                <b className="block text-[13px] font-medium text-ink truncate">{file.name}</b>
                <small className="text-xs text-ink-muted">
                  {file.status === 'extracting' ? 'Extrayendo texto…' : file.status === 'error' ? file.error : formatBytes(file.size)}
                </small>
              </button>
              {loadingPreview === file.id && <Loader2 size={12} className="animate-spin text-ink-subtle" />}
              {file.status === 'ready' && (
                // Todas las fuentes se usan en el chat y en Estudio (elegir cuáles sería otra función).
                <span
                  role="img"
                  aria-label="Se usa en el chat y en Estudio"
                  title="Se usa en el chat y en Estudio"
                  className="w-[18px] h-[18px] rounded-[5px] bg-accent text-on-accent grid place-items-center flex-shrink-0"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
