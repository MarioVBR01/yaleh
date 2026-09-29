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
  startSession: (durationSeconds, mode) => ipcRenderer.invoke(IPC_INVOKE.sessionStart, durationSeconds, mode),
  getSessionState: () => ipcRenderer.invoke(IPC_INVOKE.sessionGetState),
  resumeSession: () => ipcRenderer.invoke(IPC_INVOKE.sessionResume),
  discardResume: () => ipcRenderer.invoke(IPC_INVOKE.sessionDiscardResume),
  onSessionTick: callback => subscribe(IPC_EVENT.sessionTick, callback),
  onSessionEnded: callback => subscribe(IPC_EVENT.sessionEnded, callback),
  getConnectionMode: () => ipcRenderer.invoke(IPC_INVOKE.connectionGet),
  recheckConnection: () => ipcRenderer.invoke(IPC_INVOKE.connectionRecheck),
  onConnectionChange: callback => subscribe(IPC_EVENT.connectionChanged, callback),
  closeApp: () => ipcRenderer.invoke(IPC_INVOKE.appClose),
  openExternal: url => ipcRenderer.invoke(IPC_INVOKE.appOpenExternal, url),
  onAuthToken: callback => subscribe(IPC_EVENT.authToken, callback),
  onSessionLink: callback => subscribe(IPC_EVENT.sessionLink, callback),
};

contextBridge.exposeInMainWorld('electronAPI', api);
