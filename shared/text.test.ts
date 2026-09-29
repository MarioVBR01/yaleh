// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { splitText } from './text';

describe('splitText', () => {
  it('texto vacío → sin partes', () => {
    expect(splitText('')).toEqual([]);
  });

  it('texto corto → una sola parte', () => {
    expect(splitText('hola mundo', 100)).toEqual(['hola mundo']);
  });

  it('ninguna parte supera el máximo y al unirlas se recupera el texto', () => {
    const text = Array.from({ length: 500 }, (_, i) => `palabra${i}`).join(' ');
    const chunks = splitText(text, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.length <= 100)).toBe(true);
    expect(chunks.join('')).toBe(text);
  });

  it('corta en espacios cuando puede', () => {
    const chunks = splitText('aaaa bbbb cccc dddd', 10);
    expect(chunks[0]).toBe('aaaa bbbb ');
  });

  it('corta en seco si no hay espacios', () => {
    expect(splitText('x'.repeat(25), 10)).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
  });
});
