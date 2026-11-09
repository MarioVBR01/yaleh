/**
 * ORION #37: web, pantalla de entrar con la composición de la bienvenida del escritorio.
 */

import { render, screen } from '@testing-library/react';
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

describe('Web: pantalla de entrar (ORION #37)', () => {
  it('logo, el título "Iniciar sesión" y la frase de la web', () => {
    renderLogin();
    expect(screen.getByTestId('yaleh-logo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByText('Prepara tu sesión aquí y estudia en la app de escritorio.')).toBeTruthy();
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

  it('sin recuadro ni degradé azul', () => {
    const { container } = renderLogin();
    expect(container.innerHTML).not.toMatch(/from-slate|via-blue|bg-gradient|backdrop-blur|Iniciar Sesión/);
  });

  it('mientras se comprueba la cuenta (BUG-002) no muestra el botón', () => {
    renderLogin(false);
    expect(screen.queryByText('Registrarse con Google')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Comprobando tu cuenta');
  });
});
