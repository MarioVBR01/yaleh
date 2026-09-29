/**
 * @file connectivity.ts
 * @description Detección del modo de conexión en el proceso principal.
 * Online si el sistema tiene red (net.isOnline) y la web de YALEH responde a
 * una petición HTTPS antes del tiempo límite; cualquier respuesta HTTP cuenta.
 */

import type { ConnectionMode } from '../shared/ipc-types';

/** Devuelve true si el servidor respondió (con cualquier código HTTP). */
export type Probe = () => Promise<boolean>;

type FetchLike = (url: string, init: { method: string; signal: AbortSignal }) => Promise<unknown>;

/**
 * Crea una comprobación HTTP: true si llega una respuesta antes de `timeoutMs`;
 * false si la petición falla (sin red, DNS, TLS) o se agota el tiempo.
 */
export function createHttpProbe(fetchImpl: FetchLike, url: string, timeoutMs: number): Probe {
  return () => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<boolean>(resolve => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, timeoutMs);
    });
    const request = fetchImpl(url, { method: 'HEAD', signal: controller.signal }).then(
      () => true,
      () => false
    );
    return Promise.race([request, timeout]).finally(() => clearTimeout(timer));
  };
}

export interface ConnectivityMonitorDeps {
  /** Indica si el sistema operativo tiene alguna red (Electron: net.isOnline). */
  isOnline: () => boolean;
  probe: Probe;
  intervalMs: number;
  /** Se llama solo cuando el modo cambia (incluida la primera comprobación). */
  onChange: (mode: ConnectionMode, previous: ConnectionMode) => void;
}

export class ConnectivityMonitor {
  private mode: ConnectionMode = 'unknown';
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<ConnectionMode> | null = null;

  constructor(private readonly deps: ConnectivityMonitorDeps) {}

  getMode(): ConnectionMode {
    return this.mode;
  }

  /** Comprueba ahora y luego cada `intervalMs`. */
  start(): Promise<ConnectionMode> {
    this.stop();
    this.timer = setInterval(() => void this.check(), this.deps.intervalMs);
    return this.check();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Comprueba la conexión. Si ya hay una comprobación en curso, reutiliza su resultado. */
  check(): Promise<ConnectionMode> {
    if (!this.inFlight) {
      this.inFlight = this.runCheck().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  private async runCheck(): Promise<ConnectionMode> {
    let next: ConnectionMode;
    if (!this.deps.isOnline()) {
      next = 'offline';
    } else {
      next = (await this.deps.probe()) ? 'online' : 'offline';
    }
    if (next !== this.mode) {
      const previous = this.mode;
      this.mode = next;
      this.deps.onChange(next, previous);
    }
    return next;
  }
}
