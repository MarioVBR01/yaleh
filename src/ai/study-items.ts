/**
 * @file study-items.ts
 * @description Resultados de la columna Estudio (brief, sección 7.3).
 * Resumen, cuestionario y tarjetas usan salida estructurada (esquema JSON) y se
 * validan antes de mostrarse; el informe es markdown.
 */

export type StudyKind = 'summary' | 'quiz' | 'flashcards' | 'report';

export interface SummaryContent {
  title: string;
  overview: string;
  keyPoints: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

export interface FlashcardsContent {
  cards: { front: string; back: string }[];
}

export type StudyContent =
  | { kind: 'summary'; data: SummaryContent }
  | { kind: 'quiz'; data: QuizContent }
  | { kind: 'flashcards'; data: FlashcardsContent }
  | { kind: 'report'; data: string };

export const STUDY_LABELS: Record<StudyKind, string> = {
  summary: 'Resumen',
  quiz: 'Cuestionario',
  flashcards: 'Tarjetas de estudio',
  report: 'Informe',
};

export class InvalidStudyOutputError extends Error {}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Valida la respuesta del modelo. Lanza InvalidStudyOutputError si no tiene la forma esperada. */
export function parseStudyOutput(kind: StudyKind, raw: string): StudyContent {
  if (kind === 'report') {
    if (!isText(raw)) throw new InvalidStudyOutputError('El informe llegó vacío.');
    return { kind, data: raw.trim() };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new InvalidStudyOutputError('La respuesta no es JSON válido.');
  }
  const obj = json as Record<string, unknown>;

  if (kind === 'summary') {
    const keyPoints = Array.isArray(obj.keyPoints) ? obj.keyPoints.filter(isText) : [];
    if (!isText(obj.title) || !isText(obj.overview) || keyPoints.length === 0) {
      throw new InvalidStudyOutputError('El resumen no tiene título, síntesis o puntos clave.');
    }
    return { kind, data: { title: obj.title, overview: obj.overview, keyPoints } };
  }

  if (kind === 'quiz') {
    const questions = (Array.isArray(obj.questions) ? obj.questions : [])
      .map(q => q as Record<string, unknown>)
      .filter(
        q =>
          isText(q.question) &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          q.options.every(isText) &&
          Number.isInteger(q.correctIndex) &&
          (q.correctIndex as number) >= 0 &&
          (q.correctIndex as number) < (q.options as unknown[]).length
      )
      .map(q => ({
        question: q.question as string,
        options: q.options as string[],
        correctIndex: q.correctIndex as number,
        explanation: isText(q.explanation) ? q.explanation : '',
      }));
    if (questions.length === 0) throw new InvalidStudyOutputError('El cuestionario no tiene preguntas válidas.');
    return { kind, data: { questions } };
  }

  const cards = (Array.isArray(obj.cards) ? obj.cards : [])
    .map(c => c as Record<string, unknown>)
    .filter(c => isText(c.front) && isText(c.back))
    .map(c => ({ front: c.front as string, back: c.back as string }));
  if (cards.length === 0) throw new InvalidStudyOutputError('No se generaron tarjetas válidas.');
  return { kind: 'flashcards', data: { cards } };
}
