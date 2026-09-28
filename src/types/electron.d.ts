export {};

declare global {
  interface Window {
    electronAPI?: {
      activateKiosk: (durationSeconds: number) => Promise<void>;
      deactivateKiosk: () => Promise<void>;
      closeApp: () => Promise<void>;
      openExternal: (url: string) => Promise<boolean>;
      onAuthToken: (callback: (token: string) => void) => () => void;
    };
  }
}
