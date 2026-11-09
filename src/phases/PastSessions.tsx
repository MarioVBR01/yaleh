/**
 * @file PastSessions.tsx
 * @description "Tus sesiones pasadas" en el paso Material de la web: las sesiones ya descargadas.
 * "Usar de nuevo" carga sus archivos y su duración y va a Confirmar; al descargar sale un .yaleh
 * nuevo (nuevo sessionId, vale 24 horas y se usa una vez).
 */

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { loadRemoteSources } from '../data/sources';
import { discardEmptyDraft, listPastSessions, type PastSession } from '../firebase/sessions';
import { formatDateTime } from '../utils/format';

/** Hasta dos nombres y "+N más". */
function sourcesLabel(names: string[]): string {
  if (names.length === 0) return 'Sin archivos';
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${shown} +${names.length - 2} más` : shown;
}

export default function PastSessions({ uid }: { uid: string }) {
  const { state, dispatch } = useApp();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [reusing, setReusing] = useState<string | null>(null);
  const [reuseError, setReuseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPastSessions(uid)
      .then(list => {
        if (cancelled) return;
        setSessions(list);
        setStatus('ready');
      })
      .catch(err => {
        console.error('No se pudieron cargar las sesiones pasadas:', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt(n => n + 1);
  };

  const reuse = async (session: PastSession) => {
    setReusing(session.id);
    setReuseError(null);
    const previous = state.workspaceId;
    const previousIsEmpty = state.uploadedFiles.length === 0;
    try {
      const files = await loadRemoteSources(uid, session.id);
      dispatch({ type: 'SET_WORKSPACE', payload: session.id });
      dispatch({ type: 'SET_FILES', payload: files });
      dispatch({ type: 'SET_SESSION_DURATION', payload: session.durationSeconds });
      dispatch({ type: 'SET_DOWNLOADED_FILE', payload: null });
      dispatch({ type: 'SET_PHASE', payload: 'confirm-session' });
      // El borrador vacío que se creó al entrar ya no se usa.
      if (previous && previous !== session.id && previousIsEmpty) {
        discardEmptyDraft(uid, previous).catch(err => console.error('No se pudo borrar el borrador:', err));
      }
    } catch (err) {
      console.error('No se pudo abrir la sesión pasada:', err);
      setReuseError('No se pudo abrir esa sesión. Inténtalo de nuevo.');
      setReusing(null);
    }
  };

  return (
    <section aria-label="Tus sesiones pasadas" className="w-full max-w-[640px] bg-surface border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-4">
      <h2 className="font-sans text-base font-semibold text-ink">Tus sesiones pasadas</h2>

      {status === 'loading' && (
        <div role="status" aria-label="Cargando tus sesiones" data-testid="past-sessions-loading" className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <span key={i} className="block h-[60px] rounded-xl bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 text-sm text-ink-soft">
          <span>No se pudieron cargar tus sesiones.</span>
          <button onClick={retry} className="h-10 px-4 rounded-xl text-sm font-medium border border-line text-ink hover:border-ink-muted">
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && sessions.length === 0 && <p className="text-sm text-ink-muted">Aún no has descargado ninguna sesión.</p>}

      {status === 'ready' && sessions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sessions.map(session => {
            const date = session.lastExportedAt ? formatDateTime(session.lastExportedAt) : '';
            return (
              <li key={session.id} data-testid="past-session" className="flex flex-col sm:flex-row sm:items-center gap-3 px-3.5 py-3 rounded-xl border border-line">
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-medium text-ink truncate" title={session.sourceNames.join(', ')}>
                    {sourcesLabel(session.sourceNames)}
                  </b>
                  <small className="text-xs text-ink-muted font-mono">
                    {date} · {Math.round(session.durationSeconds / 60)} min
                  </small>
                </div>
                <button
                  onClick={() => void reuse(session)}
                  disabled={reusing !== null}
                  aria-label={`Usar de nuevo la sesión del ${date}`}
                  className="h-10 px-4 rounded-xl text-sm font-medium border border-line text-ink hover:border-ink-muted inline-flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60"
                >
                  <RotateCcw size={14} /> {reusing === session.id ? 'Abriendo…' : 'Usar de nuevo'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {reuseError && (
        <p role="alert" className="text-sm text-danger">
          {reuseError}
        </p>
      )}
    </section>
  );
}
