/**
 * @file DesktopStartPhase.tsx
 * @description Bienvenida de la app de escritorio (brief, revisión 1.5), con o sin conexión.
 * El escritorio no inicia sesión con Google:
 * - "Iniciar": flujo local (dropzone → tiempo → confirmación → kiosko).
 * - "Abrir archivo de sesión (.yaleh)": el proceso principal lo valida y, si es
 *   válido, bloquea el equipo y empieza el tiempo de inmediato. También se puede
 *   arrastrar el archivo a esta ventana.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Loader2, Play, Wifi, WifiOff } from 'lucide-react';
import { SESSION_FILE_EXTENSION } from '@shared/session-file';
import { useApp } from '../context/AppContext';
import { newId } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';
import { applyOpenedSessionFile } from '../lib/session-file';

export default function DesktopStartPhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const [opening, setOpening] = useState(false);
  const [dragging, setDragging] = useState(false);

  /** Flujo local: espacio de trabajo nuevo en SQLite (su id será el de la sesión). */
  const handleStart = () => {
    dispatch({ type: 'SET_NOTICE', payload: null });
    dispatch({ type: 'SET_WORKSPACE', payload: newId() });
    dispatch({ type: 'SET_FILES', payload: [] });
    dispatch({
      type: 'SET_SESSION',
      payload: { isAuthenticated: false, isAnonymous: true, displayName: 'Estudiante', initials: 'ES' },
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  const handleOpenFile = async () => {
    if (!api) return;
    setOpening(true);
    dispatch({ type: 'SET_NOTICE', payload: null });
    try {
      applyOpenedSessionFile(dispatch, await api.openSessionFileDialog());
    } finally {
      setOpening(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = [...e.dataTransfer.files].find(f => f.name.toLowerCase().endsWith(SESSION_FILE_EXTENSION));
    if (!api) return;
    if (!file) {
      dispatch({ type: 'SET_NOTICE', payload: 'Arrastra un archivo de sesión con extensión .yaleh.' });
      return;
    }
    setOpening(true);
    dispatch({ type: 'SET_NOTICE', payload: null });
    try {
      applyOpenedSessionFile(dispatch, await api.openSessionFileContent(await file.text()));
    } finally {
      setOpening(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-canvas flex items-center justify-center p-4"
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => void handleDrop(e)}
    >
      <motion.div
        className={`w-full max-w-md bg-surface border rounded-2xl p-8 text-center ${
          dragging ? 'border-accent' : 'border-line'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-ink mb-1">Bienvenido a YALEH</h1>
        <p className="text-ink-muted text-sm mb-6">Tu entorno de estudio sin distracciones.</p>

        <p className="flex items-center justify-center gap-2 text-xs text-ink-subtle mb-6" role="status">
          {state.connection === 'online' ? (
            <>
              <Wifi size={14} className="text-success" /> Con conexión: tendrás el asistente de IA y las herramientas.
            </>
          ) : state.connection === 'offline' ? (
            <>
              <WifiOff size={14} className="text-warning" /> Sin conexión: tendrás los módulos locales.
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" /> Comprobando conexión…
            </>
          )}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            disabled={opening}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Play size={16} /> Iniciar
          </button>
          <button
            onClick={() => void handleOpenFile()}
            disabled={opening}
            className="w-full py-3 rounded-xl text-sm border border-line text-ink-soft hover:text-ink hover:border-line-strong transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {opening ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
            Abrir archivo de sesión (.yaleh)
          </button>
        </div>
        <p className="text-ink-subtle text-[11px] mt-3">
          También puedes arrastrar el archivo .yaleh a esta ventana. Al abrirlo, la sesión empieza de inmediato.
        </p>

        {state.notice && (
          <p role="alert" className="mt-4 p-3 rounded-xl border border-danger/40 bg-danger/10 text-sm text-ink-soft">
            {state.notice}
          </p>
        )}
      </motion.div>
    </div>
  );
}
