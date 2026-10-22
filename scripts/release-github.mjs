/**
 * Publica el instalador en GitHub Releases (MarioVBR01/yaleh): crea la release v<versión> con
 * release/YALEH-Setup-<versión>.exe (de `npm run dist`) o, si ya existe, reemplaza el archivo.
 * El botón "Descargar para Windows" de la landing apunta a esa release (DOWNLOADS.installerUrl):
 * Firebase Hosting gratis no admite archivos ejecutables. Necesita la CLI de GitHub (gh) con sesión iniciada.
 * Uso: npm run dist && npm run release:github
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'MarioVBR01/yaleh';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${version}`;
const installer = path.join(root, 'release', `YALEH-Setup-${version}.exe`);
if (!existsSync(installer)) {
  console.error(`[release] No está ${path.relative(root, installer)}: generalo antes con npm run dist.`);
  process.exit(1);
}
const gh = (...args) => execFileSync('gh', args, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root }).toString().trim();

let exists = true;
try {
  gh('release', 'view', tag, '--repo', REPO, '--json', 'tagName');
} catch {
  exists = false;
}
if (exists) {
  gh('release', 'upload', tag, installer, '--repo', REPO, '--clobber');
  console.log(`[release] ${tag}: instalador reemplazado.`);
} else {
  const notes = [
    `YALEH ${version} para Windows 10 y 11 (64 bits).`,
    '',
    `Descargá YALEH-Setup-${version}.exe y abrilo. Se instala solo para tu usuario, sin permisos de administrador.`,
    'Si Windows muestra "Windows protegió su PC", elegí "Más información" y después "Ejecutar de todas formas" (el instalador todavía no tiene firma digital).',
    '',
    'El asistente sin conexión (Qwen3.5-4B, 2,7 GB) se descarga aparte desde Configuración → IA sin conexión.',
  ].join('\n');
  gh('release', 'create', tag, installer, '--repo', REPO, '--target', branch, '--title', `YALEH ${version}`, '--notes', notes);
  console.log(`[release] ${tag} creada en ${REPO} (rama ${branch}).`);
}
console.log(`[release] https://github.com/${REPO}/releases/download/${tag}/${path.basename(installer)}`);
