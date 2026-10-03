/// <reference types="vitest/config" />
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { ALLOWED_SITES } from "./shared/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * node:sqlite necesita --experimental-sqlite en Node < 22.13 (las pruebas corren
 * con el Node del sistema; Electron 42 trae Node 24 y no lo necesita).
 */
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const sqliteExecArgv =
  nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)
    ? ["--experimental-sqlite", "--disable-warning=ExperimentalWarning"]
    : ["--disable-warning=ExperimentalWarning"];

/**
 * Content-Security-Policy de la interfaz (brief, sección 9).
 * Sin 'unsafe-inline' para scripts. Los estilos en línea se permiten porque
 * framer-motion y React escriben atributos style.
 * Solo se inyecta al compilar: el servidor de desarrollo de Vite necesita un
 * script en línea para la recarga en caliente.
 */
function contentSecurityPolicy(): string {
  const frameHosts = ALLOWED_SITES.map(site =>
    site.includeSubdomains ? `https://${site.host} https://*.${site.host}` : `https://${site.host}`
  );
  return [
    "default-src 'self'",
    // Google (inicio de sesión) y reCAPTCHA Enterprise (App Check).
    "script-src 'self' https://apis.google.com https://www.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com",
    "font-src 'self' data:",
    // Firebase (Auth, Firestore, AI Logic, App Check) y la API de Wikipedia.
    "connect-src 'self' https://*.googleapis.com https://www.google.com https://es.wikipedia.org",
    "worker-src 'self' blob:",
    `frame-src ${[...new Set(frameHosts)].join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function cspPlugin(): Plugin {
  return {
    name: "yaleh-csp",
    apply: "build",
    transformIndexHtml: html =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy()}" />`
      ),
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: la misma compilación sirve para Firebase Hosting y para file:// en Electron.
  base: "./",
  plugins: [react(), tailwindcss(), cspPlugin()],
  build: {
    rollupOptions: {
      // youtube.html: reproductor propio de YALEH (brief, sección 6.2), publicado en Hosting.
      input: {
        main: path.resolve(__dirname, "index.html"),
        youtube: path.resolve(__dirname, "youtube.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    execArgv: sqliteExecArgv,
    include: ["src/**/*.test.{ts,tsx}", "shared/**/*.test.ts", "electron/**/*.test.ts"],
  },
});
