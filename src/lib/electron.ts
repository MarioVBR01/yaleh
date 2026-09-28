export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

export async function activateKiosk(durationSeconds: number): Promise<void> {
  if (window.electronAPI?.activateKiosk) {
    await window.electronAPI.activateKiosk(durationSeconds);
  }
}

export async function deactivateKiosk(): Promise<void> {
  if (window.electronAPI?.deactivateKiosk) {
    await window.electronAPI.deactivateKiosk();
  }
}

export async function closeApp(): Promise<void> {
  if (window.electronAPI?.closeApp) {
    await window.electronAPI.closeApp();
  }
}
