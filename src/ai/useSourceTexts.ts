/**
 * @file useSourceTexts.ts
 * @description Texto de las fuentes listas del espacio de trabajo, para el contexto de la IA.
 */

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getWorkspaceStore } from '../data/workspace';
import type { SourceText } from './gemini';

export function useSourceTexts() {
  const { state } = useApp();
  const readySources = state.uploadedFiles.filter(f => f.status === 'ready' || f.status === undefined);

  const load = useCallback(async (): Promise<SourceText[]> => {
    const store = getWorkspaceStore(state);
    if (!store) return [];
    return Promise.all(readySources.map(async f => ({ name: f.name, text: await store.getSourceText(f.id) })));
  }, [state, readySources]);

  return { load, count: readySources.length };
}
