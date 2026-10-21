/**
 * Landing page: presenta YALEH y ofrece el instalador y, aparte, el asistente sin conexión.
 */

import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, DOWNLOADS, LOCAL_AI } from '@shared/config';
import LandingPage from './LandingPage';

describe('Landing page', () => {
  it('la versión que se descarga es la de package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(DOWNLOADS.installerPath).toBe(`downloads/YALEH-Setup-${pkg.version}.exe`);
  });

  it('título, logo y botones para descargar el instalador y preparar la sesión en la web', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Estudiá sin distracciones.' })).toBeTruthy();
    expect(screen.getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    const downloads = screen.getAllByTestId('download-installer');
    expect(downloads.length).toBeGreaterThanOrEqual(2);
    for (const a of downloads) {
      expect(a.getAttribute('href')).toBe(DOWNLOADS.installerPath);
      expect(a.getAttribute('download')).toBe(DOWNLOADS.installerFile);
    }
    expect(screen.getByText('Preparar una sesión en la web').closest('a')!.getAttribute('href')).toBe(DOWNLOADS.webAppUrl);
  });

  it('secciones: cómo funciona, funciones, sin conexión, requisitos y preguntas', () => {
    const { container } = render(<LandingPage />);
    for (const id of ['como-funciona', 'funciones', 'sin-conexion', 'requisitos', 'preguntas']) {
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
    expect(screen.getAllByTestId('feature').length).toBe(8);
    expect(screen.getByText('Windows 10 u 11 de 64 bits')).toBeTruthy();
    expect(screen.getByText(/Windows protegió su PC/)).toBeTruthy();
  });

  it('el asistente sin conexión: recomendado desde la app; descarga directa con carpeta, nombre y SHA-256', () => {
    render(<LandingPage />);
    expect(screen.getByText('Recomendado')).toBeTruthy();
    const manual = screen.getByTestId('manual-model');
    expect(within(manual).getByText('%APPDATA%\\yaleh\\models')).toBeTruthy();
    expect(within(manual).getByText(LOCAL_AI.fileName)).toBeTruthy();
    expect(within(manual).getByText(LOCAL_AI.sha256)).toBeTruthy();
    expect(screen.getByTestId('download-model').getAttribute('href')).toBe(LOCAL_AI.url);
    expect(screen.getByTestId('download-model').textContent).toContain('2,7 GB');
  });
});
