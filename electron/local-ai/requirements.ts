/**
 * @file requirements.ts
 * @description Requisitos del asistente sin conexión (revisión 1.8): RAM mínima y espacio
 * libre en disco. Si no se cumplen, la bienvenida muestra el motivo y no ofrece la descarga.
 */

import fs from 'node:fs';
import os from 'node:os';
import { LOCAL_AI } from '../../shared/config';
import type { LocalAiRequirements } from '../../shared/ipc-types';

const GB = 1024 ** 3;
const formatGb = (bytes: number) => `${(bytes / GB).toFixed(1).replace('.', ',')} GB`;

export interface RequirementsInput {
  ramBytes: number;
  freeDiskBytes: number | null;
  /** Bytes que ya están descargados (una descarga a medias necesita menos espacio). */
  alreadyDownloaded?: number;
  /** El modelo ya está instalado: no hace falta espacio. */
  installed?: boolean;
}

export function evaluateRequirements(input: RequirementsInput): LocalAiRequirements {
  const remaining = input.installed ? 0 : Math.max(0, LOCAL_AI.sizeBytes - (input.alreadyDownloaded ?? 0));
  const requiredDiskBytes = input.installed ? 0 : remaining + LOCAL_AI.diskMarginBytes;
  const problems: string[] = [];
  if (input.ramBytes < LOCAL_AI.minRamBytes) {
    problems.push(
      `Este equipo tiene ${formatGb(input.ramBytes)} de RAM y el asistente sin conexión necesita al menos ${LOCAL_AI.minRamLabel}.`
    );
  }
  if (input.freeDiskBytes !== null && input.freeDiskBytes < requiredDiskBytes) {
    problems.push(
      `Hay ${formatGb(input.freeDiskBytes)} libres en el disco y la descarga necesita ${formatGb(requiredDiskBytes)}.`
    );
  }
  return {
    ok: problems.length === 0,
    ramBytes: input.ramBytes,
    minRamBytes: LOCAL_AI.minRamBytes,
    freeDiskBytes: input.freeDiskBytes,
    requiredDiskBytes,
    problems,
  };
}

/** Espacio libre en el disco de `dir` (null si no se puede medir). */
export function freeDiskBytes(dir: string): number | null {
  try {
    const stats = fs.statfsSync(dir);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch {
    return null;
  }
}

export function checkRequirements(dir: string, state: Omit<RequirementsInput, 'ramBytes' | 'freeDiskBytes'>): LocalAiRequirements {
  return evaluateRequirements({ ramBytes: os.totalmem(), freeDiskBytes: freeDiskBytes(dir), ...state });
}
