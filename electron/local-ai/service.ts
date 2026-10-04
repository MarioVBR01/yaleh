/**
 * @file service.ts
 * @description Asistente sin conexión en el proceso principal (revisión 1.8):
 * - Estado: requisitos del equipo, descarga (con reanudación y SHA-256) e instalación.
 * - La descarga solo se permite con conexión y fuera de la sesión; si empieza una sesión,
 *   se pausa (nunca se descarga durante el kiosko).
 * - Generación: recupera fragmentos con FTS5 y delega en el utilityProcess del modelo,
 *   reenviando el texto parcial a la interfaz.
 * No importa 'electron': el utilityProcess se crea con `forkWorker` (inyectado), para poder probarlo.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { LOCAL_AI } from '../../shared/config';
import type { LocalAiChunk, LocalAiRequest, LocalAiResult, LocalAiStatus } from '../../shared/ipc-types';
import { DownloadError, downloadModel, partialSize, partPath, type DownloadProgress } from './downloader';
import { buildWorkerRequest } from './prompts';
import { evaluateRequirements, freeDiskBytes } from './requirements';
import { formatPassages, samplePassages, searchPassages } from './retrieval';
import type { FromWorker, ToWorker, WorkerInit } from './worker-protocol';

/** Lo que el servicio necesita de un utilityProcess. */
export interface WorkerHandle {
  postMessage(message: ToWorker): void;
  on(event: 'message', listener: (message: FromWorker) => void): void;
  on(event: 'exit', listener: (code: number) => void): void;
  kill(): void;
}

export interface LocalAiDeps {
  modelsDir: string;
  db: DatabaseSync;
  isOnline: () => boolean;
  isSessionActive: () => boolean;
  sendStatus: (status: LocalAiStatus) => void;
  sendChunk: (chunk: LocalAiChunk) => void;
  forkWorker: (init: WorkerInit) => WorkerHandle;
  /** Para las pruebas. */
  fetchImpl?: typeof fetch;
  totalMem?: () => number;
  freeDisk?: (dir: string) => number | null;
  target?: { url: string; sha256: string; sizeBytes: number; fileName: string };
  /** Reemplaza LOCAL_AI.gpu (solo la medición). */
  gpu?: false | 'auto';
}

interface Pending {
  resolve: (result: LocalAiResult) => void;
  sourceChars: number;
  passages: number;
}

export class LocalAiError extends Error {}

export class LocalAiService {
  private download: { controller: AbortController; progress: DownloadProgress } | null = null;
  private lastError: string | null = null;
  private worker: WorkerHandle | null = null;
  /** Después de una caída del proceso del modelo se usa solo la CPU (drivers de GPU problemáticos). */
  private cpuOnly = false;
  private readonly pending = new Map<string, Pending>();
  private readonly target;

  constructor(private readonly deps: LocalAiDeps) {
    this.target = deps.target ?? LOCAL_AI;
  }

  get modelFile(): string {
    return path.join(this.deps.modelsDir, this.target.fileName);
  }

  isInstalled(): boolean {
    try {
      return fs.statSync(this.modelFile).size === this.target.sizeBytes;
    } catch {
      return false;
    }
  }

  status(): LocalAiStatus {
    const installed = this.isInstalled();
    const downloaded = partialSize(this.modelFile);
    fs.mkdirSync(this.deps.modelsDir, { recursive: true });
    const requirements = evaluateRequirements({
      ramBytes: (this.deps.totalMem ?? os.totalmem)(),
      freeDiskBytes: (this.deps.freeDisk ?? freeDiskBytes)(this.deps.modelsDir),
      alreadyDownloaded: downloaded,
      installed,
    });
    let state: LocalAiStatus['state'];
    let receivedBytes = downloaded;
    if (this.download) {
      state = this.download.progress.phase;
      receivedBytes = this.download.progress.receivedBytes;
    } else if (!requirements.ok) state = 'unsupported';
    else if (installed) state = 'installed';
    else if (this.lastError) state = 'error';
    else if (downloaded > 0) state = 'paused';
    else state = 'not-installed';

    return {
      state,
      requirements,
      receivedBytes: installed ? this.target.sizeBytes : receivedBytes,
      totalBytes: this.target.sizeBytes,
      message: state === 'error' ? this.lastError : null,
      model: {
        name: LOCAL_AI.displayName,
        author: LOCAL_AI.author,
        license: LOCAL_AI.license,
        licenseUrl: LOCAL_AI.licenseUrl,
        sizeBytes: this.target.sizeBytes,
      },
    };
  }

  private emit(): void {
    this.deps.sendStatus(this.status());
  }

  /** Empieza o reanuda la descarga. Lanza LocalAiError con un mensaje para la interfaz si no se puede. */
  startDownload(): LocalAiStatus {
    if (this.download) return this.status();
    if (this.deps.isSessionActive()) throw new LocalAiError('No se puede descargar durante una sesión de concentración.');
    if (!this.deps.isOnline()) throw new LocalAiError('Necesitas conexión a internet para descargar el asistente.');
    const current = this.status();
    if (current.state === 'installed') return current;
    if (!current.requirements.ok) throw new LocalAiError(current.requirements.problems.join(' '));

    this.lastError = null;
    const controller = new AbortController();
    this.download = {
      controller,
      progress: { phase: 'downloading', receivedBytes: partialSize(this.modelFile), totalBytes: this.target.sizeBytes },
    };
    void downloadModel(
      { url: this.target.url, sha256: this.target.sha256, sizeBytes: this.target.sizeBytes, file: this.modelFile },
      {
        signal: controller.signal,
        fetchImpl: this.deps.fetchImpl,
        onProgress: progress => {
          if (this.download?.controller !== controller) return;
          this.download.progress = progress;
          this.emit();
        },
      }
    )
      .catch((error: unknown) => {
        if (error instanceof DownloadError && error.code === 'aborted') return;
        console.error('[local-ai] Descarga fallida:', error);
        this.lastError = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        if (this.download?.controller === controller) this.download = null;
        this.emit();
      });
    const status = this.status();
    this.deps.sendStatus(status);
    return status;
  }

  /** Pausa la descarga; el archivo parcial queda para reanudarla. */
  pauseDownload(): LocalAiStatus {
    if (this.download) {
      this.download.controller.abort();
      this.download = null;
    }
    const status = this.status();
    this.deps.sendStatus(status);
    return status;
  }

  /** Al empezar una sesión: nunca se descarga durante el kiosko. */
  onSessionStarted(): void {
    if (this.download) this.pauseDownload();
  }

  removeModel(): LocalAiStatus {
    if (this.deps.isSessionActive()) throw new LocalAiError('No se puede borrar el asistente durante una sesión.');
    this.pauseDownload();
    this.releaseModel();
    fs.rmSync(this.modelFile, { force: true });
    fs.rmSync(partPath(this.modelFile), { force: true });
    this.lastError = null;
    const status = this.status();
    this.deps.sendStatus(status);
    return status;
  }

  /** Libera la memoria del modelo (al terminar la sesión o al borrarlo). */
  releaseModel(): void {
    const worker = this.worker;
    this.worker = null;
    worker?.kill();
    this.failPending('El asistente sin conexión se cerró.');
  }

  shutdown(): void {
    this.download?.controller.abort();
    this.download = null;
    this.releaseModel();
  }

  private failPending(message: string): void {
    for (const [, pending] of this.pending) pending.resolve({ ok: false, message });
    this.pending.clear();
  }

  private ensureWorker(): WorkerHandle {
    if (this.worker) return this.worker;
    const worker = this.deps.forkWorker({ modelPath: this.modelFile, contextSize: LOCAL_AI.contextSize, gpu: this.cpuOnly ? false : (this.deps.gpu ?? LOCAL_AI.gpu) });
    worker.on('message', message => this.onWorkerMessage(message));
    worker.on('exit', code => {
      if (this.worker !== worker) return;
      this.worker = null;
      console.error(`[local-ai] El proceso del modelo terminó (código ${code}). El próximo intento usará solo la CPU.`);
      this.cpuOnly = true;
      this.failPending('El asistente sin conexión se detuvo inesperadamente. Vuelve a intentarlo.');
    });
    this.worker = worker;
    return worker;
  }

  private onWorkerMessage(message: FromWorker): void {
    if (message.type === 'loaded') {
      console.log(`[local-ai] Modelo cargado en ${message.loadMs} ms.`);
      return;
    }
    if (message.type === 'chunk') {
      this.deps.sendChunk({ requestId: message.id, text: message.text, tokens: message.tokens });
      return;
    }
    const pending = message.id ? this.pending.get(message.id) : undefined;
    if (!pending || !message.id) return;
    this.pending.delete(message.id);
    if (message.type === 'error') {
      pending.resolve({ ok: false, message: message.aborted ? message.message : `El asistente sin conexión falló: ${message.message}`, aborted: message.aborted });
      return;
    }
    const generationMs = Math.max(1, message.totalMs - message.firstTokenMs - message.loadMs);
    pending.resolve({
      ok: true,
      text: message.text,
      stats: {
        tokens: message.tokens,
        firstTokenMs: message.firstTokenMs,
        totalMs: message.totalMs,
        tokensPerSecond: Math.round((message.tokens / (generationMs / 1000)) * 10) / 10,
        sourceChars: pending.sourceChars,
        passages: pending.passages,
        loadMs: message.loadMs,
      },
    });
  }

  generate(request: LocalAiRequest): Promise<LocalAiResult> {
    const status = this.status();
    if (status.state !== 'installed') {
      return Promise.resolve({ ok: false, message: 'El asistente sin conexión no está instalado.' });
    }
    const passages =
      request.task === 'chat'
        ? searchPassages(this.deps.db, request.workspaceId, request.question ?? '', LOCAL_AI.sourceBudgetChars)
        : samplePassages(this.deps.db, request.workspaceId, LOCAL_AI.sourceBudgetChars);
    const workerRequest = buildWorkerRequest(request, formatPassages(passages));
    return new Promise(resolve => {
      this.pending.set(request.requestId, {
        resolve,
        sourceChars: passages.reduce((sum, p) => sum + p.text.length, 0),
        passages: passages.length,
      });
      this.ensureWorker().postMessage(workerRequest);
    });
  }

  abort(requestId: string): void {
    if (this.pending.has(requestId)) this.worker?.postMessage({ type: 'abort', id: requestId });
  }
}
