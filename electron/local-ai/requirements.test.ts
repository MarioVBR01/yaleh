// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LOCAL_AI } from '../../shared/config';
import { evaluateRequirements } from './requirements';
import { buildWorkerRequest, LOCAL_SCHEMAS, trimHistory } from './prompts';

const GB = 1024 ** 3;

describe('evaluateRequirements', () => {
  it('equipo con 16 GB y disco libre: cumple', () => {
    const r = evaluateRequirements({ ramBytes: 16 * GB, freeDiskBytes: 50 * GB });
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.requiredDiskBytes).toBe(LOCAL_AI.sizeBytes + LOCAL_AI.diskMarginBytes);
  });

  it('un equipo de 8 GB (Windows informa ~7,8 GB) cumple; uno de 4 GB no', () => {
    expect(evaluateRequirements({ ramBytes: 7.8 * GB, freeDiskBytes: 50 * GB }).ok).toBe(true);
    const low = evaluateRequirements({ ramBytes: 4 * GB, freeDiskBytes: 50 * GB });
    expect(low.ok).toBe(false);
    expect(low.problems[0]).toMatch(/4,0 GB de RAM.*al menos 8 GB/);
  });

  it('sin espacio en disco no cumple y dice cuánto falta', () => {
    const r = evaluateRequirements({ ramBytes: 16 * GB, freeDiskBytes: 1 * GB });
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/1,0 GB libres.*necesita 3,1 GB/);
  });

  it('una descarga a medias necesita menos espacio; un modelo instalado, ninguno', () => {
    const partial = evaluateRequirements({ ramBytes: 16 * GB, freeDiskBytes: 2 * GB, alreadyDownloaded: 2 * GB });
    expect(partial.ok).toBe(true);
    expect(evaluateRequirements({ ramBytes: 16 * GB, freeDiskBytes: 0, installed: true }).ok).toBe(true);
  });

  it('si no se puede medir el disco, decide solo por la RAM', () => {
    expect(evaluateRequirements({ ramBytes: 16 * GB, freeDiskBytes: null }).ok).toBe(true);
  });
});

describe('buildWorkerRequest', () => {
  it('chat: fragmentos y pregunta en el mensaje, historial recortado, sin esquema', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', text: `turno ${i}` }));
    const req = buildWorkerRequest({ requestId: 'r1', task: 'chat', workspaceId: 'w', question: '¿Qué es?', history }, 'FRAGMENTOS: x');
    expect(req.prompt).toBe('FRAGMENTOS: x\n\nPREGUNTA DEL ESTUDIANTE: ¿Qué es?');
    expect(req.history).toHaveLength(LOCAL_AI.historyTurns);
    expect(req.history.at(-1)?.text).toBe('turno 9');
    expect(req.schema).toBeUndefined();
    expect(req.maxTokens).toBe(LOCAL_AI.maxTokens.chat);
  });

  it('tarjetas y resumen usan su esquema JSON', () => {
    expect(buildWorkerRequest({ requestId: 'r', task: 'flashcards', workspaceId: 'w' }, 'F').schema).toBe(LOCAL_SCHEMAS.flashcards);
    expect(buildWorkerRequest({ requestId: 'r', task: 'summary', workspaceId: 'w' }, 'F').schema).toBe(LOCAL_SCHEMAS.summary);
  });

  it('recorta turnos muy largos', () => {
    expect(trimHistory([{ role: 'user', text: 'a'.repeat(5000) }])[0].text).toHaveLength(1501);
  });
});
