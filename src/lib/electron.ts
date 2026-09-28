import type { ElectronAPI } from '@shared/ipc-types';

/** true dentro de la app de escritorio; false en el navegador. */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/** API del escritorio, o null en el navegador. */
export function getElectronAPI(): ElectronAPI | null {
  return typeof window !== 'undefined' ? window.electronAPI ?? null : null;
}

/** Cierra la app. El proceso principal lo rechaza mientras la sesión está activa. */
export async function closeApp(): Promise<void> {
  await window.electronAPI?.closeApp();
}
