/**
 * ORION #18: mapa mental, tabla, infografía y presentación (Gemini, con conexión).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../store/appStore';
import { AppProvider } from '../context/AppContext';
import { parseStudyOutput } from '../ai/study-items';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import { DataTable, Infographic, MindMap, Presentation, tableToTsv } from './StudyVisuals';

const generateStudyItem = vi.fn();
vi.mock('../ai/gemini', async importOriginal => ({
  ...(await importOriginal<typeof import('../ai/gemini')>()),
  generateStudyItem: (...args: unknown[]) => generateStudyItem(...args),
}));

const { default: StudioColumn } = await import('./StudioColumn');

afterEach(() => {
  uninstallElectronMock();
  generateStudyItem.mockReset();
});

const TABLE = { title: 'Reptiles', columns: ['Especie', 'Vida'], rows: [['Tortuga', '80 años'], ['Iguana', '15 años']] };

describe('parseStudyOutput: tipos nuevos', () => {
  it('mapa mental, tabla, infografía y presentación válidos', () => {
    expect(parseStudyOutput('mindmap', JSON.stringify({ central: 'Reptiles', branches: [{ label: 'Tipos', children: ['Tortugas'] }, { label: 'Hábitat', children: [] }] })).kind).toBe('mindmap');
    expect(parseStudyOutput('table', JSON.stringify(TABLE)).data).toEqual(TABLE);
    const info = parseStudyOutput('infographic', JSON.stringify({ title: 'T', subtitle: 's', stats: [{ icon: 'nada', value: '80', label: 'años' }], points: [{ icon: 'book', text: 'Leen' }] }));
    expect(info.kind === 'infographic' && info.data.stats[0].icon).toBe('idea'); // ícono desconocido → idea
    expect(parseStudyOutput('presentation', JSON.stringify({ title: 'P', slides: [{ title: 'Uno', bullets: ['a'] }] })).kind).toBe('presentation');
  });

  it('rechaza resultados incompletos', () => {
    expect(() => parseStudyOutput('mindmap', JSON.stringify({ central: 'x', branches: [] }))).toThrow();
    expect(() => parseStudyOutput('table', JSON.stringify({ columns: ['a'], rows: [] }))).toThrow();
    expect(() => parseStudyOutput('presentation', JSON.stringify({ title: 'x', slides: [] }))).toThrow();
  });
});

describe('visualizaciones', () => {
  it('mapa mental: tema central, ramas y subtemas', () => {
    render(<MindMap data={{ central: 'Reptiles', branches: [{ label: 'Tipos', children: ['Tortugas', 'Iguanas'] }, { label: 'Hábitat', children: ['Mar'] }] }} />);
    expect(screen.getByText('Reptiles')).toBeTruthy();
    expect(screen.getByText('Iguanas')).toBeTruthy();
  });

  it('tabla: se puede copiar (texto con tabulaciones)', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DataTable data={TABLE} />);
    fireEvent.click(screen.getByText('Copiar'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Especie\tVida\nTortuga\t80 años\nIguana\t15 años'));
    expect(tableToTsv(TABLE).split('\n')).toHaveLength(3);
  });

  it('infografía: datos con íconos', () => {
    render(<Infographic data={{ title: 'Tortugas', subtitle: 'Datos', stats: [{ icon: 'clock', value: '80', label: 'años de vida' }], points: [{ icon: 'globe', text: 'Viven en todo el mundo' }] }} />);
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('Viven en todo el mundo')).toBeTruthy();
  });

  it('presentación: descarga .pptx por el proceso principal', async () => {
    const mock = createElectronMock();
    mock.install();
    render(<Presentation data={{ title: 'Reptiles', slides: [{ title: 'Tipos', bullets: ['Tortugas', 'Iguanas'] }] }} />);
    fireEvent.click(screen.getByText('Descargar .pptx'));
    await waitFor(() => expect(mock.api.exportOffice).toHaveBeenCalled());
    const request = (mock.api.exportOffice as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(request.kind).toBe('pptx');
    expect(request.slides).toHaveLength(2); // portada + 1
    expect(request.slides[1].content).toBe('• Tortugas\n• Iguanas');
    expect(await screen.findByText(/Guardado en .*\.pptx/)).toBeTruthy();
  });
});

describe('Estudio con conexión', () => {
  const online = {
    ...initialState,
    sessionMode: 'online' as const,
    connection: 'online' as const,
    workspaceId: 'ws1',
    uploadedFiles: [{ id: 'f1', name: 'a.txt', size: 1, type: 'text/plain', status: 'ready' } as never],
  };

  it('muestra los cuatro botones nuevos y el mapa mental generado', async () => {
    createElectronMock({ connection: 'online' }).install();
    generateStudyItem.mockResolvedValue({ kind: 'mindmap', data: { central: 'Reptiles', branches: [{ label: 'Tipos', children: [] }, { label: 'Hábitat', children: [] }] } });
    render(<AppProvider initial={online}><StudioColumn /></AppProvider>);
    for (const label of ['Mapa mental', 'Tabla', 'Infografía', 'Presentación']) {
      expect((screen.getByText(label).closest('button') as HTMLButtonElement).disabled).toBe(false);
    }
    fireEvent.click(screen.getByText('Mapa mental'));
    expect(await screen.findByTestId('mindmap')).toBeTruthy();
    expect(generateStudyItem).toHaveBeenCalledWith('mindmap', expect.anything());
  });

  it('si Gemini falla, muestra un error claro y la vista sigue', async () => {
    createElectronMock({ connection: 'online' }).install();
    generateStudyItem.mockRejectedValue(new Error('Failed to fetch'));
    render(<AppProvider initial={online}><StudioColumn /></AppProvider>);
    fireEvent.click(screen.getByText('Infografía'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/No hay conexión con el asistente/);
    expect(screen.getByText('Presentación')).toBeTruthy();
  });
});
