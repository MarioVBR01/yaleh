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
const ensureUserProfile = vi.hoisted(() => vi.fn(async () => {}));
const createDraftSession = vi.hoisted(() => vi.fn(async () => 'draft1'));
const discardEmptyDraft = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../firebase/sessions', () => ({ createDraftSession, discardEmptyDraft, ensureUserProfile, listMySessions: vi.fn(async () => []) }));

const { default: App } = await import('../App');
const { default: WebAccountBar } = await import('./WebAccountBar');
const { AppProvider, useApp } = await import('../context/AppContext');
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

/** La web empieza en la landing (revisión 1.10): "Iniciar sesión" lleva al login. */
function goToLogin() {
  fireEvent.click(screen.getAllByTestId('sign-in')[0]);
}

describe('Iniciar sesión', () => {
  it('lleva a "Mis sesiones" y guarda el perfil', async () => {
    render(<App />);
    goToLogin();
    const ana = user('u1', 'ana@tecba.edu.bo');
    act(() => emit?.(ana));
    expect(await screen.findByRole('heading', { name: 'Mis sesiones' }, { timeout: 4000 })).toBeTruthy();
    expect(ensureUserProfile).toHaveBeenCalledWith(ana);
    // El borrador se crea con "Nueva sesión", no al ingresar.
    expect(createDraftSession).not.toHaveBeenCalled();
  });
});

describe('BUG-002: cuenta de Google guardada en el navegador', () => {
  it('mientras Firebase comprueba la sesión no muestra el botón del login', async () => {
    render(<App />);
    goToLogin();
    expect(await screen.findByText('Comprobando tu cuenta…')).toBeTruthy();
    expect(screen.queryByText('Registrarse con Google')).toBeNull();
    act(() => emit?.(null));
    expect(screen.getByText('Registrarse con Google')).toBeTruthy();
  });

  it('con una cuenta guardada muestra la cuenta activa; "Cerrar sesión" vuelve a la landing', async () => {
    render(<App />);
    goToLogin();
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    expect(await screen.findByText('ana@tecba.edu.bo')).toBeTruthy();
    // El login sale con una animación; después ya no está.
    await waitFor(() => expect(screen.queryByText('Registrarse con Google')).toBeNull());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    });
    expect(signOut).toHaveBeenCalled();
    // Revisión 1.10: al cerrar sesión se vuelve al inicio (la landing).
    expect((await screen.findAllByTestId('sign-in')).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Cuenta de Google')).toBeNull();
  });

  it('"Cambiar" abre la ventana de Google y, con otra cuenta, muestra la nueva', async () => {
    render(<App />);
    goToLogin();
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
  it('en "Mis sesiones" no hay pasos; están la cuenta, Cambiar y Cerrar sesión', async () => {
    render(<App />);
    goToLogin();
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    expect(await screen.findByText('ana@tecba.edu.bo')).toBeTruthy();
    const bar = screen.getByLabelText('Cuenta de Google');
    expect(await screen.findByRole('heading', { name: 'Mis sesiones' }, { timeout: 4000 })).toBeTruthy();
    expect(bar.querySelectorAll('li')).toHaveLength(0);
    expect(screen.getByText('Cambiar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('dentro de una sesión: logo, pasos (Material actual en naranja) y la cuenta', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'dropzone', authChecked: true, session: { ...initialState.session, isAuthenticated: true } }}>
        <WebAccountBar step={0} />
      </AppProvider>
    );
    const bar = screen.getByLabelText('Cuenta de Google');
    expect(bar.querySelector('[data-testid="yaleh-logo"]')).toBeTruthy();
    const steps = [...bar.querySelectorAll('li')];
    expect(steps.map(s => s.textContent)).toEqual(['1Material', '2Duración', '3Confirmar', '4Descargar']);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[0].querySelector('span')!.className).toContain('bg-accent');
    expect(screen.getByText('Cambiar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('el enlace "Mis sesiones" y el logo vuelven a la lista; un borrador vacío se descarta', () => {
    function Phase() {
      return <output data-testid="phase">{useApp().state.phase}</output>;
    }
    const state = { ...initialState, phase: 'dropzone' as const, authChecked: true, workspaceId: 'w1', session: { ...initialState.session, uid: 'u1', isAuthenticated: true } };
    const { unmount } = render(
      <AppProvider initial={state}>
        <WebAccountBar step={0} />
        <Phase />
      </AppProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Mis sesiones' }));
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
    expect(discardEmptyDraft).toHaveBeenCalledWith('u1', 'w1');
    unmount();

    discardEmptyDraft.mockClear();
    const files = [{ id: 'f', name: 'a.pdf', size: 1, type: 'application/pdf', uploadedAt: new Date() }];
    render(
      <AppProvider initial={{ ...state, uploadedFiles: files }}>
        <WebAccountBar step={1} />
        <Phase />
      </AppProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Mis sesiones' }));
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
    expect(discardEmptyDraft).not.toHaveBeenCalled();
  });

  it('"Cerrar sesión" tiene su texto, title y aria-label', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'sessions-home', authChecked: true }}>
        <WebAccountBar home />
      </AppProvider>
    );
    const button = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(button.getAttribute('title')).toBe('Cerrar sesión');
    expect(button.textContent).toContain('Cerrar sesión');
    expect(screen.queryByText('Salir')).toBeNull();
  });

  it('desde "Mis sesiones" se puede volver a la landing con la cuenta abierta', async () => {
    render(<App />);
    goToLogin();
    act(() => emit?.(user('u1', 'ana@tecba.edu.bo')));
    // La pantalla entra con una animación: se espera a que termine antes de salir de ella.
    expect(await screen.findByRole('heading', { name: 'Mis sesiones' }, { timeout: 4000 })).toBeTruthy();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(await screen.findByTestId('account-menu-button', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByLabelText('Cuenta de Google')).toBeNull();
  });

  it('dentro de una sesión no está el enlace a la landing', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'dropzone', authChecked: true }}>
        <WebAccountBar step={0} />
      </AppProvider>
    );
    expect(screen.queryByRole('button', { name: 'Ir al inicio' })).toBeNull();
  });

  it('tiene el botón de tema', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'sessions-home', authChecked: true }}>
        <WebAccountBar home />
      </AppProvider>
    );
    expect(screen.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/ })).toBeTruthy();
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
