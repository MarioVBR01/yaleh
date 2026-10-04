// @vitest-environment node
/**
 * Descarga del modelo: completa, reanudada con Range, servidor sin Range, SHA-256 distinto y pausa.
 * Usa un servidor HTTP local con un archivo pequeño.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { DownloadError, downloadModel, partPath } from './downloader';

const DATA = crypto.randomBytes(256 * 1024);
const SHA = crypto.createHash('sha256').update(DATA).digest('hex');

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(fn => fn()));

function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-dl-'));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'models', 'modelo.gguf');
}

/** Servidor que entrega DATA; con `acceptRange` responde 206 a las peticiones Range. */
async function serve(options: { acceptRange?: boolean; stallAfter?: number } = {}) {
  const ranges: (string | undefined)[] = [];
  const server = http.createServer((req, res) => {
    ranges.push(req.headers.range);
    const match = /bytes=(\d+)-/.exec(req.headers.range ?? '');
    const start = options.acceptRange !== false && match ? Number(match[1]) : 0;
    res.writeHead(start > 0 ? 206 : 200, { 'Content-Length': DATA.length - start });
    const body = DATA.subarray(start);
    if (options.stallAfter) {
      res.write(body.subarray(0, options.stallAfter)); // y no termina: simula una conexión colgada
      return;
    }
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(() => {
    server.closeAllConnections();
    server.close();
  });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/modelo.gguf`, ranges };
}

describe('downloadModel', () => {
  it('descarga, verifica el SHA-256 y deja el archivo final (sin .part)', async () => {
    const { url } = await serve();
    const file = tempFile();
    const phases = new Set<string>();
    await downloadModel({ url, sha256: SHA, sizeBytes: DATA.length, file }, { onProgress: p => phases.add(p.phase) });
    expect(fs.readFileSync(file).equals(DATA)).toBe(true);
    expect(fs.existsSync(partPath(file))).toBe(false);
    expect([...phases]).toEqual(['downloading', 'verifying']);
  });

  it('reanuda una descarga a medias con una petición Range', async () => {
    const { url, ranges } = await serve();
    const file = tempFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(partPath(file), DATA.subarray(0, 100_000));
    await downloadModel({ url, sha256: SHA, sizeBytes: DATA.length, file });
    expect(ranges).toEqual(['bytes=100000-']);
    expect(fs.readFileSync(file).equals(DATA)).toBe(true);
  });

  it('si el servidor ignora el Range, empieza de cero sin duplicar bytes', async () => {
    const { url } = await serve({ acceptRange: false });
    const file = tempFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(partPath(file), DATA.subarray(0, 50_000));
    await downloadModel({ url, sha256: SHA, sizeBytes: DATA.length, file });
    expect(fs.readFileSync(file).equals(DATA)).toBe(true);
  });

  it('si el SHA-256 no coincide, borra el archivo y falla', async () => {
    const { url } = await serve();
    const file = tempFile();
    await expect(downloadModel({ url, sha256: '0'.repeat(64), sizeBytes: DATA.length, file })).rejects.toMatchObject({
      code: 'checksum',
    });
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(partPath(file))).toBe(false);
  });

  it('al pausar conserva lo descargado para reanudar', async () => {
    const { url } = await serve({ stallAfter: 64 * 1024 });
    const file = tempFile();
    const controller = new AbortController();
    const download = downloadModel(
      { url, sha256: SHA, sizeBytes: DATA.length, file },
      {
        signal: controller.signal,
        onProgress: p => {
          if (p.receivedBytes >= 64 * 1024) controller.abort();
        },
      }
    );
    setTimeout(() => controller.abort(), 1500);
    const error = await download.catch(e => e);
    expect(error).toBeInstanceOf(DownloadError);
    expect((error as DownloadError).code).toBe('aborted');
    expect(fs.statSync(partPath(file)).size).toBeGreaterThan(0);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('un error HTTP se informa con su código', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    cleanups.push(() => server.close());
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
    await expect(downloadModel({ url, sha256: SHA, sizeBytes: DATA.length, file: tempFile() })).rejects.toThrow(/404/);
  });
});
