/**
 * @file ConfirmSessionPhase.tsx
 * @description Confirmación antes de la sesión de concentración.
 * Muestra los archivos cargados y la duración, y advierte que no se puede
 * salir hasta que termine el tiempo. El estudiante confirma con un botón explícito.
 *
 * - Web: descarga el archivo de sesión .yaleh (brief, revisión 1.5) y explica
 *   cómo abrirlo en la app de escritorio. La web nunca bloquea nada.
 *   ORION #39: resumen con Archivos y Duración (cada uno con "Cambiar"), botón naranja y pantalla
 *   "Tu sesión está lista" con tres pasos (Descargas → doble clic → la sesión empieza).
 * - Escritorio: inicia la sesión local; el proceso principal bloquea el equipo.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Download, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';
import { buildSessionFileBlob, downloadBlob } from '../lib/session-file';
import { formatMinutes } from '../utils/format';

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
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8">
          <div className="text-center">
            <CheckCircle2 size={44} className="text-success mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-ink mb-2">Tu sesión está lista</h1>
            <p data-testid="session-file-name" className="font-mono text-sm text-ink-soft break-all mb-6">
              {downloaded}
            </p>
          </div>
          <ol className="space-y-3 mb-5">
            {[
              'Buscalo en tu carpeta Descargas.',
              'Abrilo con doble clic.',
              `La sesión de ${formatMinutes(minutes)} empieza y la computadora queda bloqueada.`,
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-ink-soft">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-on-accent text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-ink-subtle text-xs text-center mb-6">El archivo vale 24 horas y se puede usar una sola vez.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleDownload()}
              disabled={busy}
              className="w-full py-3 rounded-xl text-sm border border-line text-ink-soft hover:text-ink hover:border-line-strong disabled:opacity-60"
            >
              Descargar otra vez
            </button>
            <button onClick={prepareNewSession} className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink transition-colors">
              Preparar otra sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const changeLink = 'text-accent-soft hover:underline text-xs font-semibold whitespace-nowrap disabled:opacity-50';

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ink mb-1">Confirma tu sesión</h1>
          <p className="text-ink-muted text-sm">
            {api ? 'Revisa todo antes de bloquear el equipo.' : 'Revisa todo antes de descargar tu archivo de sesión.'}
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
          {/* Resumen: Archivos (cantidad y nombres) y Duración, cada uno con "Cambiar" */}
          <section aria-label="Archivos" className="p-4 rounded-xl bg-surface-raised">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-accent-soft flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Archivos</p>
                <p className="text-ink text-sm font-semibold">
                  {files.length === 0 ? 'Sin archivos' : files.length === 1 ? '1 archivo' : `${files.length} archivos`}
                </p>
                {files.length > 0 && (
                  <ul className="mt-1 max-h-32 overflow-y-auto text-ink-soft text-xs space-y-0.5">
                    {files.map(file => (
                      <li key={file.id} className="truncate" title={file.name}>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', payload: 'dropzone' })}
                disabled={busy}
                aria-label="Cambiar archivos"
                className={changeLink}
              >
                Cambiar
              </button>
            </div>
          </section>

          <section aria-label="Duración" className="p-4 rounded-xl bg-surface-raised">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-accent-soft flex-shrink-0" />
              <div className="flex-1">
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Duración</p>
                <p className="text-ink text-sm font-semibold">{formatMinutes(minutes)}</p>
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })}
                disabled={busy}
                aria-label="Cambiar duración"
                className={changeLink}
              >
                Cambiar
              </button>
            </div>
          </section>

          {/* Aviso con candado */}
          <section className="flex items-start gap-3 p-3 rounded-xl border border-accent/40 bg-accent/10">
            <Lock size={18} className="text-accent-soft flex-shrink-0 mt-0.5" />
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
            className={`w-full py-4 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
              api ? 'bg-accent hover:bg-accent-strong text-on-accent' : 'bg-accent hover:bg-accent-strong text-on-accent'
            }`}
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
