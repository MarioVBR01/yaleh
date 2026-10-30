/**
 * BUG-004: si la web se abre desde una dirección no autorizada en Firebase, el login lo dice y ofrece la web oficial.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState } from '../store/appStore';
import LoginPhase from './LoginPhase';

const signIn = vi.hoisted(() => vi.fn());

vi.mock('../firebase/app', () => ({ isFirebaseConfigured: true }));
vi.mock('../firebase/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('../firebase/auth')>()),
  signInWithGoogle: signIn,
}));

function renderLogin() {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'login', authChecked: true }}>
      <LoginPhase />
    </AppProvider>
  );
}

describe('Login desde una dirección no autorizada (BUG-004)', () => {
  it('muestra la dirección y un enlace a la web oficial', async () => {
    signIn.mockRejectedValueOnce({ code: 'auth/unauthorized-domain' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLogin();
    fireEvent.click(screen.getByText('Continuar con Google'));

    expect((await screen.findByRole('alert')).textContent).toContain(`(${window.location.host})`);
    const link = screen.getByRole('link', { name: /Abrir la web oficial \(yaleh-fbe1c\.web\.app\)/ });
    expect(link.getAttribute('href')).toBe('https://yaleh-fbe1c.web.app');
  });

  it('con otros errores no ofrece la web oficial', async () => {
    signIn.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLogin();
    fireEvent.click(screen.getByText('Continuar con Google'));

    await screen.findByRole('alert');
    expect(screen.queryByRole('link', { name: /Abrir la web oficial/ })).toBeNull();
  });
});
