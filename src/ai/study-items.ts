/**
 * @file study-items.ts
 * @description Resultados de la columna Estudio (brief, sección 7.3).
 * Resumen, cuestionario, tarjetas, mapa mental, tabla, infografía y presentación usan salida
 * estructurada (esquema JSON) y se validan antes de mostrarse; el informe es markdown.
 * Mapa mental, tabla, infografía y presentación: ORION #18.
 */

export type StudyKind = 'summary' | 'quiz' | 'flashcards' | 'report' | 'mindmap' | 'table' | 'infographic' | 'presentation';

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

/** Mapa mental de 2 niveles: tema central, ramas y subtemas. */
export interface MindMapContent {
  central: string;
  branches: { label: string; children: string[] }[];
}

/** Tabla de datos con la información clave. */
export interface TableContent {
  title: string;
  columns: string[];
  rows: string[][];
}

/** Íconos que la app sabe dibujar en la infografía. */
export const INFOGRAPHIC_ICONS = ['book', 'clock', 'chart', 'idea', 'target', 'people', 'globe', 'check', 'warning', 'calendar', 'money', 'science'] as const;
export type InfographicIcon = (typeof INFOGRAPHIC_ICONS)[number];

/** Infografía simple: datos destacados y puntos clave, cada uno con un ícono. */
export interface InfographicContent {
  title: string;
  subtitle: string;
  stats: { icon: InfographicIcon; value: string; label: string }[];
  points: { icon: InfographicIcon; text: string }[];
}

/** Esquema de diapositivas (se descarga como .pptx). */
export interface PresentationContent {
  title: string;
  slides: { title: string; bullets: string[] }[];
}

export type StudyContent =
  | { kind: 'summary'; data: SummaryContent }
  | { kind: 'quiz'; data: QuizContent }
  | { kind: 'flashcards'; data: FlashcardsContent }
  | { kind: 'report'; data: string }
  | { kind: 'mindmap'; data: MindMapContent }
  | { kind: 'table'; data: TableContent }
  | { kind: 'infographic'; data: InfographicContent }
  | { kind: 'presentation'; data: PresentationContent };

export const STUDY_LABELS: Record<StudyKind, string> = {
  summary: 'Resumen',
  quiz: 'Cuestionario',
  flashcards: 'Tarjetas de estudio',
  report: 'Informe',
  mindmap: 'Mapa mental',
  table: 'Tabla de datos',
  infographic: 'Infografía',
  presentation: 'Presentación',
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

  if (kind === 'mindmap') {
    const branches = (Array.isArray(obj.branches) ? obj.branches : [])
      .map(b => b as Record<string, unknown>)
      .filter(b => isText(b.label))
      .map(b => ({ label: b.label as string, children: (Array.isArray(b.children) ? b.children : []).filter(isText) as string[] }));
    if (!isText(obj.central) || branches.length < 2) throw new InvalidStudyOutputError('El mapa mental no tiene tema central o ramas.');
    return { kind, data: { central: obj.central, branches } };
  }

  if (kind === 'table') {
    const columns = Array.isArray(obj.columns) ? obj.columns.filter(isText) : [];
    const rows = (Array.isArray(obj.rows) ? obj.rows : [])
      .filter((r): r is unknown[] => Array.isArray(r))
      .map(r => columns.map((_, i) => (typeof r[i] === 'string' ? (r[i] as string) : r[i] === undefined || r[i] === null ? '' : String(r[i]))));
    if (columns.length < 2 || rows.length === 0) throw new InvalidStudyOutputError('La tabla no tiene columnas o filas.');
    return { kind, data: { title: isText(obj.title) ? obj.title : 'Tabla de datos', columns, rows } };
  }

  if (kind === 'infographic') {
    const icon = (v: unknown): InfographicIcon => ((INFOGRAPHIC_ICONS as readonly unknown[]).includes(v) ? (v as InfographicIcon) : 'idea');
    const stats = (Array.isArray(obj.stats) ? obj.stats : [])
      .map(x => x as Record<string, unknown>)
      .filter(x => isText(x.value) && isText(x.label))
      .map(x => ({ icon: icon(x.icon), value: x.value as string, label: x.label as string }));
    const points = (Array.isArray(obj.points) ? obj.points : [])
      .map(x => x as Record<string, unknown>)
      .filter(x => isText(x.text))
      .map(x => ({ icon: icon(x.icon), text: x.text as string }));
    if (!isText(obj.title) || stats.length + points.length < 2) throw new InvalidStudyOutputError('La infografía no tiene título o datos.');
    return { kind, data: { title: obj.title, subtitle: isText(obj.subtitle) ? obj.subtitle : '', stats, points } };
  }

  if (kind === 'presentation') {
    const slides = (Array.isArray(obj.slides) ? obj.slides : [])
      .map(x => x as Record<string, unknown>)
      .filter(x => isText(x.title))
      .map(x => ({ title: x.title as string, bullets: (Array.isArray(x.bullets) ? x.bullets : []).filter(isText) as string[] }));
    if (!isText(obj.title) || slides.length === 0) throw new InvalidStudyOutputError('La presentación no tiene título o diapositivas.');
    return { kind, data: { title: obj.title, slides } };
  }

  const cards = (Array.isArray(obj.cards) ? obj.cards : [])
    .map(c => c as Record<string, unknown>)
    .filter(c => isText(c.front) && isText(c.back))
    .map(c => ({ front: c.front as string, back: c.back as string }));
  if (cards.length === 0) throw new InvalidStudyOutputError('No se generaron tarjetas válidas.');
  return { kind: 'flashcards', data: { cards } };
}
