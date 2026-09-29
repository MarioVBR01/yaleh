/**
 * @file NotesBox.tsx
 * @description Recuadro de notas de la columna Estudio (brief, sección 5.2).
 * Se guardan en Firestore (online) o SQLite (offline). Funciona sin conexión.
 */

import { useEffect, useState } from 'react';
import { Loader2, StickyNote, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore, newId, type Note } from '../data/workspace';

export default function NotesBox() {
  const { state } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = getWorkspaceStore(state);
  const storeKey = `${store?.kind}/${state.workspaceId}`;

  useEffect(() => {
    if (!store) return;
    store
      .listNotes()
      .then(setNotes)
      .catch(err => {
        console.error('No se pudieron cargar las notas:', err);
        setError('No se pudieron cargar las notas.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  const handleSave = async () => {
    const text = draft.trim();
    if (!store || !text) return;
    setSaving(true);
    setError(null);
    const note: Note = { id: newId(), text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await store.saveNote(note);
      setNotes(prev => [...prev, note]);
      setDraft('');
    } catch (err) {
      console.error('No se pudo guardar la nota:', err);
      setError('No se pudo guardar la nota.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!store) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await store.deleteNote(id);
    } catch (err) {
      console.error('No se pudo eliminar la nota:', err);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-3">
      <h3 className="flex items-center gap-2 text-ink text-xs font-semibold mb-2">
        <StickyNote size={14} className="text-accent" /> Notas
      </h3>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Escribe una nota…"
        rows={3}
        className="w-full bg-canvas border border-line focus:border-accent rounded-lg px-2 py-1.5 text-xs text-ink placeholder:text-ink-subtle focus:outline-none resize-none"
      />
      <div className="flex justify-end mt-1.5">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !draft.trim() || !store}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-accent-strong hover:bg-accent text-ink disabled:opacity-50"
        >
          {saving && <Loader2 size={12} className="animate-spin" />} Guardar nota
        </button>
      </div>
      {error && <p className="text-danger text-[11px] mt-1">{error}</p>}
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {notes.map(note => (
            <li key={note.id} className="group flex gap-2 p-2 rounded-lg bg-canvas text-xs text-ink-soft">
              <p className="flex-1 whitespace-pre-wrap break-words">{note.text}</p>
              <button
                onClick={() => void handleDelete(note.id)}
                className="opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-danger self-start"
                title="Eliminar nota"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
