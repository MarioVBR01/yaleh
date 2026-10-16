/**
 * ORION #38: Material de estudio con el diseño nuevo.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import DropzonePhase from './DropzonePhase';

function Probe() {
  return <output data-testid="phase">{useApp().state.phase}</output>;
}

const files = [
  { id: 'f1', name: 'Practica_MikroTik.pdf', size: 1_468_006, type: 'application/pdf', status: 'ready', charCount: 10 },
  { id: 'f2', name: 'Marco Teórico.pdf', size: 1_887_437, type: 'application/pdf', status: 'ready', charCount: 10 },
] as AppState['uploadedFiles'];

function renderDropzone(uploadedFiles: AppState['uploadedFiles'] = []) {
  render(
    <AppProvider initial={{ ...initialState, phase: 'dropzone', workspaceId: 'w1', uploadedFiles }}>
      <DropzonePhase />
      <Probe />
    </AppProvider>
  );
}

describe('Material (ORION #38)', () => {
  it('título, zona grande para arrastrar y barra de uso', () => {
    renderDropzone();
    expect(screen.getByRole('heading', { name: '¿Con qué vas a estudiar?' })).toBeTruthy();
    expect(screen.getByTestId('dropzone').className).toContain('border-dashed');
    expect(screen.getByText('o hacé clic para elegirlos · PDF, Word o texto')).toBeTruthy();
    expect(screen.getByTestId('usage').textContent).toBe('0 B de 500 MB');
  });

  it('lista los archivos con su tamaño y una X; la barra suma lo cargado', () => {
    renderDropzone(files);
    const rows = screen.getAllByTestId('file-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('1,4 MB · texto listo')).toBeTruthy();
    expect(within(rows[0]).getByLabelText('Quitar Practica_MikroTik.pdf')).toBeTruthy();
    expect(screen.getByTestId('usage').textContent).toBe('3,2 MB de 500 MB');
  });

  it('sin archivos: "Seguir sin archivos" lleva a la duración; "Continuar" espera archivos', () => {
    renderDropzone();
    expect((screen.getByText('Continuar') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Seguir sin archivos'));
    expect(screen.getByTestId('phase').textContent).toBe('timer-select');
  });

  it('con archivos listos, "Continuar" lleva a la duración', () => {
    renderDropzone(files);
    expect((screen.getByText('Seguir sin archivos') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByTestId('phase').textContent).toBe('timer-select');
  });
});
