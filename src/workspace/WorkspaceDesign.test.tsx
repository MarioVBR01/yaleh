/**
 * ORION #35: espacio de trabajo con el estilo nuevo (Fuentes, Chat y Estudio).
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, makeLocalAiStatus, uninstallElectronMock } from '../test/electron-mock';

const generateStudyItem = vi.fn();
vi.mock('../ai/gemini', async importOriginal => ({
  ...(await importOriginal<typeof import('../ai/gemini')>()),
  generateStudyItem: (...args: unknown[]) => generateStudyItem(...args),
}));

const { default: SourcesColumn } = await import('./SourcesColumn');
const { default: ChatColumn } = await import('./ChatColumn');
const { default: StudioColumn } = await import('./StudioColumn');

afterEach(() => {
  uninstallElectronMock();
  generateStudyItem.mockReset();
});

const files = [
  { id: 'f1', name: 'Biología celular.pdf', size: 2_480_000, type: 'application/pdf', status: 'ready', charCount: 100 },
  { id: 'f2', name: 'Apuntes.docx', size: 312_000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', status: 'ready', charCount: 50 },
] as AppState['uploadedFiles'];

const online: Partial<AppState> = { sessionMode: 'online', connection: 'online', workspaceId: 'w1', uploadedFiles: files };
const offline: Partial<AppState> = { sessionMode: 'offline', connection: 'offline', workspaceId: 'w1', uploadedFiles: files, localAi: makeLocalAiStatus({ state: 'installed' }) };

function renderIn(state: Partial<AppState>, ui: React.ReactNode, mock = createElectronMock({ connection: state.connection, localAi: state.localAi ?? undefined })) {
  mock.install();
  render(<AppProvider initial={{ ...initialState, phase: 'kiosk', ...state }}>{ui}</AppProvider>);
  return mock;
}

describe('Fuentes (ORION #35)', () => {
  it('cada archivo con ícono naranja, nombre, tamaño (en lugar de páginas) y la casilla; "2 de 2"', () => {
    renderIn(online, <SourcesColumn />);
    const items = screen.getAllByTestId('source-item');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Biología celular.pdf')).toBeTruthy();
    expect(within(items[0]).getByText('2,4 MB')).toBeTruthy();
    expect(within(items[0]).getByLabelText('Se usa en el chat y en Estudio')).toBeTruthy();
    expect(items[0].className).toContain('border-accent');
    expect(screen.getByTestId('sources-count').textContent).toBe('2 de 2');
  });

  it('solo los archivos cargados: sin zona para soltar ni botón para agregar (ORION #45)', () => {
    renderIn(online, <SourcesColumn />);
    expect(screen.queryByText(/Agregar/)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(document.querySelector('.border-dashed')).toBeNull();
  });

  it('un archivo arrastrado sobre la columna no hace nada (ORION #45)', () => {
    renderIn(online, <SourcesColumn />);
    const column = screen.getByTestId('sources-column');
    const file = new File(['x'], 'otro.pdf', { type: 'application/pdf' });
    const dataTransfer = { files: [file], items: [], types: ['Files'], dropEffect: 'copy' };
    const over = fireEvent.dragOver(column, { dataTransfer });
    expect(over).toBe(false); // preventDefault: el navegador no abre el archivo
    expect(dataTransfer.dropEffect).toBe('none');
    expect(fireEvent.drop(column, { dataTransfer })).toBe(false);
    expect(screen.getAllByTestId('source-item')).toHaveLength(2);
  });
});

describe('Chat (ORION #35)', () => {
  it('pregunta en burbuja oscura, respuesta con el ícono del asistente y la cita con el nombre del archivo; Enviar naranja', async () => {
    renderIn(offline, <ChatColumn />);
    const sendButton = screen.getByLabelText('Enviar');
    expect(sendButton.className).toContain('bg-accent');
    fireEvent.change(screen.getByPlaceholderText('Escribe tu pregunta…'), { target: { value: '¿Qué es una célula?' } });
    fireEvent.click(sendButton);
    const user = await screen.findByTestId('msg-user');
    expect(user.className).toContain('bg-ink');
    expect(user.className).toContain('self-end');
    await screen.findByText('Respuesta local');
    const cites = screen.getAllByTestId('cite').map(c => c.textContent);
    expect(cites).toEqual(['Biología celular.pdf', 'Apuntes.docx']);
    // Sin páginas (queda para la versión 2).
    expect(cites.join(' ')).not.toMatch(/pág/);
  });

  it('las sugerencias son botones redondeados', () => {
    renderIn(offline, <ChatColumn />);
    expect(screen.getByText('Dame un ejemplo práctico').className).toContain('rounded-full');
  });

  it.each([
    ['sin conexión', offline],
    ['con conexión', online],
  ])('sin "Buscar también en Wikipedia" ni su aviso, %s (ORION #45)', (_label, state) => {
    renderIn(state, <ChatColumn />);
    expect(screen.getByPlaceholderText('Escribe tu pregunta…')).toBeTruthy();
    expect(screen.queryByText(/Wikipedia/)).toBeNull();
  });
});

describe('Estudio (ORION #35)', () => {
  it('con conexión, las 8 herramientas en dos columnas y en el orden del diseño', () => {
    renderIn(online, <StudioColumn />);
    const grid = screen.getByText('Resumen').closest('div')!;
    expect(grid.className).toContain('grid-cols-2');
    expect([...grid.querySelectorAll('button')].map(b => b.textContent)).toEqual([
      'Resumen', 'Tarjetas', 'Cuestionario', 'Informe', 'Mapa mental', 'Tabla', 'Presentación', 'Infografía',
    ]);
    expect(grid.querySelector('svg')!.getAttribute('class')).toContain('text-accent-soft');
  });

  it('lo generado aparece en "Generado en esta sesión" y las notas quedan abajo de todo', async () => {
    generateStudyItem.mockResolvedValue({ kind: 'flashcards', data: { cards: Array.from({ length: 12 }, (_, i) => ({ front: `P${i}`, back: `R${i}` })) } });
    renderIn(online, <StudioColumn />);
    expect(screen.queryByText('Generado en esta sesión')).toBeNull();
    fireEvent.click(screen.getByText('Tarjetas'));
    expect(await screen.findByText('Generado en esta sesión')).toBeTruthy();
    expect(screen.getByTestId('study-item').textContent).toContain('12 tarjetas · recién');
    const column = screen.getByTestId('notes-box').parentElement!;
    expect(column.lastElementChild).toBe(screen.getByTestId('notes-box'));
  });
});
