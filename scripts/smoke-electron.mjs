/**
 * Prueba de humo de la app de escritorio: abre la versión compilada (dist/ y
 * dist-electron/) sin ventana visible, comprueba que la interfaz carga, que el
 * preload expone window.electronAPI y que no hay errores en la consola
 * (por ejemplo, bloqueos de la Content-Security-Policy), que la base SQLite se
 * crea con sus migraciones y que responde el canal de conexión. No activa el kiosko.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import electronPath from 'electron';

// ELECTRON_RUN_AS_NODE (lo hereda, por ejemplo, un proceso lanzado desde VS Code)
// haría que Electron arranque como Node y require('electron') devuelva una ruta.
const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

// Carpeta de datos temporal: la prueba no toca la base real del usuario.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-smoke-'));
const cleanUp = () => fs.rmSync(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

const child = spawn(electronPath, ['.'], {
  env: { ...env, YALEH_SMOKE: '1', YALEH_SMOKE_USER_DATA: userData },
  stdio: 'inherit',
});

const timeout = setTimeout(() => {
  console.error('[smoke] Tiempo agotado');
  child.kill();
  cleanUp();
  process.exit(1);
}, 30000);

child.on('exit', code => {
  clearTimeout(timeout);
  cleanUp();
  process.exit(code ?? 1);
});
