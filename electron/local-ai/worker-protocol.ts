/**
 * @file worker-protocol.ts
 * @description Mensajes entre el proceso principal y el utilityProcess del modelo local.
 */

import type { LocalAiTurn } from '../../shared/ipc-types';

export interface WorkerInit {
  modelPath: string;
  contextSize: number;
  gpu: false | 'auto';
}

export interface WorkerGenerate {
  type: 'generate';
  id: string;
  systemPrompt: string;
  history: LocalAiTurn[];
  prompt: string;
  maxTokens: number;
  temperature: number;
  /** Esquema JSON: la salida se restringe con una gramática (llama.cpp). */
  schema?: object;
}

export type ToWorker = WorkerGenerate | { type: 'abort'; id: string };

export type FromWorker =
  | { type: 'loaded'; loadMs: number }
  | { type: 'chunk'; id: string; text: string; tokens: number }
  | { type: 'done'; id: string; text: string; tokens: number; firstTokenMs: number; totalMs: number; loadMs: number }
  | { type: 'error'; id: string | null; message: string; aborted?: boolean };
