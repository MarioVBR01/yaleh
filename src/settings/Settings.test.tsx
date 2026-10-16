/**
 * ORION #7: vista de Configuración y lo que usa la configuración en el resto de la app.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isKioskSafePatch, type AppSettings } from '@shared/settings';
import App from '../App';
import { AppProvider } from '../context/AppContext';
import BottomBar from '../kiosk/BottomBar';
import { PomodoroProvider } from '../pomodoro/PomodoroContext';
import SessionCompletePhase from '../phases/SessionCompletePhase';
import TimerSelectPhase from '../phases/TimerSelectPhase';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import SettingsView from './SettingsView';

afterEach(() => {
  uninstallElectronMock();
  document.documentElement.style.fontSize = '';
  document.documentElement.classList.remove('reduce-motion', 'high-contrast', 'dyslexia-font');
  delete document.documentElement.dataset.theme;
});

const snapshot = (settings: Partial<AppSettings> = {}, sessionActive = false) => ({
  settings: { ...DEFAULT_SETTINGS, ...settings },
  profileName: null,
  exportDirResolved: 'C:\\Users\\x\\Documents\\YALEH',
  sessionActive,
});

function renderSettings(inSession: boolean, options: Parameters<typeof createElectronMock>[0] = {}) {
  const mock = createElectronMock({ sessionActive: inSession, ...options });
  mock.install();
  render(
    <AppProvider initial={{ ...initialState, phase: inSession ? 'kiosk' : 'settings' }}>
      <SettingsView inSession={inSession} />
    </AppProvider>
  );
  return mock;
}

const section = (name: string) => screen.getByRole('region', { name });

describe('SettingsView', () => {
  it('muestra todas las secciones; el modo oscuro se cambia (ORION #29)', async () => {
    renderSettings(false);
    for (const name of ['Sesión', 'Modo nocturno', 'IA sin conexión', 'Datos', 'Apariencia y accesibilidad', 'Perfil', 'Acerca de']) {
      expect(await screen.findByRole('region', { name })).toBeTruthy();
    }
    const dark = screen.getByRole('switch', { name: 'Modo oscuro' }) as HTMLButtonElement;
    expect(dark.disabled).toBe(false);
    expect(within(section('Acerca de')).getByText(/Qwen3\.5-4B.*Apache 2\.0/)).toBeTruthy();
  });

  it('fuera de la sesión cambia las opciones de la sesión y el perfil', async () => {
    const mock = renderSettings(false);
    fireEvent.click(await screen.findByRole('switch', { name: 'Permitir extender la sesión' }));
    expect(mock.api.settings.update).toHaveBeenCalledWith({ allowExtend: false });

    const minutes = screen.getByLabelText('Duración predeterminada en minutos');
    fireEvent.change(minutes, { target: { value: '45' } });
    fireEvent.blur(minutes);
    expect(mock.api.settings.update).toHaveBeenCalledWith({ defaultSessionMinutes: 45 });

    fireEvent.change(screen.getByLabelText('Nombre del estudiante'), { target: { value: 'Ana' } });
    fireEvent.click(within(section('Perfil')).getByText('Guardar'));
    expect(await screen.findByText('Nombre guardado.', {}, { timeout: 4000 })).toBeTruthy();
    expect(mock.api.settings.setProfileName).toHaveBeenCalledWith('Ana');
  });

  it('una duración fuera de rango muestra el motivo y no se guarda', async () => {
    const mock = renderSettings(false);
    const minutes = await screen.findByLabelText('Duración predeterminada en minutos');
    fireEvent.change(minutes, { target: { value: '500' } });
    fireEvent.blur(minutes);
    expect((await screen.findByRole('alert')).textContent).toMatch(/entre 1 y 180/);
    expect(mock.api.settings.update).not.toHaveBeenCalled();
  });

  it('borrar el historial pide confirmación', async () => {
    const mock = renderSettings(false, { history: [] });
    fireEvent.click(within(await screen.findByRole('region', { name: 'Datos' })).getByText('Borrar'));
    expect(mock.api.clearSessionHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Sí, borrar'));
    await waitFor(() => expect(mock.api.clearSessionHistory).toHaveBeenCalled());
    expect(await screen.findByText(/Se borraron 0 sesiones/)).toBeTruthy();
  });

  it('cancelar el borrado no borra nada (ORION #25)', async () => {
    const mock = renderSettings(false, { history: [] });
    fireEvent.click(within(await screen.findByRole('region', { name: 'Datos' })).getByText('Borrar'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(mock.api.clearSessionHistory).not.toHaveBeenCalled();
    expect(within(section('Datos')).getByText('Borrar')).toBeTruthy();
  });

  it('la carpeta de exportaciones se elige con el selector propio y se muestra (ORION #25)', async () => {
    const mock = renderSettings(true);
    fireEvent.click(within(await screen.findByRole('region', { name: 'Datos' })).getByText('Cambiar'));
    // Selector propio, nunca la ventana de Windows; también durante la sesión.
    const folder = 'C:\\Users\\x\\Documents\\YALEH';
    await waitFor(() => expect(screen.getByTestId('current-folder').textContent).toContain('YALEH'));
    fireEvent.click(screen.getByText('Usar esta carpeta'));
    await waitFor(() => expect(mock.api.settings.setExportDir).toHaveBeenCalledWith(folder));
    expect((await within(section('Datos')).findByRole('status')).textContent).toBe(`Las exportaciones se guardarán en ${folder}`);
  });

  it('exportar el historial muestra dónde se guardó, junto al botón (ORION #25)', async () => {
    const mock = renderSettings(false);
    fireEvent.click(within(await screen.findByRole('region', { name: 'Datos' })).getByText('Exportar PDF'));
    await waitFor(() => expect(mock.api.exportSessionHistoryPdf).toHaveBeenCalled());
    expect((await within(section('Datos')).findByRole('status')).textContent).toMatch(/^Guardado en .*Historial de sesiones .*\.pdf$/);
  });

  it('dentro de la sesión, lo que afecta a la sesión está deshabilitado; el tamaño del texto se puede cambiar', async () => {
    const mock = renderSettings(true);
    const extend = (await screen.findByRole('switch', { name: 'Permitir extender la sesión' })) as HTMLButtonElement;
    expect(extend.disabled).toBe(true);
    expect((screen.getByLabelText('Duración predeterminada en minutos') as HTMLInputElement).disabled).toBe(true);
    // Lo inofensivo sí se puede durante la sesión (ORION #19): nombre, accesibilidad, alarmas y aviso.
    expect((screen.getByLabelText('Nombre del estudiante') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole('switch', { name: 'Alto contraste' }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(section('Datos')).getByText('Borrar') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Muy grande'));
    expect(mock.api.settings.update).toHaveBeenCalledWith({ textScale: 'xlarge' });
  });
});

describe('opciones del kiosko (ORION #19)', () => {
  it('dentro de la sesión se cambian el aviso (minutos libres), el volumen, el sonido y el nombre', async () => {
    const mock = renderSettings(true);
    const warning = (await screen.findByLabelText('Minutos del aviso antes de que termine')) as HTMLInputElement;
    // Esperar a que el campo tenga el valor guardado (si no, el relleno inicial puede pisar lo escrito).
    await waitFor(() => expect(warning.value).toBe(String(DEFAULT_SETTINGS.endWarningMinutes)));
    fireEvent.change(warning, { target: { value: '7' } });
    fireEvent.blur(warning);
    expect(mock.api.settings.update).toHaveBeenCalledWith({ endWarningMinutes: 7 });

    fireEvent.change(screen.getByLabelText('Volumen de las alarmas'), { target: { value: '30' } });
    expect(mock.api.settings.update).toHaveBeenCalledWith({ alarmVolume: 30 });
    fireEvent.change(screen.getByLabelText('Sonido de las alarmas'), { target: { value: 'suave' } });
    expect(mock.api.settings.update).toHaveBeenCalledWith({ alarmSound: 'suave' });

    fireEvent.click(screen.getByRole('switch', { name: 'Tipografía para dislexia' }));
    expect(mock.api.settings.update).toHaveBeenCalledWith({ dyslexiaFont: true });

    fireEvent.change(screen.getByLabelText('Nombre del estudiante'), { target: { value: 'Ana' } });
    fireEvent.click(within(section('Perfil')).getByText('Guardar'));
    expect(await screen.findByText('Nombre guardado.', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('el aviso fuera de rango muestra el motivo y no se guarda', async () => {
    const mock = renderSettings(true);
    const warning = (await screen.findByLabelText('Minutos del aviso antes de que termine')) as HTMLInputElement;
    // Esperar a que el campo tenga el valor guardado (si no, el relleno inicial puede pisar lo escrito).
    await waitFor(() => expect(warning.value).toBe(String(DEFAULT_SETTINGS.endWarningMinutes)));
    fireEvent.change(warning, { target: { value: '90' } });
    fireEvent.blur(warning);
    expect((await screen.findByRole('alert')).textContent).toMatch(/entre 1 y 60/);
    expect(mock.api.settings.update).not.toHaveBeenCalled();
  });

  it('alto contraste y tipografía para dislexia se aplican a toda la interfaz', async () => {
    createElectronMock({ settings: { highContrast: true, dyslexiaFont: true } }).install();
    render(<App />);
    await waitFor(() => expect(document.documentElement.classList.contains('high-contrast')).toBe(true));
    expect(document.documentElement.classList.contains('dyslexia-font')).toBe(true);
  });
});

describe('modo claro/oscuro y logo (ORION #29)', () => {
  it('el interruptor guarda la elección y la app cambia de tema, también durante la sesión', async () => {
    const mock = createElectronMock({ sessionActive: true });
    mock.install();
    render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(isKioskSafePatch({ darkMode: false })).toBe(true);
    await mock.api.settings.update({ darkMode: false });
    expect(mock.api.settings.update).toHaveBeenCalledWith({ darkMode: false });
  });

  it('con el modo oscuro apagado, la app usa el modo claro', async () => {
    createElectronMock({ settings: { darkMode: false } }).install();
    render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  });
});

describe('la configuración en el resto de la app', () => {
  it('el tamaño del texto y reducir animaciones se aplican a toda la interfaz', async () => {
    createElectronMock({ settings: { textScale: 'xlarge', reduceMotion: true } }).install();
    render(<App />);
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe('125%'));
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  });

  it('la bienvenida tiene "Configuración" y saluda con el nombre', async () => {
    createElectronMock({ profileName: 'Ana' }).install();
    render(<App />);
    expect((await screen.findByText('Ana')).parentElement!.textContent).toBe('Hola, Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect(await screen.findByText('⚙️ Configuración')).toBeTruthy();
  });

  it('la vista de duración propone la duración predeterminada', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'timer-select', settings: snapshot({ defaultSessionMinutes: 40 }) }}>
        <TimerSelectPhase />
      </AppProvider>
    );
    expect(screen.getByText('Continuar con 40 min')).toBeTruthy();
  });

  it('si extender está desactivado, la pantalla final no lo ofrece', () => {
    createElectronMock().install();
    render(
      <AppProvider initial={{ ...initialState, phase: 'session-complete', settings: snapshot({ allowExtend: false }) }}>
        <SessionCompletePhase />
      </AppProvider>
    );
    expect(screen.queryByText('+15 min')).toBeNull();
  });

  it('aviso antes de que termine la sesión en la barra inferior', () => {
    const base: AppState = { ...initialState, phase: 'kiosk', sessionDuration: 3000, settings: snapshot({ endWarningMinutes: 5 }) };
    const { unmount } = render(
      <AppProvider initial={{ ...base, timeRemaining: 400 }}>
        <PomodoroProvider>
          <BottomBar onNewTab={() => {}} />
        </PomodoroProvider>
      </AppProvider>
    );
    expect(screen.queryByText(/Quedan .* min de sesión/)).toBeNull();
    unmount();
    render(
      <AppProvider initial={{ ...base, timeRemaining: 290 }}>
        <PomodoroProvider>
          <BottomBar onNewTab={() => {}} />
        </PomodoroProvider>
      </AppProvider>
    );
    expect(screen.getByRole('alert').textContent).toBe('Quedan 5 min de sesión');
  });
});
