// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionController } from './controller';
import { MemorySessionStore, type PersistedSession } from './store';

const MIN = 60;
const MAX = 180 * 60;
const T0 = Date.parse('2026-09-28T10:00:00Z');

function setup(store = new MemorySessionStore()) {
  const lock = vi.fn();
  const unlock = vi.fn();
  const onTick = vi.fn();
  const onEnded = vi.fn();
  const controller = new SessionController({
    store,
    minSeconds: MIN,
    maxSeconds: MAX,
    lock,
    unlock,
    onTick,
    onEnded,
    newId: () => 'session-1',
  });
  return { controller, store, lock, unlock, onTick, onEnded };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionController: inactiva → activa → terminada', () => {
  it('empieza inactiva', () => {
    const { controller } = setup();
    expect(controller.getSnapshot()).toEqual({
      status: 'idle',
      sessionId: null,
      mode: null,
      durationSeconds: 0,
      remainingSeconds: 0,
    });
    expect(controller.isActive()).toBe(false);
  });

  it('al iniciar bloquea, guarda sessionEndsAt y envía el tiempo restante', () => {
    const { controller, store, lock, onTick } = setup();
    const snapshot = controller.start(120, 'offline');

    expect(snapshot.status).toBe('active');
    expect(snapshot.remainingSeconds).toBe(120);
    expect(lock).toHaveBeenCalledOnce();
    expect(onTick).toHaveBeenLastCalledWith(120);
    expect(store.session).toMatchObject({
      id: 'session-1',
      startedAt: T0,
      endsAt: T0 + 120_000,
      durationSeconds: 120,
      status: 'active',
    });
    expect(store.events.map(e => e.type)).toEqual(['session-started']);
  });

  it('envía el tiempo restante una vez por segundo', () => {
    const { controller, onTick } = setup();
    controller.start(120, 'offline');
    onTick.mockClear();

    vi.advanceTimersByTime(3000);

    expect(onTick.mock.calls.map(c => c[0])).toEqual([119, 118, 117]);
  });

  it('termina al cumplirse el tiempo: libera, guarda y avisa', () => {
    const { controller, store, unlock, onEnded } = setup();
    controller.start(60, 'offline');

    vi.advanceTimersByTime(59_000);
    expect(controller.isActive()).toBe(true);
    expect(unlock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(controller.isActive()).toBe(false);
    expect(controller.getSnapshot().status).toBe('finished');
    expect(unlock).toHaveBeenCalledOnce();
    expect(onEnded).toHaveBeenCalledWith('completed');
    expect(store.session?.status).toBe('finished');
    expect(store.events.at(-1)).toMatchObject({ type: 'session-finished', detail: 'completed' });
  });

  it('el tiempo se calcula con el reloj, no contando ticks', () => {
    const { controller, onEnded } = setup();
    controller.start(600, 'offline');
    // El equipo se suspende 10 minutos: al volver, la sesión ya terminó.
    vi.setSystemTime(T0 + 600_000);
    vi.advanceTimersByTime(1000);
    expect(onEnded).toHaveBeenCalledWith('completed');
  });

  it('rechaza una segunda sesión mientras hay una activa', () => {
    const { controller } = setup();
    controller.start(120, 'offline');
    expect(() => controller.start(120, 'offline')).toThrow('Ya hay una sesión activa.');
  });

  it.each([0, 59, MAX + 1, 90.5, Number.NaN])('rechaza la duración %s', duration => {
    const { controller, lock } = setup();
    expect(() => controller.start(duration, 'offline')).toThrow('Duración de sesión no válida.');
    expect(lock).not.toHaveBeenCalled();
  });

  it('acepta los límites exactos (1 y 180 minutos)', () => {
    expect(setup().controller.start(MIN, 'offline').status).toBe('active');
    expect(setup().controller.start(MAX, 'offline').status).toBe('active');
  });

  it('permite una nueva sesión después de terminar', () => {
    const { controller } = setup();
    controller.start(60, 'offline');
    vi.advanceTimersByTime(60_000);
    expect(controller.start(60, 'offline').status).toBe('active');
  });

  it('la salida de desarrollo libera de inmediato y queda registrada', () => {
    const { controller, store, unlock, onEnded } = setup();
    controller.start(600, 'offline');
    controller.forceRelease();

    expect(controller.isActive()).toBe(false);
    expect(unlock).toHaveBeenCalledOnce();
    expect(onEnded).toHaveBeenCalledWith('dev-release');
    expect(store.events.map(e => e.type)).toEqual(['session-started', 'dev-release', 'session-finished']);
  });

  it('la salida de desarrollo no hace nada sin sesión activa', () => {
    const { controller, unlock } = setup();
    controller.forceRelease();
    expect(unlock).not.toHaveBeenCalled();
  });

  it('registra las pérdidas de foco con fecha y hora solo durante la sesión', () => {
    const { controller, store } = setup();
    controller.recordFocusLost();
    expect(store.events).toHaveLength(0);

    controller.start(120, 'offline');
    vi.setSystemTime(T0 + 5000);
    controller.recordFocusLost();
    expect(store.events.at(-1)).toEqual({
      type: 'focus-lost',
      at: new Date(T0 + 5000).toISOString(),
      sessionId: 'session-1',
    });
  });

  it('dispose detiene los ticks', () => {
    const { controller, onTick } = setup();
    controller.start(120, 'offline');
    onTick.mockClear();
    controller.dispose();
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();
  });
});

describe('SessionController: sesiones interrumpidas', () => {
  const saved: PersistedSession = {
    id: 'prev',
    mode: 'offline',
    startedAt: T0,
    endsAt: T0 + 50 * 60_000,
    durationSeconds: 50 * 60,
    status: 'active',
  };

  function storeWith(session: PersistedSession | null) {
    const store = new MemorySessionStore();
    store.session = session;
    return store;
  }

  it('sin sesión guardada queda inactiva', () => {
    const { controller, store } = setup(storeWith(null));
    expect(controller.recover().status).toBe('idle');
    expect(store.events).toHaveLength(0);
  });

  it('ignora sesiones ya terminadas o interrumpidas', () => {
    for (const status of ['finished', 'interrupted'] as const) {
      const { controller, store } = setup(storeWith({ ...saved, status }));
      expect(controller.recover().status).toBe('idle');
      expect(store.events).toHaveLength(0);
    }
  });

  it('reapertura antes de sessionEndsAt: registra la interrupción y ofrece retomar', () => {
    vi.setSystemTime(T0 + 20 * 60_000);
    const { controller, store, lock } = setup(storeWith(saved));

    const snapshot = controller.recover();

    expect(snapshot).toEqual({
      status: 'resumable',
      sessionId: 'prev',
      mode: 'offline',
      durationSeconds: 50 * 60,
      remainingSeconds: 30 * 60,
    });
    expect(lock).not.toHaveBeenCalled();
    expect(store.events).toEqual([
      { type: 'session-interrupted', at: new Date(T0 + 20 * 60_000).toISOString(), sessionId: 'prev', detail: 'resumable' },
    ]);
  });

  it('retomar bloquea de nuevo con el tiempo restante y el mismo sessionEndsAt', () => {
    vi.setSystemTime(T0 + 20 * 60_000);
    const { controller, store, lock, onEnded } = setup(storeWith(saved));
    controller.recover();

    const snapshot = controller.resume();

    expect(snapshot.status).toBe('active');
    expect(snapshot.remainingSeconds).toBe(30 * 60);
    expect(lock).toHaveBeenCalledOnce();
    expect(store.session?.endsAt).toBe(saved.endsAt);
    expect(store.events.at(-1)?.type).toBe('session-resumed');

    vi.advanceTimersByTime(30 * 60_000);
    expect(onEnded).toHaveBeenCalledWith('completed');
  });

  it('no se puede iniciar otra sesión mientras hay una para retomar', () => {
    vi.setSystemTime(T0 + 20 * 60_000);
    const { controller } = setup(storeWith(saved));
    controller.recover();
    expect(() => controller.start(120, 'offline')).toThrow(/sesión interrumpida pendiente/);
  });

  it('descartar deja la sesión como interrumpida y permite empezar otra', () => {
    vi.setSystemTime(T0 + 20 * 60_000);
    const { controller, store } = setup(storeWith(saved));
    controller.recover();

    expect(controller.discardResume().status).toBe('idle');
    expect(store.session?.status).toBe('interrupted');
    expect(controller.start(120, 'offline').status).toBe('active');
  });

  it('reapertura después de sessionEndsAt: la registra como interrumpida y no ofrece retomar', () => {
    vi.setSystemTime(T0 + 60 * 60_000);
    const { controller, store } = setup(storeWith(saved));

    expect(controller.recover().status).toBe('idle');
    expect(store.session?.status).toBe('interrupted');
    expect(store.events).toEqual([
      { type: 'session-interrupted', at: new Date(T0 + 60 * 60_000).toISOString(), sessionId: 'prev', detail: 'expired' },
    ]);
  });

  it('si el tiempo se agota mientras se decide, retomar falla y la marca como interrumpida', () => {
    vi.setSystemTime(T0 + 49 * 60_000);
    const { controller, store, lock } = setup(storeWith(saved));
    controller.recover();

    vi.setSystemTime(T0 + 51 * 60_000);
    expect(() => controller.resume()).toThrow(/ya terminó/);
    expect(lock).not.toHaveBeenCalled();
    expect(store.session?.status).toBe('interrupted');
    expect(controller.getSnapshot().status).toBe('idle');
  });

  it('retomar sin sesión pendiente falla', () => {
    const { controller } = setup();
    expect(() => controller.resume()).toThrow('No hay ninguna sesión para retomar.');
  });
});

describe('SessionController: modo y conexión', () => {
  it('guarda el modo de la sesión y lo informa en el snapshot', () => {
    const { controller, store } = setup();
    expect(controller.start(120, 'online').mode).toBe('online');
    expect(store.session?.mode).toBe('online');
    expect(store.events[0]).toMatchObject({ type: 'session-started', detail: 'online, 120s' });
  });

  it('rechaza un modo inválido', () => {
    const { controller } = setup();
    expect(() => controller.start(120, 'hybrid' as never)).toThrow('Modo de sesión no válido.');
  });

  it('registra connection-lost y connection-restored durante la sesión, sin terminarla', () => {
    const { controller, store, unlock } = setup();
    controller.start(120, 'online');

    controller.recordConnectionChange('offline', 'online');
    controller.recordConnectionChange('online', 'offline');

    expect(store.events.map(e => e.type)).toEqual(['session-started', 'connection-lost', 'connection-restored']);
    expect(controller.isActive()).toBe(true);
    expect(unlock).not.toHaveBeenCalled();
  });

  it('no registra cambios de conexión sin sesión activa ni la primera detección', () => {
    const { controller, store } = setup();
    controller.recordConnectionChange('offline', 'online');
    controller.start(120, 'offline');
    controller.recordConnectionChange('online', 'unknown');
    expect(store.events.map(e => e.type)).toEqual(['session-started']);
  });
});
