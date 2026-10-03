/**
 * Empaqueta el proceso principal y el preload de Electron con esbuild.
 * Ambos se generan como CommonJS (.cjs, porque package.json tiene "type": "module"):
 * - dist-electron/main.cjs     proceso principal (CommonJS permite usar __dirname).
 * - dist-electron/preload.cjs  un único archivo (requisito de sandbox: true).
 */

import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const common = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  // Las librerías de ofimática se cargan desde node_modules (el instalador las incluye).
  external: ['electron', 'docx', 'exceljs', 'pptxgenjs'],
  sourcemap: true,
  logLevel: 'info',
  define: { __YALEH_VERSION__: JSON.stringify(pkg.version) },
};

await Promise.all([
  build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.cjs', format: 'cjs' }),
  build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs', format: 'cjs' }),
]);
