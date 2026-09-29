/**
 * @file useIngest.ts
 * @description Carga de fuentes (dropzone y columna Fuentes): valida, extrae el
 * texto y lo guarda en Firestore (online) o SQLite (offline). Brief, sección 8.
 */

import { useCallback } from 'react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../utils/format';
import { classifyFile } from './file-types';
import { ExtractionError, extractText } from './extract';
import { getWorkspaceStore, newId } from './workspace';

export interface IngestResult {
  accepted: number;
  errors: string[];
}

export function useIngest() {
  const { state, dispatch, logActivity } = useApp();

  const ingest = useCallback(
    async (files: FileList | File[]): Promise<IngestResult> => {
      const store = getWorkspaceStore(state);
      if (!store) return { accepted: 0, errors: ['Tu espacio de trabajo aún se está preparando. Inténtalo en unos segundos.'] };

      const errors: string[] = [];
      let total = state.uploadedFiles.reduce((sum, f) => sum + f.size, 0);
      const toProcess: { file: File; kind: NonNullable<ReturnType<typeof classifyFile>>; id: string }[] = [];

      for (const file of Array.from(files)) {
        const kind = classifyFile(file.name, file.type);
        if (!kind) {
          errors.push(`"${file.name}": formato no admitido (PDF, DOCX o TXT).`);
          continue;
        }
        if (total + file.size > LIMITS.maxUploadBytes) {
          errors.push(`"${file.name}": supera el límite de ${formatBytes(LIMITS.maxUploadBytes)}.`);
          continue;
        }
        total += file.size;
        const id = newId();
        toProcess.push({ file, kind, id });
        dispatch({
          type: 'ADD_FILES',
          payload: [{ id, name: file.name, size: file.size, type: file.type, uploadedAt: new Date(), status: 'extracting' }],
        });
      }

      await Promise.all(
        toProcess.map(async ({ file, kind, id }) => {
          try {
            const text = await extractText(file, kind);
            await store.addSource({ id, name: file.name, type: file.type || kind, size: file.size }, text);
            dispatch({ type: 'UPDATE_FILE', payload: { id, status: 'ready', charCount: text.length } });
            logActivity({ type: 'file', label: `Fuente cargada: ${file.name}`, detail: formatBytes(file.size), icon: '📄' });
          } catch (error) {
            const message =
              error instanceof ExtractionError ? error.message : 'No se pudo guardar. Revisa tu conexión.';
            if (!(error instanceof ExtractionError)) console.error(`No se pudo guardar ${file.name}:`, error);
            dispatch({ type: 'UPDATE_FILE', payload: { id, status: 'error', error: message } });
            errors.push(`"${file.name}": ${message}`);
          }
        })
      );

      return { accepted: toProcess.length, errors };
    },
    [state, dispatch, logActivity]
  );

  const remove = useCallback(
    async (id: string) => {
      const store = getWorkspaceStore(state);
      dispatch({ type: 'REMOVE_FILE', payload: id });
      try {
        await store?.removeSource(id);
      } catch (error) {
        console.error('No se pudo eliminar la fuente:', error);
      }
    },
    [state, dispatch]
  );

  return { ingest, remove, ready: state.workspaceId !== null };
}
