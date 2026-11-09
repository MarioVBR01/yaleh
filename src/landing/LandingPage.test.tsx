/**
 * Landing page, el inicio de la web (revisión 1.10): presenta YALEH, lleva a preparar la sesión y ofrece
 * el instalador y, aparte, la IA Local.
 */

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_VERSION, DOWNLOADS, LOCAL_AI } from '@shared/config';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import LandingPage from './LandingPage';

const signOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../firebase/auth', () => ({ signOut }));

beforeEach(() => signOut.mockClear());

const signedIn = (extra: Partial<AppState['session']> = {}) => ({
  session: { ...initialState.session, isAuthenticated: true, displayName: 'Ana María Rojas', email: 'ana@tecba.edu.bo', initials: 'AR', ...extra },
});
const openMenu = () => fireEvent.click(screen.getByTestId('account-menu-button'));

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

  it('título, logo y los dos botones: iniciar sesión y descargar el instalador', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Estudia sin distracciones.' })).toBeTruthy();
    expect(screen.getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    const downloads = screen.getAllByTestId('download-installer');
    expect(downloads.length).toBeGreaterThanOrEqual(2);
    for (const a of downloads) {
      expect(a.getAttribute('href')).toBe(DOWNLOADS.installerUrl);
      expect(a.getAttribute('download')).toBe(DOWNLOADS.installerFile);
    }
    expect(screen.getAllByTestId('sign-in').length).toBeGreaterThanOrEqual(2);
  });

  it('hay un solo botón para entrar: "Iniciar sesión" en todos lados, sin "Ingresar" ni "Preparar mi sesión"', () => {
    const { container } = renderLanding();
    for (const button of screen.getAllByTestId('sign-in')) expect(button.textContent).toBe('Iniciar sesión');
    expect(container.textContent).not.toMatch(/Preparar mi sesión|Ingresar/);
  });

  it('"Iniciar sesión" lleva al login', () => {
    renderLanding();
    fireEvent.click(screen.getAllByTestId('sign-in')[0]);
    expect(screen.getByTestId('phase').textContent).toBe('login');
  });

  it('el encabezado va en orden: tema, Iniciar sesión y Descargar para Windows', () => {
    const { container } = renderLanding();
    const labels = [...container.querySelectorAll('header [aria-label^="Cambiar a modo"], header [data-testid="sign-in"], header [data-testid="download-installer"]')];
    expect(labels.map(e => e.getAttribute('data-testid') ?? 'tema')).toEqual(['tema', 'sign-in', 'download-installer']);
  });

  it('con la cuenta abierta, los botones grandes dicen "Ir a Mis sesiones" y llevan ahí', () => {
    renderLanding(signedIn());
    const buttons = screen.getAllByTestId('sign-in');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    for (const button of buttons) expect(button.textContent).toBe('Ir a Mis sesiones');
    fireEvent.click(buttons[0]);
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
  });

  it('con la cuenta abierta, arriba se ve el ícono naranja con las iniciales y el primer nombre', () => {
    const { container } = renderLanding(signedIn());
    expect(container.querySelector('header [data-testid="sign-in"]')).toBeNull();
    const button = screen.getByTestId('account-menu-button');
    expect(button.textContent).toBe('ARAna');
    expect(screen.getByTestId('user-initials').className).toContain('bg-accent');
  });

  it('con foto, muestra la foto; si no carga, las iniciales', () => {
    renderLanding(signedIn({ avatar: 'foto.png' }));
    const image = screen.getByTestId('account-menu-button').querySelector('img')!;
    expect(image.getAttribute('src')).toBe('foto.png');
    fireEvent.error(image);
    expect(screen.getByTestId('user-initials').textContent).toBe('AR');
  });

  it('el menú muestra el nombre completo, el correo y las dos opciones', () => {
    renderLanding(signedIn());
    const button = screen.getByTestId('account-menu-button');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    openMenu();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Ana María Rojas')).toBeTruthy();
    expect(within(menu).getByText('ana@tecba.edu.bo')).toBeTruthy();
    expect(within(menu).getAllByRole('menuitem').map(i => i.textContent?.trim())).toEqual(['Mis sesiones', 'Cerrar sesión']);
  });

  it('"Mis sesiones" del menú va a la lista', () => {
    renderLanding(signedIn());
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mis sesiones' }));
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
  });

  it('"Cerrar sesión" del menú cierra la cuenta', async () => {
    renderLanding(signedIn());
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('si no se puede cerrar la sesión, avisa', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    signOut.mockRejectedValueOnce(new Error('sin red'));
    renderLanding(signedIn());
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(await screen.findByText('No se pudo cerrar la sesión. Inténtalo de nuevo.')).toBeTruthy();
    logged.mockRestore();
  });

  it('Escape cierra el menú y devuelve el foco al botón', () => {
    renderLanding(signedIn());
    openMenu();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Mis sesiones' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('account-menu-button'));
  });

  it('un clic afuera cierra el menú', () => {
    renderLanding(signedIn());
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('las flechas recorren las opciones', () => {
    renderLanding(signedIn());
    openMenu();
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Mis sesiones' }));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
  });

  it('el paso 1 dice cómo iniciar sesión y las preguntas explican el registro', async () => {
    renderLanding();
    expect(screen.getByText('Inicia sesión con tu cuenta de Google, sube tus apuntes (PDF, Word o texto) y elige cuánto tiempo vas a estudiar.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '¿Necesito registrarme?' }));
    expect(await screen.findByText('Sí, con tu cuenta de Google: al iniciar sesión por primera vez, YALEH crea tu cuenta y guarda tus sesiones en ella. En esta versión el registro es solo con Google.')).toBeTruthy();
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
