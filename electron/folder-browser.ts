/**
 * @file folder-browser.ts
 * @description Selector de carpetas propio de YALEH (ORION #22). Nunca se usa la ventana de
 * Windows durante la sesión: desde ella se puede abrir el Explorador (clic derecho) y salir del kiosko.
 * Solo lista carpetas (sin archivos) dentro de ubicaciones permitidas (Documentos, Escritorio,
 * Descargas, Imágenes, otras unidades y la carpeta de exportaciones). El proceso principal valida
 * cada ruta: la interfaz no puede pedir carpetas fuera de esas ubicaciones.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { FolderListing, FolderRoot } from '../shared/ipc-types';

/** Carpetas que no tiene sentido mostrar (sistema u ocultas). */
const HIDDEN = /^(\.|\$)|^(System Volume Information|Windows|Recovery|PerfLogs|ProgramData|Program Files( \(x86\))?|AppData)$/i;

const normalize = (p: string) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();

/** true si `target` es una de las raíces o está dentro de alguna. */
export function isInsideRoots(target: string, roots: FolderRoot[]): boolean {
  if (typeof target !== 'string' || target.length === 0 || target.length > 1024 || !path.isAbsolute(target)) return false;
  const t = normalize(target);
  return roots.some(root => {
    const r = normalize(root.path);
    return t === r || t.startsWith(`${r}${path.sep}`) || t.startsWith(`${r}/`);
  });
}

/** Raíz que contiene a `target` (la más específica). */
function rootOf(target: string, roots: FolderRoot[]): FolderRoot | undefined {
  const t = normalize(target);
  return [...roots]
    .sort((a, b) => b.path.length - a.path.length)
    .find(root => {
      const r = normalize(root.path);
      return t === r || t.startsWith(`${r}${path.sep}`);
    });
}

/** Subcarpetas de `dir` (nombre y ruta), ordenadas. Lanza un Error si `dir` no está permitido. */
export function listFolders(dir: string, roots: FolderRoot[]): FolderListing {
  if (!isInsideRoots(dir, roots)) throw new Error('Esa carpeta no está disponible.');
  const resolved = path.resolve(dir);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true });
  } catch {
    throw new Error('No se pudo abrir la carpeta.');
  }
  const folders = entries
    .filter(e => e.isDirectory() && !HIDDEN.test(e.name))
    .map(e => ({ name: e.name, path: path.join(resolved, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const root = rootOf(resolved, roots);
  const atRoot = !root || normalize(root.path) === normalize(resolved);
  return {
    path: resolved,
    parent: atRoot ? null : path.dirname(resolved),
    rootName: root?.name ?? '',
    folders,
  };
}

/** Raíces disponibles en este equipo (las que existen). */
export function availableRoots(candidates: FolderRoot[]): FolderRoot[] {
  const seen = new Set<string>();
  return candidates.filter(root => {
    const key = normalize(root.path);
    if (seen.has(key)) return false;
    seen.add(key);
    try {
      return fs.statSync(root.path).isDirectory();
    } catch {
      return false;
    }
  });
}

/** Unidades distintas de la del sistema (memorias USB, discos secundarios), solo en Windows. */
export function otherDrives(systemDrive = process.env.SystemDrive ?? 'C:'): FolderRoot[] {
  if (process.platform !== 'win32') return [];
  const system = systemDrive.slice(0, 1).toUpperCase();
  return 'DEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .filter(letter => letter !== system)
    .map(letter => ({ name: `Unidad ${letter}:`, path: `${letter}:\\` }));
}
