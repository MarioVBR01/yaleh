/**
 * Bienvenida del escritorio y apertura del archivo de sesión .yaleh (brief, revisión 1.5),
 * y el chat de la IA según el modo.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConnectionMode, OpenSessionFileResult } from '@shared/ipc-types';
import App from '../App';
import { AppProvider, useApp } from '../context/AppContext';
import ChatColumn from '../workspace/ChatColumn';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import DesktopStartPhase from './DesktopStartPhase';

function StateProbe() {
  const { state } = useApp();
  return (
    <>
      <output data-testid="phase">{state.phase}</output>
      <output data-testid="session-mode">{String(state.sessionMode)}</output>
      <output data-testid="workspace">{String(state.workspaceId)}</output>
      <output data-testid="files">{state.uploadedFiles.map(f => f.name).join(',')}</output>
    </>
  );
}

function renderWelcome(connection: ConnectionMode) {
  const initial: AppState = { ...initialState, phase: 'desktop-start', connection };
  return render(
    <AppProvider initial={initial}>
      <StateProbe />
      <DesktopStartPhase />
    </AppProvider>
  );
}

const OPENED: OpenSessionFileResult = {
  ok: true,
  snapshot: { status: 'active', sessionId: 'archivo1', mode: 'online', durationSeconds: 3000, remainingSeconds: 3000 },
  sources: [{ id: 'f1', name: 'apuntes.pdf', type: 'application/pdf', size: 10, charCount: 500, createdAt: '' }],
  createdBy: { name: 'Mario Brañez', email: 'mario@tecba.edu.bo' },
};

afterEach(() => {
  uninstallElectronMock();
});

describe('Bienvenida del escritorio', () => {
  it.each<ConnectionMode>(['online', 'offline'])('muestra la bienvenida y los dos botones (%s)', connection => {
    createElectronMock({ connection }).install();
    renderWelcome(connection);

    expect(screen.getByText('Bienvenido a YALEH')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
    expect(screen.getByText('Abrir archivo de sesión (.yaleh)')).toBeTruthy();
    expect(screen.queryByText(/Inicia tu sesión desde la web/)).toBeNull();
  });

  it('"Iniciar" lleva al flujo local con un espacio de trabajo nuevo', () => {
    createElectronMock().install();
    renderWelcome('offline');

    fireEvent.click(screen.getByText('Iniciar'));

    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
    expect(screen.getByTestId('workspace').textContent).not.toBe('null');
  });

  it('un .yaleh válido entra directo al kiosko con sus fuentes y el modo que decidió el proceso principal', async () => {
    const mock = createElectronMock({ connection: 'online', openResult: OPENED });
    mock.install();
    renderWelcome('online');

    fireEvent.click(screen.getByText('Abrir archivo de sesión (.yaleh)'));

    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('kiosk'));
    expect(screen.getByTestId('session-mode').textContent).toBe('online');
    expect(screen.getByTestId('workspace').textContent).toBe('archivo1');
    expect(screen.getByTestId('files').textContent).toBe('apuntes.pdf');
  });

  it('un .yaleh caducado o ya usado muestra el mensaje y no sale de la bienvenida', async () => {
    const message = 'Este archivo de sesión ya se usó. Descarga uno nuevo en la web de YALEH.';
    createElectronMock({ openResult: { ok: false, message } }).install();
    renderWelcome('offline');

    fireEvent.click(screen.getByText('Abrir archivo de sesión (.yaleh)'));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message));
    expect(screen.getByTestId('phase').textContent).toBe('desktop-start');
  });

  it('cancelar el diálogo no muestra ningún mensaje', async () => {
    const mock = createElectronMock();
    mock.install();
    renderWelcome('offline');

    fireEvent.click(screen.getByText('Abrir archivo de sesión (.yaleh)'));

    await waitFor(() => expect(mock.api.openSessionFileDialog).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('App en el escritorio', () => {
  it('no muestra el login de la web: arranca en la bienvenida', async () => {
    createElectronMock({ connection: 'offline' }).install();
    render(<App />);

    await waitFor(() => expect(screen.getByText('Bienvenido a YALEH')).toBeTruthy());
    expect(screen.queryByText('Continuar con Google')).toBeNull();
  });

  it('un .yaleh abierto desde fuera de la app (doble clic o segunda instancia) entra al kiosko', async () => {
    const mock = createElectronMock({ connection: 'online' });
    mock.install();
    render(<App />);
    await waitFor(() => expect(screen.getByText('Bienvenido a YALEH')).toBeTruthy());

    mock.emitSessionFileResult(OPENED);

    await waitFor(() => expect(screen.getByText('00:50:00')).toBeTruthy());
  });
});

describe('App en la web', () => {
  it('sigue mostrando el login con Google (después de comprobar la sesión guardada)', async () => {
    render(<App />);
    expect(await screen.findByText('Continuar con Google', {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe('Chat con la IA', () => {
  function renderAI(state: Partial<AppState>) {
    return render(
      <AppProvider initial={{ ...initialState, ...state }}>
        <ChatColumn />
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
