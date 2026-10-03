/**
 * @file useExternalTabs.ts
 * @description Pestañas internas con WebContentsView (brief, sección 10), del lado de la interfaz.
 * - open(): aplica el límite de pestañas y pide al proceso principal que cree la vista
 *   (allí se valida la URL con la lista de sitios o se convierte en reproductor de YouTube).
 * - useExternalTabsSync(): muestra/oculta la vista activa, cierra las vistas de las pestañas
 *   cerradas y atiende los eventos del proceso principal (títulos, errores, pedidos de pestaña).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import { TAB_LIMIT_MESSAGE } from '../store/appStore';
import { LIMITS } from '@shared/config';

export function useOpenExternalTab() {
  const { state, dispatch, logActivity } = useApp();

  return useCallback(
    async (url: string, title?: string, icon?: string) => {
      const api = getElectronAPI();
      if (!api) return;
      const existing = state.tabs.find(t => t.url === url);
      if (existing) {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: existing.id });
        return;
      }
      if (state.tabs.length >= LIMITS.maxTabs) {
        dispatch({ type: 'SET_NOTICE', payload: TAB_LIMIT_MESSAGE });
        return;
      }
      const result = await api.tabs.open(url);
      if (!result.ok) {
        dispatch({ type: 'SET_NOTICE', payload: result.message });
        return;
      }
      dispatch({
        type: 'ADD_TAB',
        payload: {
          id: result.tabId,
          type: 'workspace-url',
          title: title ?? (result.title || new URL(result.url).hostname.replace(/^www\./, '')),
          url: result.url,
          icon: icon ?? (result.title === 'YouTube' ? '▶️' : '🌐'),
        },
      });
      logActivity({ type: 'site', label: `Abierto: ${title ?? result.url}`, detail: result.url, icon: icon ?? '🌐' });
    },
    [state.tabs, dispatch, logActivity]
  );
}

export function useExternalTabsSync(options: { overlayOpen: boolean; onlineTools: boolean }) {
  const { state, dispatch } = useApp();
  const open = useOpenExternalTab();
  const openRef = useRef(open);
  openRef.current = open;
  const knownIds = useRef(new Set<string>());

  // Vista visible: la de la pestaña activa, salvo que haya un diálogo o aviso encima o falte conexión.
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const visibleId =
    activeTab?.type === 'workspace-url' && !options.overlayOpen && options.onlineTools && !state.notice
      ? activeTab.id
      : null;

  useEffect(() => {
    void getElectronAPI()?.tabs.show(visibleId);
  }, [visibleId]);

  // Cerrar en el proceso principal las vistas de las pestañas que ya no están.
  useEffect(() => {
    const api = getElectronAPI();
    const current = new Set(state.tabs.filter(t => t.type === 'workspace-url').map(t => t.id));
    for (const id of knownIds.current) {
      if (!current.has(id)) void api?.tabs.close(id);
    }
    knownIds.current = current;
  }, [state.tabs]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;
    const offUpdated = api.tabs.onUpdated(({ tabId, title, error }) => {
      dispatch({ type: 'UPDATE_TAB', payload: { id: tabId, ...(title ? { title } : {}), ...(error ? { error } : {}) } });
    });
    const offRequest = api.tabs.onOpenRequest(({ url }) => void openRef.current(url));
    return () => {
      offUpdated();
      offRequest();
    };
  }, [dispatch]);
}
