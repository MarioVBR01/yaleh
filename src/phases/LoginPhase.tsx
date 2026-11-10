/**
 * @file LoginPhase.tsx
 * @description Ingreso a la web con Google (brief, sección 5.1). El registro es el primer ingreso.
 * Solo existe en la web: el escritorio no tiene login propio (brief, sección 4.2).
 * "Registrarse con Google": si la cuenta ya existe, entra; si no, la crea (ensureUserProfile, en App.tsx).
 * Al iniciar sesión, App.tsx sincroniza el usuario y pasa a "Mis sesiones".
 * Mientras Firebase comprueba si hay una cuenta guardada, se muestra "Comprobando tu cuenta…"
 * en lugar del botón (BUG-002): así el login no aparece un momento y salta a la pantalla siguiente.
 * Se llega desde la landing ("Iniciar sesión") y tiene "Volver al inicio" (revisión 1.10).
 *
 * Diseño: dos columnas. A la izquierda el panel de marca (55 %, siempre oscuro: es la marca, no sigue el
 * tema) con el logo, los destellos del logo y la franja diagonal naranja que corta las dos columnas; a la
 * derecha, sobre manchas desenfocadas, la tarjeta de vidrio con el formulario. En pantallas angostas, el
 * panel queda como una franja arriba y la tarjeta debajo.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Info, Loader2 } from 'lucide-react';
import { APP_VERSION, YALEH_WEB_ORIGINS } from '@shared/config';
import Logo from '../components/Logo';
import WebThemeToggle from '../components/WebThemeToggle';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured } from '../firebase/app';
import { describeAuthError, isUnauthorizedDomain, signInWithGoogle } from '../firebase/auth';

/** Web oficial, donde el login siempre está autorizado. */
const OFFICIAL_WEB = YALEH_WEB_ORIGINS[0];

/** Fondo del panel de marca: el negro cálido del diseño, también en modo claro. */
const BRAND_BG = '#100f0e';

/** Destellos de 4 puntas como los del logo: dónde, de qué tamaño y con qué ritmo titilan. */
const SPARKLES = [
  { top: '12%', left: '14%', size: 13, color: '#f7941d', seconds: 4.2, delay: 0 },
  { top: '22%', left: '72%', size: 9, color: '#ffffff', seconds: 3.4, delay: 0.8 },
  { top: '34%', left: '26%', size: 7, color: '#ffffff', seconds: 4.8, delay: 1.6 },
  { top: '9%', left: '46%', size: 8, color: '#f7941d', seconds: 3.8, delay: 2.4 },
  { top: '46%', left: '8%', size: 10, color: '#f7941d', seconds: 4.4, delay: 1.1 },
  { top: '58%', left: '78%', size: 12, color: '#f7941d', seconds: 3.6, delay: 0.4 },
  { top: '70%', left: '18%', size: 8, color: '#ffffff', seconds: 4.6, delay: 2 },
  { top: '82%', left: '58%', size: 11, color: '#f7941d', seconds: 4, delay: 1.4 },
  { top: '88%', left: '30%', size: 6, color: '#ffffff', seconds: 3.2, delay: 2.8 },
  { top: '64%', left: '42%', size: 7, color: '#ffffff', seconds: 4.9, delay: 0.6 },
  { top: '30%', left: '88%', size: 8, color: '#ffffff', seconds: 3.9, delay: 3.2 },
  { top: '76%', left: '88%', size: 9, color: '#f7941d', seconds: 4.3, delay: 2.2 },
];

/** Destello de 4 puntas (el mismo dibujo que los del logo). */
function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
      <path d="M12 0c.8 6.6 4.6 10.4 12 12-7.4 1.6-11.2 5.4-12 12-.8-6.6-4.6-10.4-12-12 7.4-1.6 11.2-5.4 12-12z" />
    </svg>
  );
}

/**
 * Composición de marca del panel izquierdo. Para usar una ilustración propia más adelante, basta con
 * poner el archivo en `src/assets/login/` y reemplazar este componente por su `<img>`: el panel, la
 * franja diagonal y el resto de la pantalla no cambian.
 */
function BrandArtwork() {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-6">
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        <Logo size={180} className="w-24 h-24 lg:w-[180px] lg:h-[180px]" />
      </motion.div>
      <p className="mt-2 lg:mt-6 font-display text-[22px] lg:text-[44px] font-extrabold tracking-[0.04em] text-white">
        YALEH<span className="text-accent">.</span>
      </p>
      <p className="hidden lg:block mt-3 text-[17px] font-light text-white/75">Tu entorno de estudio sin distracciones.</p>
    </div>
  );
}

/** Panel de marca: fondo oscuro, resplandor, destellos y la franja diagonal del borde. */
function BrandPanel() {
  return (
    <motion.div
      data-testid="login-brand"
      className="relative flex-shrink-0 w-full h-[200px] lg:h-auto lg:w-[55%] overflow-hidden flex items-center justify-center"
      style={{ background: BRAND_BG }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Resplandor naranja detrás del logo. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[760px] h-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(247,148,29,0.20) 0%, transparent 62%)' }}
      />

      {SPARKLES.map(sparkle => (
        <span
          key={`${sparkle.top}${sparkle.left}`}
          aria-hidden="true"
          data-testid="login-sparkle"
          className="pointer-events-none absolute opacity-60 motion-safe:animate-[twinkle_4s_ease-in-out_infinite]"
          style={{ top: sparkle.top, left: sparkle.left, animationDuration: `${sparkle.seconds}s`, animationDelay: `${sparkle.delay}s` }}
        >
          <Sparkle size={sparkle.size} color={sparkle.color} />
        </span>
      ))}

      {/* Franja diagonal naranja: el corte entre las dos columnas (abajo en pantallas angostas). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3 lg:hidden"
        style={{ background: 'var(--color-accent)', clipPath: 'polygon(0 60%, 100% 0, 100% 100%, 0 100%)' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none hidden lg:block absolute inset-y-0 right-0 w-[150px]"
        style={{ background: 'var(--color-accent)', clipPath: 'polygon(76% 0, 100% 0, 30% 100%, 6% 100%)' }}
      />

      <BrandArtwork />
    </motion.div>
  );
}

export default function LoginPhase() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongDomain, setWrongDomain] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setWrongDomain(false);
    try {
      await signInWithGoogle();
      // App.tsx recibe el usuario (onAuthStateChanged) y cambia de pantalla.
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setError(describeAuthError(err));
      setWrongDomain(isUnauthorizedDomain(err));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col lg:flex-row bg-canvas overflow-hidden">
      <BrandPanel />

      {/* Volver a la landing, el inicio de la web (brief, revisión 1.10). Va sobre el panel oscuro. */}
      <button
        onClick={() => dispatch({ type: 'SET_PHASE', payload: 'landing' })}
        aria-label="Volver al inicio"
        className="absolute z-30 top-6 left-6 inline-flex items-center gap-2 h-10 px-3 rounded-xl text-sm text-white/75 hover:text-white hover:bg-white/10"
      >
        {/* En el celular, solo la flecha: el logo de la franja ocupa el centro. */}
        <ArrowLeft size={16} /> <span className="hidden sm:inline">Volver al inicio</span>
      </button>

      <div className="absolute z-30 top-6 right-6">
        <WebThemeToggle />
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Manchas desenfocadas: lo que se ve a través del vidrio. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-10 w-[460px] h-[460px] login-blob rounded-full blur-[100px] motion-safe:animate-[blob-drift_26s_ease-in-out_infinite]"
          style={{ background: 'var(--color-accent)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-12%] -left-16 w-[420px] h-[420px] login-blob rounded-full blur-[110px] motion-safe:animate-[blob-drift_32s_ease-in-out_infinite_reverse]"
          style={{ background: '#ffab45' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 left-[12%] w-[360px] h-[360px] login-blob rounded-full blur-[120px] motion-safe:animate-[blob-drift_24s_ease-in-out_infinite]"
          style={{ background: 'var(--color-accent-strong)', animationDelay: '6s' }}
        />

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 lg:py-16">
          <motion.div
            data-testid="login-card"
            className="glass-card w-full max-w-[440px] rounded-[28px] p-6 sm:p-10 flex flex-col gap-4 text-center"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          >
            <div>
              <h1 className="font-display text-[2.25rem] sm:text-[2.5rem] leading-none font-extrabold tracking-tight text-ink">Iniciar sesión</h1>
              <p className="mt-3 text-[15px] text-ink-soft">Prepara tu sesión aquí y estudia en la app de escritorio.</p>
            </div>

            {!state.authChecked ? (
              <p className="flex items-center justify-center gap-2 h-14 text-sm text-ink-muted" role="status">
                <Loader2 size={16} className="animate-spin" /> Comprobando tu cuenta…
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
                Registrarse con Google
              </button>
            )}

            <div className="flex flex-col gap-2">
              <small className="text-[13px] text-ink-muted">Si ya te registraste, entras directo a Mis sesiones.</small>
              {/* El ícono va en el texto: si la línea se parte, no queda solo a un costado. */}
              <p className="text-xs text-ink-muted">
                <Info size={13} aria-hidden="true" className="inline align-[-2px] mr-1.5" />
                Versión 1: el registro se hace con tu cuenta de Google.
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            {/* BUG-004: abierta desde otra dirección (IP de la red, vista previa…), se ofrece la web oficial. */}
            {wrongDomain && (
              <a
                href={OFFICIAL_WEB}
                className="mx-auto inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-on-accent text-sm font-medium hover:opacity-90"
              >
                Abrir la web oficial ({new URL(OFFICIAL_WEB).host}) <ExternalLink size={15} />
              </a>
            )}
            {!isFirebaseConfigured && <p className="text-xs text-warning">Falta la configuración de Firebase (.env).</p>}
          </motion.div>
        </div>

        <p className="relative z-10 pb-6 px-4 text-center text-xs text-ink-muted">YALEH v{APP_VERSION} · TECBA 2026 · Proyecto de grado</p>
      </div>
    </div>
  );
}
