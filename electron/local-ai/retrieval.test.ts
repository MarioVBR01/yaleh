// @vitest-environment node
/**
 * Recuperación de fragmentos con FTS5 (migración 3) sobre fuentes reales en SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../db/migrations';
import { WorkspaceRepository } from '../db/workspace-repository';
import { buildFtsQuery, formatPassages, samplePassages, searchPassages } from './retrieval';

function setup() {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  return { db, repo: new WorkspaceRepository(db) };
}

const filler = (word: string, n: number) => Array.from({ length: n }, (_, i) => `${word} ${i}.`).join(' ');

describe('buildFtsQuery', () => {
  it('quita palabras vacías y tildes, y busca por prefijo', () => {
    expect(buildFtsQuery('¿Qué es la fotosíntesis en las plantas?')).toBe('"fotosintes"* OR "plant"*');
  });
  it('null si no queda ninguna palabra útil', () => {
    expect(buildFtsQuery('¿y eso qué es?')).toBeNull();
  });
  it('las comillas del estudiante no rompen la consulta', () => {
    expect(buildFtsQuery('células "eucariotas"')).toBe('"celul"* OR "eucariot"*');
  });
});

describe('searchPassages', () => {
  it('devuelve los fragmentos que mencionan la pregunta, no los demás', () => {
    const { db, repo } = setup();
    const text = `${filler('Historia de Bolivia', 60)} La fotosíntesis convierte la luz en energía química en los cloroplastos. ${filler('Geografía andina', 60)}`;
    repo.addSource('ws1', { id: 's1', name: 'apuntes.txt', type: 'text/plain', size: text.length }, text);

    const found = searchPassages(db, 'ws1', '¿Dónde ocurre la fotosíntesis?', 12_000);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].text).toContain('cloroplastos');
    expect(found.every(p => p.sourceName === 'apuntes.txt')).toBe(true);
    expect(found.some(p => p.text.includes('Historia de Bolivia 0.'))).toBe(false);
  });

  it('no mezcla espacios de trabajo', () => {
    const { db, repo } = setup();
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: 1 }, 'Las mitocondrias producen energía.');
    repo.addSource('ws2', { id: 's2', name: 'b.txt', type: 'text/plain', size: 1 }, 'Las mitocondrias tienen ADN propio.');
    const found = searchPassages(db, 'ws2', 'mitocondrias', 12_000);
    expect(found.map(p => p.sourceName)).toEqual(['b.txt']);
  });

  it('respeta el presupuesto de caracteres', () => {
    const { db, repo } = setup();
    const text = filler('La célula es la unidad básica de la vida', 400);
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: text.length }, text);
    const found = searchPassages(db, 'ws1', 'célula', 3_000);
    expect(found.reduce((n, p) => n + p.text.length, 0)).toBeLessThanOrEqual(3_000);
  });

  it('si la búsqueda no encuentra nada, usa fragmentos repartidos', () => {
    const { db, repo } = setup();
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: 1 }, 'Texto sobre álgebra lineal.');
    const found = searchPassages(db, 'ws1', 'astronomía', 12_000);
    expect(found.map(p => p.text)).toEqual(['Texto sobre álgebra lineal.']);
  });

  it('al borrar una fuente se borran sus fragmentos del índice', () => {
    const { db, repo } = setup();
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: 1 }, 'Los volcanes de los Andes.');
    repo.removeSource('ws1', 's1');
    expect(searchPassages(db, 'ws1', 'volcanes', 12_000)).toEqual([]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM source_passages_fts WHERE source_passages_fts MATCH 'volcanes'").get()).toEqual({ n: 0 });
  });
});

describe('samplePassages', () => {
  it('reparte el presupuesto entre las fuentes y a lo largo de cada una', () => {
    const { db, repo } = setup();
    const long = `${filler('INICIO', 100)} ${filler('MEDIO', 100)} ${filler('FINAL', 100)}`;
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: 1 }, long);
    repo.addSource('ws1', { id: 's2', name: 'b.txt', type: 'text/plain', size: 1 }, 'Fuente corta.');
    const sample = samplePassages(db, 'ws1', 4_000);
    const fromA = sample.filter(p => p.sourceName === 'a.txt').map(p => p.text).join(' ');
    expect(fromA).toContain('INICIO');
    expect(fromA).toContain('FINAL');
    expect(sample.some(p => p.text === 'Fuente corta.')).toBe(true);
    expect(sample.reduce((n, p) => n + p.text.length, 0)).toBeLessThanOrEqual(4_000);
  });
});

describe('indexMissingPassages', () => {
  it('indexa las fuentes guardadas antes de la migración 3', () => {
    const { db, repo } = setup();
    repo.addSource('ws1', { id: 's1', name: 'a.txt', type: 'text/plain', size: 1 }, 'La gravedad atrae los cuerpos.');
    db.exec('DELETE FROM source_passages');
    expect(searchPassages(db, 'ws1', 'gravedad', 12_000)).toEqual([]);
    expect(repo.indexMissingPassages()).toBe(1);
    expect(repo.indexMissingPassages()).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM source_passages_fts WHERE source_passages_fts MATCH 'gravedad'").get()).toEqual({ n: 1 });
  });
});

describe('formatPassages', () => {
  it('nombra la fuente y el fragmento', () => {
    expect(formatPassages([{ sourceId: 's', sourceName: 'a.txt', idx: 2, text: 'Hola' }])).toContain('### a.txt (fragmento 3)\nHola');
  });
});
