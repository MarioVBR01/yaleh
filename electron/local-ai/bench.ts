/**
 * @file bench.ts
 * @description Medición del asistente sin conexión en el equipo actual (npm run bench:local-ai).
 * Usa lo mismo que la app: LocalAiService, la recuperación FTS5, las instrucciones y el
 * utilityProcess con node-llama-cpp. Fuente de prueba: docs/BRIEF_YALEH.md (texto real en español).
 * Necesita el modelo ya descargado en %APPDATA%\yaleh\models. Escribe docs/mediciones/ia-local-{gpu,cpu}.md.
 * Solo sin empaquetar.
 */

import { app, utilityProcess } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LOCAL_AI } from '../../shared/config';
import type { LocalAiRequest, LocalAiResult } from '../../shared/ipc-types';
import { parseStudyOutput } from '../../src/ai/study-items';
import { runMigrations } from '../db/migrations';
import { WorkspaceRepository } from '../db/workspace-repository';
import { LocalAiService, type WorkerHandle } from './service';

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs', 'BRIEF_YALEH.md');
/** BENCH_GPU=off mide solo con la CPU y BENCH_GPU=auto con la GPU; por defecto, LOCAL_AI.gpu. */
const GPU: false | 'auto' = process.env.BENCH_GPU === 'off' ? false : process.env.BENCH_GPU === 'auto' ? 'auto' : LOCAL_AI.gpu;
const OUTPUT = path.join(ROOT, 'docs', 'mediciones', GPU ? 'ia-local-gpu.md' : 'ia-local-cpu.md');

interface Row {
  name: string;
  result: LocalAiResult;
  valid: string;
  preview: string;
}

const s = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const num = (n: number) => String(n).replace('.', ',');

async function main(): Promise<void> {
  const modelsDir = path.join(app.getPath('appData'), 'yaleh', 'models');
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  const text = fs.readFileSync(SOURCE, 'utf8');
  new WorkspaceRepository(db).addSource('bench', { id: 'brief', name: 'BRIEF_YALEH.md', type: 'text/markdown', size: text.length }, text);

  const service = new LocalAiService({
    modelsDir,
    db,
    isOnline: () => false,
    isSessionActive: () => false,
    sendStatus: () => {},
    sendChunk: () => {},
    gpu: GPU,
    forkWorker: init =>
      utilityProcess.fork(path.join(__dirname, 'ai-worker.mjs'), [JSON.stringify(init)], {
        serviceName: 'YALEH asistente sin conexión (medición)',
        stdio: 'inherit',
      }) as unknown as WorkerHandle,
  });
  if (!service.isInstalled()) {
    console.error(`[bench] No está el modelo en ${modelsDir}. Descárgalo desde la bienvenida de YALEH.`);
    app.exit(1);
    return;
  }

  const runs: { name: string; request: Omit<LocalAiRequest, 'requestId'> }[] = [
    { name: 'Chat (primera pregunta, incluye cargar el modelo)', request: { task: 'chat', workspaceId: 'bench', question: '¿Qué es YALEH y para quién está pensado?' } },
    { name: 'Chat (segunda pregunta, modelo ya cargado)', request: { task: 'chat', workspaceId: 'bench', question: '¿Cómo se une la aplicación web con la de escritorio?' } },
    { name: 'Resumen', request: { task: 'summary', workspaceId: 'bench' } },
    { name: 'Tarjetas de estudio', request: { task: 'flashcards', workspaceId: 'bench' } },
  ];

  const rows: Row[] = [];
  for (const [i, run] of runs.entries()) {
    console.log(`[bench] ${run.name}…`);
    const result = await service.generate({ ...run.request, requestId: `bench-${i}` });
    let valid = 'sí';
    let preview = '';
    if (result.ok) {
      if (run.request.task === 'chat') preview = result.text.slice(0, 300);
      else {
        try {
          const content = parseStudyOutput(run.request.task, result.text);
          preview =
            content.kind === 'summary'
              ? `${content.data.title} — ${content.data.keyPoints.length} puntos clave`
              : content.kind === 'flashcards'
                ? `${content.data.cards.length} tarjetas; primera: ${content.data.cards[0].front}`
                : '';
        } catch (error) {
          valid = `no (${(error as Error).message})`;
        }
      }
      console.log(`[bench]   ${result.stats.tokens} tokens, ${result.stats.tokensPerSecond} tokens/s, total ${s(result.stats.totalMs)}`);
    } else {
      valid = 'no';
      console.log(`[bench]   error: ${result.message}`);
    }
    rows.push({ name: run.name, result, valid, preview });
  }
  service.shutdown();

  const cpu = os.cpus()[0]?.model.trim() ?? 'desconocida';
  const table = rows
    .map(r =>
      r.result.ok
        ? `| ${r.name} | ${r.result.stats.loadMs ? s(r.result.stats.loadMs) : '—'} | ${s(r.result.stats.firstTokenMs)} | ${r.result.stats.tokens} | ${num(r.result.stats.tokensPerSecond)} | ${s(r.result.stats.totalMs)} | ${r.result.stats.passages} (${r.result.stats.sourceChars.toLocaleString('es-BO')} car.) | ${r.valid} |`
        : `| ${r.name} | — | — | — | — | — | — | error: ${r.result.message} |`
    )
    .join('\n');
  const samples = rows.map(r => `- **${r.name}:** ${r.preview.replace(/\s+/g, ' ')}`).join('\n');

  const md = `# Mediciones del asistente sin conexión

Medido con \`npm run bench:local-ai\` el ${new Date().toLocaleString('es-BO')}.

- **Equipo:** ${cpu}, ${os.cpus().length} hilos, ${(os.totalmem() / 1024 ** 3).toFixed(1).replace('.', ',')} GB de RAM, ${os.version()}.
- **Modelo:** ${LOCAL_AI.displayName} (GGUF Q4_K_M, ${(LOCAL_AI.sizeBytes / 1024 ** 3).toFixed(2).replace('.', ',')} GB), llama.cpp vía node-llama-cpp en un utilityProcess de Electron, ${GPU ? 'con GPU (Vulkan)' : 'solo CPU'}, contexto de ${LOCAL_AI.contextSize} tokens, "pensamiento" desactivado.
- **Fuente:** \`docs/BRIEF_YALEH.md\` (${text.length.toLocaleString('es-BO')} caracteres). Al modelo se envían como máximo ${LOCAL_AI.sourceBudgetChars.toLocaleString('es-BO')} caracteres de fragmentos (FTS5 para el chat; repartidos para resumen y tarjetas).

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Fragmentos enviados | Salida válida |
| --- | --- | --- | --- | --- | --- | --- | --- |
${table}

"Hasta el primer texto" incluye leer los fragmentos (procesar el contexto); "Tokens/s" es la velocidad de generación después del primer texto. "Tiempo total" va desde el pedido hasta la respuesta completa (incluye la carga del modelo en la primera prueba).

## Muestras de las respuestas

${samples}
`;
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, md);
  console.log(`[bench] Resultados en ${OUTPUT}`);
  app.exit(0);
}

app.whenReady().then(() =>
  main().catch(error => {
    console.error('[bench] Falló:', error);
    app.exit(1);
  })
);
