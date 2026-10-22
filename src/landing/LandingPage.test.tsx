/**
 * Landing page, el inicio de la web (revisión 1.10): presenta YALEH, lleva a preparar la sesión y ofrece
 * el instalador y, aparte, el asistente sin conexión.
 */

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, DOWNLOADS, LOCAL_AI } from '@shared/config';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import LandingPage from './LandingPage';

function Phase() {
  return <output data-testid="phase">{useApp().state.phase}</output>;
}

function renderLanding(state: Partial<AppState> = {}) {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'landing', authChecked: true, ...state }}>
      <LandingPage />
      <Phase />
    </AppProvider>
  );
}

describe('Landing page', () => {
  it('la versión que se descarga es la de package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(DOWNLOADS.installerPath).toBe(`downloads/YALEH-Setup-${pkg.version}.exe`);
  });

  it('título, logo y los dos botones: preparar la sesión y descargar el instalador', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Estudiá sin distracciones.' })).toBeTruthy();
    expect(screen.getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    const downloads = screen.getAllByTestId('download-installer');
    expect(downloads.length).toBeGreaterThanOrEqual(2);
    for (const a of downloads) {
      expect(a.getAttribute('href')).toBe(DOWNLOADS.installerPath);
      expect(a.getAttribute('download')).toBe(DOWNLOADS.installerFile);
    }
    expect(screen.getAllByTestId('prepare-session').length).toBeGreaterThanOrEqual(2);
  });

  it('"Preparar mi sesión" lleva al login con Google', () => {
    renderLanding();
    fireEvent.click(screen.getAllByTestId('prepare-session')[0]);
    expect(screen.getByTestId('phase').textContent).toBe('login');
  });

  it('con la cuenta ya iniciada, "Preparar mi sesión" va directo a Material', () => {
    renderLanding({ session: { ...initialState.session, isAuthenticated: true } });
    fireEvent.click(screen.getAllByTestId('prepare-session')[0]);
    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
  });

  it('secciones: cómo funciona, funciones, sin conexión, requisitos y preguntas', () => {
    const { container } = renderLanding();
    for (const id of ['como-funciona', 'funciones', 'sin-conexion', 'requisitos', 'preguntas']) {
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
    expect(screen.getAllByTestId('feature').length).toBe(8);
    expect(screen.getByText('Windows 10 u 11 de 64 bits')).toBeTruthy();
    expect(screen.getByText(/Windows protegió su PC/)).toBeTruthy();
  });

  it('el asistente sin conexión: recomendado desde la app; descarga directa con carpeta, nombre y SHA-256', () => {
    renderLanding();
    expect(screen.getByText('Recomendado')).toBeTruthy();
    const manual = screen.getByTestId('manual-model');
    expect(within(manual).getByText('%APPDATA%\\yaleh\\models')).toBeTruthy();
    expect(within(manual).getByText(LOCAL_AI.fileName)).toBeTruthy();
    expect(within(manual).getByText(LOCAL_AI.sha256)).toBeTruthy();
    expect(screen.getByTestId('download-model').getAttribute('href')).toBe(LOCAL_AI.url);
    expect(screen.getByTestId('download-model').textContent).toContain('2,7 GB');
  });
});
