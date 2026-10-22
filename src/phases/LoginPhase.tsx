/**
 * @file LoginPhase.tsx
 * @description Inicio de sesión de la web con Google (brief, sección 5.1).
 * Solo existe en la web: el escritorio no tiene login propio (brief, sección 4.2).
 * Al iniciar sesión, App.tsx sincroniza el usuario y pasa a la dropzone.
 * Mientras Firebase comprueba si hay una sesión guardada, se muestra "Comprobando tu sesión…"
 * en lugar del botón (BUG-002): así el login no aparece un momento y salta a la dropzone.
 * Se llega desde la landing ("Preparar mi sesión") y tiene "Volver al inicio" (revisión 1.10).
 * Diseño (ORION #37, docs/diseno/maquetas/web.html, pantalla 1): logo, "YALEH.", frase y el botón
 * blanco de Google sobre el fondo, sin recuadro ni degradé.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { APP_VERSION } from '@shared/config';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured } from '../firebase/app';
import { describeAuthError, signInWithGoogle } from '../firebase/auth';

export default function LoginPhase() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // App.tsx recibe el usuario (onAuthStateChanged) y cambia de pantalla.
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setError(describeAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-full bg-canvas overflow-hidden flex flex-col">
      {/* Volver a la landing, el inicio de la web (brief, revisión 1.10). */}
      <button
        onClick={() => dispatch({ type: 'SET_PHASE', payload: 'landing' })}
        className="absolute z-10 top-6 left-6 inline-flex items-center gap-2 h-10 px-3 rounded-xl text-sm text-ink-soft hover:text-ink hover:bg-surface-raised"
      >
        <ArrowLeft size={16} /> Volver al inicio
      </button>
      {/* Misma composición que la bienvenida del escritorio (ORION #37): resplandor suave, sin recuadro. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-accent) 15%, transparent) 0%, transparent 60%)' }}
      />
      <motion.div
        className="relative flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Logo size={128} />
        <div className="text-center">
          <h1 className="font-display text-5xl sm:text-[56px] leading-none font-extrabold tracking-[0.02em] text-ink">
            YALEH<span className="text-accent">.</span>
          </h1>
          <p className="mt-2.5 text-[17px] font-light text-ink-soft">Prepará tu sesión acá y estudiá en la app de escritorio.</p>
        </div>

        <div className="w-full max-w-[440px] flex flex-col gap-3.5 text-center">
          {!state.authChecked ? (
            <p className="flex items-center justify-center gap-2 h-14 text-sm text-ink-muted" role="status">
              <Loader2 size={16} className="animate-spin" /> Comprobando tu sesión…
            </p>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading || !isFirebaseConfigured}
              className="h-14 rounded-2xl border border-[#DADCE0] bg-white hover:bg-[#F8F9FA] text-[#1F1F1F] font-medium text-base flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={22} className="animate-spin text-[#4285F4]" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continuar con Google
            </button>
          )}
          <small className="text-[13px] text-ink-muted">Usá tu cuenta institucional de TECBA.</small>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {!isFirebaseConfigured && <p className="text-xs text-warning">Falta la configuración de Firebase (.env).</p>}
        </div>
      </motion.div>

      <p className="absolute left-0 right-0 bottom-6 text-center text-xs text-ink-muted">YALEH v{APP_VERSION} · TECBA 2026 · Proyecto de grado</p>
    </div>
  );
}
