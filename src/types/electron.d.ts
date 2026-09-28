import type { ElectronAPI } from '@shared/ipc-types';

declare global {
  interface Window {
    /** Solo existe dentro de la app de escritorio (lo expone el preload). */
    electronAPI?: ElectronAPI;
  }
}

export {};
