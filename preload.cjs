const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  activateKiosk: (durationSeconds) =>
    ipcRenderer.invoke("activate-kiosk", durationSeconds),
  deactivateKiosk: () =>
    ipcRenderer.invoke("deactivate-kiosk"),
  closeApp: () => ipcRenderer.invoke("close-app"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  
  /**
   * Escucha el evento de token recibido desde el main process
   * @param {Function} callback - Función que se ejecuta cuando se recibe el token
   * @returns {Function} Función para desuscribirse del evento
   */
  onAuthToken: (callback) => {
    const handler = (_event, token) => callback(token);
    ipcRenderer.on("auth:token-received", handler);
    
    // Retornar función para limpiar el listener
    return () => ipcRenderer.removeListener("auth:token-received", handler);
  },
});
