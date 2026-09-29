/**
 * Pantallas de inicio según el modo (brief, sección 4.2) y el panel de IA sin conexión.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConnectionMode } from '@shared/ipc-types';
import App from '../App';
import { AppProvider, useApp } from '../context/AppContext';
import AIWorkPanel from '../panels/AIWorkPanel';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import DesktopStartPhase from './DesktopStartPhase';

function StateProbe() {
  const { state } = useApp();
  return (
    <>
      <output data-testid="phase">{state.phase}</output>
      <output data-testid="session-mode">{String(state.sessionMode)}</output>
    </>
  );
}

function renderStart(connection: ConnectionMode) {
  const initial: AppState = { ...initialState, phase: 'desktop-start', connection };
  return render(
    <AppProvider initial={initial}>
      <StateProbe />
      <DesktopStartPhase />
    </AppProvider>
  );
}

afterEach(() => {
  uninstallElectronMock();
});

describe('Pantalla de inicio del escritorio', () => {
  it('mientras comprueba la conexión lo indica', () => {
    createElectronMock().install();
    renderStart('unknown');
    expect(screen.getByText('Comprobando conexión…')).toBeTruthy();
  });

  it('sin conexión ofrece iniciar sesión offline', () => {
    createElectronMock().install();
    renderStart('offline');

    expect(screen.getByText('No estás conectado. ¿Quieres iniciar sesión offline?')).toBeTruthy();
    fireEvent.click(screen.getByText('Iniciar sesión offline'));

    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
    expect(screen.getByTestId('session-mode').textContent).toBe('offline');
  });

  it('"Reintentar conexión" pide una nueva comprobación y actualiza la pantalla', async () => {
    const mock = createElectronMock({ connection: 'online' });
    mock.install();
    renderStart('offline');

    fireEvent.click(screen.getByText('Reintentar conexión'));

    await waitFor(() => expect(screen.getByText('Inicia tu sesión desde la web')).toBeTruthy());
    expect(mock.api.recheckConnection).toHaveBeenCalledOnce();
  });

  it('con conexión pide iniciar desde la web y abre la web de YALEH', () => {
    const mock = createElectronMock({ connection: 'online' });
    mock.install();
    renderStart('online');

    expect(screen.getByText('Inicia tu sesión desde la web')).toBeTruthy();
    fireEvent.click(screen.getByText('Abrir la web de YALEH'));
    expect(mock.api.openExternal).toHaveBeenCalledWith('https://yaleh-fbe1c.web.app/');
  });

  it('con conexión permite usar el modo offline', () => {
    createElectronMock({ connection: 'online' }).install();
    renderStart('online');

    fireEvent.click(screen.getByText('Usar modo offline'));

    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
    expect(screen.getByTestId('session-mode').textContent).toBe('offline');
  });

  it('el botón de sesión online de prueba solo existe sin empaquetar', async () => {
    createElectronMock({ connection: 'online', isPackaged: true }).install();
    const packaged = renderStart('online');
    await waitFor(() => expect(screen.queryByText(/solo desarrollo/)).toBeNull());
    packaged.unmount();

    createElectronMock({ connection: 'online', isPackaged: false }).install();
    renderStart('online');
    await waitFor(() => expect(screen.getByText('Probar sesión online (solo desarrollo)')).toBeTruthy());
  });
});

describe('App en el escritorio', () => {
  it('no muestra el login de la web: arranca en la pantalla de inicio según la conexión', async () => {
    createElectronMock({ connection: 'offline' }).install();
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('No estás conectado. ¿Quieres iniciar sesión offline?')).toBeTruthy()
    );
    expect(screen.queryByText('Iniciar Sesión')).toBeNull();
    expect(screen.queryByText(/Omitir registro/)).toBeNull();
  });

  it('cambia de pantalla cuando el proceso principal avisa un cambio de conexión', async () => {
    const mock = createElectronMock({ connection: 'offline' });
    mock.install();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/No estás conectado/)).toBeTruthy());

    mock.setConnection('online');

    await waitFor(() => expect(screen.getByText('Inicia tu sesión desde la web')).toBeTruthy());
  });
});

describe('App en la web', () => {
  it('sigue mostrando el login (hasta la fase 4)', () => {
    render(<App />);
    expect(screen.getByText('Iniciar Sesión')).toBeTruthy();
  });
});

describe('Panel de IA', () => {
  function renderAI(state: Partial<AppState>) {
    return render(
      <AppProvider initial={{ ...initialState, ...state }}>
        <AIWorkPanel />
      </AppProvider>
    );
  }

  it('en una sesión offline muestra "Disponible próximamente"', () => {
    createElectronMock().install();
    renderAI({ sessionMode: 'offline', connection: 'offline' });
    expect(screen.getByText('Disponible próximamente')).toBeTruthy();
  });

  it('en una sesión online con conexión muestra el chat', () => {
    createElectronMock({ connection: 'online' }).install();
    renderAI({ sessionMode: 'online', connection: 'online' });
    expect(screen.queryByText('Disponible próximamente')).toBeNull();
  });
});
