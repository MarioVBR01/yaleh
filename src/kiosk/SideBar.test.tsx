/**
 * ORION #31: barra lateral con el logo nuevo, la opción activa en naranja y el pie "Sesión protegida".
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import SideBar from './SideBar';

afterEach(() => uninstallElectronMock());

function renderSideBar(collapsed: boolean) {
  createElectronMock().install();
  render(
    <AppProvider initial={{ ...initialState, phase: 'kiosk', kioskActive: true }}>
      <SideBar collapsed={collapsed} />
    </AppProvider>
  );
}

describe('Barra lateral (ORION #31)', () => {
  it('logo de 44 px con "YALEH" y "Entorno de estudio"', () => {
    renderSideBar(false);
    expect(screen.getByTestId('yaleh-logo').getAttribute('width')).toBe('44');
    expect(screen.getByText('YALEH')).toBeTruthy();
    expect(screen.getByText('Entorno de estudio')).toBeTruthy();
  });

  it('la opción activa tiene fondo naranja suave, línea a la izquierda e ícono naranja', () => {
    renderSideBar(false);
    const active = screen.getByText('Espacio de trabajo').closest('button')!;
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('bg-accent/15');
    expect(active.className).toContain('inset_3px_0_0_var(--color-accent)');
    expect(active.querySelector('span')!.className).toContain('text-accent');
    expect(screen.getByText('Estadísticas').closest('button')!.getAttribute('aria-current')).toBeNull();
  });

  it('el pie dice "Sesión protegida" y lo explica en una línea', () => {
    renderSideBar(false);
    const foot = screen.getByTestId('sidebar-foot');
    expect(foot.textContent).toContain('Sesión protegida');
    expect(foot.textContent).toContain('Solo se abren los sitios de estudio permitidos. Si se corta internet, el asistente sin conexión sigue funcionando.');
    expect(screen.queryByText('Modo Kiosko Activo')).toBeNull();
  });

  it('colapsada muestra solo los íconos', () => {
    renderSideBar(true);
    expect(screen.queryByText('Entorno de estudio')).toBeNull();
    expect(screen.queryByTestId('sidebar-foot')).toBeNull();
    expect(screen.getByLabelText('Sesión protegida')).toBeTruthy();
    // Los nombres solo aparecen como ayuda al pasar el mouse.
    expect(screen.getByTitle('Espacio de trabajo')).toBeTruthy();
  });
});
