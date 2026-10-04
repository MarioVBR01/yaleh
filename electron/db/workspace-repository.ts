/**
 * @file workspace-repository.ts
 * @description Fuentes (texto extraído) y notas del modo offline en SQLite
 * (brief, sección 8.2). `workspace_id` es el id local de la sesión.
 */

import type { DatabaseSync } from 'node:sqlite';
import { LOCAL_AI } from '../../shared/config';
import { splitText } from '../../shared/text';
import type { LocalNote, LocalSourceInfo } from '../../shared/ipc-types';

export class WorkspaceRepository {
  constructor(private readonly db: DatabaseSync) {}

  addSource(workspaceId: string, source: { id: string; name: string; type: string; size: number }, text: string): void {
    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO sources (id, workspace_id, name, mime, size, char_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, char_count = excluded.char_count`
        )
        .run(source.id, workspaceId, source.name, source.type, source.size, text.length, now);
      this.db.prepare('DELETE FROM source_chunks WHERE source_id = ?').run(source.id);
      const insert = this.db.prepare('INSERT INTO source_chunks (source_id, idx, text) VALUES (?, ?, ?)');
      splitText(text).forEach((chunk, index) => insert.run(source.id, index, chunk));
      this.indexPassages(workspaceId, source.id, text);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  listSources(workspaceId: string): LocalSourceInfo[] {
    return (
      this.db
        .prepare(
          `SELECT id, name, mime, size, char_count, created_at FROM sources
           WHERE workspace_id = ? ORDER BY created_at`
        )
        .all(workspaceId) as { id: string; name: string; mime: string; size: number; char_count: number; created_at: string }[]
    ).map(r => ({ id: r.id, name: r.name, type: r.mime, size: r.size, charCount: r.char_count, createdAt: r.created_at }));
  }

  getSourceText(workspaceId: string, sourceId: string): string {
    const rows = this.db
      .prepare(
        `SELECT c.text FROM source_chunks c JOIN sources s ON s.id = c.source_id
         WHERE s.workspace_id = ? AND s.id = ? ORDER BY c.idx`
      )
      .all(workspaceId, sourceId) as { text: string }[];
    return rows.map(r => r.text).join('');
  }

  /** Fragmentos cortos para la búsqueda FTS5 del asistente sin conexión (migración 3). */
  private indexPassages(workspaceId: string, sourceId: string, text: string): void {
    this.db.prepare('DELETE FROM source_passages WHERE source_id = ?').run(sourceId);
    const insert = this.db.prepare('INSERT INTO source_passages (source_id, workspace_id, idx, text) VALUES (?, ?, ?, ?)');
    splitText(text, LOCAL_AI.passageChars).forEach((passage, index) => insert.run(sourceId, workspaceId, index, passage));
  }

  /**
   * Indexa las fuentes guardadas antes de la migración 3 (sin fragmentos).
   * Se llama al arrancar; devuelve cuántas fuentes indexó.
   */
  indexMissingPassages(): number {
    const pending = this.db
      .prepare(
        `SELECT s.id, s.workspace_id FROM sources s
         WHERE NOT EXISTS (SELECT 1 FROM source_passages p WHERE p.source_id = s.id)`
      )
      .all() as { id: string; workspace_id: string }[];
    for (const source of pending) {
      this.db.exec('BEGIN');
      try {
        this.indexPassages(source.workspace_id, source.id, this.getSourceText(source.workspace_id, source.id));
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
    return pending.length;
  }

  removeSource(workspaceId: string, sourceId: string): void {
    this.db.prepare('DELETE FROM source_passages WHERE source_id IN (SELECT id FROM sources WHERE id = ? AND workspace_id = ?)').run(sourceId, workspaceId);
    this.db.prepare('DELETE FROM source_chunks WHERE source_id IN (SELECT id FROM sources WHERE id = ? AND workspace_id = ?)').run(sourceId, workspaceId);
    this.db.prepare('DELETE FROM sources WHERE id = ? AND workspace_id = ?').run(sourceId, workspaceId);
  }

  listNotes(workspaceId: string): LocalNote[] {
    return (
      this.db
        .prepare('SELECT id, text, created_at, updated_at FROM notes WHERE workspace_id = ? ORDER BY created_at')
        .all(workspaceId) as { id: string; text: string; created_at: string; updated_at: string }[]
    ).map(r => ({ id: r.id, text: r.text, createdAt: r.created_at, updatedAt: r.updated_at }));
  }

  saveNote(workspaceId: string, note: { id: string; text: string }): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO notes (id, workspace_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at
         WHERE notes.workspace_id = excluded.workspace_id`
      )
      .run(note.id, workspaceId, note.text, now, now);
  }

  deleteNote(workspaceId: string, noteId: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ? AND workspace_id = ?').run(noteId, workspaceId);
  }
}
