/**
 * ORION #21 y #34: el aviso del límite de pestañas se ve claro y no lo tapa una pestaña externa.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState, TAB_LIMIT_MESSAGE } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import KioskLayout from './KioskLayout';

afterEach(() => uninstallElectronMock());

describe('Aviso de pestañas (ORION #21 y #34)', () => {
  it('tarjeta con fondo invertido, ocupa su lugar arriba del área de trabajo y se cierra con "Entendido"', () => {
    createElectronMock().install();
    render(
      <AppProvider initial={{ ...initialState, phase: 'kiosk', kioskActive: true, notice: TAB_LIMIT_MESSAGE }}>
        <KioskLayout />
      </AppProvider>
    );
    const banner = screen.getByText(TAB_LIMIT_MESSAGE).closest('[role="alert"]') as HTMLElement;
    expect(TAB_LIMIT_MESSAGE).toBe('Tenés 8 pestañas abiertas. Es el máximo de la sesión. Cerrá una para abrir otra.');
    // Fondo invertido: el color del texto (claro en modo oscuro) como fondo; ícono naranja.
    expect(banner.className).toContain('bg-ink');
    expect(banner.className).toContain('text-canvas');
    expect(banner.className).not.toMatch(/absolute|fixed/);
    expect(banner.querySelector('svg')!.getAttribute('class')).toContain('text-brand');
    // Va antes del contenedor de las pestañas (en el flujo): la pestaña externa se achica debajo.
    const tabsArea = banner.parentElement!.parentElement!.lastElementChild as HTMLElement;
    expect(tabsArea.className).toContain('relative');
    expect(banner.compareDocumentPosition(tabsArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByText('Entendido'));
    expect(screen.queryByText(TAB_LIMIT_MESSAGE)).toBeNull();
  });

  it('con 8 pestañas, contador naranja 8/8 y "Nueva pestaña" deshabilitado', () => {
    createElectronMock().install();
    const tabs = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, type: 'workspace-url' as const, title: `Pestaña ${i}`, url: `https://docs.google.com/${i}` }));
    render(
      <AppProvider initial={{ ...initialState, phase: 'kiosk', kioskActive: true, tabs, activeTabId: 't0' }}>
        <KioskLayout />
      </AppProvider>
    );
    expect(screen.getByTestId('tab-counter').textContent).toBe('8/8');
    expect((screen.getByText('Nueva Pestaña').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
