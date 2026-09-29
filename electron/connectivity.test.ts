// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectivityMonitor, createHttpProbe, type Probe } from './connectivity';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Red simulada: el sistema tiene o no red, y el servidor responde o no. */
function fakeNetwork(initial: { systemOnline: boolean; serverReachable: boolean }) {
  const net = { ...initial };
  const probe = vi.fn<Probe>(async () => net.serverReachable);
  return { net, probe };
}

function createMonitor(net: { systemOnline: boolean }, probe: Probe) {
  const onChange = vi.fn();
  const monitor = new ConnectivityMonitor({
    isOnline: () => net.systemOnline,
    probe,
    intervalMs: 30_000,
    onChange,
  });
  return { monitor, onChange };
}

describe('ConnectivityMonitor', () => {
  it('empieza en "unknown"', () => {
    const { net, probe } = fakeNetwork({ systemOnline: true, serverReachable: true });
    expect(createMonitor(net, probe).monitor.getMode()).toBe('unknown');
  });

  it('online si el sistema tiene red y la web de YALEH responde', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: true, serverReachable: true });
    const { monitor, onChange } = createMonitor(net, probe);

    await expect(monitor.start()).resolves.toBe('online');
    expect(onChange).toHaveBeenCalledWith('online', 'unknown');
    monitor.stop();
  });

  it('offline sin red del sistema, sin intentar la petición', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: false, serverReachable: true });
    const { monitor } = createMonitor(net, probe);

    await expect(monitor.start()).resolves.toBe('offline');
    expect(probe).not.toHaveBeenCalled();
    monitor.stop();
  });

  it('offline si hay red pero la web no responde (por ejemplo, un portal cautivo caído)', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: true, serverReachable: false });
    const { monitor } = createMonitor(net, probe);
    await expect(monitor.start()).resolves.toBe('offline');
    monitor.stop();
  });

  it('vuelve a comprobar cada 30 segundos y avisa solo cuando el modo cambia', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: true, serverReachable: true });
    const { monitor, onChange } = createMonitor(net, probe);
    await monitor.start();
    onChange.mockClear();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();

    net.systemOnline = false;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(onChange).toHaveBeenCalledWith('offline', 'online');

    net.systemOnline = true;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(onChange).toHaveBeenLastCalledWith('online', 'offline');
    monitor.stop();
  });

  it('check() permite una comprobación inmediata (eventos de red, "Reintentar conexión")', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: false, serverReachable: true });
    const { monitor } = createMonitor(net, probe);
    await monitor.start();

    net.systemOnline = true;
    await expect(monitor.check()).resolves.toBe('online');
    monitor.stop();
  });

  it('las comprobaciones simultáneas comparten una sola petición', async () => {
    let resolveProbe: (value: boolean) => void = () => {};
    const probe = vi.fn<Probe>(() => new Promise<boolean>(resolve => (resolveProbe = resolve)));
    const { monitor } = createMonitor({ systemOnline: true }, probe);

    const first = monitor.check();
    const second = monitor.check();
    resolveProbe(true);

    await expect(Promise.all([first, second])).resolves.toEqual(['online', 'online']);
    expect(probe).toHaveBeenCalledOnce();
  });

  it('stop() detiene las comprobaciones periódicas', async () => {
    const { net, probe } = fakeNetwork({ systemOnline: true, serverReachable: true });
    const { monitor } = createMonitor(net, probe);
    await monitor.start();
    monitor.stop();

    await vi.advanceTimersByTimeAsync(120_000);
    expect(probe).toHaveBeenCalledOnce();
  });
});

describe('createHttpProbe', () => {
  it('cualquier respuesta HTTP cuenta como conexión (también 404 o 500)', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 500 }));
    await expect(createHttpProbe(fetchImpl, 'https://yaleh.test/', 5000)()).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('https://yaleh.test/', expect.objectContaining({ method: 'HEAD' }));
  });

  it('un error de red (DNS, TLS, sin conexión) cuenta como offline', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('net::ERR_INTERNET_DISCONNECTED');
    });
    await expect(createHttpProbe(fetchImpl, 'https://yaleh.test/', 5000)()).resolves.toBe(false);
  });

  it('si no responde en 5 segundos cuenta como offline y cancela la petición', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init: { signal: AbortSignal }) => {
      signal = init.signal;
      return new Promise(() => {});
    });
    const result = createHttpProbe(fetchImpl, 'https://yaleh.test/', 5000)();

    await vi.advanceTimersByTimeAsync(4999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe(false);
    expect(signal?.aborted).toBe(true);
  });
});
