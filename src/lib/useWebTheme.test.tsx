/**
 * Web: modo claro y oscuro.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebThemeToggle from '../components/WebThemeToggle';
import { preferredWebTheme, WEB_THEME_KEY } from './useWebTheme';

function systemPrefersDark(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches, media: query }) as unknown as MediaQueryList);
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => vi.restoreAllMocks());

describe('Preferencia de tema de la web', () => {
  it('sin preferencia guardada sigue al sistema', () => {
    systemPrefersDark(true);
    expect(preferredWebTheme()).toBe('dark');
    systemPrefersDark(false);
    expect(preferredWebTheme()).toBe('light');
  });

  it('la preferencia guardada gana al sistema', () => {
    systemPrefersDark(true);
    localStorage.setItem(WEB_THEME_KEY, 'light');
    expect(preferredWebTheme()).toBe('light');
  });

  it('ignora un valor desconocido', () => {
    systemPrefersDark(false);
    localStorage.setItem(WEB_THEME_KEY, 'azul');
    expect(preferredWebTheme()).toBe('light');
  });

  it('si el almacenamiento falla, usa el sistema', () => {
    systemPrefersDark(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(preferredWebTheme()).toBe('dark');
  });
});

describe('Botón Sol/Luna', () => {
  it('cambia el tema de la página, lo guarda y cambia su etiqueta', () => {
    systemPrefersDark(true);
    render(<WebThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(WEB_THEME_KEY)).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(WEB_THEME_KEY)).toBe('dark');
  });

  it('sin almacenamiento, igual cambia el tema', () => {
    systemPrefersDark(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    render(<WebThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
