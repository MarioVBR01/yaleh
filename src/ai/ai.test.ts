import { describe, expect, it, vi } from 'vitest';
import { describeAIError } from './errors';
import { buildSearchContext, buildSourcesContext } from './gemini';
import { parseExtractsResponse, parseSearchResponse, WikipediaSearchProvider } from './search';
import { InvalidStudyOutputError, parseStudyOutput } from './study-items';

describe('parseStudyOutput', () => {
  it('acepta un resumen válido', () => {
    const out = parseStudyOutput('summary', JSON.stringify({ title: 'Célula', overview: 'Unidad básica', keyPoints: ['Núcleo', ''] }));
    expect(out).toEqual({ kind: 'summary', data: { title: 'Célula', overview: 'Unidad básica', keyPoints: ['Núcleo'] } });
  });

  it('descarta preguntas mal formadas y conserva las válidas', () => {
    const out = parseStudyOutput(
      'quiz',
      JSON.stringify({
        questions: [
          { question: '¿2+2?', options: ['3', '4', '5', '6'], correctIndex: 1, explanation: 'Suma' },
          { question: 'sin opciones', options: [], correctIndex: 0 },
          { question: 'índice fuera de rango', options: ['a', 'b'], correctIndex: 5 },
        ],
      })
    );
    expect(out.kind).toBe('quiz');
    if (out.kind === 'quiz') expect(out.data.questions).toHaveLength(1);
  });

  it('acepta tarjetas y el informe en markdown', () => {
    expect(parseStudyOutput('flashcards', JSON.stringify({ cards: [{ front: 'ADN', back: 'Ácido' }] })).kind).toBe('flashcards');
    expect(parseStudyOutput('report', '# Informe\n\nTexto')).toEqual({ kind: 'report', data: '# Informe\n\nTexto' });
  });

  it.each([
    ['summary', 'no es json'],
    ['summary', JSON.stringify({ title: 'x' })],
    ['quiz', JSON.stringify({ questions: [] })],
    ['flashcards', JSON.stringify({ cards: [{ front: 'solo anverso' }] })],
    ['report', '   '],
  ] as const)('rechaza %s inválido', (kind, raw) => {
    expect(() => parseStudyOutput(kind, raw)).toThrow(InvalidStudyOutputError);
  });
});

describe('Wikipedia', () => {
  it('lee los resultados de búsqueda y los extractos en orden', () => {
    const hits = parseSearchResponse({ query: { search: [{ pageid: 2, title: 'Tortuga' }, { pageid: 1, title: 'Reptil' }] } });
    expect(hits.map(h => h.pageid)).toEqual([2, 1]);
    const results = parseExtractsResponse(
      { query: { pages: { '1': { title: 'Reptil', extract: 'Los reptiles…' }, '2': { title: 'Tortuga', extract: 'Las tortugas…' } } } },
      [2, 1]
    );
    expect(results.map(r => r.title)).toEqual(['Tortuga', 'Reptil']);
    expect(results[0].sourceLabel).toContain('Wikipedia');
  });

  it('tolera respuestas vacías o inesperadas', () => {
    expect(parseSearchResponse({})).toEqual([]);
    expect(parseExtractsResponse({ query: { pages: { '1': { title: 'x', extract: '' } } } }, [1])).toEqual([]);
  });

  it('usa la API en español con Api-User-Agent y origin=*', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { search: [{ pageid: 7, title: 'Tortuga' }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages: { '7': { title: 'Tortuga', extract: 'Reptil.' } } } }) });
    const results = await new WikipediaSearchProvider(fetchImpl).search('tortugas');

    expect(results).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('https://es.wikipedia.org/w/api.php');
    expect(url).toContain('origin=*');
    expect(init.headers['Api-User-Agent']).toContain('YALEH');
  });
});

describe('contexto para Gemini', () => {
  it('incluye cada fuente por su nombre y recorta el texto largo', () => {
    const ctx = buildSourcesContext([{ name: 'a.pdf', text: 'x'.repeat(100) }, { name: 'b.txt', text: 'corto' }], 60);
    expect(ctx).toContain('### Fuente: a.pdf');
    expect(ctx).toContain('[… texto recortado …]');
    expect(ctx).toContain('corto');
  });

  it('indica cuando no hay fuentes y no agrega bloque de búsqueda vacío', () => {
    expect(buildSourcesContext([])).toContain('aún no cargó fuentes');
    expect(buildSearchContext([])).toBe('');
  });
});

describe('describeAIError', () => {
  it('cuota agotada (429)', () => {
    expect(describeAIError(new Error('[429 Too Many Requests] Resource exhausted'))).toMatch(/cuota/);
    expect(describeAIError({ message: 'x', customErrorData: { status: 429 } })).toMatch(/cuota/);
  });

  it('App Check / permisos', () => {
    expect(describeAIError(new Error('[401 Unauthorized] Firebase App Check token is invalid.'))).toMatch(/App Check/);
  });

  it('sin conexión y error genérico', () => {
    expect(describeAIError(new TypeError('Failed to fetch'))).toMatch(/conexión/);
    expect(describeAIError(new Error('otra cosa'))).toMatch(/no pudo responder/);
  });
});

describe('respaldo de modelos', () => {
  it('reintenta con otro modelo ante saturación o cuota, pero no ante otros errores', async () => {
    const { isRetryableModelError } = await import('./gemini');
    expect(isRetryableModelError(new Error('[500 ] This model is currently experiencing high demand.'))).toBe(true);
    expect(isRetryableModelError({ message: 'x', customErrorData: { status: 429 } })).toBe(true);
    expect(isRetryableModelError(new Error('[401 Unauthorized] Firebase App Check token is invalid.'))).toBe(false);
  });
});
