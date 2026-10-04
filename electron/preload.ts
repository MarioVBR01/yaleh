/**
 * @file preload.ts
 * @description Puente entre la interfaz y el proceso principal.
 * Se empaqueta como un único archivo CommonJS (requisito de `sandbox: true`):
 * solo puede importar 'electron' y código propio que esbuild incluye.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_EVENT, IPC_INVOKE, type ElectronAPI } from '../shared/ipc-types';

declare const __YALEH_VERSION__: string;

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api: ElectronAPI = {
  version: __YALEH_VERSION__,
  getAppInfo: () => ipcRenderer.invoke(IPC_INVOKE.appGetInfo),
  startSession: (durationSeconds, sessionId) => ipcRenderer.invoke(IPC_INVOKE.sessionStart, durationSeconds, sessionId),
  getSessionState: () => ipcRenderer.invoke(IPC_INVOKE.sessionGetState),
  resumeSession: () => ipcRenderer.invoke(IPC_INVOKE.sessionResume),
  discardResume: () => ipcRenderer.invoke(IPC_INVOKE.sessionDiscardResume),
  onSessionTick: callback => subscribe(IPC_EVENT.sessionTick, callback),
  onSessionEnded: callback => subscribe(IPC_EVENT.sessionEnded, callback),
  openSessionFileDialog: () => ipcRenderer.invoke(IPC_INVOKE.sessionFileOpenDialog),
  openSessionFileContent: content => ipcRenderer.invoke(IPC_INVOKE.sessionFileOpenContent, content),
  onSessionFileResult: callback => subscribe(IPC_EVENT.sessionFileResult, callback),
  getConnectionMode: () => ipcRenderer.invoke(IPC_INVOKE.connectionGet),
  recheckConnection: () => ipcRenderer.invoke(IPC_INVOKE.connectionRecheck),
  onConnectionChange: callback => subscribe(IPC_EVENT.connectionChanged, callback),
  closeApp: () => ipcRenderer.invoke(IPC_INVOKE.appClose),
  workspace: {
    addSource: (workspaceId, source, text) =>
      ipcRenderer.invoke(IPC_INVOKE.workspaceAddSource, workspaceId, source, text),
    listSources: workspaceId => ipcRenderer.invoke(IPC_INVOKE.workspaceListSources, workspaceId),
    getSourceText: (workspaceId, sourceId) => ipcRenderer.invoke(IPC_INVOKE.workspaceSourceText, workspaceId, sourceId),
    removeSource: (workspaceId, sourceId) => ipcRenderer.invoke(IPC_INVOKE.workspaceRemoveSource, workspaceId, sourceId),
    listNotes: workspaceId => ipcRenderer.invoke(IPC_INVOKE.workspaceListNotes, workspaceId),
    saveNote: (workspaceId, note) => ipcRenderer.invoke(IPC_INVOKE.workspaceSaveNote, workspaceId, note),
    deleteNote: (workspaceId, noteId) => ipcRenderer.invoke(IPC_INVOKE.workspaceDeleteNote, workspaceId, noteId),
  },
  exportOffice: request => ipcRenderer.invoke(IPC_INVOKE.officeExport, request),
  listSessionHistory: () => ipcRenderer.invoke(IPC_INVOKE.historyList),
  tabs: {
    open: url => ipcRenderer.invoke(IPC_INVOKE.tabsOpen, url),
    close: tabId => ipcRenderer.invoke(IPC_INVOKE.tabsClose, tabId),
    show: tabId => ipcRenderer.invoke(IPC_INVOKE.tabsShow, tabId),
    setBounds: (tabId, bounds) => ipcRenderer.invoke(IPC_INVOKE.tabsSetBounds, tabId, bounds),
    onUpdated: callback => subscribe(IPC_EVENT.tabsUpdated, callback),
    onOpenRequest: callback => subscribe(IPC_EVENT.tabsOpenRequest, callback),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
