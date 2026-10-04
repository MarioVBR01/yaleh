/**
 * Ejecuta Vitest con el Node que trae Electron (npm test / npm run test:watch).
 *
 * Las pruebas de SQLite necesitan FTS5 (migración 3, asistente sin conexión). El SQLite de
 * Electron 42 (Node 24) lo incluye, pero el de Node 22 no. Así las pruebas usan el mismo
 * node:sqlite que la app, sin depender del Node instalado en el equipo.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const electronPath = (await import('electron')).default;
// vitest.mjs no está en los "exports" del paquete: se resuelve desde su package.json.
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

const child = spawn(electronPath, [vitest, ...process.argv.slice(2)], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit',
});
child.on('exit', code => process.exit(code ?? 1));
