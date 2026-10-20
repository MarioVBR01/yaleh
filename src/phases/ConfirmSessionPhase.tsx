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
import { Check, Clock, Download, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';
import { buildSessionFileBlob, downloadBlob } from '../lib/session-file';
import { formatMinutes } from '../utils/format';

export default function ConfirmSessionPhase() {
  const { state, dispatch, logActivity } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloaded = state.downloadedFile;
  const setDownloaded = (name: string | null) => dispatch({ type: 'SET_DOWNLOADED_FILE', payload: name });

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
    // Pantalla 5 de docs/diseno/maquetas/web.html (ORION #39 y #43).
    return (
      <div className="min-h-full bg-canvas flex flex-col items-center px-4 py-10 lg:py-12">
        <div className="w-full max-w-[640px] bg-surface border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-5">
          <span className="w-[72px] h-[72px] rounded-full bg-success/15 text-success grid place-items-center mx-auto" aria-hidden="true">
            <Check size={34} strokeWidth={2.4} />
          </span>
          <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight text-ink text-center">Tu sesión está lista</h1>
          <p data-testid="session-file-name" className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-surface-raised font-mono text-[0.84rem] text-ink break-all">
            <FileText size={18} className="text-accent-soft flex-shrink-0" />
            {downloaded}
          </p>
          <ol className="flex flex-col gap-3">
            {[
              'Buscá el archivo en tu carpeta de Descargas.',
              'Abrilo con doble clic. Se abre YALEH.',
              `La sesión de ${formatMinutes(minutes)} empieza y la computadora queda bloqueada.`,
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[0.9rem] text-ink">
                <span className="w-[26px] h-[26px] rounded-full bg-ink text-canvas grid place-items-center text-xs font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-ink-muted text-[0.78rem] text-center">El archivo vale 24 horas y se puede usar una sola vez.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void handleDownload()}
              disabled={busy}
              className="flex-1 h-12 rounded-[14px] text-[0.94rem] font-medium border border-line bg-surface text-ink hover:border-ink-muted disabled:opacity-60"
            >
              Descargar otra vez
            </button>
            <button
              onClick={prepareNewSession}
              className="flex-1 h-12 rounded-[14px] text-[0.94rem] font-medium bg-ink text-canvas hover:opacity-90"
            >
              Preparar otra sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const changeLink = 'text-accent-soft hover:underline text-[0.8rem] font-medium whitespace-nowrap disabled:opacity-50';

  // Pantalla 4 de docs/diseno/maquetas/web.html (ORION #39 y #43); el escritorio usa la misma vista.
  return (
    <div className="min-h-full bg-canvas flex flex-col items-center px-4 py-10 lg:py-12 gap-7">
      <motion.div className="text-center max-w-[640px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl sm:text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-ink">Revisá tu sesión</h1>
        <p className="mt-2.5 text-base text-ink-soft">
          {api ? 'Si todo está bien, empezá la sesión: la computadora queda bloqueada.' : 'Si todo está bien, descargá el archivo y abrilo en la app de escritorio.'}
        </p>
      </motion.div>

      <div className="w-full max-w-[640px] bg-surface border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-5">
        <div>
          {/* Resumen: Archivos (cantidad y nombres) y Duración, cada uno con "Cambiar" */}
          <section aria-label="Archivos" className="flex items-start gap-3.5 pb-4 border-b border-line">
            <span className="w-10 h-10 rounded-xl bg-surface-raised text-ink-soft grid place-items-center flex-shrink-0">
              <FileText size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <small className="block text-xs text-ink-muted">Archivos</small>
              <b className="text-[0.94rem] font-medium text-ink">
                {files.length === 0 ? 'Sin archivos' : files.length === 1 ? '1 documento' : `${files.length} documentos`}
              </b>
              {files.length > 0 && (
                <ul className="mt-1 max-h-32 overflow-y-auto text-[0.84rem] text-ink-soft">
                  {files.map(file => (
                    <li key={file.id} className="truncate" title={file.name}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'dropzone' })} disabled={busy} aria-label="Cambiar archivos" className={changeLink}>
              Cambiar
            </button>
          </section>

          <section aria-label="Duración" className="flex items-center gap-3.5 pt-4">
            <span className="w-10 h-10 rounded-xl bg-surface-raised text-ink-soft grid place-items-center flex-shrink-0">
              <Clock size={18} />
            </span>
            <div className="flex-1">
              <small className="block text-xs text-ink-muted">Duración</small>
              <b className="text-[0.94rem] font-medium text-ink tabular-nums">{formatMinutes(minutes)}</b>
            </div>
            <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'timer-select' })} disabled={busy} aria-label="Cambiar duración" className={changeLink}>
              Cambiar
            </button>
          </section>
        </div>

        {/* Aviso con candado */}
        <div className="flex gap-3 items-start px-4 py-3.5 rounded-[14px] bg-accent/15 text-ink text-[0.84rem]">
          <Lock size={18} className="text-accent-soft mt-px flex-shrink-0" />
          <span>
            <b className="font-medium">No vas a poder salir hasta que termine el tiempo</b>, salvo apagando o reiniciando la computadora.
            {api ? ' La sesión empieza apenas confirmes.' : ' La sesión empieza apenas abras el archivo.'}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-danger text-sm text-center">
            {error}
          </p>
        )}

        <button
          onClick={() => void (api ? handleStart() : handleDownload())}
          disabled={busy}
          className="h-12 rounded-[14px] text-[0.94rem] font-medium bg-accent hover:bg-accent-strong text-on-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
    </div>
  );
}
