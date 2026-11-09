/**
 * @file SessionTitleEditor.tsx
 * @description Web: título de la sesión en Confirmar. El lápiz abre un campo en línea: Enter guarda, Escape cancela.
 */

import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { getSessionTitle, renameSession, SESSION_TITLE_MAX } from '../firebase/sessions';

export default function SessionTitleEditor({ uid, sessionId }: { uid: string; sessionId: string }) {
  const [title, setTitle] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSessionTitle(uid, sessionId)
      .then(value => {
        if (!cancelled) setTitle(value);
      })
      .catch(err => console.error('No se pudo leer el título de la sesión:', err));
    return () => {
      cancelled = true;
    };
  }, [uid, sessionId]);

  const startEditing = () => {
    setDraft(title ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      setTitle(await renameSession(uid, sessionId, draft));
      setEditing(false);
    } catch (err) {
      console.error('No se pudo cambiar el título:', err);
      setError('No se pudo guardar el título. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Título de la sesión" className="pb-4 border-b border-line">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            maxLength={SESSION_TITLE_MAX}
            disabled={saving}
            aria-label="Título de la sesión"
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void save();
              if (event.key === 'Escape') setEditing(false);
            }}
            className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-canvas border border-line focus:border-accent text-ink text-[15px] font-medium focus:outline-none"
          />
          {saving && <Loader2 size={16} className="animate-spin text-ink-muted" aria-label="Guardando" />}
        </div>
      ) : (
        <div className="flex items-center gap-2 min-h-11">
          <h2 className="min-w-0 font-sans text-lg font-semibold text-ink truncate">{title ?? 'Sesión sin título'}</h2>
          <button onClick={startEditing} aria-label="Cambiar el título" title="Cambiar el título" className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-raised flex-shrink-0">
            <Pencil size={15} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
