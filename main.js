import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { URL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_SERVER_URL = "http://localhost:5173";
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
const PROTOCOL_SCHEME = "yaleh";

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    kiosk: false,
    alwaysOnTop: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_PATH,
    },
  });

  const isProduction =
    process.env.NODE_ENV === "production" || app.isPackaged;

  if (isProduction) {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  } else {
    mainWindow.loadURL(DEV_SERVER_URL);
  }
}

function applyKioskMode() {
  if (!mainWindow) return;

  mainWindow.setMenu(null);
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.focus();
}

/**
 * Desactiva el modo kiosko y restaura el estado normal de la ventana.
 */
function deactivateKioskMode() {
  if (!mainWindow) return;

  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setVisibleOnAllWorkspaces(false);
}

/**
 * Procesa el deep link y extrae el token del query string.
 * @param {string} urlString - La URL del deep link (ej: yaleh://auth?token=XXX)
 */
function handleDeepLink(urlString) {
  if (!urlString.startsWith(`${PROTOCOL_SCHEME}://`)) return;

  try {
    const url = new URL(urlString);
    const token = url.searchParams.get("token");
    
    if (token && mainWindow && mainWindow.webContents) {
      // Enviar el token al renderer process
      mainWindow.webContents.send("auth:token-received", token);
    }
  } catch (error) {
    console.error("Error al procesar deep link:", error);
  }
}

ipcMain.handle("activate-kiosk", (_event, durationSeconds) => {
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) {
    throw new Error("La duración de la sesión debe ser mayor a cero.");
  }

  applyKioskMode();
});

ipcMain.handle("deactivate-kiosk", () => {
  deactivateKioskMode();
});

ipcMain.handle("close-app", () => {
  app.quit();
});

ipcMain.handle("open-external", async (_event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error("Error al abrir URL externa:", error);
    return false;
  }
});

app.whenReady().then(() => {
  // Registrar el protocolo personalizado para deep linking
  const isProduction = process.env.NODE_ENV === "production" || app.isPackaged;
  
  if (isProduction) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  } else {
    // En desarrollo, especificar el ejecutable y argumentos explícitamente
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      path.resolve(process.argv[1])
    ]);
  }
  
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Manejo de deep link en macOS (app ya está abierta)
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Manejo de deep link en Windows y Linux (segunda instancia)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // En Windows, el deep link viene en argv
    const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
  });
}
