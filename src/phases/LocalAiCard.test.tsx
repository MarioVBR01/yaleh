/**
 * Asistente sin conexión en la interfaz (revisión 1.8): la tarjeta de la bienvenida
 * (requisitos, descarga, licencia) y el chat con el modelo local.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConnectionMode, LocalAiStatus } from '@shared/ipc-types';
import { AppProvider } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, makeLocalAiStatus, uninstallElectronMock } from '../test/electron-mock';
import ChatColumn from '../workspace/ChatColumn';
import StudioColumn from '../workspace/StudioColumn';
import LocalAiCard, { ipcErrorMessage } from './LocalAiCard';

afterEach(() => uninstallElectronMock());

function renderCard(connection: ConnectionMode, localAi: Partial<LocalAiStatus>) {
  const mock = createElectronMock({ connection, localAi });
  mock.install();
  render(
    <AppProvider initial={{ ...initialState, phase: 'desktop-start', connection, localAi: makeLocalAiStatus(localAi) }}>
      <LocalAiCard />
    </AppProvider>
  );
  return mock;
}

describe('LocalAiCard', () => {
  it('con conexión y sin modelo: ofrece la descarga con su tamaño y la licencia Apache 2.0', async () => {
    const mock = renderCard('online', { state: 'not-installed' });
    const button = screen.getByText('Descargar asistente sin conexión (2,6 GB)');
    expect(screen.getByText(/licencia Apache 2\.0/)).toBeTruthy();
    fireEvent.click(button);
    await waitFor(() => expect(mock.api.localAi.startDownload).toHaveBeenCalled());
  });

  it('sin conexión: no ofrece la descarga y explica por qué', () => {
    renderCard('offline', { state: 'not-installed' });
    expect(screen.queryByText(/Descargar asistente/)).toBeNull();
    expect(screen.getByText('Conéctate a internet para descargar el asistente sin conexión.')).toBeTruthy();
  });

  it('si el equipo no cumple los requisitos: aviso claro y sin botón de descarga', () => {
    renderCard('online', {
      state: 'unsupported',
      requirements: { ...makeLocalAiStatus().requirements, ok: false, problems: ['Este equipo tiene 4,0 GB de RAM y el asistente sin conexión necesita al menos 8 GB.'] },
    });
    expect(screen.getByText('Este equipo no puede usar el asistente sin conexión.')).toBeTruthy();
    expect(screen.getByText(/4,0 GB de RAM/)).toBeTruthy();
    expect(screen.queryByText(/Descargar asistente/)).toBeNull();
  });

  it('descargando: barra de progreso y botón para pausar', () => {
    renderCard('online', { state: 'downloading', receivedBytes: 1_370_468_944 });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('Pausar')).toBeTruthy();
  });

  it('en pausa: reanudar', () => {
    renderCard('online', { state: 'paused', receivedBytes: 1_000_000_000 });
    expect(screen.getByText('Reanudar descarga')).toBeTruthy();
  });

  it('un error (por ejemplo, SHA-256 distinto) se muestra y se puede reintentar', () => {
    renderCard('online', { state: 'error', message: 'El archivo descargado está dañado (SHA-256 distinto). Vuelve a descargarlo.' });
    expect(screen.getByText(/SHA-256 distinto/)).toBeTruthy();
    expect(screen.getByText(/Descargar asistente sin conexión/)).toBeTruthy();
  });

  it('instalado: lo indica', () => {
    renderCard('offline', { state: 'installed' });
    expect(screen.getByText('Asistente sin conexión instalado')).toBeTruthy();
  });

  it('limpia el prefijo que Electron agrega a los errores de IPC', () => {
    expect(ipcErrorMessage(new Error("Error invoking remote method 'local-ai:download': Error: Necesitas conexión."))).toBe('Necesitas conexión.');
  });
});

describe('chat y estudio sin conexión', () => {
  const offlineState = (localAi: Partial<LocalAiStatus>): Partial<AppState> => ({
    sessionMode: 'offline',
    connection: 'offline',
    workspaceId: 'ws1',
    localAi: makeLocalAiStatus(localAi),
  });

  function renderWith(state: Partial<AppState>, ui: React.ReactNode, result?: string) {
    createElectronMock({ localAi: state.localAi ?? undefined, localAiResult: result ? { ok: true, text: result, stats: {} as never } : undefined }).install();
    return render(<AppProvider initial={{ ...initialState, ...state }}>{ui}</AppProvider>);
  }

  it('sin modelo: "Disponible próximamente" con la indicación para descargarlo', () => {
    renderWith(offlineState({ state: 'not-installed' }), <ChatColumn />);
    expect(screen.getByText('Disponible próximamente')).toBeTruthy();
    expect(screen.getByText(/Descargar asistente sin conexión/)).toBeTruthy();
  });

  it('con el modelo: responde el "Asistente sin conexión" y la respuesta aparece', async () => {
    renderWith(offlineState({ state: 'installed' }), <ChatColumn />, 'La **fotosíntesis** ocurre en los cloroplastos.');
    expect(screen.getByTestId('assistant-badge').textContent).toContain('Asistente sin conexión');
    expect(screen.getByText(/búsqueda en Wikipedia solo está disponible con conexión/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Escribe tu pregunta…'), { target: { value: '¿Dónde ocurre la fotosíntesis?' } });
    fireEvent.click(screen.getByTitle('Enviar'));
    expect(await screen.findByText('fotosíntesis')).toBeTruthy();
  });

  it('con conexión responde el "Asistente en línea"', () => {
    renderWith({ sessionMode: 'online', connection: 'online', localAi: makeLocalAiStatus({ state: 'installed' }) }, <ChatColumn />);
    expect(screen.getByTestId('assistant-badge').textContent).toContain('Asistente en línea');
  });

  it('estudio sin conexión: cuestionario e informe deshabilitados', () => {
    renderWith(
      { ...offlineState({ state: 'installed' }), uploadedFiles: [{ id: 'f1', name: 'a.txt', size: 1, type: 'text/plain', status: 'ready' } as never] },
      <StudioColumn />
    );
    expect((screen.getByText('Cuestionario').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Informe').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Resumen').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
