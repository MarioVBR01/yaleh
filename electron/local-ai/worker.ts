/**
 * @file worker.ts
 * @description Proceso del modelo local (utilityProcess de Electron; se compila a
 * dist-electron/ai-worker.mjs). Carga Qwen3.5-4B con node-llama-cpp la primera vez que
 * se le pide algo y atiende un pedido a la vez, para no bloquear la interfaz ni el proceso
 * principal. El modo de "pensamiento" de Qwen3.5 está desactivado: responde directo.
 */

import {
  getLlama,
  LlamaChatSession,
  QwenChatWrapper,
  type ChatHistoryItem,
  type Llama,
  type LlamaContextSequence,
  type LlamaGrammar,
} from 'node-llama-cpp';
import type { FromWorker, ToWorker, WorkerGenerate, WorkerInit } from './worker-protocol';

const init = JSON.parse(process.argv[2] ?? '{}') as WorkerInit;
const port = process.parentPort;
const send = (message: FromWorker) => port.postMessage(message);

let ready: Promise<{ llama: Llama; sequence: LlamaContextSequence; loadMs: number }> | null = null;
const grammars = new Map<string, Promise<LlamaGrammar>>();
const queue: WorkerGenerate[] = [];
const aborts = new Map<string, AbortController>();
let running = false;
let firstLoadReported = false;

function load() {
  ready ??= (async () => {
    const started = Date.now();
    const llama = await getLlama({ gpu: init.gpu });
    const model = await llama.loadModel({ modelPath: init.modelPath });
    const context = await model.createContext({ contextSize: init.contextSize, sequences: 1 });
    const loadMs = Date.now() - started;
    send({ type: 'loaded', loadMs });
    return { llama, sequence: context.getSequence(), loadMs };
  })();
  return ready;
}

function toHistory(request: WorkerGenerate): ChatHistoryItem[] {
  return [
    { type: 'system', text: request.systemPrompt },
    ...request.history.map(
      (turn): ChatHistoryItem => (turn.role === 'user' ? { type: 'user', text: turn.text } : { type: 'model', response: [turn.text] })
    ),
  ];
}

async function run(request: WorkerGenerate): Promise<void> {
  const controller = new AbortController();
  aborts.set(request.id, controller);
  const requested = Date.now();
  try {
    const { llama, sequence, loadMs } = await load();
    const reportedLoadMs = firstLoadReported ? 0 : loadMs;
    firstLoadReported = true;

    let grammar: LlamaGrammar | undefined;
    if (request.schema) {
      const key = JSON.stringify(request.schema);
      if (!grammars.has(key)) grammars.set(key, llama.createGrammarForJsonSchema(request.schema as never));
      grammar = await grammars.get(key);
    }

    const session = new LlamaChatSession({
      contextSequence: sequence,
      autoDisposeSequence: false,
      chatWrapper: new QwenChatWrapper({ variation: '3.5', thoughts: 'discourage' }),
    });
    session.setChatHistory(toHistory(request));

    const started = Date.now();
    let text = '';
    let tokens = 0;
    let firstTokenMs = 0;
    let lastSent = 0;
    try {
      text = await session.prompt(request.prompt, {
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        grammar,
        signal: controller.signal,
        stopOnAbortSignal: true,
        onToken: chunk => {
          tokens += chunk.length;
        },
        onTextChunk: chunk => {
          if (!firstTokenMs) firstTokenMs = Date.now() - started;
          text += chunk;
          const now = Date.now();
          if (now - lastSent > 80) {
            lastSent = now;
            send({ type: 'chunk', id: request.id, text, tokens });
          }
        },
      });
    } finally {
      session.dispose({ disposeSequence: false });
    }

    if (controller.signal.aborted) {
      send({ type: 'error', id: request.id, message: 'Respuesta detenida.', aborted: true });
      return;
    }
    send({
      type: 'done',
      id: request.id,
      text,
      tokens,
      firstTokenMs: firstTokenMs || Date.now() - started,
      totalMs: Date.now() - requested,
      loadMs: reportedLoadMs,
    });
  } catch (error) {
    send({ type: 'error', id: request.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    aborts.delete(request.id);
  }
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  while (queue.length > 0) await run(queue.shift()!);
  running = false;
}

port.on('message', event => {
  const message = event.data as ToWorker;
  if (message.type === 'generate') {
    queue.push(message);
    void pump();
  } else if (message.type === 'abort') {
    const index = queue.findIndex(r => r.id === message.id);
    if (index >= 0) {
      queue.splice(index, 1);
      send({ type: 'error', id: message.id, message: 'Respuesta detenida.', aborted: true });
    }
    aborts.get(message.id)?.abort();
  }
});
