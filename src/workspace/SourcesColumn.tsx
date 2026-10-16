/**
 * @file SourcesColumn.tsx
 * @description Columna "Fuentes" (brief, sección 5.2): archivos cargados y su texto extraído.
 * En la web se pueden agregar y quitar fuentes. En el escritorio las fuentes se
 * cargan antes de la sesión (nunca se abre el explorador de archivos en el kiosko).
 * Diseño (ORION #35): cada archivo con ícono naranja, nombre, tamaño y la marca de que se usa;
 * abajo, "Agregar fuente" con borde punteado.
 */

import { useRef, useState } from 'react';
import { AlertTriangle, Check, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ACCEPT_ATTRIBUTE } from '../data/file-types';
import { useIngest } from '../data/useIngest';
import { getWorkspaceStore } from '../data/workspace';
import { useModeFlags } from '../lib/mode';
import { formatBytes } from '../utils/format';

export default function SourcesColumn() {
  const { state } = useApp();
  const { isDesktop } = useModeFlags();
  const { ingest, remove, ready } = useIngest();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const canEdit = !isDesktop;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const result = await ingest(files);
    setErrors(result.errors);
    if (inputRef.current) inputRef.current.value = '';
  };

  const openPreview = async (id: string, name: string) => {
    const store = getWorkspaceStore(state);
    if (!store) return;
    setLoadingPreview(id);
    try {
      setPreview({ name, text: await store.getSourceText(id) });
    } catch (error) {
      console.error('No se pudo leer la fuente:', error);
      setErrors([`No se pudo abrir "${name}".`]);
    } finally {
      setLoadingPreview(null);
    }
  };

  const readyCount = state.uploadedFiles.filter(f => f.status === 'ready').length;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-3">
        <h2 className="font-display text-[17px] font-bold text-ink flex-1">Fuentes</h2>
        {state.uploadedFiles.length > 0 && (
          <span data-testid="sources-count" className="inline-flex items-center h-6 px-2.5 rounded-full bg-surface-raised text-ink-soft text-xs font-medium font-mono">
            {readyCount} de {state.uploadedFiles.length}
          </span>
        )}
      </div>

      {canEdit && (
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
        />
      )}

      {errors.length > 0 && (
        <div role="alert" className="mx-3.5 mb-2 p-2 rounded-lg border border-danger/40 bg-danger/10 text-xs text-ink-soft space-y-1">
          {errors.map(e => (
            <p key={e}>{e}</p>
          ))}
        </div>
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
              className={`group flex items-center gap-3 p-3 rounded-xl border bg-canvas ${file.status === 'ready' ? 'border-accent' : file.status === 'error' ? 'border-danger/50' : 'border-line'}`}
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
              {canEdit && (
                <button
                  onClick={() => void remove(file.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-danger"
                  title="Quitar fuente"
                >
                  <Trash2 size={13} />
                </button>
              )}
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

          {/* "Agregar fuente": en el navegador abre el selector; en el kiosko no se agregan fuentes
              (nunca se abre una ventana de Windows durante la sesión), así que lo explica. */}
          {canEdit ? (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={!ready}
              className="mt-1 border-[1.5px] border-dashed border-line hover:border-accent rounded-xl p-[18px] flex flex-col items-center gap-1.5 text-xs text-ink-muted text-center disabled:opacity-50"
            >
              <Upload size={18} />
              <b className="text-[13px] font-medium text-ink">Agregar fuente</b>
              PDF, Word o texto.
            </button>
          ) : (
            <div data-testid="add-source-info" className="mt-1 border-[1.5px] border-dashed border-line rounded-xl p-[18px] flex flex-col items-center gap-1.5 text-xs text-ink-muted text-center">
              <Upload size={18} />
              <b className="text-[13px] font-medium text-ink">Agregar fuente</b>
              Las fuentes se agregan antes de empezar la sesión.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
