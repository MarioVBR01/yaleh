/**
 * Copia el instalador (release/YALEH-Setup-<versión>.exe, de `npm run dist`) a dist/downloads/, donde lo
 * busca el botón de la landing page. Uso, al publicar: npm run dist && npm run landing:installer
 * (y quitar "landing.html" y "downloads/**" de "ignore" en firebase.json).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const name = `YALEH-Setup-${version}.exe`;
const source = path.join(root, 'release', name);
if (!existsSync(source)) {
  console.error(`[landing] No está ${path.relative(root, source)}: generalo antes con npm run dist.`);
  process.exit(1);
}
const target = path.join(root, 'dist', 'downloads', name);
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`[landing] ${path.relative(root, target)} (${(statSync(target).size / 1024 ** 2).toFixed(0)} MB)`);
