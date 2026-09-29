/**
 * @file ConfirmSessionPhase.tsx
 * @description Confirmación antes de entrar al kiosko.
 * Muestra los archivos cargados y la duración, y advierte que no se puede
 * salir hasta que termine el tiempo. El estudiante confirma con un botón explícito.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import { formatBytes, formatMinutes } from '../utils/format';

export default function ConfirmSessionPhase() {
  const { state, dispatch, logActivity } = useApp();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutes = Math.round(state.sessionDuration / 60);
  const files = state.uploadedFiles;
  const api = getElectronAPI();

  /** Pide al proceso principal que inicie la sesión y bloquee el equipo. */
  const handleConfirm = async () => {
    setStarting(true);
    setError(null);
    try {
      if (api) {
        const snapshot = await api.startSession(state.sessionDuration, state.sessionMode ?? 'offline');
        dispatch({ type: 'START_KIOSK' });
        dispatch({ type: 'SYNC_TIME', payload: snapshot.remainingSeconds });
      } else {
        // En el navegador no se bloquea nada: el temporizador es solo una vista previa.
        dispatch({ type: 'START_KIOSK' });
      }
      logActivity({ type: 'tool', label: `Sesión de estudio iniciada: ${minutes} minutos`, icon: '🔒' });
    } catch (err) {
      console.error('No se pudo iniciar la sesión:', err);
      setError('No se pudo iniciar la sesión. Inténtalo de nuevo.');
      setStarting(false);
    }
  };

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
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', payload: 'dropzone' })}
                disabled={starting}
                className="text-accent-soft hover:text-ink text-xs font-medium whitespace-nowrap disabled:opacity-50"
              >
                Volver a cargar archivos
              </button>
            </div>
          </section>

          {/* Duración */}
          <section className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-raised">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              <span className="text-ink text-sm font-medium">Duración: {formatMinutes(minutes)}</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })}
              disabled={starting}
              className="text-accent-soft hover:text-ink text-xs font-medium disabled:opacity-50"
            >
              Cambiar duración
            </button>
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
              En el navegador no se bloquea el equipo: el temporizador es solo una vista previa.
            </p>
          )}

          {error && (
            <p role="alert" className="text-danger text-sm text-center">
              {error}
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={starting}
            className="w-full py-4 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors disabled:opacity-60"
          >
            {starting ? 'Iniciando sesión…' : `Entiendo, iniciar sesión de ${formatMinutes(minutes)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
