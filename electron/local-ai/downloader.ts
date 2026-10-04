/**
 * @file downloader.ts
 * @description Descarga del modelo del asistente sin conexión (revisión 1.8).
 * - Escribe en `<archivo>.part` y reanuda con una petición Range si se cortó.
 * - Al terminar comprueba el SHA-256; si no coincide, borra el archivo.
 * - Solo cuando el hash coincide renombra `.part` al nombre definitivo.
 * Quien la usa (LocalAiService) decide cuándo se puede descargar (con conexión y fuera de la sesión).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export interface DownloadTarget {
  url: string;
  sha256: string;
  sizeBytes: number;
  /** Ruta final del archivo. */
  file: string;
}

export interface DownloadProgress {
  phase: 'downloading' | 'verifying';
  receivedBytes: number;
  totalBytes: number;
}

export class DownloadError extends Error {
  constructor(
    message: string,
    readonly code: 'network' | 'http' | 'checksum' | 'aborted' | 'size'
  ) {
    super(message);
  }
}

export const partPath = (file: string) => `${file}.part`;

export function partialSize(file: string): number {
  try {
    return fs.statSync(partPath(file)).size;
  } catch {
    return 0;
  }
}

export async function sha256File(file: string, onProgress?: (bytes: number) => void, signal?: AbortSignal): Promise<string> {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 4 * 1024 * 1024 })) {
    if (signal?.aborted) throw new DownloadError('Verificación cancelada.', 'aborted');
    hash.update(chunk as Buffer);
    bytes += (chunk as Buffer).length;
    onProgress?.(bytes);
  }
  return hash.digest('hex');
}

/**
 * Descarga (o reanuda) y verifica. Resuelve cuando el archivo final existe y su hash coincide.
 * `fetchImpl` se inyecta en las pruebas.
 */
export async function downloadModel(
  target: DownloadTarget,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: DownloadProgress) => void;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<void> {
  const { signal, onProgress, fetchImpl = fetch } = options;
  const part = partPath(target.file);
  fs.mkdirSync(path.dirname(target.file), { recursive: true });

  let start = partialSize(target.file);
  if (start > target.sizeBytes) {
    fs.rmSync(part, { force: true });
    start = 0;
  }

  if (start < target.sizeBytes) {
    let response: Response;
    try {
      response = await fetchImpl(target.url, {
        headers: start > 0 ? { Range: `bytes=${start}-` } : {},
        signal,
        redirect: 'follow',
      });
    } catch (error) {
      if (signal?.aborted) throw new DownloadError('Descarga en pausa.', 'aborted');
      throw new DownloadError(`No se pudo conectar para descargar el modelo (${String(error)}).`, 'network');
    }
    if (response.status === 200 && start > 0) {
      // El servidor no aceptó el Range: se empieza de cero.
      start = 0;
    } else if (response.status !== 200 && response.status !== 206) {
      throw new DownloadError(`El servidor respondió ${response.status} al descargar el modelo.`, 'http');
    }
    if (!response.body) throw new DownloadError('La descarga llegó vacía.', 'network');

    const out = fs.createWriteStream(part, { flags: start > 0 ? 'a' : 'w' });
    let received = start;
    let lastReport = 0;
    try {
      for await (const chunk of Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)) {
        const buffer = chunk as Buffer;
        received += buffer.length;
        if (!out.write(buffer)) await new Promise<void>(resolve => out.once('drain', resolve));
        const now = Date.now();
        if (now - lastReport > 250) {
          lastReport = now;
          onProgress?.({ phase: 'downloading', receivedBytes: received, totalBytes: target.sizeBytes });
        }
      }
    } catch (error) {
      await new Promise<void>(resolve => out.end(resolve));
      if (signal?.aborted) throw new DownloadError('Descarga en pausa.', 'aborted');
      throw new DownloadError(`Se cortó la descarga (${String(error)}). Puedes reanudarla.`, 'network');
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    onProgress?.({ phase: 'downloading', receivedBytes: received, totalBytes: target.sizeBytes });
    if (received < target.sizeBytes) {
      throw new DownloadError('La descarga terminó antes de tiempo. Puedes reanudarla.', 'network');
    }
  }

  const size = partialSize(target.file);
  if (size !== target.sizeBytes) {
    fs.rmSync(part, { force: true });
    throw new DownloadError('El archivo descargado no tiene el tamaño esperado. Vuelve a descargarlo.', 'size');
  }

  onProgress?.({ phase: 'verifying', receivedBytes: 0, totalBytes: target.sizeBytes });
  const digest = await sha256File(
    part,
    bytes => onProgress?.({ phase: 'verifying', receivedBytes: bytes, totalBytes: target.sizeBytes }),
    signal
  );
  if (digest !== target.sha256.toLowerCase()) {
    fs.rmSync(part, { force: true });
    throw new DownloadError('El archivo descargado está dañado (SHA-256 distinto). Vuelve a descargarlo.', 'checksum');
  }
  fs.renameSync(part, target.file);
}
