/**
 * @file ResumeSessionPhase.tsx
 * @description Se muestra al abrir la app de escritorio si la sesión anterior
 * quedó interrumpida (apagado, reinicio o cierre forzado) y todavía le queda
 * tiempo. La sesión ya quedó registrada como interrumpida en el proceso principal.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import { startPhase } from '../lib/mode';
import { formatMinutes } from '../utils/format';

export default function ResumeSessionPhase() {
  const { dispatch } = useApp();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = getElectronAPI();

  useEffect(() => {
    if (!api) return;
    void api.getSessionState().then(snapshot => {
      if (snapshot.status === 'resumable') {
        setRemainingSeconds(snapshot.remainingSeconds);
      } else {
        dispatch({ type: 'SET_PHASE', payload: startPhase(true) });
      }
    });
  }, [api, dispatch]);

  const handleResume = async () => {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await api.resumeSession();
      dispatch({
        type: 'RESUME_SESSION',
        payload: {
          durationSeconds: snapshot.durationSeconds,
          remainingSeconds: snapshot.remainingSeconds,
          mode: snapshot.mode,
        },
      });
    } catch (err) {
      console.error('No se pudo retomar la sesión:', err);
      setError('El tiempo de la sesión ya terminó. Puedes iniciar una nueva.');
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!api) return;
    setBusy(true);
    await api.discardResume();
    dispatch({ type: 'SET_PHASE', payload: startPhase(true) });
  };

  const remainingMinutes = remainingSeconds === null ? null : Math.max(1, Math.ceil(remainingSeconds / 60));

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised mb-4">
          <RotateCcw size={26} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">Tu sesión anterior se interrumpió</h1>
        <p className="text-ink-muted text-sm mb-6">
          {remainingMinutes === null
            ? 'Revisando la sesión…'
            : `Le quedan aproximadamente ${formatMinutes(remainingMinutes)}. ¿Quieres retomarla?`}
        </p>

        {error && (
          <p role="alert" className="text-danger text-sm mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleResume}
            disabled={busy || remainingSeconds === null || error !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors disabled:opacity-60"
          >
            Retomar sesión
          </button>
          <button
            onClick={handleDiscard}
            disabled={busy && error === null}
            className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink transition-colors"
          >
            {error ? 'Continuar' : 'No retomar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
