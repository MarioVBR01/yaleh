/**
 * @file ConfirmSessionPhase.tsx
 * @description Confirmación antes de la sesión de concentración.
 * Muestra los archivos cargados y la duración, y advierte que no se puede
 * salir hasta que termine el tiempo. El estudiante confirma con un botón explícito.
 *
 * - Web: descarga el archivo de sesión .yaleh (brief, revisión 1.5) y explica
 *   cómo abrirlo en la app de escritorio. La web nunca bloquea nada.
 * - Escritorio: inicia la sesión local; el proceso principal bloquea el equipo.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Download, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';
import { buildSessionFileBlob, downloadBlob } from '../lib/session-file';
import { formatBytes, formatMinutes } from '../utils/format';

export default function ConfirmSessionPhase() {
  const { state, dispatch, logActivity } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const minutes = Math.round(state.sessionDuration / 60);
  const files = state.uploadedFiles;
  const api = getElectronAPI();

  /** Web: genera y descarga el .yaleh con el texto de las fuentes. */
  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const { blob, fileName } = await buildSessionFileBlob(state, getWorkspaceStore(state));
      downloadBlob(blob, fileName);
      setDownloaded(fileName);
      logActivity({ type: 'tool', label: `Archivo de sesión descargado: ${minutes} minutos`, icon: '📥' });
    } catch (err) {
      console.error('No se pudo crear el archivo de sesión:', err);
      const message = err instanceof Error && err.message.startsWith('El texto de tus fuentes') ? err.message : null;
      setError(message ?? 'No se pudo crear el archivo de sesión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  /** Escritorio: pide al proceso principal que inicie la sesión y bloquee el equipo. */
  const handleStart = async () => {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await api.startSession(state.sessionDuration, state.workspaceId ?? undefined);
      dispatch({ type: 'SET_SESSION_MODE', payload: snapshot.mode });
      dispatch({ type: 'START_KIOSK' });
      dispatch({ type: 'SYNC_TIME', payload: snapshot.remainingSeconds });
      logActivity({ type: 'tool', label: `Sesión de estudio iniciada: ${minutes} minutos`, icon: '🔒' });
    } catch (err) {
      console.error('No se pudo iniciar la sesión:', err);
      setError('No se pudo iniciar la sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  /**
   * Web: prepara una sesión nueva desde la dropzone. Se crea otro espacio en
   * Firestore (useWebWorkspace) y se vacía la lista de archivos.
   */
  const prepareNewSession = () => {
    dispatch({ type: 'SET_FILES', payload: [] });
    dispatch({ type: 'SET_WORKSPACE', payload: null });
    dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  if (downloaded) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center">
          <Download size={30} className="text-accent mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ink mb-2">Archivo de sesión descargado</h1>
          <p className="text-ink-soft text-sm mb-2">
            <strong className="text-ink">Abre el archivo con la aplicación de escritorio YALEH.</strong>
          </p>
          <ol className="text-ink-muted text-sm text-left list-decimal pl-5 space-y-1 mb-4">
            <li>Abre YALEH en tu computadora.</li>
            <li>
              Pulsa <em>Abrir archivo de sesión (.yaleh)</em> y elige{' '}
              <span className="text-ink-soft break-all">{downloaded}</span>, o arrastra el archivo a la ventana de YALEH.
            </li>
            <li>La sesión de {formatMinutes(minutes)} empieza de inmediato y el equipo queda bloqueado.</li>
          </ol>
          <p className="text-ink-subtle text-xs mb-6">El archivo vale 24 horas y se puede usar una sola vez.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleDownload()}
              disabled={busy}
              className="w-full py-3 rounded-xl text-sm border border-line text-ink-soft hover:text-ink hover:border-line-strong disabled:opacity-60"
            >
              Descargar otro archivo
            </button>
            <button onClick={prepareNewSession} className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink transition-colors">
              Preparar una nueva sesión
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
          <p className="text-ink-muted text-sm">
            {api ? 'Revisa todo antes de bloquear el equipo.' : 'Revisa todo antes de descargar tu archivo de sesión.'}
          </p>
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
                  <li key={file.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised text-sm">
                    <FileText size={14} className="text-accent flex-shrink-0" />
                    <span className="text-ink-soft truncate flex-1">{file.name}</span>
                    <span className="text-ink-subtle text-xs">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-subtle text-sm px-3 py-2 rounded-lg bg-surface-raised">No cargaste archivos.</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-ink-soft text-sm">¿Cargaste todos los archivos que necesitas?</p>
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', payload: 'dropzone' })}
                disabled={busy}
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
              disabled={busy}
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
              {!api && ' La sesión empezará en cuanto abras el archivo en la app de escritorio.'}
            </p>
          </section>

          {error && (
            <p role="alert" className="text-danger text-sm text-center">
              {error}
            </p>
          )}

          <button
            onClick={() => void (api ? handleStart() : handleDownload())}
            disabled={busy}
            className="w-full py-4 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {api ? (
              busy ? 'Iniciando sesión…' : `Entiendo, iniciar sesión de ${formatMinutes(minutes)}`
            ) : (
              <>
                <Download size={16} /> {busy ? 'Preparando archivo…' : 'Descargar archivo de sesión'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
