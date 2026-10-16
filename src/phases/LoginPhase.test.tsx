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
  it('logo nuevo, "YALEH." y la frase de la web', () => {
    renderLogin();
    expect(screen.getByTestId('yaleh-logo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'YALEH.' })).toBeTruthy();
    expect(screen.getByText('Prepará tu sesión acá y estudiá en la app de escritorio.')).toBeTruthy();
  });

  it('botón blanco "Continuar con Google" con el logo de Google y la indicación de TECBA', () => {
    renderLogin();
    const button = screen.getByText('Continuar con Google').closest('button')!;
    expect(button.className).toContain('bg-white');
    expect(button.querySelector('svg path[fill="#4285F4"]')).toBeTruthy();
    expect(screen.getByText('Usá tu cuenta institucional de TECBA.')).toBeTruthy();
  });

  it('sin recuadro ni degradé azul', () => {
    const { container } = renderLogin();
    expect(container.innerHTML).not.toMatch(/from-slate|via-blue|bg-gradient|backdrop-blur|Iniciar Sesión/);
  });

  it('mientras se comprueba la sesión (BUG-002) no muestra el botón', () => {
    renderLogin(false);
    expect(screen.queryByText('Continuar con Google')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Comprobando tu sesión');
  });
});
