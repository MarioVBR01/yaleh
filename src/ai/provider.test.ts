/**
 * Proveedor común del asistente (revisión 1.8): selección según conexión y modelo,
 * y el proveedor local (texto parcial, validación del JSON y funciones solo en línea).
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { ConnectionMode, LocalAiState, SessionMode } from '@shared/ipc-types';
import { createElectronMock, makeLocalAiStatus, uninstallElectronMock } from '../test/electron-mock';
import { AssistantError, createLocalProvider, geminiProvider, selectAssistant } from './provider';

afterEach(() => uninstallElectronMock());

const choose = (isDesktop: boolean, sessionMode: SessionMode | null, connection: ConnectionMode, local: LocalAiState | null) =>
  selectAssistant({ isDesktop, sessionMode, connection, localAi: local ? makeLocalAiStatus({ state: local }) : null });

describe('selectAssistant', () => {
  it('web: siempre el asistente en línea', () => {
    expect(choose(false, null, 'online', null)).toEqual({ kind: 'online' });
  });

  it('escritorio, sesión online con conexión: en línea aunque el modelo esté instalado', () => {
    expect(choose(true, 'online', 'online', 'installed')).toEqual({ kind: 'online' });
  });

  it('sin conexión y con el modelo instalado: el local', () => {
    expect(choose(true, 'offline', 'offline', 'installed')).toEqual({ kind: 'local' });
    // Una sesión online que pierde la conexión pasa al local.
    expect(choose(true, 'online', 'offline', 'installed')).toEqual({ kind: 'local' });
  });

  it('sin conexión y sin modelo: ninguno, con la indicación para descargarlo', () => {
    expect(choose(true, 'offline', 'offline', 'not-installed')).toEqual({ kind: 'none', reason: 'needs-download' });
    expect(choose(true, 'offline', 'offline', 'paused')).toEqual({ kind: 'none', reason: 'needs-download' });
    expect(choose(true, 'offline', 'offline', null)).toEqual({ kind: 'none', reason: 'needs-download' });
  });

  it('equipo sin requisitos: ninguno, con ese motivo', () => {
    expect(choose(true, 'offline', 'offline', 'unsupported')).toEqual({ kind: 'none', reason: 'unsupported' });
  });
});

describe('funciones de cada proveedor', () => {
  it('en línea: todo; sin conexión: chat, resumen y tarjetas', () => {
    const local = createLocalProvider(createElectronMock().api);
    expect(['chat', 'summary', 'quiz', 'flashcards', 'report', 'wikipedia'].every(f => geminiProvider.supports(f as never))).toBe(true);
    expect(['chat', 'summary', 'flashcards'].every(f => local.supports(f as never))).toBe(true);
    expect(['quiz', 'report', 'wikipedia'].some(f => local.supports(f as never))).toBe(false);
    expect(local.label).toBe('Asistente sin conexión');
    expect(geminiProvider.label).toBe('Asistente en línea');
  });
});

describe('proveedor local', () => {
  const context = { loadSources: async () => [], workspaceId: 'ws1' };

  it('chat: entrega el texto parcial y la respuesta completa', async () => {
    const mock = createElectronMock({ localAiResult: { ok: true, text: 'Hola desde el modelo', stats: {} as never } });
    const partials: string[] = [];
    const text = await createLocalProvider(mock.api).chat({ question: '¿Qué es?', history: [], searchResults: [] }, context, p =>
      partials.push(p)
    );
    expect(text).toBe('Hola desde el modelo');
    expect(partials).toEqual(['Hola desde', 'Hola desde el modelo']);
    expect(mock.api.localAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'chat', workspaceId: 'ws1', question: '¿Qué es?', history: [] })
    );
  });

  it('tarjetas: valida el JSON y devuelve el contenido de estudio', async () => {
    const json = JSON.stringify({ cards: [{ front: '¿Qué es la célula?', back: 'La unidad básica de la vida.' }] });
    const mock = createElectronMock({ localAiResult: { ok: true, text: json, stats: {} as never } });
    const content = await createLocalProvider(mock.api).study('flashcards', context);
    expect(content).toEqual({ kind: 'flashcards', data: { cards: [{ front: '¿Qué es la célula?', back: 'La unidad básica de la vida.' }] } });
  });

  it('un error del modelo llega como AssistantError con su mensaje', async () => {
    const mock = createElectronMock({ localAiResult: { ok: false, message: 'El asistente sin conexión no está instalado.' } });
    await expect(createLocalProvider(mock.api).study('summary', context)).rejects.toThrow(AssistantError);
  });

  it('cuestionario e informe: solo con conexión', async () => {
    const mock = createElectronMock();
    await expect(createLocalProvider(mock.api).study('quiz', context)).rejects.toThrow(/solo está disponible con conexión/);
    expect(mock.api.localAi.generate).not.toHaveBeenCalled();
  });

  it('detener pide al proceso principal que corte la respuesta', async () => {
    const mock = createElectronMock();
    const controller = new AbortController();
    controller.abort();
    await createLocalProvider(mock.api).chat({ question: 'x', history: [], searchResults: [] }, context, () => {}, controller.signal);
    // La señal ya abortada no dispara el evento; se aborta durante la generación:
    const live = new AbortController();
    const pending = createLocalProvider(mock.api).chat({ question: 'y', history: [], searchResults: [] }, context, () => live.abort(), live.signal);
    await pending;
    expect(mock.api.localAi.abort).toHaveBeenCalledTimes(1);
  });
});
