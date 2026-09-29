/**
 * @file electron-mock.ts
 * @description `window.electronAPI` simulada para las pruebas de la interfaz.
 * Permite emitir los eventos del proceso principal (tiempo, fin, conexión).
 */

import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type {
  ConnectionChangedPayload,
  ConnectionMode,
  ElectronAPI,
  SessionEndedPayload,
  SessionSnapshot,
  SessionTickPayload,
} from '@shared/ipc-types';

export interface ElectronMockOptions {
  connection?: ConnectionMode;
  snapshot?: Partial<SessionSnapshot>;
  isPackaged?: boolean;
}

export function createElectronMock(options: ElectronMockOptions = {}) {
  let tick: ((p: SessionTickPayload) => void) | null = null;
  let ended: ((p: SessionEndedPayload) => void) | null = null;
  let connectionListener: ((p: ConnectionChangedPayload) => void) | null = null;
  let connection: ConnectionMode = options.connection ?? 'offline';

  const snapshot: SessionSnapshot = {
    status: 'idle',
    sessionId: null,
    mode: null,
    durationSeconds: 0,
    remainingSeconds: 0,
    ...options.snapshot,
  };

  const api: ElectronAPI = {
    version: 'test',
    getAppInfo: vi.fn(async () => ({ version: 'test', isPackaged: options.isPackaged ?? true })),
    startSession: vi.fn(async (durationSeconds, mode) => ({
      status: 'active' as const,
      sessionId: 's1',
      mode,
      durationSeconds,
      remainingSeconds: durationSeconds,
    })),
    getSessionState: vi.fn(async () => snapshot),
    resumeSession: vi.fn(async () => ({ ...snapshot, status: 'active' as const })),
    discardResume: vi.fn(async () => ({ ...snapshot, status: 'idle' as const })),
    onSessionTick: vi.fn(cb => {
      tick = cb;
      return () => {
        tick = null;
      };
    }),
    onSessionEnded: vi.fn(cb => {
      ended = cb;
      return () => {
        ended = null;
      };
    }),
    getConnectionMode: vi.fn(async () => connection),
    recheckConnection: vi.fn(async () => connection),
    onConnectionChange: vi.fn(cb => {
      connectionListener = cb;
      return () => {
        connectionListener = null;
      };
    }),
    closeApp: vi.fn(async () => {}),
    openExternal: vi.fn(async () => true),
    onAuthToken: vi.fn(() => () => {}),
    onSessionLink: vi.fn(() => () => {}),
  };

  return {
    api,
    /** Instala la API simulada en `window`. */
    install: () => {
      window.electronAPI = api;
    },
    emitTick: (remainingSeconds: number) => act(() => tick?.({ remainingSeconds })),
    emitEnded: () => act(() => ended?.({ reason: 'completed' })),
    /** Cambia la conexión que devolverá la API y avisa a la interfaz. */
    setConnection: (mode: ConnectionMode) =>
      act(() => {
        connection = mode;
        connectionListener?.({ mode });
      }),
  };
}

export function uninstallElectronMock(): void {
  delete window.electronAPI;
}
