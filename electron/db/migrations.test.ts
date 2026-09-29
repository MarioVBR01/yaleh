// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ensureLocalProfile, getSetting, setSetting } from './database';
import { MIGRATIONS, runMigrations, type Migration } from './migrations';

function tableNames(db: DatabaseSync): string[] {
  return (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[])
    .map(r => r.name)
    .filter(name => !name.startsWith('sqlite_'));
}

describe('runMigrations', () => {
  it('crea las tablas iniciales y registra la versión', () => {
    const db = new DatabaseSync(':memory:');
    expect(runMigrations(db)).toEqual([1]);

    expect(tableNames(db)).toEqual(['local_profile', 'schema_migrations', 'session_events', 'sessions', 'settings']);
    const rows = db.prepare('SELECT version, name FROM schema_migrations').all();
    expect(rows).toEqual([{ version: 1, name: 'initial' }]);
  });

  it('es idempotente: ejecutarla otra vez no aplica nada ni cambia la base', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const before = tableNames(db);

    expect(runMigrations(db)).toEqual([]);
    expect(runMigrations(db)).toEqual([]);
    expect(tableNames(db)).toEqual(before);
    expect(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get()).toEqual({ n: 1 });
  });

  it('aplica solo las migraciones nuevas, en orden', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const extra: Migration = { version: 2, name: 'extra', sql: 'CREATE TABLE extra (x INTEGER)' };

    expect(runMigrations(db, [...MIGRATIONS, extra])).toEqual([2]);
    expect(tableNames(db)).toContain('extra');
  });

  it('si una migración falla, deshace sus cambios y no la registra', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const broken: Migration = {
      version: 2,
      name: 'broken',
      sql: 'CREATE TABLE half (x INTEGER); THIS IS NOT SQL;',
    };

    expect(() => runMigrations(db, [...MIGRATIONS, broken])).toThrow(/La migración 2 \(broken\) falló/);
    expect(tableNames(db)).not.toContain('half');
    expect(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get()).toEqual({ n: 1 });
  });

  it('las restricciones rechazan modos y estados inválidos', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const insert = db.prepare(
      'INSERT INTO sessions (id, mode, started_at, ends_at, duration_seconds, status) VALUES (?, ?, 0, 0, 60, ?)'
    );
    expect(() => insert.run('a', 'hybrid', 'active')).toThrow();
    expect(() => insert.run('b', 'offline', 'paused')).toThrow();
    expect(() => insert.run('c', 'offline', 'active')).not.toThrow();
  });
});

describe('settings y perfil local', () => {
  it('guarda y actualiza valores de configuración', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    expect(getSetting(db, 'x')).toBeNull();
    setSetting(db, 'x', '1');
    setSetting(db, 'x', '2');
    expect(getSetting(db, 'x')).toBe('2');
  });

  it('crea el perfil local una sola vez', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const first = ensureLocalProfile(db, () => 'perfil-1');
    const second = ensureLocalProfile(db, () => 'perfil-2');
    expect(first).toBe('perfil-1');
    expect(second).toBe('perfil-1');
    expect(db.prepare('SELECT COUNT(*) AS n FROM local_profile').get()).toEqual({ n: 1 });
  });
});
