/**
 * @file WebAccountBar.tsx
 * @description Web: barra superior fija (ORION #38, docs/diseno/maquetas/web.html) con el logo, la barra
 * de pasos (Material, Duración, Confirmar, Descargar: ✓ los hechos, naranja el actual) y la cuenta de
 * Google con la que se entró, con "Cambiar" (otra cuenta) y "Cerrar sesión" (BUG-002). En una
 * computadora compartida hay que poder ver qué cuenta está activa y salir de ella.
 * Al cambiar de cuenta o cerrar sesión, App.tsx descarta los archivos y el borrador anteriores.
 * En "Mis sesiones" no hay pasos y hay un enlace a la landing; el logo siempre lleva a "Mis sesiones".
 */

import { Fragment, useState } from 'react';
import { ArrowLeft, Home, LogOut, RefreshCw } from 'lucide-react';
import Logo from '../components/Logo';
import UserAvatar from '../components/UserAvatar';
import WebThemeToggle from '../components/WebThemeToggle';
import { useApp } from '../context/AppContext';
import { describeAuthError, signInWithGoogle, signOut } from '../firebase/auth';
import { useGoToMySessions } from '../lib/useGoToMySessions';

export const WEB_STEPS = ['Material', 'Duración', 'Confirmar', 'Descargar'] as const;

export default function WebAccountBar({ step = 0, home = false }: { step?: number; home?: boolean }) {
  const { state, dispatch } = useApp();
  const goToMySessions = useGoToMySessions();
  const { displayName, email, avatar, initials } = state.session;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error('Error con la cuenta de Google:', err);
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const ghost = 'flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[13px] text-ink-soft hover:text-ink hover:bg-surface-raised disabled:opacity-50';

  return (
    <header className="relative flex-shrink-0 bg-surface border-b border-line" aria-label="Cuenta de Google">
      <div className="h-[72px] flex items-center gap-3 lg:gap-4 px-4 lg:px-8">
        <button onClick={goToMySessions} aria-label="Ir a Mis sesiones" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo size={38} />
          <b className={`font-display text-[19px] font-extrabold tracking-[0.04em] text-ink hidden ${home ? 'sm:block' : 'xl:block'}`}>YALEH</b>
        </button>

        {home && (
          <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'landing' })} className={`${ghost} flex-shrink-0`} aria-label="Ir al inicio" title="Ir al inicio">
            <Home size={14} /> <span className="hidden sm:inline">Inicio</span>
          </button>
        )}

        {!home && (
          <button onClick={goToMySessions} className={`${ghost} flex-shrink-0 whitespace-nowrap`} aria-label="Volver a Mis sesiones">
            <ArrowLeft size={14} /> <span className="hidden sm:inline">Mis sesiones</span>
          </button>
        )}

        {!home && (
        <ol className="flex-1 hidden lg:flex justify-center items-center gap-2" aria-label="Pasos">
          {WEB_STEPS.map((label, i) => {
            const done = i < step;
            const now = i === step;
            return (
              <Fragment key={label}>
                {i > 0 && <span aria-hidden="true" className="w-4 xl:w-9 h-[1.5px] bg-line" />}
                <li
                  aria-current={now ? 'step' : undefined}
                  data-state={done ? 'done' : now ? 'now' : 'todo'}
                  className={`flex items-center gap-2 text-[13px] ${now ? 'text-ink font-medium' : 'text-ink-muted'}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full grid place-items-center text-xs font-semibold border-[1.5px] ${
                      done ? 'bg-ink border-ink text-canvas' : now ? 'bg-accent border-accent text-on-accent' : 'border-line'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {label}
                </li>
              </Fragment>
            );
          })}
        </ol>
        )}

        <div className={`ml-auto ${home ? '' : 'lg:ml-0'} flex items-center gap-2.5 p-1.5 rounded-[14px] border border-line min-w-0`}>
          <UserAvatar avatar={avatar} initials={initials} />
          <div className={`min-w-0 leading-tight pr-1 hidden ${home ? 'md:block' : 'xl:block'}`}>
            <p className="text-[13px] text-ink truncate">{displayName}</p>
            {email && <p className="text-[11.5px] text-ink-muted truncate">{email}</p>}
          </div>
          {/* El popup se abre directo con el clic (sin cerrar sesión antes) para que el navegador no lo bloquee. */}
          <button onClick={() => void run(signInWithGoogle)} disabled={busy} className={ghost} title="Elegir otra cuenta de Google">
            <RefreshCw size={14} /> Cambiar
          </button>
          <button onClick={() => void run(signOut)} disabled={busy} className={`${ghost} whitespace-nowrap`} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut size={14} /> <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
        <WebThemeToggle />
      </div>
      {error && (
        <p role="alert" className="absolute right-4 top-full mt-1 text-[11px] text-danger text-right">
          {error}
        </p>
      )}
    </header>
  );
}
