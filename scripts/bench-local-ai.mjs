/**
 * Mide el asistente sin conexión en este equipo (npm run bench:local-ai).
 * Abre Electron con dist-electron/bench-local-ai.cjs; necesita el modelo ya descargado.
 * Los resultados quedan en docs/MEDICIONES_IA_LOCAL.md.
 */

import { spawn } from 'node:child_process';
import electronPath from 'electron';

// ELECTRON_RUN_AS_NODE haría que Electron arranque como Node (ver CLAUDE.md).
const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

const child = spawn(electronPath, ['dist-electron/bench-local-ai.cjs'], { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
