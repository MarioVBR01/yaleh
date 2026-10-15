/**
 * ORION #24: botón ⟳ en las pestañas externas (no en las vistas propias de YALEH).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import KioskLayout from '../kiosk/KioskLayout';
import { initialState, type Tab } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import ExternalTabPanel from './ExternalTabPanel';

afterEach(() => uninstallElectronMock());

const docsTab: Tab = { id: 'tab-1', type: 'workspace-url', title: 'Google Docs', url: 'https://docs.google.com/document/d/abc/edit' };
const online = { ...initialState, phase: 'kiosk' as const, sessionMode: 'online' as const, connection: 'online' as const };

describe('Recargar pestaña externa (ORION #24)', () => {
  it('la pestaña externa tiene ⟳ y recarga esa pestaña en el proceso principal', () => {
    const mock = createElectronMock({ connection: 'online' });
    mock.install();
    render(
      <AppProvider initial={{ ...online, tabs: [docsTab], activeTabId: docsTab.id }}>
        <ExternalTabPanel tab={docsTab} />
      </AppProvider>
    );
    expect(screen.getByText('docs.google.com')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Recargar la página'));
    expect(mock.api.tabs.reload).toHaveBeenCalledWith('tab-1');
  });

  it('sin conexión el botón queda deshabilitado', () => {
    createElectronMock().install();
    render(
      <AppProvider initial={{ ...online, sessionMode: 'offline', connection: 'offline', tabs: [docsTab], activeTabId: docsTab.id }}>
        <ExternalTabPanel tab={docsTab} />
      </AppProvider>
    );
    expect((screen.getByLabelText('Recargar la página') as HTMLButtonElement).disabled).toBe(true);
  });

  it('las vistas propias de YALEH no tienen el botón', () => {
    createElectronMock({ connection: 'online' }).install();
    const stats: Tab = { id: 'st', type: 'stats', title: 'Estadísticas' };
    render(
      <AppProvider initial={{ ...online, tabs: [...initialState.tabs, stats], activeTabId: 'st' }}>
        <KioskLayout />
      </AppProvider>
    );
    expect(screen.queryByLabelText('Recargar la página')).toBeNull();
  });
});
