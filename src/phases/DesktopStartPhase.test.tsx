/**
 * Bienvenida del escritorio y apertura del archivo de sesión .yaleh (brief, revisión 1.5),
 * y el chat de la IA según el modo.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import type { ConnectionMode, OpenSessionFileResult } from '@shared/ipc-types';
import App from '../App';
import { AppProvider, useApp } from '../context/AppContext';
import { applyOpenedSessionFile } from '../lib/session-file';
import ChatColumn from '../workspace/ChatColumn';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, makeLocalAiStatus, uninstallElectronMock } from '../test/electron-mock';
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
  it.each<ConnectionMode>(['online', 'offline'])('muestra la bienvenida sin recuadro, con el logo e Iniciar (%s)', connection => {
    createElectronMock({ connection }).install();
    renderWelcome(connection);

    expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy();
    expect(screen.getByTestId('yaleh-logo')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
    expect(screen.queryByText(/Inicia tu sesión desde la web/)).toBeNull();
    // ORION #30: sin "Con conexión" ni la sección de la IA Local.
    expect(screen.queryByText(/Con conexión/)).toBeNull();
    expect(screen.queryByText(/Descargar IA Local|Eliminar IA Local/)).toBeNull();
    // Configuración es un engranaje con su texto al pasar el mouse.
    expect(screen.getByRole('button', { name: 'Configuración' })).toBeTruthy();
  });

  it('sin conexión avisa con qué se va a estudiar, según el asistente', () => {
    createElectronMock({ connection: 'offline', localAi: { state: 'installed' } }).install();
    const { unmount } = render(
      <AppProvider initial={{ ...initialState, phase: 'desktop-start', connection: 'offline', localAi: makeLocalAiStatus({ state: 'installed' }) }}>
        <DesktopStartPhase />
      </AppProvider>
    );
    expect(screen.getByTestId('offline-note').textContent).toMatch(/^Estás sin conexión. Vas a estudiar con la IA Local/);
    unmount();
    renderWelcome('offline');
    expect(screen.getByTestId('offline-note').textContent).toMatch(/no está instalada: se descarga desde la página de YALEH/);
  });

  it('con conexión explica cómo tener la sesión completa, solo con texto, sin el aviso de sin conexión', () => {
    createElectronMock({ connection: 'online' }).install();
    renderWelcome('online');
    expect(screen.queryByTestId('offline-note')).toBeNull();
    const note = screen.getByTestId('online-note');
    expect(note.textContent).toContain(
      '¿Quieres Gemini y las herramientas de Google con tu cuenta? Prepara tu sesión en yaleh-fbe1c.web.app y abre el archivo .yaleh con doble clic.'
    );
    expect(note.querySelector('a, button')).toBeNull();
  });

  it('sin conexión no muestra la nota de la sesión completa', () => {
    createElectronMock({ connection: 'offline' }).install();
    renderWelcome('offline');
    expect(screen.queryByTestId('online-note')).toBeNull();
  });

  it.each([
    ['installed', 'Módulo IA Local: tus archivos, notas, Pomodoro y la IA que funciona en tu computadora, sin internet.'],
    ['not-installed', 'Módulo IA Local: descarga el modelo en Configuración para usar la IA sin internet.'],
    ['paused', 'Módulo IA Local: descarga el modelo en Configuración para usar la IA sin internet.'],
    ['unsupported', 'Módulo IA Local: este equipo no cumple los requisitos de la IA; puedes estudiar con tus archivos, notas y Pomodoro.'],
  ] as const)('debajo de Iniciar dice qué es el módulo IA Local, según el modelo (%s)', (state, text) => {
    createElectronMock({ connection: 'online', localAi: { state } }).install();
    render(
      <AppProvider initial={{ ...initialState, phase: 'desktop-start', connection: 'online', localAi: makeLocalAiStatus({ state }) }}>
        <DesktopStartPhase />
      </AppProvider>
    );
    expect(screen.getByTestId('local-module-note').textContent).toBe(text);
  });

  it('el .yaleh solo se abre con doble clic: sin botón, sin frase y sin arrastre', () => {
    const mock = createElectronMock({ openResult: OPENED });
    mock.install();
    const { container } = renderWelcome('online');
    expect(screen.queryByText('Abrir archivo de sesión (.yaleh)')).toBeNull();
    expect(screen.queryByText(/también puedes arrastrar/)).toBeNull();
    expect(screen.queryByTestId('dev-session-file')).toBeNull();
    const file = new File(['{}'], 'sesion.yaleh');
    fireEvent.drop(container.firstElementChild!, { dataTransfer: { files: [file] } });
    expect(mock.api.openSessionFileContent).not.toHaveBeenCalled();
    expect('openSessionFileDialog' in mock.api).toBe(false);
  });

  it('no saluda con el nombre', () => {
    createElectronMock().install();
    const settings = { settings: { ...DEFAULT_SETTINGS }, profileName: 'Ana', exportDirResolved: '', sessionActive: false };
    render(
      <AppProvider initial={{ ...initialState, phase: 'desktop-start', connection: 'online', settings }}>
        <DesktopStartPhase />
      </AppProvider>
    );
    expect(screen.queryByText(/Hola/)).toBeNull();
    expect(screen.queryByText('Ana')).toBeNull();
  });

  it('"Iniciar" lleva al flujo local con un espacio de trabajo nuevo', () => {
    createElectronMock().install();
    renderWelcome('offline');

    fireEvent.click(screen.getByText('Iniciar'));

    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
    expect(screen.getByTestId('workspace').textContent).not.toBe('null');
  });

  it('un .yaleh válido entra directo al kiosko con sus fuentes y el modo que decidió el proceso principal', () => {
    createElectronMock({ connection: 'online' }).install();
    function ApplyResult() {
      const { dispatch } = useApp();
      return <button onClick={() => applyOpenedSessionFile(dispatch, OPENED)}>aplicar</button>;
    }
    render(
      <AppProvider initial={{ ...initialState, phase: 'desktop-start', connection: 'online' }}>
        <StateProbe />
        <ApplyResult />
      </AppProvider>
    );

    fireEvent.click(screen.getByText('aplicar'));

    expect(screen.getByTestId('phase').textContent).toBe('kiosk');
    expect(screen.getByTestId('session-mode').textContent).toBe('online');
    expect(screen.getByTestId('workspace').textContent).toBe('archivo1');
    expect(screen.getByTestId('files').textContent).toBe('apuntes.pdf');
  });
});

describe('App en el escritorio', () => {
  it('no muestra el login de la web: arranca en la bienvenida', async () => {
    createElectronMock({ connection: 'offline' }).install();
    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy());
    expect(screen.queryByText('Continuar con Google')).toBeNull();
  });

  it('un .yaleh abierto desde fuera de la app (doble clic o segunda instancia) entra al kiosko', async () => {
    const mock = createElectronMock({ connection: 'online' });
    mock.install();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy());

    mock.emitSessionFileResult(OPENED);

    await waitFor(() => expect(screen.getByText('00:50:00')).toBeTruthy());
  });

  it('un .yaleh caducado o ya usado muestra el mensaje y no sale de la bienvenida', async () => {
    const message = 'Este archivo de sesión ya se usó. Descarga uno nuevo en la web de YALEH.';
    const mock = createElectronMock({ connection: 'offline' });
    mock.install();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy());

    mock.emitSessionFileResult({ ok: false, message });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message));
    expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy();
  });
});

describe('App en la web', () => {
  it('empieza en la landing; "Preparar mi sesión" lleva al login con Google y "Volver al inicio" regresa', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Estudiá sin distracciones.' })).toBeTruthy();
    expect(screen.queryByText('Continuar con Google')).toBeNull();
    fireEvent.click(screen.getAllByTestId('prepare-session')[0]);
    expect(await screen.findByText('Continuar con Google', {}, { timeout: 5000 })).toBeTruthy();
    fireEvent.click(screen.getByText('Volver al inicio'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Estudiá sin distracciones.' })).toBeTruthy();
  });
});

describe('La landing no aparece en el escritorio', () => {
  it('el escritorio arranca en su bienvenida', async () => {
    createElectronMock({ connection: 'online' }).install();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido a YALEH.' })).toBeTruthy());
    expect(screen.queryByTestId('prepare-session')).toBeNull();
    expect(screen.queryByTestId('download-installer')).toBeNull();
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
