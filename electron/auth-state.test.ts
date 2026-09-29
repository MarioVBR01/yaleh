// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AUTH_STATE_TTL_MS, checkAuthState, createAuthState } from './auth-state';
import { parseDeepLink } from './deeplink';

describe('state del inicio de sesión del escritorio', () => {
  it('genera states aleatorios que el enlace yaleh://auth acepta', () => {
    const a = createAuthState();
    const b = createAuthState();
    expect(a.state).not.toBe(b.state);
    expect(parseDeepLink(`yaleh://auth?token=abc&state=${a.state}`)).toMatchObject({ state: a.state });
  });

  it('acepta el mismo state antes de caducar', () => {
    const pending = createAuthState(1000);
    expect(checkAuthState(pending, pending.state, 1000 + 60_000)).toBe('ok');
  });

  it('rechaza sin intento pendiente, con otro state, sin state o caducado', () => {
    const pending = createAuthState(1000);
    expect(checkAuthState(null, pending.state, 1000)).toBe('no-pending');
    expect(checkAuthState(pending, createAuthState().state, 1000)).toBe('mismatch');
    expect(checkAuthState(pending, 'corto', 1000)).toBe('mismatch');
    expect(checkAuthState(pending, null, 1000)).toBe('mismatch');
    expect(checkAuthState(pending, pending.state, 1000 + AUTH_STATE_TTL_MS + 1)).toBe('expired');
  });
});
