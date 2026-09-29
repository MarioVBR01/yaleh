/**
 * @file ConfirmSessionPhase.tsx
 * @description Confirmación antes de entrar al kiosko.
 * Muestra los archivos cargados y la duración, y advierte que no se puede
 * salir hasta que termine el tiempo. El estudiante confirma con un botón explícito.
 *
 * - Web: guarda la sesión en Firestore y abre el escritorio con yaleh://sesion?id=…
 * - Escritorio offline: inicia la sesión local.
 * - Escritorio online: la sesión llegó desde la web y el equipo ya está bloqueado;
 *   el tiempo empieza al confirmar (brief, sección 4.1).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { markSessionActive, markSessionPending } from '../firebase/sessions';
import { getElectronAPI } from '../lib/electron';
import { startPhase } from '../lib/mode';
import { formatBytes, formatMinutes } from '../utils/format';

export default function ConfirmSessionPhase() {
  const { state, dispatch, logActivity } = useApp();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handedOff, setHandedOff] = useState(false);

  const minutes = Math.round(state.sessionDuration / 60);
  const files = state.uploadedFiles;
  const api = getElectronAPI();
  const uid = state.session.uid;
  const workspaceId = state.workspaceId;
  /** Escritorio con una sesión online recibida desde la web (equipo ya bloqueado). */
  const heldOnline = Boolean(api) && state.onlineSessionHeld;
  const sessionLink = workspaceId ? `yaleh://sesion?id=${encodeURIComponent(workspaceId)}` : null;

  /** Web: guarda la sesión como pendiente y abre la app de escritorio. */
  const handleHandOff = async () => {
    if (!uid || !workspaceId || !sessionLink) {
      setError('Tu espacio de trabajo aún se está creando. Espera un momento e inténtalo de nuevo.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      await markSessionPending(uid, workspaceId, state.sessionDuration);
      window.location.href = sessionLink;
      setHandedOff(true);
      logActivity({ type: 'tool', label: `Sesión enviada al escritorio: ${minutes} minutos`, icon: '🔒' });
    } catch (err) {
      console.error('No se pudo guardar la sesión:', err);
      setError('No se pudo guardar la sesión. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  /** Escritorio: pide al proceso principal que inicie la sesión y bloquee el equipo. */
  const handleConfirm = async () => {
    if (!api) return;
    setStarting(true);
    setError(null);
    try {
      const mode = state.sessionMode ?? 'offline';
      // Online preparada: el id de Firestore. Offline: el id local. Prueba online sin cuenta: lo genera el proceso principal.
      const sessionId = mode === 'offline' || heldOnline ? workspaceId ?? undefined : undefined;
      const snapshot = await api.startSession(state.sessionDuration, mode, sessionId);
      dispatch({ type: 'SET_ONLINE_SESSION_HELD', payload: false });
      dispatch({ type: 'START_KIOSK' });
      dispatch({ type: 'SYNC_TIME', payload: snapshot.remainingSeconds });
      if (heldOnline && uid && workspaceId) {
        markSessionActive(uid, workspaceId).catch(err => console.warn('No se pudo marcar la sesión como activa:', err));
      }
      logActivity({ type: 'tool', label: `Sesión de estudio iniciada: ${minutes} minutos`, icon: '🔒' });
    } catch (err) {
      console.error('No se pudo iniciar la sesión:', err);
      setError('No se pudo iniciar la sesión. Inténtalo de nuevo.');
      setStarting(false);
    }
  };

  /** Escritorio online: cancelar antes de que empiece el tiempo libera el equipo. */
  const handleCancelOnline = async () => {
    await api?.cancelOnlineSession();
    dispatch({ type: 'SET_ONLINE_SESSION_HELD', payload: false });
    dispatch({ type: 'SET_LINKED_SESSION', payload: null });
    dispatch({ type: 'SET_PHASE', payload: startPhase(true) });
  };

  if (handedOff && sessionLink) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center">
          <Lock size={30} className="text-accent mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ink mb-2">Abriendo YALEH en tu escritorio</h1>
          <p className="text-ink-muted text-sm mb-6">
            Tu navegador puede pedirte permiso para abrir YALEH. Si no se abre, verifica que la app de escritorio
            esté instalada y vuelve a intentarlo.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={sessionLink}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors"
            >
              Abrir YALEH otra vez
            </a>
            <button
              onClick={() => {
                // La sesión corre en el escritorio: la web solo muestra el espacio de trabajo, sin temporizador.
                dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
                dispatch({ type: 'START_KIOSK' });
              }}
              className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Ir a mi espacio de trabajo en la web
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-strong mb-4">
            <Lock size={30} className="text-ink" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-1">Confirma tu sesión</h1>
          <p className="text-ink-muted text-sm">Revisa todo antes de bloquear el equipo.</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 space-y-5">
          {/* Archivos cargados */}
          <section>
            <h2 className="text-ink-muted text-xs font-medium uppercase tracking-wider mb-2">
              Archivos cargados ({files.length})
            </h2>
            {files.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto space-y-1.5">
                {files.map(file => (
                  <li
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised text-sm"
                  >
                    <FileText size={14} className="text-accent flex-shrink-0" />
                    <span className="text-ink-soft truncate flex-1">{file.name}</span>
                    <span className="text-ink-subtle text-xs">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-subtle text-sm px-3 py-2 rounded-lg bg-surface-raised">
                No cargaste archivos.
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-ink-soft text-sm">¿Cargaste todos los archivos que necesitas?</p>
              {!heldOnline && (
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', payload: 'dropzone' })}
                disabled={starting}
                className="text-accent-soft hover:text-ink text-xs font-medium whitespace-nowrap disabled:opacity-50"
              >
                Volver a cargar archivos
              </button>
              )}
            </div>
          </section>

          {/* Duración */}
          <section className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-raised">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              <span className="text-ink text-sm font-medium">Duración: {formatMinutes(minutes)}</span>
            </div>
            {!heldOnline && (
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })}
              disabled={starting}
              className="text-accent-soft hover:text-ink text-xs font-medium disabled:opacity-50"
            >
              Cambiar duración
            </button>
            )}
          </section>

          {/* Aviso */}
          <section className="flex items-start gap-3 p-3 rounded-xl border border-warning/40 bg-warning/10">
            <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
            <p className="text-ink-soft text-sm">
              <strong className="text-ink">
                No podrás salir hasta que termine el tiempo. Solo apagando o reiniciando el equipo.
              </strong>
            </p>
          </section>

          {!api && (
            <p className="text-ink-subtle text-xs text-center">
              La sesión se abrirá en la app de escritorio de YALEH, que bloqueará el equipo.
            </p>
          )}

          {error && (
            <p role="alert" className="text-danger text-sm text-center">
              {error}
            </p>
          )}

          <button
            onClick={api ? handleConfirm : handleHandOff}
            disabled={starting}
            className="w-full py-4 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors disabled:opacity-60"
          >
            {starting
              ? 'Iniciando sesión…'
              : api
                ? `Entiendo, iniciar sesión de ${formatMinutes(minutes)}`
                : `Entiendo, abrir la sesión de ${formatMinutes(minutes)} en el escritorio`}
          </button>

          {heldOnline && (
            <button
              onClick={handleCancelOnline}
              disabled={starting}
              className="w-full py-2 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Cancelar (el tiempo aún no empezó)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
