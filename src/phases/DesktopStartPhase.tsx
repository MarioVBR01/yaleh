/**
 * @file DesktopStartPhase.tsx
 * @description Pantalla de inicio de la app de escritorio (brief, sección 4.2).
 * El escritorio no tiene login propio:
 * - Sin conexión: "No estás conectado. ¿Quieres iniciar sesión offline?"
 * - Con conexión: "Inicia tu sesión desde la web" (el flujo desde la web llega en la fase 4),
 *   con la opción de usar el modo offline.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, RefreshCw, WifiOff } from 'lucide-react';
import { YALEH_WEB_ORIGINS } from '@shared/config';
import type { SessionMode } from '@shared/ipc-types';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';

export default function DesktopStartPhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const [retrying, setRetrying] = useState(false);
  const [isPackaged, setIsPackaged] = useState(true);

  useEffect(() => {
    void api?.getAppInfo().then(info => setIsPackaged(info.isPackaged));
  }, [api]);

  /** Entra al flujo local: dropzone → tiempo → confirmación → kiosko. */
  const startFlow = (mode: SessionMode) => {
    dispatch({ type: 'SET_SESSION_MODE', payload: mode });
    dispatch({
      type: 'SET_SESSION',
      payload: { isAuthenticated: false, isAnonymous: true, displayName: 'Estudiante', initials: 'ES' },
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  const handleRetry = async () => {
    if (!api) return;
    setRetrying(true);
    try {
      const mode = await api.recheckConnection();
      dispatch({ type: 'SET_CONNECTION', payload: mode });
    } finally {
      setRetrying(false);
    }
  };

  const handleOpenWeb = () => {
    void api?.openExternal(`${YALEH_WEB_ORIGINS[0]}/`);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-ink mb-1">YALEH</h1>
        <p className="text-ink-subtle text-xs mb-8">Entorno de estudio · TECBA 2026</p>

        {state.connection === 'unknown' && (
          <p className="text-ink-muted text-sm" role="status">
            Comprobando conexión…
          </p>
        )}

        {state.connection === 'offline' && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised mb-4">
              <WifiOff size={26} className="text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-6">
              No estás conectado. ¿Quieres iniciar sesión offline?
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => startFlow('offline')}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors"
              >
                Iniciar sesión offline
              </button>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Comprobando…' : 'Reintentar conexión'}
              </button>
            </div>
          </>
        )}

        {state.connection === 'online' && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised mb-4">
              <Globe size={26} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">Inicia tu sesión desde la web</h2>
            <p className="text-ink-muted text-sm mb-6">
              Inicia sesión en la web de YALEH, carga tus materiales y desde ahí abre la sesión de concentración.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleOpenWeb}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-accent-strong hover:bg-accent text-ink transition-colors"
              >
                Abrir la web de YALEH
              </button>
              <button
                onClick={() => startFlow('offline')}
                className="w-full py-3 rounded-xl text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Usar modo offline
              </button>
              {!isPackaged && (
                // TODO(fase 4): se reemplaza por el flujo real desde la web (yaleh://sesion).
                <button
                  onClick={() => startFlow('online')}
                  className="w-full py-2 rounded-xl text-xs text-ink-subtle hover:text-ink border border-dashed border-line transition-colors"
                >
                  Probar sesión online (solo desarrollo)
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
