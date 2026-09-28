/**
 * Prueba de humo de la app de escritorio: abre la versión compilada (dist/ y
 * dist-electron/) sin ventana visible, comprueba que la interfaz carga, que el
 * preload expone window.electronAPI y que no hay errores en la consola
 * (por ejemplo, bloqueos de la Content-Security-Policy). No activa el kiosko.
 */

import { spawn } from 'node:child_process';
import electronPath from 'electron';

// ELECTRON_RUN_AS_NODE (lo hereda, por ejemplo, un proceso lanzado desde VS Code)
// haría que Electron arranque como Node y require('electron') devuelva una ruta.
const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

const child = spawn(electronPath, ['.'], {
  env: { ...env, YALEH_SMOKE: '1' },
  stdio: 'inherit',
});

const timeout = setTimeout(() => {
  console.error('[smoke] Tiempo agotado');
  child.kill();
  process.exit(1);
}, 30000);

child.on('exit', code => {
  clearTimeout(timeout);
  process.exit(code ?? 1);
});
