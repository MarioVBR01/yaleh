/**
 * ORION #29: logo nuevo como SVG; el círculo sigue el tema (borde fino en modo oscuro).
 */

import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Logo from './Logo';

describe('Logo (ORION #29)', () => {
  it('dibuja el logo con los tokens del círculo', () => {
    render(<Logo size={44} />);
    const svg = screen.getByRole('img', { name: 'YALEH' });
    expect(svg.getAttribute('width')).toBe('44');
    const disc = svg.querySelector('circle')!;
    expect(disc.getAttribute('fill')).toBe('var(--color-logo-disc)');
    expect(disc.getAttribute('stroke')).toBe('var(--color-logo-ring)');
  });

  it('los tokens del modo oscuro ponen el borde fino del círculo', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const dark = css.slice(css.indexOf(':root[data-theme="dark"]'));
    expect(dark).toMatch(/--color-logo-ring: #3a342e/);
    expect(css).toMatch(/--color-logo-ring: transparent/);
  });

  it('los SVG del proyecto no traen metadatos', () => {
    for (const f of ['logo-yaleh.svg', 'logo-yaleh-modo-oscuro.svg']) {
      const svg = readFileSync(`src/assets/logo/${f}`, 'utf8');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toContain('<metadata>');
    }
  });
});
