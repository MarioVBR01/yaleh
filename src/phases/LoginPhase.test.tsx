/**
 * Web: pantalla de inicio de sesión (panel de marca + tarjeta de vidrio).
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState } from '../store/appStore';
import LoginPhase from './LoginPhase';

function renderLogin(authChecked = true) {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'login', authChecked }}>
      <LoginPhase />
    </AppProvider>
  );
}

describe('Web: pantalla de inicio de sesión', () => {
  it('logo, el título "Iniciar sesión" y la frase de la web', () => {
    renderLogin();
    expect(screen.getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByText('Prepara tu sesión aquí y estudia en la app de escritorio.')).toBeTruthy();
  });

  it('panel de marca con el logo y los destellos, y la tarjeta del formulario con el botón', () => {
    renderLogin();
    const brand = screen.getByTestId('login-brand');
    expect(within(brand).getAllByTestId('yaleh-logo').length).toBeGreaterThan(0);
    // "YALEH." lleva el punto naranja en su propio span.
    expect(brand.textContent).toContain('YALEH.');
    expect(brand.textContent).toContain('Tu entorno de estudio sin distracciones.');
    expect(within(brand).getAllByTestId('login-sparkle').length).toBeGreaterThanOrEqual(10);
    // El panel es la marca: fondo oscuro también en modo claro.
    expect(brand.style.background).toBe('rgb(16, 15, 14)');

    const card = screen.getByTestId('login-card');
    expect(card.className).toContain('glass-card');
    expect(within(card).getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(within(card).getByText('Registrarse con Google')).toBeTruthy();
    expect(within(card).getByText('Versión 1: el registro se hace con tu cuenta de Google.')).toBeTruthy();
    // El logo grande vive en el panel, no en la tarjeta.
    expect(within(card).queryByTestId('yaleh-logo')).toBeNull();
  });

  it('botón blanco "Registrarse con Google" con su logo, la ayuda y la nota de la versión', () => {
    renderLogin();
    const button = screen.getByText('Registrarse con Google').closest('button')!;
    expect(button.className).toContain('bg-white');
    expect(button.querySelector('svg path[fill="#4285F4"]')).toBeTruthy();
    expect(screen.getByText('Si ya te registraste, entras directo a Mis sesiones.')).toBeTruthy();
    const note = screen.getByText('Versión 1: el registro se hace con tu cuenta de Google.');
    expect(note.className).toContain('text-xs');
    expect(note.className).toContain('text-ink-muted');
    expect(note.querySelector('svg')).toBeTruthy();
  });

  it('tiene el botón de tema', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/ })).toBeTruthy();
  });

  it('sin restos del MVP (degradé ni azul de Tailwind)', () => {
    const { container } = renderLogin();
    expect(container.innerHTML).not.toMatch(/from-slate|via-blue|bg-blue|bg-gradient|Iniciar Sesión/);
  });

  it('mientras se comprueba la cuenta (BUG-002) no muestra el botón', () => {
    renderLogin(false);
    expect(screen.queryByText('Registrarse con Google')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Comprobando tu cuenta');
  });
});
