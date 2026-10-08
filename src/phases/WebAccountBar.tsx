/**
 * @file WebAccountBar.tsx
 * @description Web: cuenta de Google con la que se entró, con "Cambiar de cuenta" y
 * "Cerrar sesión" (BUG-002). Firebase guarda la sesión en el navegador; en una computadora
 * compartida hay que poder ver qué cuenta está activa y salir de ella.
 * Al cambiar de cuenta o cerrar sesión, App.tsx descarta los archivos y el borrador anteriores.
 */

import { useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeAuthError, signInWithGoogle, signOut } from '../firebase/auth';

export default function WebAccountBar() {
  const { state } = useApp();
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

  const button =
    'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-ink-muted hover:text-ink hover:bg-surface-raised disabled:opacity-50';

  return (
    <div className="fixed top-3 right-3 z-50 max-w-[calc(100%-1.5rem)]" aria-label="Cuenta de Google">
      <div className="flex items-center gap-2 bg-surface/90 backdrop-blur border border-line rounded-xl pl-2 pr-1 py-1 shadow-lg">
        {avatar ? (
          <img src={avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-accent-strong text-ink text-[11px] font-semibold flex items-center justify-center">
            {initials ?? '?'}
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <p className="text-xs text-ink truncate">{displayName}</p>
          {email && <p className="text-[10px] text-ink-subtle truncate">{email}</p>}
        </div>
        {/* El popup se abre directo con el clic (sin cerrar sesión antes) para que el navegador no lo bloquee. */}
        <button onClick={() => void run(signInWithGoogle)} disabled={busy} className={button} title="Elegir otra cuenta de Google">
          <RefreshCw size={12} /> Cambiar de cuenta
        </button>
        <button onClick={() => void run(signOut)} disabled={busy} className={button} title="Cerrar sesión">
          <LogOut size={12} /> Cerrar sesión
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-danger text-right">
          {error}
        </p>
      )}
    </div>
  );
}
