/**
 * @file electron-mock.ts
 * @description `window.electronAPI` simulada para las pruebas de la interfaz.
 * Permite emitir los eventos del proceso principal (tiempo, fin, conexión, .yaleh).
 */

import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type {
  ConnectionChangedPayload,
  ConnectionMode,
  ElectronAPI,
  LocalAiChunk,
  LocalAiRequest,
  LocalAiResult,
  LocalAiStatus,
  OpenSessionFileResult,
  SessionEndedPayload,
  SessionHistoryEntry,
  SessionSnapshot,
  SessionTickPayload,
} from '@shared/ipc-types';

export interface ElectronMockOptions {
  connection?: ConnectionMode;
  snapshot?: Partial<SessionSnapshot>;
  isPackaged?: boolean;
  /** Historial de sesiones que devolverá listSessionHistory. */
  history?: SessionHistoryEntry[];
  /** Estado del asistente sin conexión (por defecto: no instalado). */
  localAi?: Partial<LocalAiStatus>;
  /** Respuesta del modelo local; se entrega en dos partes por onChunk antes de resolver. */
  localAiResult?: LocalAiResult;
  /** Resultado que devolverán el diálogo y la apertura por contenido. */
  openResult?: OpenSessionFileResult;
}

export function createElectronMock(options: ElectronMockOptions = {}) {
  let tick: ((p: SessionTickPayload) => void) | null = null;
  let ended: ((p: SessionEndedPayload) => void) | null = null;
  let connectionListener: ((p: ConnectionChangedPayload) => void) | null = null;
  let fileListener: ((r: OpenSessionFileResult) => void) | null = null;
  let connection: ConnectionMode = options.connection ?? 'offline';
  const openResult: OpenSessionFileResult = options.openResult ?? { ok: false, canceled: true, message: '' };

  const snapshot: SessionSnapshot = {
    status: 'idle',
    sessionId: null,
    mode: null,
    durationSeconds: 0,
    remainingSeconds: 0,
    ...options.snapshot,
  };

  let localAiStatus = makeLocalAiStatus(options.localAi);
  let statusListener: ((s: LocalAiStatus) => void) | null = null;
  let chunkListener: ((c: LocalAiChunk) => void) | null = null;

  const api: ElectronAPI = {
    version: 'test',
    getAppInfo: vi.fn(async () => ({ version: 'test', isPackaged: options.isPackaged ?? true })),
    startSession: vi.fn(async (durationSeconds: number, sessionId?: string) => ({
      status: 'active' as const,
      sessionId: sessionId ?? 's1',
      mode: connection === 'online' ? ('online' as const) : ('offline' as const),
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
    openSessionFileDialog: vi.fn(async () => openResult),
    openSessionFileContent: vi.fn(async () => openResult),
    onSessionFileResult: vi.fn(cb => {
      fileListener = cb;
      return () => {
        fileListener = null;
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
    workspace: {
      addSource: vi.fn(async () => {}),
      listSources: vi.fn(async () => []),
      getSourceText: vi.fn(async () => ''),
      removeSource: vi.fn(async () => {}),
      listNotes: vi.fn(async () => []),
      saveNote: vi.fn(async () => {}),
      deleteNote: vi.fn(async () => {}),
    },
    listSessionHistory: vi.fn(async () => options.history ?? []),
    exportOffice: vi.fn(async () => ({ ok: true as const, path: 'C:\\Users\\x\\Documents\\YALEH\\Documento.docx' })),
    localAi: {
      getStatus: vi.fn(async () => localAiStatus),
      startDownload: vi.fn(async () => {
        localAiStatus = { ...localAiStatus, state: 'downloading' };
        return localAiStatus;
      }),
      pauseDownload: vi.fn(async () => ({ ...localAiStatus, state: 'paused' as const })),
      removeModel: vi.fn(async () => ({ ...localAiStatus, state: 'not-installed' as const })),
      generate: vi.fn(async (request: LocalAiRequest): Promise<LocalAiResult> => {
        const result = options.localAiResult ?? { ok: true, text: 'Respuesta local', stats: STATS };
        if (result.ok) {
          const half = result.text.slice(0, Math.ceil(result.text.length / 2));
          act(() => chunkListener?.({ requestId: request.requestId, text: half, tokens: 1 }));
        }
        return result;
      }),
      abort: vi.fn(async () => {}),
      onStatus: vi.fn((cb: (s: LocalAiStatus) => void) => {
        statusListener = cb;
        return () => {
          statusListener = null;
        };
      }),
      onChunk: vi.fn((cb: (c: LocalAiChunk) => void) => {
        chunkListener = cb;
        return () => {
          chunkListener = null;
        };
      }),
    },
    tabs: {
      open: vi.fn(async (url: string) => ({ ok: true as const, tabId: `tab-${url.length}`, url, title: '' })),
      close: vi.fn(async () => {}),
      show: vi.fn(async () => {}),
      setBounds: vi.fn(async () => {}),
      onUpdated: vi.fn(() => () => {}),
      onOpenRequest: vi.fn(() => () => {}),
    },
  };

  return {
    api,
    /** Cambia el estado del asistente sin conexión y avisa a la interfaz. */
    emitLocalAiStatus: (status: Partial<LocalAiStatus>) =>
      act(() => {
        localAiStatus = makeLocalAiStatus({ ...localAiStatus, ...status });
        statusListener?.(localAiStatus);
      }),
    /** Instala la API simulada en `window`. */
    install: () => {
      window.electronAPI = api;
    },
    emitTick: (remainingSeconds: number) => act(() => tick?.({ remainingSeconds })),
    emitEnded: () => act(() => ended?.({ reason: 'completed' })),
    /** Simula un .yaleh abierto por los argumentos de arranque o una segunda instancia. */
    emitSessionFileResult: (result: OpenSessionFileResult) => act(() => fileListener?.(result)),
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

const STATS = { tokens: 10, firstTokenMs: 100, totalMs: 1000, tokensPerSecond: 10, sourceChars: 100, passages: 1, loadMs: 0 };

export function makeLocalAiStatus(overrides: Partial<LocalAiStatus> = {}): LocalAiStatus {
  return {
    state: 'not-installed',
    requirements: { ok: true, ramBytes: 16 * 1024 ** 3, minRamBytes: 7.5 * 1024 ** 3, freeDiskBytes: 100 * 1024 ** 3, requiredDiskBytes: 3 * 1024 ** 3, problems: [] },
    receivedBytes: 0,
    totalBytes: 2_740_937_888,
    message: null,
    model: { name: 'Qwen3.5-4B', author: 'equipo Qwen (Alibaba Cloud)', license: 'Apache 2.0', licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0', sizeBytes: 2_740_937_888 },
    ...overrides,
  };
}
