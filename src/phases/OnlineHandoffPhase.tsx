/**
 * @file OnlineHandoffPhase.tsx
 * @description Escritorio: recibe una sesión desde la web por yaleh://sesion
 * (brief, secciones 4.1 y 4.5, opción A).
 * 1. Si no hay sesión de Google en el escritorio, la pide por el navegador del
 *    sistema (auth-desktop.html + state) y usa signInWithCredential.
 * 2. Pide al proceso principal que bloquee el equipo (el tiempo aún no corre).
 * 3. Lee la sesión y sus fuentes de Firestore y pasa a la confirmación.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { describeAuthError, signInWithGoogleIdToken, watchUser } from '../firebase/auth';
import { getRemoteSession } from '../firebase/sessions';
import { loadRemoteSources } from '../data/sources';
import { getElectronAPI } from '../lib/electron';
import { startPhase } from '../lib/mode';

type Step = 'checking' | 'auth-needed' | 'waiting-browser' | 'loading' | 'error';

export default function OnlineHandoffPhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const sessionId = state.linkedSessionId;
  const [step, setStep] = useState<Step>('checking');
  const [error, setError] = useState<string | null>(null);
  const preparing = useRef(false);

  const fail = (message: string) => {
    setError(message);
    setStep('error');
  };

  /** Bloquea el equipo, lee la sesión y pasa a la confirmación. */
  const prepare = useCallback(
    async (user: User) => {
      if (!api || !sessionId || preparing.current) return;
      preparing.current = true;
      setStep('loading');
      try {
        const remote = await getRemoteSession(user.uid, sessionId);
        if (!remote || !remote.durationSeconds) {
          preparing.current = false;
          fail('No se encontró esta sesión en tu cuenta. ¿Iniciaste sesión con otra cuenta de Google?');
          return;
        }
        await api.prepareOnlineSession(sessionId);
        dispatch({ type: 'SET_ONLINE_SESSION_HELD', payload: true });
        const files = await loadRemoteSources(user.uid, sessionId);
        dispatch({ type: 'SET_SESSION_MODE', payload: 'online' });
        dispatch({ type: 'SET_WORKSPACE', payload: sessionId });
        dispatch({ type: 'SET_FILES', payload: files });
        dispatch({ type: 'SET_SESSION_DURATION', payload: remote.durationSeconds });
        dispatch({ type: 'SET_PHASE', payload: 'confirm-session' });
      } catch (err) {
        console.error('No se pudo preparar la sesión online:', err);
        preparing.current = false;
        fail('No se pudo cargar la sesión. Revisa tu conexión e inténtalo de nuevo.');
      }
    },
    [api, sessionId, dispatch]
  );

  // ¿Ya hay sesión de Google en el escritorio? (Firebase la recuerda entre usos.)
  useEffect(() => {
    return watchUser(user => {
      if (user) void prepare(user);
      else setStep(current => (current === 'checking' ? 'auth-needed' : current));
    });
  }, [prepare]);

  // Token de Google que llega por yaleh://auth (el proceso principal ya validó el state).
  useEffect(() => {
    if (!api) return;
    return api.onAuthToken(async token => {
      setStep('loading');
      try {
        await signInWithGoogleIdToken(token);
        // watchUser recibe el usuario y continúa con prepare().
      } catch (err) {
        console.error(err);
        fail(describeAuthError(err));
      }
    });
  }, [api]);

  const handleSignIn = async () => {
    setError(null);
    setStep('waiting-browser');
    await api?.beginDesktopAuth();
  };

  const handleCancel = async () => {
    await api?.cancelOnlineSession();
    dispatch({ type: 'SET_ONLINE_SESSION_HELD', payload: false });
    dispatch({ type: 'SET_LINKED_SESSION', payload: null });
    dispatch({ type: 'SET_PHASE', payload: startPhase(true) });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised mb-4">
          <Globe size={26} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">Sesión recibida desde la web</h1>

        {(step === 'checking' || step === 'loading') && (
          <p className="text-ink-muted text-sm flex items-center justify-center gap-2" role="status">
            <Loader2 size={16} className="animate-spin" />
            {step === 'checking' ? 'Comprobando tu cuenta…' : 'Preparando tu sesión…'}
          </p>
        )}

        {step === 'auth-needed' && (
          <>
            <p className="text-ink-muted text-sm mb-6">
              Inicia sesión con la misma cuenta de Google que usaste en la web. Se abrirá tu navegador.
            </p>
            <button
              onClick={handleSignIn}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors"
            >
              Iniciar sesión con Google
            </button>
          </>
        )}

        {step === 'waiting-browser' && (
          <>
            <p className="text-ink-muted text-sm mb-6" role="status">
              Completa el inicio de sesión en tu navegador. YALEH continuará sola cuando termines.
            </p>
            <button onClick={handleSignIn} className="text-accent-soft hover:text-ink text-xs">
              Abrir el navegador otra vez
            </button>
          </>
        )}

        {step === 'error' && error && (
          <p role="alert" className="text-danger text-sm mb-4">
            {error}
          </p>
        )}

        {step !== 'loading' && (
          <button onClick={handleCancel} className="mt-6 w-full py-2 text-sm text-ink-muted hover:text-ink transition-colors">
            Cancelar
          </button>
        )}
      </motion.div>
    </div>
  );
}
