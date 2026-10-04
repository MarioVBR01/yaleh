/**
 * @file retrieval.ts
 * @description Recuperación de fragmentos para el asistente sin conexión (revisión 1.8).
 * El modelo local tiene un contexto chico, así que no recibe las fuentes completas:
 * - Chat: búsqueda de texto completo (FTS5, ranking bm25) con las palabras de la pregunta.
 * - Resumen y tarjetas (o si la búsqueda no encuentra nada): fragmentos repartidos a lo
 *   largo de cada fuente.
 * En ambos casos se respeta un presupuesto de caracteres.
 */

import type { DatabaseSync } from 'node:sqlite';

export interface Passage {
  sourceId: string;
  sourceName: string;
  idx: number;
  text: string;
}

/** Palabras vacías frecuentes del español (no ayudan a buscar). */
const STOPWORDS = new Set(
  (
    'para como pero porque cual cuales cuando donde desde hasta entre sobre segun sin con los las del una unos unas ' +
    'que qué este esta esto estos estas ese esa eso esos esas aquel aquella ser son era fue han hay muy mas más menos tambien ' +
    'también puede pueden sus nos les explica explicame explícame dime dame cuál qué cómo como sobre tema ideas principales ' +
    'algo todo toda todos todas otro otra otros otras mismo misma'
  ).split(/\s+/)
);

const normalize = (word: string) =>
  word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * Consulta FTS5 a partir de una pregunta: palabras de 3 o más letras, sin palabras vacías,
 * como prefijos (`"celul"*` encuentra "célula" y "celulares") unidas con OR. null si no queda ninguna.
 */
export function buildFtsQuery(question: string, maxTerms = 12): string | null {
  const terms: string[] = [];
  for (const raw of question.split(/[^\p{L}\p{N}]+/u)) {
    const word = normalize(raw);
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    // Prefijo: quita plurales y terminaciones cortas para encontrar variantes de la palabra.
    const stem = word.length > 5 ? word.slice(0, Math.max(5, word.length - 2)) : word;
    if (!terms.includes(stem)) terms.push(stem);
    if (terms.length >= maxTerms) break;
  }
  return terms.length > 0 ? terms.map(t => `"${t}"*`).join(' OR ') : null;
}

/** Toma fragmentos en orden hasta llenar el presupuesto (el primero se recorta si no entra). */
function fillBudget(candidates: Passage[], budgetChars: number): Passage[] {
  const chosen: Passage[] = [];
  let used = 0;
  for (const passage of candidates) {
    if (used >= budgetChars) break;
    const room = budgetChars - used;
    if (passage.text.length > room) {
      if (chosen.length === 0) chosen.push({ ...passage, text: passage.text.slice(0, room) });
      break;
    }
    chosen.push(passage);
    used += passage.text.length;
  }
  return chosen;
}

/** Orden de lectura: por fuente y por posición dentro de la fuente. */
const readingOrder = (a: Passage, b: Passage) => a.sourceName.localeCompare(b.sourceName) || a.idx - b.idx;

export function searchPassages(db: DatabaseSync, workspaceId: string, question: string, budgetChars: number): Passage[] {
  const query = buildFtsQuery(question);
  if (!query) return samplePassages(db, workspaceId, budgetChars);
  const rows = db
    .prepare(
      `SELECT p.source_id AS sourceId, s.name AS sourceName, p.idx AS idx, p.text AS text
       FROM source_passages_fts f
       JOIN source_passages p ON p.id = f.rowid
       JOIN sources s ON s.id = p.source_id
       WHERE source_passages_fts MATCH ? AND p.workspace_id = ?
       ORDER BY bm25(source_passages_fts)
       LIMIT 40`
    )
    .all(query, workspaceId) as unknown as Passage[];
  if (rows.length === 0) return samplePassages(db, workspaceId, budgetChars);
  return fillBudget(rows, budgetChars).sort(readingOrder);
}

/**
 * Fragmentos repartidos de forma pareja entre las fuentes y, dentro de cada una, a lo largo
 * del texto (inicio, medio y final), para resumir o hacer tarjetas sin pasar el presupuesto.
 */
export function samplePassages(db: DatabaseSync, workspaceId: string, budgetChars: number): Passage[] {
  const sources = db
    .prepare('SELECT id, name FROM sources WHERE workspace_id = ? ORDER BY created_at, name')
    .all(workspaceId) as { id: string; name: string }[];
  if (sources.length === 0) return [];
  const perSource = Math.floor(budgetChars / sources.length);
  const select = db.prepare('SELECT idx, text FROM source_passages WHERE source_id = ? ORDER BY idx');
  const chosen: Passage[] = [];
  for (const source of sources) {
    const passages = (select.all(source.id) as { idx: number; text: string }[]).map(p => ({
      sourceId: source.id,
      sourceName: source.name,
      idx: p.idx,
      text: p.text,
    }));
    const total = passages.reduce((sum, p) => sum + p.text.length, 0);
    if (total <= perSource) {
      chosen.push(...passages);
      continue;
    }
    const average = total / passages.length;
    const count = Math.max(1, Math.floor(perSource / average));
    const step = passages.length / count;
    const spread = Array.from({ length: count }, (_, i) => passages[Math.floor(i * step)]);
    chosen.push(...fillBudget(spread, perSource));
  }
  return chosen;
}

/** Bloque de texto con los fragmentos, para el mensaje que recibe el modelo. */
export function formatPassages(passages: Passage[]): string {
  if (passages.length === 0) return 'FRAGMENTOS: el estudiante no tiene fuentes cargadas.';
  return `FRAGMENTOS DE LAS FUENTES DEL ESTUDIANTE:\n\n${passages
    .map(p => `### ${p.sourceName} (fragmento ${p.idx + 1})\n${p.text.trim()}`)
    .join('\n\n')}`;
}
