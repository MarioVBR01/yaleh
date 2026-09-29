/**
 * @file controller.ts
 * @description Controlador de la sesión de concentración. Vive en el proceso
 * principal y es la única autoridad sobre el tiempo y el bloqueo:
 * inactiva → activa → terminada (brief, sección 4.3).
 *
 * No hay salida anticipada: la sesión solo termina al cumplirse el tiempo
 * (o con la salida de desarrollo, que solo existe sin empaquetar).
 */

import type {
  ConnectionMode,
  SessionEndReason,
  SessionMode,
  SessionSnapshot,
  SessionStatus,
} from '../../shared/ipc-types';
import type { PersistedSession, SessionEvent, SessionStore } from './store';

export interface SessionControllerDeps {
  store: SessionStore;
  /** Duración mínima y máxima permitida, en segundos. */
  minSeconds: number;
  maxSeconds: number;
  /** Bloquea el equipo (kiosko). */
  lock: () => void;
  /** Libera el equipo. */
  unlock: () => void;
  /** Tiempo restante, una vez por segundo mientras la sesión está activa. */
  onTick: (remainingSeconds: number) => void;
  onEnded: (reason: SessionEndReason) => void;
  now?: () => number;
  newId?: () => string;
}

export class SessionController {
  private status: SessionStatus = 'idle';
  private current: PersistedSession | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(private readonly deps: SessionControllerDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.newId = deps.newId ?? (() => crypto.randomUUID());
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  getSnapshot(): SessionSnapshot {
    return {
      status: this.status,
      sessionId: this.current?.id ?? null,
      mode: this.current?.mode ?? null,
      durationSeconds: this.current?.durationSeconds ?? 0,
      remainingSeconds: this.remainingSeconds(),
    };
  }

  /**
   * Revisa al arrancar si quedó una sesión activa sin terminar (apagado,
   * reinicio o cierre forzado). La registra como interrumpida y, si aún queda
   * tiempo, la deja disponible para retomarla.
   */
  recover(): SessionSnapshot {
    const saved = this.deps.store.loadSession();
    if (!saved || saved.status !== 'active') return this.getSnapshot();

    const expired = this.now() >= saved.endsAt;
    this.log('session-interrupted', saved.id, expired ? 'expired' : 'resumable');

    if (expired) {
      this.deps.store.saveSession({ ...saved, status: 'interrupted' });
      return this.getSnapshot();
    }

    this.current = saved;
    this.status = 'resumable';
    return this.getSnapshot();
  }

  start(durationSeconds: number, mode: SessionMode, sessionId?: string): SessionSnapshot {
    if (this.status === 'active') throw new Error('Ya hay una sesión activa.');
    if (this.status === 'resumable') {
      throw new Error('Hay una sesión interrumpida pendiente. Retómala o descártala primero.');
    }
    if (
      !Number.isInteger(durationSeconds) ||
      durationSeconds < this.deps.minSeconds ||
      durationSeconds > this.deps.maxSeconds
    ) {
      throw new Error('Duración de sesión no válida.');
    }
    if (mode !== 'online' && mode !== 'offline') {
      throw new Error('Modo de sesión no válido.');
    }
    if (sessionId !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
      throw new Error('Identificador de sesión no válido.');
    }

    const startedAt = this.now();
    this.current = {
      id: sessionId ?? this.newId(),
      mode,
      startedAt,
      endsAt: startedAt + durationSeconds * 1000,
      durationSeconds,
      status: 'active',
    };
    this.deps.store.saveSession(this.current);
    this.log('session-started', this.current.id, `${mode}, ${durationSeconds}s`);
    this.activate();
    return this.getSnapshot();
  }

  resume(): SessionSnapshot {
    if (this.status !== 'resumable' || !this.current) {
      throw new Error('No hay ninguna sesión para retomar.');
    }
    if (this.now() >= this.current.endsAt) {
      this.deps.store.saveSession({ ...this.current, status: 'interrupted' });
      this.current = null;
      this.status = 'idle';
      throw new Error('El tiempo de la sesión interrumpida ya terminó.');
    }
    this.log('session-resumed', this.current.id, `${this.remainingSeconds()}s restantes`);
    this.activate();
    return this.getSnapshot();
  }

  discardResume(): SessionSnapshot {
    if (this.status === 'resumable' && this.current) {
      this.deps.store.saveSession({ ...this.current, status: 'interrupted' });
      this.current = null;
      this.status = 'idle';
    }
    return this.getSnapshot();
  }

  /** Salida de desarrollo: libera el kiosko de inmediato. Solo sin empaquetar. */
  forceRelease(): void {
    if (!this.isActive() || !this.current) return;
    this.log('dev-release', this.current.id);
    this.finish('dev-release');
  }

  /** Registra una pérdida de foco de la ventana durante la sesión. */
  recordFocusLost(): void {
    if (this.isActive()) this.log('focus-lost', this.current?.id ?? null);
  }

  /**
   * Registra que se perdió o se recuperó la conexión durante la sesión.
   * El kiosko sigue bloqueado y el tiempo sigue corriendo: no cambia nada más.
   */
  recordConnectionChange(mode: ConnectionMode, previous: ConnectionMode): void {
    if (!this.isActive()) return;
    if (mode === 'offline' && previous === 'online') this.log('connection-lost', this.current?.id ?? null);
    if (mode === 'online' && previous === 'offline') this.log('connection-restored', this.current?.id ?? null);
  }

  /** Detiene el intervalo (al cerrar la app). No cambia el estado guardado. */
  dispose(): void {
    this.clearTimer();
  }

  private remainingSeconds(): number {
    if (!this.current || (this.status !== 'active' && this.status !== 'resumable')) return 0;
    return Math.max(0, Math.ceil((this.current.endsAt - this.now()) / 1000));
  }

  private activate(): void {
    this.status = 'active';
    this.deps.lock();
    this.deps.onTick(this.remainingSeconds());
    this.clearTimer();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    const remaining = this.remainingSeconds();
    if (remaining <= 0) {
      this.finish('completed');
    } else {
      this.deps.onTick(remaining);
    }
  }

  private finish(reason: SessionEndReason): void {
    this.clearTimer();
    if (this.current) {
      this.current = { ...this.current, status: 'finished' };
      this.deps.store.saveSession(this.current);
      this.log('session-finished', this.current.id, reason);
    }
    this.status = 'finished';
    this.deps.unlock();
    this.deps.onTick(0);
    this.deps.onEnded(reason);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private log(type: SessionEvent['type'], sessionId: string | null, detail?: string): void {
    this.deps.store.appendEvent({
      type,
      at: new Date(this.now()).toISOString(),
      sessionId,
      ...(detail ? { detail } : {}),
    });
  }
}
