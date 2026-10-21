/**
 * Genera build/icon.ico a partir de docs/diseno/logo/logo-yaleh.svg (icono del instalador y de la app).
 * Uso: npm run icon (corre con Electron: dibuja el SVG en una ventana fuera de pantalla con fondo
 * transparente, en 16, 24, 32, 48, 64, 128 y 256 px, y arma un .ico con las imágenes PNG).
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SVG = path.join(ROOT, 'docs', 'diseno', 'logo', 'logo-yaleh.svg');
const OUT = path.join(ROOT, 'build', 'icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

/** Quita el bloque de metadatos (C2PA) del SVG: no hace falta para dibujarlo. */
function cleanSvg() {
  return fs
    .readFileSync(SVG, 'utf8')
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/ width="\d+" height="\d+"/, '');
}

async function render(win, svg, size) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}</style></head>
<body><img width="${size}" height="${size}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`;
  win.setContentSize(size, size);
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
  await new Promise(r => setTimeout(r, 150));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  return image.resize({ width: size, height: size, quality: 'best' }).toPNG();
}

/** .ico con imágenes PNG (Windows Vista en adelante). */
function buildIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.png)]);
}

app.whenReady().then(main).catch(error => {
  console.error('[icon] No se pudo generar el icono:', error);
  app.exit(1);
});

async function main() {
  const svg = cleanSvg();
  const win = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    width: 256,
    height: 256,
    paintWhenInitiallyHidden: true,
    backgroundColor: '#00000000',
    webPreferences: { backgroundThrottling: false },
  });
  const pngs = [];
  for (const size of SIZES) pngs.push({ size, png: await render(win, svg, size) });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buildIco(pngs));
  fs.writeFileSync(path.join(path.dirname(OUT), 'icon-256.png'), pngs[pngs.length - 1].png);
  console.log(`[icon] ${path.relative(ROOT, OUT)} (${SIZES.join(', ')} px, ${fs.statSync(OUT).size} bytes)`);
  app.quit();
}
