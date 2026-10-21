// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SPLASH_MIN_MS, SPLASH_SIZE, splashHtml } from './splash';

describe('Pantalla de bienvenida', () => {
  it('muestra el logo, el nombre, la versión, el copyright y la barra de carga', () => {
    const html = splashHtml('1.0.0');
    expect(html).toContain('<svg');
    expect(html).toContain('YALEH<span>.</span>');
    expect(html).toContain('Versión 1.0.0 (x64)');
    expect(html).toContain('Mario Víctor Brañez Rodriguez · TECBA');
    expect(html).toContain('class="bar"');
    expect(html).toContain('Preparando tu entorno de estudio');
  });

  it('es solo HTML y CSS (sin scripts) y respeta reducir movimiento', () => {
    const html = splashHtml('<b>1</b>');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('&lt;b&gt;1&lt;/b&gt;');
    expect(html).toContain('prefers-reduced-motion');
  });

  it('ventana chica y tiempo mínimo razonable', () => {
    expect(SPLASH_SIZE.width).toBeLessThanOrEqual(640);
    expect(SPLASH_MIN_MS).toBeGreaterThanOrEqual(1000);
    expect(SPLASH_MIN_MS).toBeLessThanOrEqual(3000);
  });
});
