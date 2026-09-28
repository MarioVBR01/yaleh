// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isBlockedInput, isDevEscapeInput, type KeyInput } from './shortcuts';

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  type: 'keyDown',
  key: k,
  control: false,
  meta: false,
  shift: false,
  alt: false,
  ...mods,
});

describe('isBlockedInput', () => {
  it.each([
    ['Ctrl+W', key('w', { control: true })],
    ['Ctrl+R', key('r', { control: true })],
    ['Ctrl+Shift+R', key('R', { control: true, shift: true })],
    ['Ctrl+N', key('n', { control: true })],
    ['Ctrl+T', key('t', { control: true })],
    ['Ctrl+Q', key('q', { control: true })],
    ['Ctrl+Shift+I', key('I', { control: true, shift: true })],
    ['Ctrl+Shift+J', key('J', { control: true, shift: true })],
    ['Ctrl+Shift+C', key('C', { control: true, shift: true })],
    ['F5', key('F5')],
    ['F11', key('F11')],
    ['F12', key('F12')],
    ['Alt+F4', key('F4', { alt: true })],
  ])('bloquea %s', (_name, input) => {
    expect(isBlockedInput(input)).toBe(true);
  });

  it.each([
    ['escribir texto', key('w')],
    ['Ctrl+C (copiar)', key('c', { control: true })],
    ['Ctrl+V (pegar)', key('v', { control: true })],
    ['Ctrl+Z (deshacer)', key('z', { control: true })],
    ['Shift+R (mayúscula)', key('R', { shift: true })],
    ['soltar F5', { ...key('F5'), type: 'keyUp' }],
  ])('no bloquea %s', (_name, input) => {
    expect(isBlockedInput(input)).toBe(false);
  });
});

describe('isDevEscapeInput', () => {
  it('reconoce Ctrl+Shift+F12', () => {
    expect(isDevEscapeInput(key('F12', { control: true, shift: true }))).toBe(true);
  });

  it('no confunde F12 ni Ctrl+F12', () => {
    expect(isDevEscapeInput(key('F12'))).toBe(false);
    expect(isDevEscapeInput(key('F12', { control: true }))).toBe(false);
  });
});
