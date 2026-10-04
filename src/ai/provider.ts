/**
 * @file provider.ts
 * @description Proveedor común del asistente (revisión 1.8), como SearchProvider:
 * Gemini ("Asistente en línea") y el modelo local ("Asistente sin conexión") con la misma interfaz.
 * - Con conexión (web, o sesión online del escritorio con conexión): Gemini.
 * - Sin conexión y con el modelo instalado: el local.
 * - Sin modelo: no hay asistente ("Disponible próximamente" con la indicación para descargarlo).
 * El modelo local solo hace chat, resumen y tarjetas; cuestionario, informe y Wikipedia siguen en línea.
 */

import type { ConnectionMode, ElectronAPI, LocalAiStatus, LocalAiTask, SessionMode } from '@shared/ipc-types';
import { askTutor, generateStudyItem, type ChatTurn, type SourceText } from './gemini';
import type { SearchResult } from './search';
import { parseStudyOutput, type StudyContent, type StudyKind } from './study-items';

export type AssistantKind = 'online' | 'local';
export type AssistantFeature = 'chat' | 'wikipedia' | StudyKind;

export const ASSISTANT_LABELS: Record<AssistantKind, string> = {
  online: 'Asistente en línea',
  local: 'Asistente sin conexión',
};

/** Lo que cada proveedor necesita del espacio de trabajo. */
export interface AssistantContext {
  /** Texto completo de las fuentes (Gemini). */
  loadSources: () => Promise<SourceText[]>;
  /** Id del espacio de trabajo en SQLite (el modelo local recupera los fragmentos ahí). */
  workspaceId: string | null;
}

export interface ChatRequest {
  question: string;
  history: ChatTurn[];
  searchResults: SearchResult[];
}

export interface AssistantProvider {
  kind: AssistantKind;
  label: string;
  supports: (feature: AssistantFeature) => boolean;
  /** Entrega el texto acumulado a medida que se genera y resuelve con la respuesta completa. */
  chat: (
    request: ChatRequest,
    context: AssistantContext,
    onText: (partial: string) => void,
    signal?: AbortSignal
  ) => Promise<string>;
  /** `onProgress` recibe los tokens generados (solo el modelo local informa el avance). */
  study: (kind: StudyKind, context: AssistantContext, onProgress?: (tokens: number) => void) => Promise<StudyContent>;
}

/** Error con un mensaje ya listo para mostrar. */
export class AssistantError extends Error {}

export const geminiProvider: AssistantProvider = {
  kind: 'online',
  label: ASSISTANT_LABELS.online,
  supports: () => true,
  chat: async (request, context, onText) =>
    askTutor(request.question, request.history, await context.loadSources(), request.searchResults, onText),
  study: async (kind, context) => generateStudyItem(kind, await context.loadSources()),
};

const LOCAL_FEATURES: readonly AssistantFeature[] = ['chat', 'summary', 'flashcards'];
let requestCounter = 0;

export function createLocalProvider(api: Pick<ElectronAPI, 'localAi'>): AssistantProvider {
  const run = async (
    task: LocalAiTask,
    context: AssistantContext,
    extra: { question?: string; history?: ChatTurn[] },
    onChunk: (text: string, tokens: number) => void,
    signal?: AbortSignal
  ): Promise<string> => {
    if (!context.workspaceId) throw new AssistantError('No hay un espacio de trabajo abierto.');
    const requestId = `local-${Date.now()}-${++requestCounter}`;
    const off = api.localAi.onChunk(chunk => {
      if (chunk.requestId === requestId) onChunk(chunk.text, chunk.tokens);
    });
    const onAbort = () => void api.localAi.abort(requestId);
    signal?.addEventListener('abort', onAbort);
    try {
      const result = await api.localAi.generate({ requestId, task, workspaceId: context.workspaceId, ...extra });
      if (!result.ok) throw new AssistantError(result.message);
      console.info(`[ia local] ${task}: ${result.stats.tokens} tokens, ${result.stats.tokensPerSecond} tokens/s, ${result.stats.totalMs} ms`);
      return result.text;
    } finally {
      off();
      signal?.removeEventListener('abort', onAbort);
    }
  };

  return {
    kind: 'local',
    label: ASSISTANT_LABELS.local,
    supports: feature => LOCAL_FEATURES.includes(feature),
    chat: async (request, context, onText, signal) => {
      const text = await run(
        'chat',
        context,
        { question: request.question, history: request.history },
        partial => onText(partial),
        signal
      );
      onText(text);
      return text;
    },
    study: async (kind, context, onProgress) => {
      if (kind !== 'summary' && kind !== 'flashcards') {
        throw new AssistantError('Esta función solo está disponible con conexión.');
      }
      const raw = await run(kind, context, {}, (_text, tokens) => onProgress?.(tokens));
      return parseStudyOutput(kind, raw);
    },
  };
}

/** Por qué no hay asistente. */
export type NoAssistantReason = 'needs-download' | 'unsupported';

export type AssistantChoice = { kind: AssistantKind } | { kind: 'none'; reason: NoAssistantReason };

export interface AssistantSelectionInput {
  isDesktop: boolean;
  sessionMode: SessionMode | null;
  connection: ConnectionMode;
  localAi: LocalAiStatus | null;
}

/** Qué asistente responde según la plataforma, la conexión y si el modelo local está instalado. */
export function selectAssistant(input: AssistantSelectionInput): AssistantChoice {
  if (!input.isDesktop) return { kind: 'online' };
  if (input.sessionMode === 'online' && input.connection === 'online') return { kind: 'online' };
  if (input.localAi?.state === 'installed') return { kind: 'local' };
  return { kind: 'none', reason: input.localAi?.state === 'unsupported' ? 'unsupported' : 'needs-download' };
}
