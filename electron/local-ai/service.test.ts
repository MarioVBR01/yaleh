// @vitest-environment node
/**
 * LocalAiService: estados, reglas de la descarga (con conexión, fuera de la sesión, requisitos),
 * pausa al empezar la sesión y generación con un worker simulado (texto parcial y estadísticas).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LocalAiChunk, LocalAiStatus } from '../../shared/ipc-types';
import { runMigrations } from '../db/migrations';
import { WorkspaceRepository } from '../db/workspace-repository';
import { LocalAiError, LocalAiService, type WorkerHandle } from './service';
import type { FromWorker, ToWorker, WorkerGenerate } from './worker-protocol';

const GB = 1024 ** 3;
const DATA = crypto.randomBytes(64 * 1024);
const TARGET = {
  url: 'https://modelos.example/modelo.gguf',
  sha256: crypto.createHash('sha256').update(DATA).digest('hex'),
  sizeBytes: DATA.length,
  fileName: 'modelo.gguf',
};

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(fn => fn()));

class FakeWorker implements WorkerHandle {
  readonly received: ToWorker[] = [];
  private listeners: { message: ((m: FromWorker) => void)[]; exit: ((code: number) => void)[] } = { message: [], exit: [] };
  killed = false;
  postMessage(message: ToWorker) {
    this.received.push(message);
  }
  on(event: 'message' | 'exit', listener: never) {
    this.listeners[event].push(listener);
  }
  kill() {
    this.killed = true;
  }
  emit(message: FromWorker) {
    this.listeners.message.forEach(l => l(message));
  }
  exit(code: number) {
    this.listeners.exit.forEach(l => l(code));
  }
}

function setup(overrides: { online?: boolean; active?: boolean; ram?: number; fetchImpl?: typeof fetch } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-ai-'));
  // En Windows el .part puede seguir abierto un instante después de pausar: se reintenta.
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  const repo = new WorkspaceRepository(db);
  const statuses: LocalAiStatus[] = [];
  const chunks: LocalAiChunk[] = [];
  const workers: FakeWorker[] = [];
  const flags = { online: overrides.online ?? true, active: overrides.active ?? false };
  const service = new LocalAiService({
    modelsDir: path.join(dir, 'models'),
    db,
    isOnline: () => flags.online,
    isSessionActive: () => flags.active,
    sendStatus: s => statuses.push(s),
    sendChunk: c => chunks.push(c),
    forkWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    fetchImpl: overrides.fetchImpl ?? (async () => new Response(DATA)),
    totalMem: () => overrides.ram ?? 16 * GB,
    freeDisk: () => 100 * GB,
    target: TARGET,
  });
  const install = () => {
    fs.mkdirSync(path.join(dir, 'models'), { recursive: true });
    fs.writeFileSync(service.modelFile, DATA);
  };
  return { service, repo, statuses, chunks, workers, flags, install, db };
}

const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i++) await new Promise(r => setTimeout(r, 10));
  expect(check()).toBe(true);
};

describe('estado', () => {
  it('sin modelo: not-installed; con el modelo: installed', () => {
    const { service, install } = setup();
    expect(service.status().state).toBe('not-installed');
    install();
    expect(service.status().state).toBe('installed');
  });

  it('con poca RAM: unsupported, con el motivo', () => {
    const { service } = setup({ ram: 4 * GB });
    const status = service.status();
    expect(status.state).toBe('unsupported');
    expect(status.requirements.problems[0]).toMatch(/RAM/);
  });
});

describe('descarga', () => {
  it('descarga y verifica: termina instalado y avisa el progreso', async () => {
    const { service, statuses } = setup();
    expect(service.startDownload().state).toBe('downloading');
    await waitFor(() => service.status().state === 'installed');
    expect(statuses.some(s => s.state === 'verifying')).toBe(true);
    expect(statuses.at(-1)?.state).toBe('installed');
  });

  it('se rechaza sin conexión, durante la sesión o si el equipo no cumple', () => {
    expect(() => setup({ online: false }).service.startDownload()).toThrow(/conexión/);
    expect(() => setup({ active: true }).service.startDownload()).toThrow(LocalAiError);
    expect(() => setup({ ram: 4 * GB }).service.startDownload()).toThrow(/RAM/);
  });

  it('al empezar una sesión se pausa y queda para reanudar', async () => {
    let cancel: (() => void) | null = null;
    const slowFetch = (async (_url: string, init?: RequestInit) =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(DATA.subarray(0, 1024)));
            cancel = () => controller.error(new Error('aborted'));
            init?.signal?.addEventListener('abort', () => cancel?.());
          },
        })
      )) as unknown as typeof fetch;
    const { service, statuses } = setup({ fetchImpl: slowFetch });
    service.startDownload();
    await waitFor(() => fs.existsSync(`${service.modelFile}.part`) && fs.statSync(`${service.modelFile}.part`).size > 0);
    service.onSessionStarted();
    await waitFor(() => service.status().state === 'paused');
    // El segundo aviso llega cuando la descarga ya cerró el archivo parcial.
    await waitFor(() => statuses.filter(s => s.state === 'paused').length >= 2);
    expect(service.status().receivedBytes).toBe(1024);
  });

  it('un SHA-256 distinto deja el estado de error con el motivo', async () => {
    const { service } = setup({ fetchImpl: (async () => new Response(Buffer.alloc(DATA.length))) as unknown as typeof fetch });
    service.startDownload();
    await waitFor(() => service.status().state === 'error');
    expect(service.status().message).toMatch(/SHA-256/);
  });
});

describe('generación', () => {
  it('sin modelo instalado responde con un error claro', async () => {
    const { service } = setup();
    expect(await service.generate({ requestId: 'r1', task: 'chat', workspaceId: 'ws', question: 'hola' })).toEqual({
      ok: false,
      message: 'El asistente sin conexión no está instalado.',
    });
  });

  it('envía al worker los fragmentos relevantes y devuelve el texto con estadísticas', async () => {
    const { service, repo, install, workers, chunks } = setup();
    install();
    repo.addSource('ws', { id: 's1', name: 'bio.txt', type: 'text/plain', size: 1 }, 'La fotosíntesis ocurre en los cloroplastos.');
    const result = service.generate({ requestId: 'r1', task: 'chat', workspaceId: 'ws', question: '¿Qué es la fotosíntesis?' });

    const request = workers[0].received[0] as WorkerGenerate;
    expect(request.prompt).toContain('### bio.txt (fragmento 1)');
    expect(request.prompt).toContain('PREGUNTA DEL ESTUDIANTE: ¿Qué es la fotosíntesis?');

    workers[0].emit({ type: 'chunk', id: 'r1', text: 'La foto', tokens: 2 });
    workers[0].emit({ type: 'done', id: 'r1', text: 'La fotosíntesis…', tokens: 20, firstTokenMs: 1000, totalMs: 3000, loadMs: 0 });
    const done = await result;
    expect(chunks).toEqual([{ requestId: 'r1', text: 'La foto', tokens: 2 }]);
    expect(done).toMatchObject({ ok: true, text: 'La fotosíntesis…', stats: { tokens: 20, tokensPerSecond: 10, passages: 1 } });
  });

  it('el worker se crea una sola vez y se libera al terminar la sesión', async () => {
    const { service, install, workers } = setup();
    install();
    void service.generate({ requestId: 'a', task: 'summary', workspaceId: 'ws' });
    void service.generate({ requestId: 'b', task: 'flashcards', workspaceId: 'ws' });
    expect(workers).toHaveLength(1);
    expect((workers[0].received[1] as WorkerGenerate).schema).toBeDefined();
    service.releaseModel();
    expect(workers[0].killed).toBe(true);
  });

  it('si el proceso del modelo se cae, los pedidos pendientes fallan con un mensaje', async () => {
    const { service, install, workers } = setup();
    install();
    const result = service.generate({ requestId: 'r1', task: 'chat', workspaceId: 'ws', question: 'hola' });
    workers[0].exit(1);
    expect(await result).toMatchObject({ ok: false, message: expect.stringMatching(/se detuvo/) });
  });

  it('después de una caída, el siguiente proceso usa solo la CPU', async () => {
    const forks: unknown[] = [];
    const { service, install, workers } = setup();
    install();
    const original = (service as unknown as { deps: { forkWorker: (init: unknown) => unknown } }).deps.forkWorker;
    (service as unknown as { deps: { forkWorker: (init: unknown) => unknown } }).deps.forkWorker = init => {
      forks.push(init);
      return original(init);
    };
    const first = service.generate({ requestId: 'r1', task: 'chat', workspaceId: 'ws', question: 'hola' });
    workers[0].exit(1);
    await first;
    void service.generate({ requestId: 'r2', task: 'chat', workspaceId: 'ws', question: 'hola' });
    expect(forks).toMatchObject([{ gpu: 'auto' }, { gpu: false }]);
  });

  it('detener reenvía el pedido al worker', () => {
    const { service, install, workers } = setup();
    install();
    void service.generate({ requestId: 'r1', task: 'chat', workspaceId: 'ws', question: 'hola' });
    service.abort('r1');
    expect(workers[0].received.at(-1)).toEqual({ type: 'abort', id: 'r1' });
  });
});

describe('borrar', () => {
  it('no se puede durante la sesión; fuera de ella borra el archivo', () => {
    const { service, install, flags } = setup();
    install();
    flags.active = true;
    expect(() => service.removeModel()).toThrow(/sesión/);
    flags.active = false;
    expect(service.removeModel().state).toBe('not-installed');
  });
});

vi.setConfig({ testTimeout: 10_000 });
