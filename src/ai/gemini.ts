/**
 * @file gemini.ts
 * @description Asistente con Gemini vía Firebase AI Logic (brief, sección 7).
 * Los modelos están en shared/config.ts (AI.models): si uno está saturado o sin cuota
 * se prueba el siguiente. Las respuestas se basan en el texto de las fuentes del
 * estudiante y, si se pide, en artículos de Wikipedia.
 */

import { getAI, getGenerativeModel, GoogleAIBackend, Schema, type Content, type GenerativeModel } from 'firebase/ai';
import { AI } from '@shared/config';
import { getFirebaseApp } from '../firebase/app';
import type { SearchResult } from './search';
import { INFOGRAPHIC_ICONS, parseStudyOutput, type StudyContent, type StudyKind } from './study-items';

export interface SourceText {
  name: string;
  text: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

const BASE_INSTRUCTION = `Eres el tutor académico de YALEH, un entorno de estudio para estudiantes del TECBA (Bolivia).
Responde siempre en español, con claridad y en formato markdown (títulos cortos, listas, negritas).
Básate en las FUENTES del estudiante que aparecen abajo. Si la respuesta no está en las fuentes, dilo y
responde con conocimiento general indicándolo. Cuando uses una fuente, menciona su nombre.
No incluyas enlaces ni URL. No inventes citas.`;

/** Arma el contexto con el texto de las fuentes, recortado a AI.maxSourceChars. */
export function buildSourcesContext(sources: SourceText[], maxChars: number = AI.maxSourceChars): string {
  if (sources.length === 0) return 'FUENTES: el estudiante aún no cargó fuentes.';
  const perSource = Math.floor(maxChars / sources.length);
  const parts = sources.map(s => {
    const text = s.text.length > perSource ? `${s.text.slice(0, perSource)}\n[… texto recortado …]` : s.text;
    return `### Fuente: ${s.name}\n${text}`;
  });
  return `FUENTES DEL ESTUDIANTE:\n\n${parts.join('\n\n')}`;
}

/** Artículos encontrados, como bloque de contexto para la pregunta. */
export function buildSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';
  return `\n\nARTÍCULOS ENCONTRADOS EN WIKIPEDIA (úsalos si son pertinentes y menciónalos por su título):\n\n${results
    .map(r => `### ${r.title}\n${r.extract}`)
    .join('\n\n')}`;
}

let ai: ReturnType<typeof getAI> | null = null;

/** Errores por los que conviene probar el siguiente modelo: saturación o cuota. */
export function isRetryableModelError(error: unknown): boolean {
  const text = `${(error as { message?: string })?.message ?? ''}`;
  const status = (error as { customErrorData?: { status?: number } })?.customErrorData?.status;
  return (
    status === 429 || status === 500 || status === 503 ||
    /\b(429|500|503)\b|high demand|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(text)
  );
}

/** Ejecuta `run` con cada modelo de AI.models hasta que uno responda. */
async function withModelFallback<T>(run: (modelName: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const name of AI.models) {
    try {
      return await run(name);
    } catch (error) {
      lastError = error;
      if (!isRetryableModelError(error)) throw error;
      console.warn(`[ia] ${name} no disponible; se prueba el siguiente modelo.`);
    }
  }
  throw lastError;
}

function model(name: string, systemInstruction: string, generationConfig?: object): GenerativeModel {
  if (!ai) ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: name, systemInstruction, ...(generationConfig ? { generationConfig } : {}) });
}

/**
 * Envía una pregunta al chat y entrega la respuesta a medida que llega.
 * `history` son los turnos anteriores (sin la pregunta actual).
 */
export async function askTutor(
  question: string,
  history: ChatTurn[],
  sources: SourceText[],
  searchResults: SearchResult[],
  onText: (partial: string) => void
): Promise<string> {
  const instruction = `${BASE_INSTRUCTION}\n\n${buildSourcesContext(sources)}`;
  const contents: Content[] = history.map(turn => ({
    role: turn.role === 'user' ? 'user' : 'model',
    parts: [{ text: turn.text }],
  }));
  return withModelFallback(async name => {
    const chat = model(name, instruction).startChat({ history: contents });
    const result = await chat.sendMessageStream(`${question}${buildSearchContext(searchResults)}`);
    let text = '';
    for await (const chunk of result.stream) {
      text += chunk.text();
      onText(text);
    }
    return text;
  });
}

// ─── Estudio: salida estructurada ────────────────────────────────────────────

const ICON_LIST = INFOGRAPHIC_ICONS.join(', ');

const SCHEMAS: Record<Exclude<StudyKind, 'report'>, Schema> = {
  summary: Schema.object({
    properties: {
      title: Schema.string({ description: 'Título breve del tema' }),
      overview: Schema.string({ description: 'Síntesis de 1 o 2 párrafos' }),
      keyPoints: Schema.array({ items: Schema.string(), description: 'Entre 4 y 8 ideas clave' }),
    },
  }),
  quiz: Schema.object({
    properties: {
      questions: Schema.array({
        description: 'Entre 5 y 8 preguntas',
        items: Schema.object({
          properties: {
            question: Schema.string(),
            options: Schema.array({ items: Schema.string(), description: 'Exactamente 4 opciones' }),
            correctIndex: Schema.integer({ description: 'Índice (0 a 3) de la opción correcta' }),
            explanation: Schema.string({ description: 'Por qué es la respuesta correcta' }),
          },
        }),
      }),
    },
  }),
  flashcards: Schema.object({
    properties: {
      cards: Schema.array({
        description: 'Entre 8 y 12 tarjetas',
        items: Schema.object({
          properties: {
            front: Schema.string({ description: 'Pregunta o concepto' }),
            back: Schema.string({ description: 'Respuesta o definición breve' }),
          },
        }),
      }),
    },
  }),
  mindmap: Schema.object({
    properties: {
      central: Schema.string({ description: 'Tema central, pocas palabras' }),
      branches: Schema.array({
        description: 'Entre 3 y 6 ramas',
        items: Schema.object({
          properties: {
            label: Schema.string({ description: 'Tema principal' }),
            children: Schema.array({ items: Schema.string(), description: 'Entre 2 y 4 subtemas cortos' }),
          },
        }),
      }),
    },
  }),
  table: Schema.object({
    properties: {
      title: Schema.string(),
      columns: Schema.array({ items: Schema.string(), description: 'Entre 2 y 5 encabezados' }),
      rows: Schema.array({ items: Schema.array({ items: Schema.string() }), description: 'Entre 4 y 10 filas, una celda por columna' }),
    },
  }),
  infographic: Schema.object({
    properties: {
      title: Schema.string(),
      subtitle: Schema.string(),
      stats: Schema.array({
        description: 'Entre 2 y 4 datos destacados',
        items: Schema.object({
          properties: {
            icon: Schema.string({ description: `Uno de: ${ICON_LIST}` }),
            value: Schema.string({ description: 'Valor corto (número, fecha o palabra)' }),
            label: Schema.string(),
          },
        }),
      }),
      points: Schema.array({
        description: 'Entre 3 y 5 puntos clave',
        items: Schema.object({
          properties: { icon: Schema.string({ description: `Uno de: ${ICON_LIST}` }), text: Schema.string() },
        }),
      }),
    },
  }),
  presentation: Schema.object({
    properties: {
      title: Schema.string(),
      slides: Schema.array({
        description: 'Entre 5 y 8 diapositivas',
        items: Schema.object({
          properties: { title: Schema.string(), bullets: Schema.array({ items: Schema.string(), description: 'Entre 2 y 5 viñetas' }) },
        }),
      }),
    },
  }),
};

const PROMPTS: Record<StudyKind, string> = {
  summary: 'Genera un resumen de las fuentes: título, síntesis y puntos clave.',
  quiz: 'Genera un cuestionario de opción múltiple sobre las fuentes, con 4 opciones por pregunta y la explicación de la respuesta correcta.',
  flashcards: 'Genera tarjetas de estudio (anverso y reverso) con los conceptos más importantes de las fuentes.',
  report:
    'Redacta un informe académico en markdown sobre las fuentes: introducción, desarrollo por secciones con títulos, conclusiones. Menciona las fuentes por su nombre. Sin enlaces.',
  mindmap:
    'Genera un mapa mental de las fuentes: un tema central breve, entre 3 y 6 ramas con los temas principales y, en cada rama, entre 2 y 4 subtemas cortos (pocas palabras).',
  table:
    'Genera una tabla de datos con la información clave de las fuentes (conceptos, fechas, cifras, comparaciones): un título, entre 2 y 5 columnas y entre 4 y 10 filas. Celdas breves.',
  infographic: `Genera el contenido de una infografía simple de las fuentes: título, subtítulo de una frase, entre 2 y 4 datos destacados (valor corto y etiqueta) y entre 3 y 5 puntos clave de una frase. A cada dato y punto asígnale un ícono de esta lista: ${INFOGRAPHIC_ICONS.join(', ')}.`,
  presentation:
    'Genera el esquema de una presentación sobre las fuentes: título y entre 5 y 8 diapositivas, cada una con un título y entre 2 y 5 viñetas breves.',
};

export async function generateStudyItem(kind: StudyKind, sources: SourceText[]): Promise<StudyContent> {
  const instruction = `${BASE_INSTRUCTION}\n\n${buildSourcesContext(sources)}`;
  const generationConfig =
    kind === 'report' ? undefined : { responseMimeType: 'application/json', responseSchema: SCHEMAS[kind] };
  const result = await withModelFallback(name => model(name, instruction, generationConfig).generateContent(PROMPTS[kind]));
  return parseStudyOutput(kind, result.response.text());
}
