// @vitest-environment node
/**
 * ORION #22: el proceso principal solo deja listar y usar carpetas dentro de las ubicaciones permitidas.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { availableRoots, isInsideRoots, listFolders } from './folder-browser';

let base: string;
beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-folders-'));
  fs.mkdirSync(path.join(base, 'Documentos', 'Tareas', 'Mate'), { recursive: true });
  fs.mkdirSync(path.join(base, 'Documentos', 'YALEH'));
  fs.mkdirSync(path.join(base, 'Documentos', '.oculta'));
  fs.writeFileSync(path.join(base, 'Documentos', 'archivo.txt'), 'x');
  fs.mkdirSync(path.join(base, 'Secreto'));
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

const roots = () => [{ name: 'Documentos', path: path.join(base, 'Documentos') }];

describe('folder-browser', () => {
  it('lista solo subcarpetas visibles (sin archivos ni ocultas) y la carpeta de arriba', () => {
    const listing = listFolders(path.join(base, 'Documentos', 'Tareas'), roots());
    expect(listing.folders.map(f => f.name)).toEqual(['Mate']);
    expect(listing.parent).toBe(path.join(base, 'Documentos'));
    const top = listFolders(path.join(base, 'Documentos'), roots());
    expect(top.folders.map(f => f.name)).toEqual(['Tareas', 'YALEH']);
    expect(top.parent).toBeNull();
    expect(top.rootName).toBe('Documentos');
  });

  it('rechaza carpetas fuera de las ubicaciones permitidas (también con ..)', () => {
    expect(() => listFolders(path.join(base, 'Secreto'), roots())).toThrow(/no está disponible/);
    expect(() => listFolders(path.join(base, 'Documentos', '..', 'Secreto'), roots())).toThrow(/no está disponible/);
    expect(isInsideRoots(path.join(base, 'Documentos-falso'), roots())).toBe(false);
    expect(isInsideRoots('relativa/carpeta', roots())).toBe(false);
    expect(isInsideRoots(path.join(base, 'Documentos', 'Tareas'), roots())).toBe(true);
  });

  it('solo ofrece ubicaciones que existen, sin repetir', () => {
    const docs = { name: 'Documentos', path: path.join(base, 'Documentos') };
    expect(availableRoots([docs, { ...docs }, { name: 'Unidad Z:', path: path.join(base, 'no-existe') }])).toEqual([docs]);
  });
});
