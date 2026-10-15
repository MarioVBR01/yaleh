/**
 * ORION #21: el aviso del límite de pestañas se ve claro y no lo tapa una pestaña externa.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState, TAB_LIMIT_MESSAGE } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import KioskLayout from './KioskLayout';

afterEach(() => uninstallElectronMock());

describe('Aviso de pestañas (ORION #21)', () => {
  it('fondo sólido, ocupa su lugar arriba del área de trabajo y se cierra con "Entendido"', () => {
    createElectronMock().install();
    render(
      <AppProvider initial={{ ...initialState, phase: 'kiosk', kioskActive: true, notice: TAB_LIMIT_MESSAGE }}>
        <KioskLayout />
      </AppProvider>
    );
    const banner = screen.getByText(TAB_LIMIT_MESSAGE).closest('[role="alert"]') as HTMLElement;
    expect(banner.className).toContain('bg-danger');
    expect(banner.className).not.toMatch(/bg-danger\/|absolute/);
    // Va antes del contenedor de las pestañas (en el flujo): la pestaña externa se achica debajo.
    const tabsArea = banner.parentElement!.lastElementChild as HTMLElement;
    expect(tabsArea.className).toContain('relative');
    expect(banner.compareDocumentPosition(tabsArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByText('Entendido'));
    expect(screen.queryByText(TAB_LIMIT_MESSAGE)).toBeNull();
  });
});
