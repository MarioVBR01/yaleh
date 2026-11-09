import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/lexend/300.css";
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/lexend/700.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./index.css";
import App from "./App";
import { isElectron } from "./lib/electron";
import { applyWebTheme, preferredWebTheme } from "./lib/useWebTheme";

// Escritorio: oscuro hasta que llegue la configuración (Modo nocturno, ORION #29).
// Web: la preferencia guardada o la del sistema, antes de dibujar, para que no parpadee.
if (isElectron()) document.documentElement.dataset.theme = "dark";
else applyWebTheme(preferredWebTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
