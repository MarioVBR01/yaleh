/**
 * Landing page, el inicio de la web (revisión 1.10): presenta YALEH, lleva a preparar la sesión y ofrece
 * el instalador y, aparte, la IA Local.
 */

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    // Firebase Hosting gratis no admite .exe: el instalador está en GitHub Releases.
    expect(DOWNLOADS.installerUrl).toBe(`https://github.com/MarioVBR01/yaleh/releases/download/v${pkg.version}/YALEH-Setup-${pkg.version}.exe`);
  });

  it('título, logo y los dos botones: preparar la sesión y descargar el instalador', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Estudia sin distracciones.' })).toBeTruthy();
    expect(screen.getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    const downloads = screen.getAllByTestId('download-installer');
    expect(downloads.length).toBeGreaterThanOrEqual(2);
    for (const a of downloads) {
      expect(a.getAttribute('href')).toBe(DOWNLOADS.installerUrl);
      expect(a.getAttribute('download')).toBe(DOWNLOADS.installerFile);
    }
    expect(screen.getAllByTestId('prepare-session').length).toBeGreaterThanOrEqual(2);
  });

  it('"Preparar mi sesión" lleva al login con Google', () => {
    renderLanding();
    fireEvent.click(screen.getAllByTestId('prepare-session')[0]);
    expect(screen.getByTestId('phase').textContent).toBe('login');
  });

  it('con la cuenta ya abierta, "Preparar mi sesión" va a Mis sesiones', () => {
    renderLanding({ session: { ...initialState.session, isAuthenticated: true } });
    fireEvent.click(screen.getAllByTestId('prepare-session')[0]);
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
  });

  it('el encabezado tiene "Ingresar", que lleva al login', () => {
    renderLanding();
    expect(screen.queryByTestId('my-sessions')).toBeNull();
    fireEvent.click(screen.getByTestId('sign-in'));
    expect(screen.getByTestId('phase').textContent).toBe('login');
  });

  it('con la cuenta ya abierta, en su lugar se ve "Mis sesiones" con las iniciales', () => {
    renderLanding({ session: { ...initialState.session, isAuthenticated: true, initials: 'AB' } });
    expect(screen.queryByTestId('sign-in')).toBeNull();
    const button = screen.getByTestId('my-sessions');
    expect(button.textContent).toBe('ABMis sesiones');
    fireEvent.click(button);
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
  });

  it('con foto, muestra la foto', () => {
    renderLanding({ session: { ...initialState.session, isAuthenticated: true, avatar: 'foto.png' } });
    expect(screen.getByTestId('my-sessions').querySelector('img')!.getAttribute('src')).toBe('foto.png');
  });

  it('tiene el botón de tema', () => {
    renderLanding();
    expect(screen.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/ })).toBeTruthy();
  });

  it('el encabezado marca el borde y la sombra al bajar 10 px', () => {
    const { container } = render(
      <div style={{ overflowY: 'auto' }} data-testid="scroller">
        <AppProvider initial={{ ...initialState, phase: 'landing', authChecked: true }}>
          <LandingPage />
        </AppProvider>
      </div>
    );
    const header = container.querySelector('header')!;
    expect(header.dataset.scrolled).toBe('false');
    expect(header.className).toContain('border-transparent');
    const scroller = screen.getByTestId('scroller');
    Object.defineProperty(scroller, 'scrollTop', { value: 11, configurable: true });
    fireEvent.scroll(scroller);
    expect(header.dataset.scrolled).toBe('true');
    expect(header.className).toContain('shadow-');
  });

  it('las preguntas se abren y se cierran', async () => {
    renderLanding();
    const question = screen.getByRole('button', { name: '¿Cuánto cuesta?' });
    expect(question.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/usa solo servicios gratuitos/)).toBeNull();
    fireEvent.click(question);
    expect(question.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByText(/usa solo servicios gratuitos/)).toBeTruthy();
    fireEvent.click(question);
    await waitFor(() => expect(screen.queryByText(/usa solo servicios gratuitos/)).toBeNull());
  });

  it('no menciona "Tus sesiones pasadas" ni usa voseo', () => {
    const { container } = renderLanding();
    expect(container.textContent).not.toMatch(/sesiones pasadas/i);
    expect(container.textContent).not.toMatch(/\b(Prepará|Estudiá|Abrí|Elegí|Descargá|Copialo|podés|tenés|necesitás|preferís|acá)\b/);
  });

  it('secciones: cómo funciona, funciones, sin conexión, requisitos y preguntas', () => {
    const { container } = renderLanding();
    for (const id of ['como-funciona', 'funciones', 'sin-conexion', 'requisitos', 'preguntas']) {
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
    expect(screen.getAllByTestId('feature').length).toBe(8);
    expect(screen.getByText('Tus sesiones quedan en tu cuenta: ábrelas, cámbialas y vuelve a descargarlas cuando quieras. Cada archivo vale 24 horas y se usa una vez.')).toBeTruthy();
    expect(screen.getByText('Windows 10 u 11 de 64 bits')).toBeTruthy();
    expect(screen.getByText(/Windows protegió su PC/)).toBeTruthy();
  });

  it('la IA Local: recomendado desde la app; descarga directa con carpeta, nombre y SHA-256', () => {
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
