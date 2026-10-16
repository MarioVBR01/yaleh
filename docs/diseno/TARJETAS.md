# Diseño al código: tarjetas para Orion

Llevar el rediseño (ronda 1, 2026-10-15) a la app de escritorio y a la web, para que las dos se vean iguales. Las maquetas de referencia están en `docs/diseno/maquetas/` (abrir los `.html` en el navegador) y publicadas en https://claude.ai/artifact/PJ7MW6dyyBLJeZurt2Etdg. Cada tarjeta dice qué maqueta copiar.

**Orden:** la tarjeta 1 va primero, porque las demás usan sus colores y letras. Después, de arriba hacia abajo.

**Prioridades:** Alta = va primero. Media = entra en esta fase (diseño). Baja = si sobra tiempo. Siguiente sprint = no entra en este sprint.

| # | Tarjeta | Tipo | Prioridad |
|---|---------|------|-----------|
| 1 | Colores, letras y logo nuevos (modo claro y oscuro) | Mejora | Alta |
| 2 | Bienvenida del escritorio sin recuadro | Mejora | Alta |
| 3 | Barra lateral con el logo nuevo | Mejora | Media |
| 4 | Barra inferior: reloj grande y Extender a un clic | Mejora | Media |
| 5 | Aviso de tiempo restante grande y animado | Mejora | Media |
| 6 | Aviso de 8 pestañas visible | Mejora | Media |
| 7 | Espacio de trabajo con el estilo nuevo | Mejora | Media |
| 8 | Historial: filtro nuevo y tabla más legible | Mejora | Media |
| 9 | Web: pantalla de entrar | Mejora | Media |
| 10 | Web: barra de pasos, Material y Duración | Mejora | Media |
| 11 | Web: Confirmar y Descargado | Mejora | Media |
| 12 | Mostrar la hora en el kiosko | Mejora | Siguiente sprint |
| 13 | Mostrar el estado de la batería en portátiles | Mejora | Media |

Las tarjetas 4, 5 y 8 reemplazan a las tarjetas 3, 4 y 6 de la cuarta ronda (`2026-10-15-cuarta-ronda-pruebas.md`). La tarjeta 6 cierra el aviso de 8 pestañas pedido en la tercera ronda.

---

## Tarjeta 1: Colores, letras y logo nuevos (modo claro y oscuro)

**Tipo:** Mejora. **Prioridad:** Alta (base de todas las demás).

**1. ¿Dónde?**
Escritorio y web, en toda la app. En el código: los tokens de color de `src/index.css` (bloque `@theme`).

**2. ¿Qué hice?**
1. Abrí la app de escritorio y la web.
2. Las comparé con `docs/diseno/maquetas/guia-de-estilo.html`.

**3. ¿Qué esperaba?**
- Negro y naranja (#F7941D), como el logo final, en las dos apps.
- Modo claro y modo oscuro, que se cambia en Configuración → Modo nocturno.
- Letras: Bricolage Grotesque para títulos, Lexend para el texto y JetBrains Mono para el reloj y las cifras.
- El logo nuevo (estudiante con birrete, destellos de IA, escudo con candado) en lugar del cuadro "YA" y del escudo azul.

**4. ¿Qué pasó?**
La app usa azul y gris pizarra (paleta del MVP), las letras del sistema y el logo provisorio "YA".

**Criterio de aceptación**
- Los valores de `@theme` en `src/index.css` cambian a los de `docs/diseno/maquetas/yaleh.css` (fondo, superficie, superficie 2, borde, texto, texto secundario, naranja, verde, rojo).
- El modo claro usa los valores del bloque `:root` y el oscuro los del bloque `[data-theme="dark"]` de `yaleh.css`; el interruptor de Configuración cambia entre los dos y la elección se guarda.
- Las letras van incluidas en la app (por ejemplo con los paquetes `@fontsource`), no desde Google Fonts: el kiosko tiene que verse igual sin internet.
- El logo está como SVG en el proyecto (copiar `docs/diseno/logo/logo-yaleh.svg`; la versión para fondo oscuro es `logo-yaleh-modo-oscuro.svg`) y se usa en escritorio y web.
- En modo oscuro el círculo negro del logo lleva un borde fino para que no se pierda contra el fondo.

---

## Tarjeta 2: Bienvenida del escritorio sin recuadro

**Tipo:** Mejora. **Prioridad:** Alta.

**1. ¿Dónde?**
Escritorio → pantalla de bienvenida (`src/phases/DesktopStartPhase.tsx`).

**2. ¿Qué hice?**
1. Abrí la app de escritorio.
2. Miré la pantalla de bienvenida.

**3. ¿Qué esperaba?**
La bienvenida de `docs/diseno/maquetas/bienvenida.html`: logo grande, "Bienvenido a YALEH", subtítulo y el botón Iniciar, sin recuadro alrededor.

**4. ¿Qué pasó?**
Todo está dentro de un recuadro, con el mensaje "Con conexión", el botón "Abrir archivo de sesión (.yaleh)", el texto de arrastrar el archivo, Configuración como botón de texto y la sección completa del asistente sin conexión.

**Criterio de aceptación**
- No hay recuadro: logo, título, subtítulo e Iniciar quedan centrados sobre el fondo.
- Iniciar es el único botón naranja y sigue haciendo lo mismo que hoy.
- Configuración es solo un engranaje arriba a la derecha (con el texto "Configuración" al pasar el mouse) y abre la misma pantalla de hoy.
- No aparece el mensaje "Con conexión".
- Sin internet aparece un aviso debajo de Iniciar: "Estás sin conexión. Vas a estudiar con el asistente sin conexión…". Si el asistente no está instalado, dice que se descarga desde la página de YALEH (la landing page de la etapa final).
- Se quitan el botón "Abrir archivo de sesión (.yaleh)", el texto de arrastrar el archivo y la sección del asistente sin conexión (instalar o eliminar).
- Abrir un `.yaleh` con doble clic sigue iniciando la sesión.
- Si hay nombre en Configuración, se muestra "Hola, (nombre)" arriba a la izquierda; si no, no se muestra nada.

---

## Tarjeta 3: Barra lateral con el logo nuevo

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Escritorio → kiosko, barra lateral (`src/kiosk/SideBar.tsx`).

**2. ¿Qué hice?**
1. Inicié una sesión.
2. Miré la barra lateral y la comparé con `docs/diseno/maquetas/espacio-de-trabajo.html`.

**3. ¿Qué esperaba?**
Logo nuevo con "YALEH / Entorno de estudio", la opción activa en naranja y un pie que explique la protección de la sesión.

**4. ¿Qué pasó?**
Cuadro "YA" azul, la opción activa en azul y abajo el texto de estado "en línea".

**Criterio de aceptación**
- Arriba, el logo nuevo de 44 px con "YALEH" y "Entorno de estudio".
- La opción activa tiene fondo naranja suave, una línea naranja a la izquierda y el ícono en naranja.
- El pie dice "Sesión protegida" y explica en una línea que solo se abren sitios de estudio permitidos y que el asistente sin conexión sigue funcionando si se corta internet.
- Se ve bien en modo claro y oscuro, y con la barra colapsada sigue mostrando solo los íconos.

---

## Tarjeta 4: Barra inferior: reloj grande y Extender a un clic

**Tipo:** Mejora. **Prioridad:** Media. Reemplaza la tarjeta 3 de la cuarta ronda.

**1. ¿Dónde?**
Escritorio → kiosko, barra inferior (`src/kiosk/BottomBar.tsx` y `ExtendControls.tsx`).

**2. ¿Qué hice?**
1. Inicié una sesión corta.
2. Esperé a los últimos 5 minutos.
3. Busqué el botón para extender el tiempo.

**3. ¿Qué esperaba?**
La barra de `docs/diseno/maquetas/espacio-de-trabajo.html`: reloj grande y un grupo naranja "Extender" con +15, +25, +50 y "…" a la vista.

**4. ¿Qué pasó?**
El botón "Extender tiempo" es chico y cuesta verlo; hay que abrirlo para ver los minutos.

**Criterio de aceptación**
- La barra inferior pasa de 40 a 64 px de alto.
- El reloj muestra "Quedan" y el tiempo en letra monoespaciada de 20 px, con un anillo de progreso; en los últimos minutos el reloj se pone naranja.
- En los últimos 5 minutos aparece el grupo naranja "Extender" con +15, +25 y +50: un clic extiende sin abrir otro menú.
- "…" permite escribir otros minutos (con los mismos límites de hoy).
- Si "Permitir extender la sesión" está apagado en Configuración, el grupo no aparece.
- La línea de progreso de arriba de la barra es naranja.

---

## Tarjeta 5: Aviso de tiempo restante grande y animado

**Tipo:** Mejora. **Prioridad:** Media. Reemplaza la tarjeta 4 de la cuarta ronda.

**1. ¿Dónde?**
Escritorio → kiosko, aviso "Te quedan N minutos" (`src/kiosk/TimeWarningToast.tsx`).

**2. ¿Qué hice?**
1. Elegí en Configuración avisar 5 minutos antes.
2. Inicié una sesión y esperé el aviso.

**3. ¿Qué esperaba?**
El aviso de `docs/diseno/maquetas/espacio-de-trabajo.html`: una franja naranja de todo el ancho, grande y con movimiento.

**4. ¿Qué pasó?**
El aviso es una línea chica con borde amarillo, fácil de pasar por alto.

**Criterio de aceptación**
- Franja naranja de todo el ancho arriba del área de trabajo, con el texto "Te quedan 5 minutos de sesión" en 30 px.
- Campana en un círculo negro que se sacude, con un pulso alrededor.
- Botones "+15 min" y "Otro tiempo" para extender desde el aviso, y una X para cerrarlo.
- Una barra abajo se vacía en 10 segundos y el aviso se cierra solo, como hoy.
- Sigue ocupando su propio lugar (no flota), para que la pestaña externa no lo tape.
- Suena la alarma elegida, como hoy.
- Si el sistema tiene activado "reducir movimiento", el aviso aparece sin animación.

---

## Tarjeta 6: Aviso de 8 pestañas visible

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Escritorio → kiosko, al llegar al máximo de pestañas.

**2. ¿Qué hice?**
1. Abrí pestañas hasta llegar a 8.
2. Intenté abrir una más.

**3. ¿Qué esperaba?**
El aviso de `docs/diseno/maquetas/historial.html`: una tarjeta con fondo invertido (clara en modo oscuro, oscura en modo claro) que se vea sobre cualquier contenido.

**4. ¿Qué pasó?**
El aviso casi no se ve contra el fondo oscuro.

**Criterio de aceptación**
- El aviso dice "Tenés 8 pestañas abiertas. Es el máximo de la sesión. Cerrá una para abrir otra.", con ícono naranja.
- En modo oscuro el fondo es claro; en modo claro, oscuro.
- Al lado de las pestañas se ve un contador naranja "8/8" y "Nueva pestaña" queda deshabilitado.
- El aviso se ve aunque esté abierta una pestaña externa (Google Docs, YouTube).

---

## Tarjeta 7: Espacio de trabajo con el estilo nuevo

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Escritorio → kiosko, Espacio de trabajo: Fuentes, Chat y Estudio (`src/workspace/`).

**2. ¿Qué hice?**
1. Abrí una sesión con dos PDF.
2. Usé el chat y las herramientas de Estudio.

**3. ¿Qué esperaba?**
Las tres columnas de `docs/diseno/maquetas/espacio-de-trabajo.html`.

**4. ¿Qué pasó?**
Las columnas usan el estilo azul anterior y los botones de Estudio se ven apagados.

**Criterio de aceptación**
- Fuentes: cada archivo con ícono naranja, nombre, páginas y casilla; abajo, "Agregar fuente" con borde punteado.
- Chat: la pregunta del estudiante en burbuja oscura a la derecha; la respuesta con el ícono del asistente y la cita del archivo y las páginas; sugerencias como botones redondeados; el botón Enviar es naranja.
- Estudio: las 8 herramientas en dos columnas con ícono naranja (Resumen, Tarjetas, Cuestionario, Informe, Mapa mental, Tabla, Presentación, Infografía); debajo, "Generado en esta sesión"; Notas abajo de todo.
- Sin conexión, solo se muestran las herramientas del asistente sin conexión (según el alcance del 2026-10-13).

---

## Tarjeta 8: Historial: filtro nuevo y tabla más legible

**Tipo:** Mejora. **Prioridad:** Media. Reemplaza la tarjeta 6 de la cuarta ronda.

**1. ¿Dónde?**
Escritorio → Historial de sesiones (`src/panels/HistoryPanel.tsx` y `SessionTable.tsx`).

**2. ¿Qué hice?**
1. Abrí el Historial.
2. Elegí un rango de fechas y pulsé Buscar.

**3. ¿Qué esperaba?**
El filtro y la tabla de `docs/diseno/maquetas/historial.html`.

**4. ¿Qué pasó?**
Hay que escribir dos fechas y pulsar Buscar; el diseño del filtro no gusta y la tabla es difícil de leer.

**Criterio de aceptación**
- Atajos de un clic: Todo, Hoy, 7 días, Este mes y Elegir fechas.
- "Elegir fechas" muestra el rango Desde/Hasta, resaltado en naranja mientras está activo; la X lo quita.
- La tabla se filtra apenas se elige, sin botón Buscar.
- Filtros extra de Estado (Completada, Interrumpida, En curso) y Modo (Con conexión, Sin conexión).
- Debajo del filtro, un resumen: cantidad de sesiones, minutos estudiados y porcentaje de completadas.
- Tabla: fecha y hora en dos líneas; "Duración" y "Tiempo estudiado" en una columna ("2 de 2 min" con barrita); "Sin archivos" en lugar de la raya; los ceros en gris y las pérdidas de foco de 5 o más en rojo.
- Exportar PDF respeta el filtro elegido.

---

## Tarjeta 9: Web: pantalla de entrar

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Web → pantalla de inicio de sesión (`src/phases/LoginPhase.tsx`).

**2. ¿Qué hice?**
1. Abrí la web.
2. La comparé con la bienvenida nueva del escritorio.

**3. ¿Qué esperaba?**
La pantalla 1 de `docs/diseno/maquetas/web.html`, con la misma composición que la bienvenida del escritorio.

**4. ¿Qué pasó?**
Fondo degradé azul, escudo azul genérico y la tarjeta "Iniciar Sesión": no se parece al escritorio.

**Criterio de aceptación**
- Logo nuevo, "YALEH." y la frase "Prepará tu sesión acá y estudiá en la app de escritorio."
- Botón blanco "Continuar con Google" (igual que hoy, con el logo de Google) y debajo "Usá tu cuenta institucional de TECBA."
- Sin recuadro ni degradé azul.
- El inicio de sesión funciona igual que hoy (se pide en cada apertura, BUG-002).

---

## Tarjeta 10: Web: barra de pasos, Material y Duración

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Web → Material de estudio (`DropzonePhase.tsx`), Duración (`TimerSelectPhase.tsx`) y la barra de cuenta (`WebAccountBar.tsx`).

**2. ¿Qué hice?**
1. Entré a la web.
2. Subí dos PDF.
3. Elegí la duración.

**3. ¿Qué esperaba?**
Las pantallas 2 y 3 de `docs/diseno/maquetas/web.html`.

**4. ¿Qué pasó?**
No se sabe en qué paso estás; la duración usa emojis y tarjetas de colores; la explicación de cada tiempo está repetida abajo.

**Criterio de aceptación**
- Barra superior fija con el logo, la barra de pasos (Material, Duración, Confirmar, Descargar) y la cuenta (foto o inicial, nombre, correo, Cambiar y Cerrar sesión).
- La barra de pasos marca con ✓ los pasos hechos y en naranja el actual.
- Material: título "¿Con qué vas a estudiar?", zona grande para arrastrar, lista de archivos con su tamaño y una X, barra de uso (ej. "3,2 MB de 50 MB"), botones "Seguir sin archivos" y "Continuar".
- Duración: tres tarjetas sin emojis (25 Pomodoro, 50 Estándar, 90 Extendida) con su explicación adentro; la elegida en naranja; minutos propios de 1 a 180; aviso de modo kiosko con candado; el botón dice "Continuar con N min".
- Se quitan las tres cajitas de explicación de abajo.

---

## Tarjeta 11: Web: Confirmar y Descargado

**Tipo:** Mejora. **Prioridad:** Media.

**1. ¿Dónde?**
Web → Confirma tu sesión y Archivo de sesión descargado (`ConfirmSessionPhase.tsx`).

**2. ¿Qué hice?**
1. Preparé una sesión de 50 minutos con dos PDF.
2. Pulsé "Descargar archivo de sesión".

**3. ¿Qué esperaba?**
Las pantallas 4 y 5 de `docs/diseno/maquetas/web.html`, con instrucciones que coincidan con la bienvenida nueva (sin el botón "Abrir archivo").

**4. ¿Qué pasó?**
Las instrucciones dicen "Pulsa Abrir archivo de sesión (.yaleh)", un botón que se saca del escritorio en la tarjeta 2.

**Criterio de aceptación**
- Confirmar: resumen con Archivos (cantidad y nombres) y Duración, cada uno con "Cambiar"; aviso con candado; botón naranja "Descargar archivo de sesión".
- Descargado: ícono verde de listo, "Tu sesión está lista", nombre del archivo en letra monoespaciada y tres pasos: buscarlo en Descargas, abrirlo con doble clic, la sesión empieza y la computadora queda bloqueada.
- Se mantiene "El archivo vale 24 horas y se puede usar una sola vez."
- Botones "Descargar otra vez" y "Preparar otra sesión".
- La web no ofrece descargar el asistente sin conexión (Qwen): eso va en la landing page, junto con el ejecutable, en la etapa final.

---

## Tarjeta 12: Mostrar la hora en el kiosko

**Tipo:** Mejora. **Prioridad:** Siguiente sprint.

**1. ¿Dónde?**
Escritorio → kiosko, barra inferior (`src/kiosk/BottomBar.tsx`).

**2. ¿Qué hice?**
1. Inicié una sesión.
2. Busqué la hora actual en la pantalla.

**3. ¿Qué esperaba?**
Ver la hora del equipo, como en la barra de tareas de Windows, que el kiosko tapa.

**4. ¿Qué pasó?**
Solo se ve el tiempo que queda de sesión. No hay forma de saber qué hora es sin salir del kiosko.

**Criterio de aceptación**
- La hora actual (formato 24 h o 12 h según Windows, ej. "21:45") se ve en la barra inferior, a la derecha, junto a "Nueva pestaña".
- Se actualiza sola cada minuto.
- No se confunde con el reloj de la sesión: es más chica, en gris y sin anillo; al pasar el mouse muestra la fecha completa ("jueves 16 de octubre de 2026").
- Se ve en modo claro y oscuro, con y sin conexión.

---

## Tarjeta 13: Mostrar el estado de la batería en portátiles

**Tipo:** Mejora. **Prioridad:** Media (si la batería se agota, la sesión se corta sin aviso).

**1. ¿Dónde?**
Escritorio → kiosko, barra inferior, solo en equipos portátiles.

**2. ¿Qué hice?**
1. Inicié una sesión en una portátil sin el cargador conectado.
2. Busqué el nivel de batería.

**3. ¿Qué esperaba?**
Ver cuánta batería queda y recibir un aviso antes de que el equipo se apague, porque el kiosko tapa el ícono de batería de Windows.

**4. ¿Qué pasó?**
La app no muestra la batería. El estudiante no sabe si el equipo se va a apagar en medio de la sesión.

**Criterio de aceptación**
- En portátiles, la barra inferior muestra un ícono de batería con el porcentaje (ej. "64 %") y un rayo cuando está cargando.
- En equipos de escritorio (sin batería) no se muestra nada.
- Con 20 % o menos y sin cargar, el ícono se pone naranja y sale una vez el aviso "Batería baja (20 %). Conectá el cargador para no perder la sesión.", con el mismo estilo del aviso de tiempo.
- Con 10 % o menos, el ícono se pone rojo y el aviso vuelve a salir.
- Al conectar el cargador, el aviso se cierra solo.
- Si el equipo se apaga por batería, la sesión queda guardada como interrumpida y se puede retomar al volver a abrir YALEH (como hoy al reiniciar).
- Nota técnica: Chromium (Electron) da el nivel y si está cargando con `navigator.getBattery()`; no hace falta permiso.

