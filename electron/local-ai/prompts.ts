/**
 * @file prompts.ts
 * @description Instrucciones y esquemas del asistente sin conexión (revisión 1.8).
 * Más cortas que las de Gemini: el modelo local es chico y su contexto también.
 * Resumen y tarjetas usan un esquema JSON que llama.cpp impone con una gramática. Los textos
 * tienen largo máximo para que el JSON termine antes del límite de tokens (si se corta, no es válido).
 */

import { LOCAL_AI } from '../../shared/config';
import type { LocalAiRequest, LocalAiTask, LocalAiTurn } from '../../shared/ipc-types';
import type { WorkerGenerate } from './worker-protocol';

export const LOCAL_SYSTEM_PROMPT = `Eres el tutor de estudio de YALEH para estudiantes del TECBA (Bolivia).
Responde siempre en español, con claridad y de forma breve, en markdown (listas y negritas).
Usa la información de los FRAGMENTOS de las fuentes del estudiante. Si la respuesta no está en los
fragmentos, dilo y responde con conocimiento general indicándolo. Menciona el nombre de la fuente que usas.
No inventes datos ni citas. No incluyas enlaces.`;

export const LOCAL_SCHEMAS = {
  summary: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 80 },
      overview: { type: 'string', maxLength: 900 },
      keyPoints: { type: 'array', items: { type: 'string', maxLength: 200 }, minItems: 4, maxItems: 6 },
    },
    required: ['title', 'overview', 'keyPoints'],
  },
  flashcards: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        minItems: 6,
        maxItems: 8,
        items: {
          type: 'object',
          properties: { front: { type: 'string', maxLength: 150 }, back: { type: 'string', maxLength: 250 } },
          required: ['front', 'back'],
        },
      },
    },
    required: ['cards'],
  },
} as const;

const STUDY_PROMPTS: Record<Exclude<LocalAiTask, 'chat'>, string> = {
  summary:
    'Resume los fragmentos anteriores. Devuelve JSON con: "title" (título breve del tema), "overview" (síntesis breve, de 3 a 5 frases) y "keyPoints" (entre 4 y 6 ideas clave, una frase corta cada una).',
  flashcards:
    'Crea tarjetas de estudio con los conceptos más importantes de los fragmentos anteriores. Devuelve JSON con "cards": entre 6 y 8 tarjetas, cada una con "front" (pregunta corta) y "back" (respuesta de una o dos frases).',
};

/** Turnos recientes del chat, recortados para no llenar el contexto. */
export function trimHistory(history: LocalAiTurn[] = [], turns: number = LOCAL_AI.historyTurns, maxChars = 1_500): LocalAiTurn[] {
  return history.slice(-turns).map(t => ({ role: t.role, text: t.text.length > maxChars ? `${t.text.slice(0, maxChars)}…` : t.text }));
}

/** Pedido para el worker a partir del pedido de la interfaz y los fragmentos ya recuperados. */
export function buildWorkerRequest(request: LocalAiRequest, passagesText: string): WorkerGenerate {
  const base = { type: 'generate' as const, id: request.requestId, systemPrompt: LOCAL_SYSTEM_PROMPT };
  if (request.task === 'chat') {
    return {
      ...base,
      history: trimHistory(request.history),
      prompt: `${passagesText}\n\nPREGUNTA DEL ESTUDIANTE: ${request.question ?? ''}`,
      maxTokens: LOCAL_AI.maxTokens.chat,
      temperature: 0.6,
    };
  }
  return {
    ...base,
    history: [],
    prompt: `${passagesText}\n\n${STUDY_PROMPTS[request.task]}`,
    maxTokens: LOCAL_AI.maxTokens[request.task],
    temperature: 0.3,
    schema: LOCAL_SCHEMAS[request.task],
  };
}
