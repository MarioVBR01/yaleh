/**
 * @file prompts.ts
 * @description Instrucciones y esquemas del asistente sin conexión (revisión 1.8).
 * Más cortas que las de Gemini: el modelo local es chico y su contexto también.
 * Resumen y tarjetas usan un esquema JSON que llama.cpp impone con una gramática. Los textos
 * tienen largo máximo para que el JSON termine antes del límite de tokens (si se corta, no es válido).
 */

import { LOCAL_AI } from '../../shared/config';
import type { LocalAiRequest, LocalAiTask, LocalAiTurn } from '../../shared/ipc-types';
import { INFOGRAPHIC_ICONS } from '../../src/ai/study-items';
import type { WorkerGenerate } from './worker-protocol';

export const LOCAL_SYSTEM_PROMPT = `Eres el tutor de estudio de YALEH para estudiantes del TECBA (Bolivia).
Responde siempre en español, con claridad y en markdown (listas y negritas). Sé breve: como máximo
3 o 4 frases (unas 80 palabras), salvo que el estudiante pida más detalle.
Usa la información de los FRAGMENTOS de las fuentes del estudiante. Si la respuesta no está en los
fragmentos, dilo y responde con conocimiento general indicándolo. Menciona el nombre de la fuente que usas.
No inventes datos ni citas. No incluyas enlaces.`;

export const LOCAL_SCHEMAS = {
  summary: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 80 },
      overview: { type: 'string', maxLength: 500 },
      keyPoints: { type: 'array', items: { type: 'string', maxLength: 160 }, minItems: 4, maxItems: 4 },
    },
    required: ['title', 'overview', 'keyPoints'],
  },
  flashcards: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          properties: { front: { type: 'string', maxLength: 120 }, back: { type: 'string', maxLength: 200 } },
          required: ['front', 'back'],
        },
      },
    },
    required: ['cards'],
  },
  // ORION #17: tamaños chicos para que el modelo local termine en pocos minutos.
  quiz: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', maxLength: 110 },
            options: { type: 'array', items: { type: 'string', maxLength: 50 }, minItems: 3, maxItems: 3 },
            correctIndex: { enum: [0, 1, 2] },
            explanation: { type: 'string', maxLength: 100 },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
  mindmap: {
    type: 'object',
    properties: {
      central: { type: 'string', maxLength: 50 },
      branches: {
        type: 'array',
        minItems: 3,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', maxLength: 40 },
            children: { type: 'array', items: { type: 'string', maxLength: 35 }, minItems: 0, maxItems: 3 },
          },
          required: ['label', 'children'],
        },
      },
    },
    required: ['central', 'branches'],
  },
  table: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 60 },
      columns: { type: 'array', items: { type: 'string', maxLength: 25 }, minItems: 2, maxItems: 3 },
      rows: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: { type: 'array', items: { type: 'string', maxLength: 45 }, minItems: 2, maxItems: 3 },
      },
    },
    required: ['title', 'columns', 'rows'],
  },
  infographic: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 60 },
      subtitle: { type: 'string', maxLength: 100 },
      stats: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            icon: { enum: [...INFOGRAPHIC_ICONS] },
            value: { type: 'string', maxLength: 20 },
            label: { type: 'string', maxLength: 50 },
          },
          required: ['icon', 'value', 'label'],
        },
      },
      points: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          properties: { icon: { enum: [...INFOGRAPHIC_ICONS] }, text: { type: 'string', maxLength: 100 } },
          required: ['icon', 'text'],
        },
      },
    },
    required: ['title', 'subtitle', 'stats', 'points'],
  },
} as const;

/** Tareas que devuelven texto libre (markdown) en lugar de JSON. */
const TEXT_TASKS: readonly LocalAiTask[] = ['report'];

const STUDY_PROMPTS: Record<Exclude<LocalAiTask, 'chat'>, string> = {
  summary:
    'Resume los fragmentos anteriores. Devuelve JSON con: "title" (título breve del tema), "overview" (síntesis breve, de 2 a 3 frases) y "keyPoints" (exactamente 4 ideas clave, una frase corta cada una).',
  flashcards:
    'Crea tarjetas de estudio con los conceptos más importantes de los fragmentos anteriores. Devuelve JSON con "cards": exactamente 5 tarjetas, cada una con "front" (pregunta corta) y "back" (respuesta de una frase).',
  quiz: 'Crea un cuestionario de opción múltiple sobre los fragmentos anteriores. Devuelve JSON con "questions": exactamente 5 preguntas cortas, cada una con 3 opciones breves ("options"), el índice de la correcta ("correctIndex": 0, 1 o 2) y una explicación de una frase ("explanation").',
  report:
    'Redacta un informe corto (una página, entre 200 y 300 palabras) sobre los fragmentos anteriores, en markdown: un título, una introducción breve, dos o tres secciones con subtítulo y una conclusión. Menciona las fuentes por su nombre. Sin enlaces.',
  mindmap:
    'Crea un mapa mental chico de los fragmentos anteriores. Devuelve JSON con "central" (tema central, pocas palabras) y "branches": entre 3 y 4 ramas, cada una con "label" (tema principal) y "children" (hasta 3 subtemas de pocas palabras).',
  table:
    'Crea una tabla chica con los datos clave de los fragmentos anteriores. Devuelve JSON con "title", "columns" (2 o 3 encabezados) y "rows": exactamente 5 filas, con una celda breve por columna.',
  infographic: `Prepara el contenido de una infografía simple de los fragmentos anteriores. Devuelve JSON con "title", "subtitle" (una frase), "stats" (2 o 3 datos destacados con "value" corto y "label") y "points" (3 puntos clave de una frase). Cada dato y punto lleva un "icon" de esta lista: ${INFOGRAPHIC_ICONS.join(', ')}.`,
};

/** El estudiante pide una respuesta más larga ("explícame en detalle", "paso a paso", "desarrolla"…). */
const DETAIL_REQUEST =
  /\b(m[aá]s\s+(detalle|detallad[oa]|completo|largo|extens[oa])|en\s+detalle|detallad[oa]|paso\s+a\s+paso|desarroll[ae]|ampl[ií]a|profundiza|extens[oa]|explica(me)?\s+(todo|bien|mejor))\b/i;

export function wantsDetail(question: string): boolean {
  return DETAIL_REQUEST.test(question);
}

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
      maxTokens: wantsDetail(request.question ?? '') ? LOCAL_AI.maxTokens.chatDetailed : LOCAL_AI.maxTokens.chat,
      temperature: 0.6,
    };
  }
  return {
    ...base,
    history: [],
    prompt: `${passagesText}\n\n${STUDY_PROMPTS[request.task]}`,
    maxTokens: LOCAL_AI.maxTokens[request.task],
    temperature: TEXT_TASKS.includes(request.task) ? 0.5 : 0.3,
    schema: TEXT_TASKS.includes(request.task) ? undefined : LOCAL_SCHEMAS[request.task as keyof typeof LOCAL_SCHEMAS],
  };
}
