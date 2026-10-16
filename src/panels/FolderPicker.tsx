/**
 * @file FolderPicker.tsx
 * @description Selector de carpetas propio de YALEH (ORION #22), como el de las aplicaciones
 * conocidas pero dentro de la app: solo carpetas, sin archivos, sin menú contextual y sin barra
 * de direcciones. Nunca se usa la ventana de Windows (desde ella se puede salir del kiosko).
 * Las rutas las valida el proceso principal.
 */

import { useEffect, useState } from 'react';
import { ArrowUp, Folder, HardDrive, Loader2 } from 'lucide-react';
import type { FolderListing, FolderRoot } from '@shared/ipc-types';
import { getElectronAPI } from '../lib/electron';

export default function FolderPicker({
  title,
  confirmLabel = 'Guardar aquí',
  onSelect,
  onCancel,
}: {
  title: string;
  confirmLabel?: string;
  onSelect: (folder: string) => void;
  onCancel: () => void;
}) {
  const api = getElectronAPI();
  const [roots, setRoots] = useState<FolderRoot[]>([]);
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const open = async (folder: string) => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      setListing(await api.folders.list(folder));
    } catch {
      setError('No se pudo abrir esa carpeta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!api) return;
    void api.folders.roots().then(result => {
      setRoots(result.roots);
      void open(result.start);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onContextMenu={e => e.preventDefault()}
      role="dialog"
      aria-label={title}
    >
      <div className="w-full max-w-2xl mx-4 bg-surface border border-line rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-ink font-semibold">{title}</h2>
          <p className="text-ink-subtle text-xs mt-1 truncate" data-testid="current-folder" title={listing?.path}>
            {listing ? listing.path : 'Cargando…'}
          </p>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Ubicaciones */}
          <nav className="w-44 flex-shrink-0 border-r border-line p-2 space-y-1 overflow-y-auto" aria-label="Ubicaciones">
            {roots.map(root => (
              <button
                key={root.path}
                onClick={() => void open(root.path)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left ${
                  listing?.rootName === root.name ? 'bg-accent/15 text-ink' : 'text-ink-soft hover:bg-surface-raised'
                }`}
              >
                {root.name.startsWith('Unidad') ? <HardDrive size={13} /> : <Folder size={13} />}
                <span className="truncate">{root.name}</span>
              </button>
            ))}
          </nav>

          {/* Carpetas */}
          <div className="flex-1 min-w-0 p-2 overflow-y-auto" aria-label="Carpetas">
            <button
              onClick={() => listing?.parent && void open(listing.parent)}
              disabled={!listing?.parent || loading}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-ink-muted hover:bg-surface-raised disabled:opacity-40"
            >
              <ArrowUp size={13} /> Subir
            </button>
            {loading ? (
              <p className="p-3 text-xs text-ink-subtle flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Cargando…
              </p>
            ) : error ? (
              <p role="alert" className="p-3 text-xs text-danger">
                {error}
              </p>
            ) : listing && listing.folders.length === 0 ? (
              <p className="p-3 text-xs text-ink-subtle">Esta carpeta no tiene subcarpetas.</p>
            ) : (
              listing?.folders.map(folder => (
                <button
                  key={folder.path}
                  onClick={() => void open(folder.path)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-ink-soft hover:bg-surface-raised text-left"
                >
                  <Folder size={14} className="text-warning flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-sm text-ink-muted hover:text-ink">
            Cancelar
          </button>
          <button
            onClick={() => listing && onSelect(listing.path)}
            disabled={!listing || loading}
            className="px-4 py-1.5 rounded-lg text-sm bg-accent hover:bg-accent-strong text-on-accent disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
