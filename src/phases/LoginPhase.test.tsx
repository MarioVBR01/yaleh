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
    expect(screen.getByText('Prepara tu sesión aquí y estudia en la app de escritorio.')).toBeTruthy();
  });

  it('botón blanco "Ingresar" con el logo de Google y cómo se crea la cuenta', () => {
    renderLogin();
    const button = screen.getByText('Ingresar').closest('button')!;
    expect(button.className).toContain('bg-white');
    expect(button.querySelector('svg path[fill="#4285F4"]')).toBeTruthy();
    expect(screen.getByText('Ingresa con tu cuenta de Google. Si es tu primera vez, tu cuenta de YALEH se crea automáticamente.')).toBeTruthy();
  });

  it('sin recuadro ni degradé azul', () => {
    const { container } = renderLogin();
    expect(container.innerHTML).not.toMatch(/from-slate|via-blue|bg-gradient|backdrop-blur|Iniciar Sesión/);
  });

  it('mientras se comprueba la cuenta (BUG-002) no muestra el botón', () => {
    renderLogin(false);
    expect(screen.queryByText('Ingresar')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Comprobando tu cuenta');
  });
});
