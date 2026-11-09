/**
 * @file SessionDialogs.tsx
 * @description Diálogos de "Mis sesiones": cambiar el nombre y eliminar una sesión.
 */

import { useEffect, useId, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SESSION_TITLE_MAX } from '../firebase/sessions';

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: (titleId: string) => ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] p-6 rounded-[20px] border border-line bg-surface flex flex-col gap-4"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={event => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-bold text-ink break-words">
          {title}
        </h2>
        {children(titleId)}
      </motion.div>
    </motion.div>
  );
}

const cancelClass = 'h-11 px-4 rounded-xl text-sm text-ink-soft hover:text-ink hover:bg-surface-raised disabled:opacity-50';
const confirmBase = 'h-11 px-5 rounded-xl text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60';

export function RenameSessionDialog({ initialTitle, onCancel, onConfirm }: { initialTitle: string; onCancel: () => void; onConfirm: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = title.trim().length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(title);
    } catch (err) {
      console.error('No se pudo cambiar el nombre:', err);
      setError('No se pudo cambiar el nombre. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <DialogShell title="Cambiar nombre" onClose={onCancel}>
      {() => (
        <form onSubmit={event => void submit(event)} className="flex flex-col gap-4">
          <input
            autoFocus
            value={title}
            maxLength={SESSION_TITLE_MAX}
            onChange={event => setTitle(event.target.value)}
            aria-label="Nombre de la sesión"
            className="h-12 px-4 rounded-xl bg-canvas border border-line focus:border-accent text-ink text-sm focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className={cancelClass}>
              Cancelar
            </button>
            <button type="submit" disabled={!valid || busy} className={`${confirmBase} bg-accent hover:bg-accent-strong text-on-accent`}>
              {busy && <Loader2 size={15} className="animate-spin" />} Guardar
            </button>
          </div>
        </form>
      )}
    </DialogShell>
  );
}

export function DeleteSessionDialog({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error('No se pudo eliminar la sesión:', err);
      setError('No se pudo eliminar la sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <DialogShell title={`¿Eliminar "${title}"?`} onClose={onCancel}>
      {() => (
        <>
          <p className="text-sm text-ink-soft">Se borran los archivos guardados de esta sesión. Los .yaleh que ya descargaste siguen funcionando hasta que venzan.</p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} disabled={busy} className={cancelClass}>
              Cancelar
            </button>
            <button onClick={() => void confirm()} disabled={busy} className={`${confirmBase} bg-danger text-white hover:opacity-90`}>
              {busy && <Loader2 size={15} className="animate-spin" />} Eliminar
            </button>
          </div>
        </>
      )}
    </DialogShell>
  );
}
