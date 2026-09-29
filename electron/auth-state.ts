/**
 * @file auth-state.ts
 * @description `state` del inicio de sesión del escritorio (brief, sección 4.5).
 * El escritorio lo genera, lo envía a auth-desktop.html y solo acepta un
 * yaleh://auth que lo devuelva igual, una sola vez y antes de que caduque.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

export interface PendingAuth {
  state: string;
  createdAt: number;
}

/** Un intento de inicio de sesión caduca a los 10 minutos. */
export const AUTH_STATE_TTL_MS = 10 * 60_000;

export function createAuthState(now: number = Date.now()): PendingAuth {
  return { state: randomBytes(24).toString('base64url'), createdAt: now };
}

export type AuthStateCheck = 'ok' | 'no-pending' | 'mismatch' | 'expired';

export function checkAuthState(
  pending: PendingAuth | null,
  received: string | null,
  now: number = Date.now(),
  ttlMs: number = AUTH_STATE_TTL_MS
): AuthStateCheck {
  if (!pending) return 'no-pending';
  if (!received) return 'mismatch';
  const a = Buffer.from(pending.state);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'mismatch';
  if (now - pending.createdAt > ttlMs) return 'expired';
  return 'ok';
}
