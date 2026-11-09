/**
 * @file SessionsHomePhase.tsx
 * @description "Mis sesiones": la pantalla principal de la web después de ingresar. Las sesiones de estudio
 * guardadas en la cuenta, en lista o cuadrícula (en el celular, siempre cuadrícula), con búsqueda y orden.
 * Desde aquí se crean, abren, renombran, descargan (.yaleh) y eliminan. Cada descarga genera un .yaleh
 * nuevo: vale 24 horas y se usa una vez.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlignLeft, Download, FileText, FileType2, FolderOpen, LayoutGrid, List, Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { loadRemoteSources } from '../data/sources';
import { getWorkspaceStore } from '../data/workspace';
import { createDraftSession, deleteSession, listMySessions, markSessionExported, renameSession, type MySession } from '../firebase/sessions';
import { buildSessionFileBlob, downloadBlob } from '../lib/session-file';
import { formatShortDate } from '../utils/format';
import { DeleteSessionDialog, RenameSessionDialog } from './SessionDialogs';

const VIEW_KEY = 'yaleh-sessions-view';
const UNTITLED = 'Sesión sin título';

type View = 'list' | 'grid';
type Sort = 'recent' | 'name';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

function saveView(view: View): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Sin almacenamiento (ventana privada): la vista dura lo que la pantalla.
  }
}

/** En el celular siempre va la cuadrícula. */
function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setPhone(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return phone;
}

const titleOf = (session: MySession) => session.title ?? UNTITLED;
const filesLabel = (n: number) => (n === 0 ? 'Sin archivos' : n === 1 ? '1 archivo' : `${n} archivos`);
const durationLabel = (seconds: number | null) => (seconds ? `${Math.round(seconds / 60)} min` : 'Sin definir');
const canDownload = (session: MySession) => session.sourceCount > 0 && Boolean(session.durationSeconds);
/** Sin mayúsculas ni tildes, para buscar. */
const normalized = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Ícono según el tipo del primer archivo. */
function SessionIcon({ session }: { session: MySession }) {
  const extension = session.sourceNames[0]?.split('.').pop()?.toLowerCase();
  const kind = extension === 'pdf' ? 'pdf' : extension === 'docx' || extension === 'doc' ? 'word' : extension === 'txt' ? 'text' : 'empty';
  const Icon = { pdf: FileText, word: FileType2, text: AlignLeft, empty: FolderOpen }[kind];
  return (
    <span data-kind={kind} data-testid="session-icon" className="w-10 h-10 rounded-xl bg-accent/15 text-accent-soft grid place-items-center flex-shrink-0">
      <Icon size={19} aria-hidden="true" />
    </span>
  );
}

function StatusChip({ session }: { session: MySession }) {
  if (session.status !== 'exported' && session.exportCount === 0) {
    return <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-surface-raised text-xs text-ink-soft whitespace-nowrap">Borrador</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-success/15 text-xs text-ink whitespace-nowrap">
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success" />
      Descargada{session.exportCount > 1 ? ` · ${session.exportCount} veces` : ''}
    </span>
  );
}

interface MenuActions {
  open: () => void;
  download: () => void;
  rename: () => void;
  remove: () => void;
}

function SessionMenu({ session, isOpen, onToggle, actions }: { session: MySession; isOpen: boolean; onToggle: (open: boolean) => void; actions: MenuActions }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onToggle(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onToggle]);

  const item = (label: string, icon: ReactNode, action: () => void, options: { disabled?: boolean; danger?: boolean; hint?: string } = {}) => (
    <button
      role="menuitem"
      disabled={options.disabled}
      title={options.hint}
      onClick={() => {
        onToggle(false);
        action();
      }}
      className={`w-full flex items-center gap-2.5 px-3 h-10 text-left text-sm hover:bg-surface-raised disabled:opacity-50 disabled:hover:bg-transparent ${options.danger ? 'text-danger' : 'text-ink'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={event => event.stopPropagation()}>
      <button
        onClick={() => onToggle(!isOpen)}
        aria-label={`Opciones de ${titleOf(session)}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="w-9 h-9 rounded-[10px] grid place-items-center text-ink-soft hover:text-ink hover:bg-surface-raised"
      >
        <MoreVertical size={18} />
      </button>
      {isOpen && (
        <div role="menu" className="absolute z-30 right-0 top-full mt-1 w-52 py-1.5 rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          {item('Abrir', <FolderOpen size={15} />, actions.open)}
          {item('Descargar .yaleh', <Download size={15} />, actions.download, {
            disabled: !canDownload(session),
            hint: canDownload(session) ? undefined : 'Agrega archivos y elige la duración para descargarla',
          })}
          {item('Cambiar nombre', <Pencil size={15} />, actions.rename)}
          {item('Eliminar', <Trash2 size={15} />, actions.remove, { danger: true })}
        </div>
      )}
    </div>
  );
}

const fadeIn = (index: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay: Math.min(index, 15) * 0.04 },
});

/** Elevación al pasar el mouse. Va en CSS para no mezclarse con el retraso de la entrada escalonada. */
const hoverLift = 'transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0';
const listColumns = 'grid-cols-[minmax(0,1fr)_96px_96px_104px_176px_40px]';

interface ItemProps {
  session: MySession;
  index: number;
  busy: boolean;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  actions: MenuActions;
}

function SessionRow({ session, index, busy, menuOpen, onMenu, actions }: ItemProps) {
  return (
    <motion.div
      {...fadeIn(index)}
      role="listitem"
      data-testid="session-row"
      onClick={actions.open}
      className={`relative ${menuOpen ? 'z-20' : ''} grid ${listColumns} gap-4 items-center px-3.5 py-3 rounded-2xl border border-line bg-surface cursor-pointer ${hoverLift}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <SessionIcon session={session} />
        {/* Sin onClick propio: el clic (o Enter) sube a la fila. */}
        <button className="min-w-0 text-left text-sm font-medium text-ink truncate" title={titleOf(session)}>
          {titleOf(session)}
        </button>
        {busy && <Loader2 size={15} className="animate-spin text-ink-muted flex-shrink-0" aria-label="Abriendo" />}
      </div>
      <span className="text-[13px] text-ink-soft">{filesLabel(session.sourceCount)}</span>
      <span className="text-[13px] text-ink-soft">{durationLabel(session.durationSeconds)}</span>
      <span className="text-[13px] text-ink-soft">{session.updatedAt ? formatShortDate(session.updatedAt) : ''}</span>
      <span>
        <StatusChip session={session} />
      </span>
      <SessionMenu session={session} isOpen={menuOpen} onToggle={onMenu} actions={actions} />
    </motion.div>
  );
}

function SessionCard({ session, index, busy, menuOpen, onMenu, actions }: ItemProps) {
  return (
    <motion.div
      {...fadeIn(index)}
      role="listitem"
      data-testid="session-card"
      onClick={actions.open}
      className={`relative ${menuOpen ? 'z-20' : ''} flex flex-col gap-3 p-4 rounded-2xl border border-line bg-surface cursor-pointer ${hoverLift}`}
    >
      <div className="flex items-start justify-between gap-2">
        <SessionIcon session={session} />
        <SessionMenu session={session} isOpen={menuOpen} onToggle={onMenu} actions={actions} />
      </div>
      <button className="text-left text-[15px] font-medium text-ink truncate" title={titleOf(session)}>
        {titleOf(session)}
      </button>
      <p className="text-[13px] text-ink-soft">
        {filesLabel(session.sourceCount)} · {durationLabel(session.durationSeconds)}
      </p>
      <div className="flex items-center justify-between gap-2 min-h-6">
        <span className="text-xs text-ink-muted">{session.updatedAt ? formatShortDate(session.updatedAt) : ''}</span>
        {busy ? <Loader2 size={15} className="animate-spin text-ink-muted" aria-label="Abriendo" /> : <StatusChip session={session} />}
      </div>
    </motion.div>
  );
}

function NewSessionButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="h-12 px-5 rounded-[14px] bg-accent hover:bg-accent-strong text-on-accent text-[15px] font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:opacity-60"
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Nueva sesión
    </button>
  );
}

const control = 'h-11 rounded-xl border border-line bg-surface text-sm text-ink focus:border-accent focus:outline-none';

export default function SessionsHomePhase() {
  const { state, dispatch } = useApp();
  const uid = state.session.uid;
  const phone = useIsPhone();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [preferredView, setPreferredView] = useState<View>(readView);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'rename' | 'delete'; session: MySession } | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    listMySessions(uid)
      .then(list => {
        if (cancelled) return;
        setSessions(list);
        setStatus('ready');
      })
      .catch(error => {
        console.error('No se pudieron cargar tus sesiones:', error);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const visible = useMemo(() => {
    const term = normalized(search.trim());
    const found = term ? sessions.filter(s => normalized([titleOf(s), ...s.sourceNames].join(' ')).includes(term)) : sessions;
    return [...found].sort((a, b) =>
      sort === 'name' ? titleOf(a).localeCompare(titleOf(b), 'es', { sensitivity: 'base' }) : (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
    );
  }, [sessions, search, sort]);

  const view: View = phone ? 'grid' : preferredView;
  const chooseView = (next: View) => {
    setPreferredView(next);
    saveView(next);
  };

  const retry = () => {
    setStatus('loading');
    setAttempt(n => n + 1);
  };

  const createNew = async () => {
    if (!uid) return;
    setCreating(true);
    setMessage(null);
    try {
      const id = await createDraftSession(uid);
      dispatch({ type: 'SET_WORKSPACE', payload: id });
      dispatch({ type: 'SET_FILES', payload: [] });
      dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
      dispatch({ type: 'SET_DOWNLOADED_FILE', payload: null });
      dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
    } catch (error) {
      console.error('No se pudo crear la sesión:', error);
      setMessage({ ok: false, text: 'No se pudo crear la sesión. Inténtalo de nuevo.' });
      setCreating(false);
    }
  };

  const openSession = async (session: MySession) => {
    if (!uid || busyId) return;
    setBusyId(session.id);
    setMessage(null);
    try {
      const files = await loadRemoteSources(uid, session.id);
      dispatch({ type: 'SET_WORKSPACE', payload: session.id });
      dispatch({ type: 'SET_FILES', payload: files });
      dispatch({ type: 'SET_SESSION_DURATION', payload: session.durationSeconds ?? 0 });
      dispatch({ type: 'SET_DOWNLOADED_FILE', payload: null });
      const next = files.length === 0 ? 'dropzone' : session.durationSeconds ? 'confirm-session' : 'timer-select';
      dispatch({ type: 'SET_PHASE', payload: next });
    } catch (error) {
      console.error('No se pudo abrir la sesión:', error);
      setMessage({ ok: false, text: 'No se pudo abrir esa sesión. Inténtalo de nuevo.' });
      setBusyId(null);
    }
  };

  /** Genera un .yaleh nuevo (otro sessionId) con las mismas fuentes y duración, sin pasar por Confirmar. */
  const downloadSession = async (session: MySession) => {
    if (!uid || busyId || !session.durationSeconds) return;
    setBusyId(session.id);
    setMessage(null);
    try {
      const uploadedFiles = await loadRemoteSources(uid, session.id);
      const target = { ...state, workspaceId: session.id, uploadedFiles, sessionDuration: session.durationSeconds };
      const { blob, fileName, sources } = await buildSessionFileBlob(target, getWorkspaceStore(target));
      downloadBlob(blob, fileName);
      setMessage({ ok: true, text: `Se descargó ${fileName}. Vale 24 horas y se usa una sola vez.` });
      setSessions(list => list.map(s => (s.id === session.id ? { ...s, status: 'exported', exportCount: s.exportCount + 1, updatedAt: new Date(), lastExportedAt: new Date() } : s)));
      // Si no se puede registrar, la descarga ya salió bien.
      markSessionExported(uid, session.id, { durationSeconds: session.durationSeconds, sources }).catch(error => console.error('No se pudo guardar la sesión descargada:', error));
    } catch (error) {
      console.error('No se pudo crear el archivo de sesión:', error);
      const detail = error instanceof Error && error.message.startsWith('El texto de tus fuentes') ? error.message : null;
      setMessage({ ok: false, text: detail ?? 'No se pudo crear el archivo de sesión. Inténtalo de nuevo.' });
    } finally {
      setBusyId(null);
    }
  };

  const confirmRename = async (session: MySession, title: string) => {
    const saved = await renameSession(uid!, session.id, title);
    setSessions(list => list.map(s => (s.id === session.id ? { ...s, title: saved, updatedAt: new Date() } : s)));
    setDialog(null);
  };

  const confirmDelete = async (session: MySession) => {
    await deleteSession(uid!, session.id);
    setSessions(list => list.filter(s => s.id !== session.id));
    setDialog(null);
  };

  const itemProps = (session: MySession, index: number): ItemProps => ({
    session,
    index,
    busy: busyId === session.id,
    menuOpen: menuFor === session.id,
    onMenu: open => setMenuFor(open ? session.id : null),
    actions: {
      open: () => void openSession(session),
      download: () => void downloadSession(session),
      rename: () => setDialog({ kind: 'rename', session }),
      remove: () => setDialog({ kind: 'delete', session }),
    },
  });

  const viewButton = (value: View, label: string, icon: ReactNode) => (
    <button
      onClick={() => chooseView(value)}
      aria-pressed={view === value}
      aria-label={label}
      title={label}
      className={`w-9 h-9 rounded-[9px] grid place-items-center ${view === value ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
    >
      {icon}
    </button>
  );

  const empty = status === 'ready' && sessions.length === 0;

  return (
    <div className="min-h-full bg-canvas">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 lg:py-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-[40px] leading-[1.05] font-extrabold tracking-tight text-ink">Mis sesiones</h1>
            <p className="mt-2 text-[15px] text-ink-soft">Prepara tus sesiones de estudio y descárgalas para abrirlas en YALEH.</p>
          </div>
          {!empty && <NewSessionButton busy={creating} onClick={() => void createNew()} />}
        </div>

        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`px-4 py-3 rounded-xl border text-sm text-ink-soft break-words ${message.ok ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
            {message.text}
          </p>
        )}

        {status === 'loading' && (
          <div role="status" aria-label="Cargando tus sesiones" data-testid="sessions-loading" className="flex flex-col gap-2.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="block h-[66px] rounded-2xl bg-surface-raised animate-pulse" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-surface text-sm text-ink-soft">
            <span>No se pudieron cargar tus sesiones.</span>
            <button onClick={retry} className="h-10 px-4 rounded-xl text-sm font-medium border border-line text-ink hover:border-ink-muted">
              Reintentar
            </button>
          </div>
        )}

        {empty && (
          <div className="flex flex-col items-center text-center gap-3 py-14">
            <Logo size={88} />
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Aún no tienes sesiones.</h2>
            <p className="text-[15px] text-ink-soft">Crea la primera: sube tus apuntes y elige cuánto vas a estudiar.</p>
            <div className="mt-2">
              <NewSessionButton busy={creating} onClick={() => void createNew()} />
            </div>
          </div>
        )}

        {status === 'ready' && sessions.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <label className="relative flex-1">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar sesiones"
                  aria-label="Buscar sesiones"
                  className={`${control} w-full pl-10 pr-3 placeholder:text-ink-muted`}
                />
              </label>
              <select value={sort} onChange={event => setSort(event.target.value as Sort)} aria-label="Ordenar" className={`${control} px-3`}>
                <option value="recent">Recientes</option>
                <option value="name">Nombre A–Z</option>
              </select>
              {!phone && (
                <div className="flex items-center gap-0.5 p-0.5 h-11 rounded-xl border border-line bg-surface" role="group" aria-label="Vista">
                  {viewButton('list', 'Lista', <List size={18} />)}
                  {viewButton('grid', 'Cuadrícula', <LayoutGrid size={18} />)}
                </div>
              )}
            </div>

            {visible.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">Ninguna sesión coincide con tu búsqueda.</p>}

            {visible.length > 0 && view === 'list' && (
              <div>
                <div aria-hidden="true" className={`grid ${listColumns} gap-4 px-3.5 pb-2 text-xs text-ink-muted`}>
                  <span>Título</span>
                  <span>Archivos</span>
                  <span>Duración</span>
                  <span>Actualizada</span>
                  <span>Estado</span>
                  <span />
                </div>
                <div role="list" aria-label="Mis sesiones" className="flex flex-col gap-2">
                  {visible.map((session, index) => (
                    <SessionRow key={session.id} {...itemProps(session, index)} />
                  ))}
                </div>
              </div>
            )}

            {visible.length > 0 && view === 'grid' && (
              <div role="list" aria-label="Mis sesiones" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visible.map((session, index) => (
                  <SessionCard key={session.id} {...itemProps(session, index)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {dialog?.kind === 'rename' && (
          <RenameSessionDialog key="rename" initialTitle={dialog.session.title ?? ''} onCancel={() => setDialog(null)} onConfirm={title => confirmRename(dialog.session, title)} />
        )}
        {dialog?.kind === 'delete' && (
          <DeleteSessionDialog key="delete" title={titleOf(dialog.session)} onCancel={() => setDialog(null)} onConfirm={() => confirmDelete(dialog.session)} />
        )}
      </AnimatePresence>
    </div>
  );
}
