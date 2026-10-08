/**
 * BUG-002: la web con una sesión de Google guardada en el navegador.
 * - Mientras Firebase comprueba la sesión, no se muestra el botón del login.
 * - Con sesión guardada se ve qué cuenta está activa y se puede cerrar sesión o cambiar de cuenta.
 * - Al cambiar de cuenta se descartan los archivos de la cuenta anterior.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

let emit: ((user: User | null) => void) | null = null;
const signOut = vi.fn(async () => emit?.(null));
const signInWithGoogle = vi.fn(async () => {});

vi.mock('../firebase/auth', () => ({
  watchUser: (cb: (user: User | null) => void) => {
    emit = cb;
    return () => {
      emit = null;
    };
  },
  signOut: () => signOut(),
  signInWithGoogle: () => signInWithGoogle(),
  describeAuthError: () => 'error',
}));
vi.mock('../firebase/sessions', () => ({ createDraftSession: vi.fn(async () => 'draft1') }));

const { default: App } = await import('../App');

const user = (uid: string, email: string) =>
  ({ uid, email, displayName: `Usuario ${uid}`, photoURL: null }) as unknown as User;

beforeEach(() => {
  signOut.mockClear();
  signInWithGoogle.mockClear();
});
afterEach(() => {
  emit = null;
});

describe('BUG-002: sesión de Google guardada en el navegador', () => {
  it('mientras Firebase comprueba la sesión no muestra el botón del login', () => {
    render(<App />);
    expect(screen.getByText('Comprobando tu sesión…')).toBeTruthy();
    expect(screen.queryByText('Continuar con Google')).toBeNull();
    act(() => emit?.(null));
    expect(screen.getByText('Continuar con Google')).toBeTruthy();
  });

  it('con una sesión guardada muestra la cuenta activa y permite cerrar sesión', async () => {
    render(<App />);
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    expect(await screen.findByText('ana@tecba.edu.bo')).toBeTruthy();
    // El login sale con una animación; después ya no está.
    await waitFor(() => expect(screen.queryByText('Continuar con Google')).toBeNull());

    await act(async () => {
      fireEvent.click(screen.getByText('Cerrar sesión'));
    });
    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByLabelText('Cuenta de Google')).toBeNull();
  });

  it('"Cambiar de cuenta" abre la ventana de Google y, con otra cuenta, muestra la nueva', async () => {
    render(<App />);
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    await act(async () => {
      fireEvent.click(await screen.findByText('Cambiar de cuenta'));
    });
    expect(signInWithGoogle).toHaveBeenCalled();
    act(() => emit?.(user('u2', 'beto@tecba.edu.bo')));
    expect(await screen.findByText('beto@tecba.edu.bo')).toBeTruthy();
    expect(screen.queryByText('ana@tecba.edu.bo')).toBeNull();
  });
});
