/**
 * @file AccountMenu.tsx
 * @description Landing con la cuenta abierta: el ícono del usuario y su primer nombre (en el celular, solo el
 * ícono) abren un menú con su nombre completo, su correo, "Mis sesiones" y "Cerrar sesión".
 */

import { useEffect, useRef, useState } from 'react';
import { FolderOpen, LogOut } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { useApp } from '../context/AppContext';
import { signOut } from '../firebase/auth';

export default function AccountMenu() {
  const { state, dispatch } = useApp();
  const { displayName, email, avatar, initials } = state.session;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /** Flechas arriba y abajo entre las opciones. */
  const moveFocus = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const closeAccount = async () => {
    setError(null);
    try {
      // Al recibir que ya no hay usuario, la landing vuelve a mostrar "Iniciar sesión".
      await signOut();
    } catch (err) {
      console.error('No se pudo cerrar la sesión:', err);
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    }
  };

  const item = 'w-full flex items-center gap-2.5 px-3.5 h-10 text-left text-sm text-ink hover:bg-surface-raised focus:bg-surface-raised focus:outline-none';

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${displayName ?? 'usuario'}`}
        data-testid="account-menu-button"
        className="inline-flex items-center gap-2 h-11 pl-1 pr-1 sm:pr-3 rounded-full text-sm font-medium text-ink hover:bg-surface-raised transition-colors"
      >
        <UserAvatar avatar={avatar} initials={initials} />
        <span className="hidden sm:inline max-w-[120px] truncate">{displayName?.split(' ')[0]}</span>
      </button>

      {open && (
        <div ref={menuRef} role="menu" aria-label="Tu cuenta" onKeyDown={moveFocus} className="absolute z-50 right-0 top-full mt-2 w-64 py-1.5 rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <div className="px-3.5 py-2 border-b border-line mb-1.5">
            <p className="text-sm font-medium text-ink truncate">{displayName}</p>
            {email && <p className="text-xs text-ink-muted truncate">{email}</p>}
          </div>
          <button role="menuitem" onClick={() => dispatch({ type: 'SET_PHASE', payload: 'sessions-home' })} className={item}>
            <FolderOpen size={15} /> Mis sesiones
          </button>
          <button role="menuitem" onClick={() => void closeAccount()} className={item}>
            <LogOut size={15} /> Cerrar sesión
          </button>
          {error && (
            <p role="alert" className="px-3.5 pt-1.5 text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
