/**
 * Muestra las últimas sesiones y eventos de la base local de YALEH (solo lectura).
 *
 *   npm run db:inspect
 *   npm run db:inspect -- --sessions 20 --events 50
 *   npm run db:inspect -- --db "C:\ruta\a\yaleh.db"
 *
 * Se ejecuta con el Node que trae Electron (node:sqlite estable), así que se
 * relanza a sí mismo con ELECTRON_RUN_AS_NODE. Se puede usar con la app abierta.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);

if (!process.versions.electron) {
  const { default: electronPath } = await import('electron');
  const child = spawn(electronPath, [fileURLToPath(import.meta.url), ...args], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
  });
  child.on('exit', code => process.exit(code ?? 1));
} else {
  await inspect();
}

function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

/** Carpeta userData de Electron para la app "yaleh" (nombre de package.json). */
function defaultDatabasePath() {
  const home = os.homedir();
  const base =
    process.platform === 'win32'
      ? process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')
      : process.platform === 'darwin'
        ? path.join(home, 'Library', 'Application Support')
        : process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  return path.join(base, 'yaleh', 'yaleh.db');
}

function formatDate(value) {
  return value === null || value === undefined
    ? '—'
    : new Date(value).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' });
}

function printTable(title, rows, columns) {
  console.log(`\n${title}`);
  if (rows.length === 0) {
    console.log('  (sin datos)');
    return;
  }
  const widths = columns.map(c => Math.max(c.label.length, ...rows.map(r => String(c.value(r)).length)));
  const line = values => '  ' + values.map((v, i) => String(v).padEnd(widths[i])).join('  ');
  console.log(line(columns.map(c => c.label)));
  console.log(line(widths.map(w => '─'.repeat(w))));
  for (const row of rows) console.log(line(columns.map(c => c.value(row))));
}

async function inspect() {
  const dbPath = option('db', defaultDatabasePath());
  const sessionLimit = Number(option('sessions', '10'));
  const eventLimit = Number(option('events', '30'));

  if (!fs.existsSync(dbPath)) {
    console.error(`No existe la base: ${dbPath}\nAbre YALEH al menos una vez (npm run electron:preview).`);
    process.exit(1);
  }

  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(dbPath, { readOnly: true });

  console.log(`Base: ${dbPath}`);
  const migrations = db.prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version').all();
  console.log(`Migraciones: ${migrations.map(m => `v${m.version} ${m.name}`).join(', ') || 'ninguna'}`);

  const counts = db
    .prepare('SELECT status, mode, COUNT(*) AS n FROM sessions GROUP BY status, mode ORDER BY status, mode')
    .all();
  console.log(`Sesiones: ${counts.map(c => `${c.n} ${c.status} (${c.mode})`).join(', ') || 'ninguna'}`);

  const sessions = db
    .prepare(
      `SELECT s.*,
         (SELECT COUNT(*) FROM session_events e WHERE e.session_id = s.id AND e.type = 'focus-lost') AS focus_lost,
         (SELECT COUNT(*) FROM session_events e WHERE e.session_id = s.id AND e.type = 'connection-lost') AS connection_lost
       FROM sessions s ORDER BY s.started_at DESC LIMIT ?`
    )
    .all(sessionLimit);

  printTable(`Últimas ${sessionLimit} sesiones`, sessions, [
    { label: 'Inicio', value: r => formatDate(r.started_at) },
    { label: 'Fin previsto', value: r => formatDate(r.ends_at) },
    { label: 'Min', value: r => Math.round(r.duration_seconds / 60) },
    { label: 'Modo', value: r => r.mode },
    { label: 'Estado', value: r => r.status },
    { label: 'Foco perdido', value: r => r.focus_lost },
    { label: 'Cortes de red', value: r => r.connection_lost },
    { label: 'Sincronizada', value: r => (r.synced_at ? 'sí' : 'no') },
    { label: 'ID', value: r => r.id.slice(0, 8) },
  ]);

  const events = db
    .prepare('SELECT * FROM session_events ORDER BY id DESC LIMIT ?')
    .all(eventLimit)
    .reverse();

  printTable(`Últimos ${eventLimit} eventos`, events, [
    { label: 'Fecha', value: r => formatDate(r.at) },
    { label: 'Tipo', value: r => r.type },
    { label: 'Sesión', value: r => (r.session_id ? r.session_id.slice(0, 8) : '—') },
    { label: 'Detalle', value: r => r.detail ?? '' },
  ]);

  db.close();
}
