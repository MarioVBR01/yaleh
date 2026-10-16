# Diseño YALEH: guía para implementar

Esta carpeta tiene todo lo necesario para llevar el rediseño (2026-10-15) al código de YALEH.

## Dónde ponerla

Copiá la carpeta completa dentro del repositorio como **`docs/diseno/`** (en la raíz del proyecto, junto a `src/`). Todas las rutas de las tarjetas usan esa ubicación:

```
yaleh/
├── src/
└── docs/
    └── diseno/            ← esta carpeta
        ├── README.md      ← este archivo
        ├── TARJETAS.md    ← las 13 tarjetas (qué hacer y criterio de aceptación)
        ├── logo/
        │   ├── logo-yaleh.svg              ← logo para fondo claro
        │   ├── logo-yaleh-modo-oscuro.svg  ← logo para fondo oscuro (círculo con borde fino)
        │   └── logo-yaleh-original.png     ← imagen original hecha con Gemini (solo referencia)
        └── maquetas/
            ├── guia-de-estilo.html   ← colores, letras, botones, estados, avisos
            ├── bienvenida.html       ← bienvenida del escritorio (con y sin conexión)
            ├── web.html              ← web: entrar, material, duración, confirmar, descargado
            ├── espacio-de-trabajo.html ← kiosko: barra lateral, barra inferior, aviso de tiempo, Fuentes/Chat/Estudio
            ├── historial.html        ← kiosko: historial con filtro nuevo y aviso de 8 pestañas
            ├── yaleh.css             ← tokens de color y estilos de todas las maquetas
            └── yaleh.js              ← dibuja íconos, logo y el selector claro/oscuro de las maquetas
```

Las maquetas se abren con doble clic en el navegador (necesitan `yaleh.css` y `yaleh.js` en la misma carpeta). Arriba a la derecha de cada una hay botones **Oscuro / Claro**.

## Instrucciones para Claude Code

1. Leé `docs/diseno/TARJETAS.md`. Hacé la **tarjeta 1 primero** (tokens, letras, logo): las demás dependen de ella.
2. Las maquetas son **referencia visual**, no código para copiar: la app usa React + Tailwind v4. Traducí cada maqueta a los componentes existentes usando los tokens de `src/index.css` (`bg-canvas`, `text-ink`, `bg-accent`, etc.).
3. `yaleh.js` solo existe para que las maquetas se vean; no se copia a la app. Los íconos de las maquetas son los mismos de `lucide-react` (ver tabla abajo).
4. Las letras van **incluidas en la app** (por ejemplo `@fontsource/bricolage-grotesque`, `@fontsource/lexend`, `@fontsource/jetbrains-mono`), nunca desde Google Fonts: el kiosko tiene que funcionar sin internet.
5. Al terminar cada tarjeta, compará la app con la maqueta en modo claro y oscuro.

## Tarjeta → archivo de referencia → código

| # | Tarjeta | Maqueta | Código a tocar |
|---|---------|---------|----------------|
| 1 | Colores, letras y logo | `guia-de-estilo.html`, `yaleh.css`, `logo/` | `src/index.css` (`@theme`), componentes con el logo |
| 2 | Bienvenida del escritorio | `bienvenida.html` | `src/phases/DesktopStartPhase.tsx` |
| 3 | Barra lateral | `espacio-de-trabajo.html` (columna izquierda) | `src/kiosk/SideBar.tsx` |
| 4 | Barra inferior: reloj y Extender | `espacio-de-trabajo.html` (abajo) | `src/kiosk/BottomBar.tsx`, `src/kiosk/ExtendControls.tsx` |
| 5 | Aviso de tiempo restante | `espacio-de-trabajo.html` (franja naranja) | `src/kiosk/TimeWarningToast.tsx` |
| 6 | Aviso de 8 pestañas | `historial.html` (aviso abajo a la derecha) | mensaje en `src/store/appStore.ts` (`TAB_LIMIT_MESSAGE`), límite en `shared/config.ts` (`maxTabs`), el aviso que hoy lo muestra, y `src/kiosk/BottomBar.tsx` (contador 8/8) |
| 7 | Espacio de trabajo | `espacio-de-trabajo.html` (tres columnas) | `src/workspace/` |
| 8 | Historial | `historial.html` | `src/panels/HistoryPanel.tsx`, `src/panels/SessionTable.tsx` |
| 9 | Web: entrar | `web.html` (pantalla 1) | `src/phases/LoginPhase.tsx` |
| 10 | Web: pasos, material y duración | `web.html` (pantallas 2 y 3) | `src/phases/DropzonePhase.tsx`, `src/phases/TimerSelectPhase.tsx`, `src/phases/WebAccountBar.tsx` |
| 11 | Web: confirmar y descargado | `web.html` (pantallas 4 y 5) | `src/phases/ConfirmSessionPhase.tsx` |
| 12 | Mostrar la hora (siguiente sprint) | sin maqueta | `src/kiosk/BottomBar.tsx` |
| 13 | Batería en portátiles | sin maqueta (usa el estilo del aviso de tiempo) | `src/kiosk/BottomBar.tsx` |

## Tokens de color

| Token (`src/index.css`) | Modo claro | Modo oscuro | Uso |
|---|---|---|---|
| `--color-canvas` | `#F6F3EF` | `#100F0E` | fondo de la app |
| `--color-surface` | `#FFFFFF` | `#191715` | paneles y barras |
| `--color-surface-raised` | `#F1ECE5` | `#221F1C` | tarjetas, inputs, pestaña activa |
| `--color-line` | `#E3DBD1` | `#322D28` | bordes |
| `--color-ink` | `#1A1510` | `#F5F0EA` | texto principal |
| `--color-ink-soft` | `#5B5248` | `#BDB3A8` | texto secundario |
| `--color-ink-muted` | `#8C8276` | `#877D72` | texto de apoyo |
| `--color-accent` | `#F7941D` | `#F7941D` | naranja YALEH: botones principales |
| `--color-accent-soft` | `#C2650A` | `#FFAB45` | naranja para textos e íconos |
| `--color-success` | `#1C8F5A` | `#3DCB86` | Completada |
| `--color-danger` | `#CC3A40` | `#FF6B6F` | Interrumpida, errores |
| texto sobre naranja | `#1A1206` | `#1A1206` | texto de los botones naranjas |

Los valores exactos y los usos de cada uno están en `maquetas/yaleh.css` (bloque `:root` = claro, bloque `[data-theme="dark"]` = oscuro).

## Letras

| Rol | Fuente | Ejemplo |
|---|---|---|
| Títulos y avisos grandes | Bricolage Grotesque 700/800 | "Historial de sesiones", "Te quedan 5 minutos" |
| Interfaz y texto | Lexend 300/400/500 | botones, menús, tablas |
| Reloj y cifras | JetBrains Mono 500/700 | `00:04:52` |

## Íconos (lucide-react)

| Maqueta | lucide-react |
|---|---|
| home | `Home` |
| chart | `BarChart2` |
| clock | `Clock` |
| wrench | `Wrench` |
| history | `History` |
| settings | `Settings` |
| send | `Send` |
| bell | `BellRing` |
| extend | `TimerReset` |
| file | `FileText` |
| upload / download | `Upload` / `Download` |
| calendar | `Calendar` |
| refresh | `RefreshCw` |
| sparkles | `Sparkles` |
| alert | `AlertTriangle` |
| shield | `ShieldCheck` |
| wifiOff | `WifiOff` |
| play | `Play` |
| lock | `Lock` |
| logout | `LogOut` |
| list, cards, quiz, report, mind, table, slides, image | `List`, `Copy`, `HelpCircle`, `FileBarChart`, `Network`, `Table`, `Presentation`, `Image` |
