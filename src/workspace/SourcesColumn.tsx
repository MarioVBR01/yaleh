/**
 * @file SourcesColumn.tsx
 * @description Columna "Fuentes" (brief, sección 5.2): archivos cargados y su texto extraído.
 * En la web se pueden agregar y quitar fuentes. En el escritorio las fuentes se
 * cargan antes de la sesión (nunca se abre el explorador de archivos en el kiosko).
 */

import { useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Plus, Trash2, X } from 'lucide-react';
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

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-ink font-semibold text-sm">Fuentes</h2>
        {canEdit && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={!ready}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-accent-soft hover:text-ink hover:bg-surface-raised disabled:opacity-50"
            >
              <Plus size={14} /> Agregar
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={e => void handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mb-2 p-2 rounded-lg border border-danger/40 bg-danger/10 text-xs text-ink-soft space-y-1">
          {errors.map(e => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {preview ? (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-line bg-surface-raised">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
            <FileText size={14} className="text-accent flex-shrink-0" />
            <span className="text-ink text-xs font-medium truncate flex-1">{preview.name}</span>
            <button onClick={() => setPreview(null)} className="text-ink-subtle hover:text-ink" title="Cerrar">
              <X size={14} />
            </button>
          </div>
          <pre className="flex-1 overflow-y-auto p-3 text-xs text-ink-soft whitespace-pre-wrap font-sans">{preview.text}</pre>
        </div>
      ) : state.uploadedFiles.length === 0 ? (
        <p className="text-ink-subtle text-xs">
          {canEdit ? 'Agrega PDF, DOCX o TXT para trabajar con el asistente.' : 'No hay fuentes en esta sesión.'}
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1.5">
          {state.uploadedFiles.map(file => (
            <li key={file.id} className="group flex items-center gap-2 px-2 py-2 rounded-lg bg-surface-raised">
              {file.status === 'extracting' ? (
                <Loader2 size={14} className="text-accent animate-spin flex-shrink-0" />
              ) : file.status === 'error' ? (
                <AlertTriangle size={14} className="text-danger flex-shrink-0" />
              ) : (
                <FileText size={14} className="text-accent flex-shrink-0" />
              )}
              <button
                onClick={() => file.status === 'ready' && void openPreview(file.id, file.name)}
                disabled={file.status !== 'ready'}
                className="flex-1 min-w-0 text-left"
                title={file.error ?? 'Ver el texto extraído'}
              >
                <p className="text-ink-soft text-xs truncate">{file.name}</p>
                <p className="text-ink-subtle text-[10px]">
                  {file.status === 'extracting'
                    ? 'Extrayendo texto…'
                    : file.status === 'error'
                      ? file.error
                      : `${formatBytes(file.size)} · ${(file.charCount ?? 0).toLocaleString('es')} caracteres`}
                </p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
