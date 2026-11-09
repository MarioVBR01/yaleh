/**
 * Qué se muestra en el escritorio según el modo de la sesión y la conexión.
 */

import { describe, expect, it } from 'vitest';
import type { ConnectionMode, LocalAiState, SessionMode } from '@shared/ipc-types';
import { initialState } from '../store/appStore';
import { makeLocalAiStatus } from '../test/electron-mock';
import { getModeFlags } from './mode';

const flags = (sessionMode: SessionMode, connection: ConnectionMode, local: LocalAiState = 'not-installed') =>
  getModeFlags({ ...initialState, sessionMode, connection, localAi: makeLocalAiStatus({ state: local }) }, true);

describe('getModeFlags en el escritorio', () => {
  it('módulo IA Local con internet: sin herramientas ni Gemini y sin el aviso de sin conexión', () => {
    expect(flags('offline', 'online')).toEqual({
      isDesktop: true,
      onlineTools: false,
      assistant: { kind: 'none', reason: 'quick-needs-download' },
      offlineNotice: false,
    });
  });

  it('módulo IA Local con internet y el modelo instalado: responde la IA Local', () => {
    expect(flags('offline', 'online', 'installed')).toMatchObject({ onlineTools: false, assistant: { kind: 'local' }, offlineNotice: false });
  });

  it('sesión con .yaleh y conexión: herramientas y Gemini', () => {
    expect(flags('online', 'online')).toMatchObject({ onlineTools: true, assistant: { kind: 'online' }, offlineNotice: false });
  });

  it('sesión con .yaleh que pierde la conexión: avisa', () => {
    expect(flags('online', 'offline')).toMatchObject({ onlineTools: false, offlineNotice: true });
  });
});
