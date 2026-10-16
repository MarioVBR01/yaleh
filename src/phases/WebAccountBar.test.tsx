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
const { default: WebAccountBar } = await import('./WebAccountBar');
const { AppProvider } = await import('../context/AppContext');
const { initialState } = await import('../store/appStore');

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
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    });
    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText('Continuar con Google')).toBeTruthy();
    expect(screen.queryByLabelText('Cuenta de Google')).toBeNull();
  });

  it('"Cambiar" abre la ventana de Google y, con otra cuenta, muestra la nueva', async () => {
    render(<App />);
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    await act(async () => {
      fireEvent.click(await screen.findByText('Cambiar'));
    });
    expect(signInWithGoogle).toHaveBeenCalled();
    act(() => emit?.(user('u2', 'beto@tecba.edu.bo')));
    expect(await screen.findByText('beto@tecba.edu.bo')).toBeTruthy();
    expect(screen.queryByText('ana@tecba.edu.bo')).toBeNull();
  });
});

describe('Barra superior de la web (ORION #38)', () => {
  it('logo, pasos (Material actual en naranja) y la cuenta con Cambiar y Cerrar sesión', async () => {
    render(<App />);
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    expect(await screen.findByText('ana@tecba.edu.bo')).toBeTruthy();
    const bar = screen.getByLabelText('Cuenta de Google');
    expect(bar.querySelector('[data-testid="yaleh-logo"]')).toBeTruthy();
    const steps = [...bar.querySelectorAll('li')];
    expect(steps.map(s => s.textContent)).toEqual(['1Material', '2Duración', '3Confirmar', '4Descargar']);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[0].querySelector('span')!.className).toContain('bg-accent');
    expect(screen.getByText('Cambiar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('marca con ✓ los pasos hechos', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'confirm-session', authChecked: true }}>
        <WebAccountBar step={2} />
      </AppProvider>
    );
    const steps = [...screen.getAllByRole('listitem')];
    expect(steps.map(s => s.dataset.state)).toEqual(['done', 'done', 'now', 'todo']);
    expect(steps[0].textContent).toBe('✓Material');
  });
});
