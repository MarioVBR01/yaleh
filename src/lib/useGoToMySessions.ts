/**
 * @file useGoToMySessions.ts
 * @description Web: volver a "Mis sesiones" desde una sesión abierta. Cierra la sesión de la pantalla y
 * descarta el borrador si quedó vacío.
 */

import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { discardEmptyDraft } from '../firebase/sessions';

export function useGoToMySessions(): () => void {
  const { state, dispatch } = useApp();
  const uid = state.session.uid;
  const workspaceId = state.workspaceId;
  const isEmpty = state.uploadedFiles.length === 0;

  return useCallback(() => {
    if (uid && workspaceId && isEmpty) {
      discardEmptyDraft(uid, workspaceId).catch(error => console.error('No se pudo borrar el borrador:', error));
    }
    dispatch({ type: 'SET_WORKSPACE', payload: null });
    dispatch({ type: 'SET_FILES', payload: [] });
    dispatch({ type: 'SET_SESSION_DURATION', payload: 0 });
    dispatch({ type: 'SET_DOWNLOADED_FILE', payload: null });
    dispatch({ type: 'SET_PHASE', payload: 'sessions-home' });
  }, [uid, workspaceId, isEmpty, dispatch]);
}
