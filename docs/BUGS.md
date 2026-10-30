# Registro de errores — YALEH v1

Anota aquí cada error que encuentres al probar. Un error por bloque, copiando la plantilla.
Los errores se corrigen al final (antes de la fase 11); al corregir uno, cambia su estado y anota el commit.

**Estados:** Abierto · En corrección · Corregido (commit) · No se corrige (motivo)
**Gravedad:** Alta (bloquea la demo o rompe el kiosko) · Media (funciona mal, hay forma de seguir) · Baja (detalle visual o de texto)

## Plantilla

```markdown
### BUG-000 — Título corto

- **Estado:** Abierto
- **Gravedad:** Alta / Media / Baja
- **Dónde:** Web (navegador) / Escritorio `electron:dev` / Escritorio `electron:preview`
- **Modo:** Con conexión / Sin conexión / No aplica
- **Fecha:** AAAA-MM-DD
- **Pasos para reproducirlo:**
  1. …
  2. …
- **Qué pasó:** …
- **Qué debería pasar:** …
- **Captura o registro:** (imagen, mensaje de la consola, salida de `npm run db:inspect`)
- **Notas:** (¿pasa siempre? ¿desde qué commit?)
```

## Errores

<!-- Agrega los errores debajo, del más reciente al más antiguo. -->
### BUG-001 — Error al cargar la página de inicio WEB

- **Estado:** Corregido (9867a33, publicado el 2026-10-08). El login con Google ya entra: el BUG-002 se vio justamente porque la sesión quedó guardada.
- **Gravedad:** Alta
- **Dónde:** Web (aplicacion web https://yaleh-fbe1c.web.app)
- **Modo:** Con conexión
- **Fecha:** 2024-06-10
- **Pasos para reproducirlo:**
  1. Abrir la aplicación web en un navegador.
  2. Observar que la página de inicio, donde se encuentra el login y su boton con google
  3. Registrarse con un correo electrónico que se muestra para seleccionar el inicio de sesión.
- **Qué pasó:** el login carga los correos por un segundo y te bota nuevamente al login de registro, justo debajo del boton de google, este tiene un mensaje que dice "No se pudo iniciar sesión con Google. Inténtalo de nuevo más tarde."
- **Qué debería pasar:** Debería iniciar sesión correctamente y redirigir al usuario a la página de carga archivos Dropzone.
- **Captura o registro:** ![alt text](<Captura de pantalla 2026-10-08 144034.png>)
- **Notas:** Primera prueba, debemos resolver esto antes de pasar a las otras pruebas
- **Diagnóstico:** la web está en `yaleh-fbe1c.web.app`, pero el login usaba `authDomain` `yaleh-fbe1c.firebaseapp.com` (otro dominio). Chrome bloquea el almacenamiento de terceros, así que la ventana de Google se cierra sin poder entregar el resultado a la página. La configuración de Firebase está bien (Google activado, dominios autorizados, App Check sin exigir en Authentication, la clave de API responde).
- **Corrección:** en la web publicada, `authDomain` es el mismo dominio de la página (`resolveAuthDomain` en `src/firebase/app.ts`). Además, el mensaje de error ahora muestra el código (por ejemplo, `auth/internal-error`).
- **Paso manual:** agregar `https://yaleh-fbe1c.web.app/__/auth/handler` a los URI de redireccionamiento autorizados del cliente OAuth "Web client (auto created by Google Service)" del proyecto. Hoy Google responde `redirect_uri_mismatch` para esa dirección.

### BUG-002 — La web salta el login y entra a la dropzone sin pedir cuenta

- **Estado:** En corrección: reabierto el 2026-10-08 y corregido de nuevo (falta probar)
- **Gravedad:** Media (se puede seguir usando, pero no se sabe con qué cuenta se entró ni se puede cambiar de cuenta; en la demo, con una computadora compartida, se usaría la cuenta de otra persona)
- **Dónde:** Web (navegador Brave, https://yaleh-fbe1c.web.app)
- **Modo:** Con conexión
- **Fecha:** 2026-10-08
- **Pasos para reproducirlo:**
  1. Abrir https://yaleh-fbe1c.web.app (o recargar la pestaña).
  2. Aparece la pantalla "Iniciar Sesión" con el botón "Continuar con Google".
  3. Sin hacer clic en el botón, esperar unos 2 segundos.
- **Qué pasó:** el login se ve un momento y, sin que se abra la ventana de Google ni se elija una cuenta, la app pasa sola a "Material de Estudio" (dropzone). Primero muestra "Preparando tu espacio de trabajo…" y después "Arrastra archivos aquí". En ninguna pantalla aparece qué cuenta quedó activa.
- **Qué debería pasar:** si no hay una sesión iniciada, la app se queda en el login hasta que el usuario elija una cuenta de Google. Si ya hay una sesión guardada, no debería mostrar el login un momento y después saltar: tiene que mostrar con qué cuenta se entró y dar una forma de cerrar sesión o cambiar de cuenta.
- **Captura o registro:** video `bugggg02.mp4` (6 s). No hay registro de la consola.
- **Notas:**
  - No se sabe si pasa siempre ni si pasa en una ventana de incógnito.
  - No se sabe si antes de grabar se había iniciado sesión con Google en este navegador (por ejemplo, al probar el arreglo del BUG-001).
  - Empezó a verse después de 9867a33 (arreglo del BUG-001). No se sabe si pasaba antes, porque antes el login fallaba.
  - Posible causa (sale de leer el código, no está comprobada): Firebase Auth guarda la sesión en el navegador. `App.tsx` arranca en la fase `login`, y cuando `onAuthStateChanged` (`watchUser` en `src/firebase/auth.ts`) devuelve el usuario guardado, `useAuthSync` cambia a `dropzone`. En la web, cerrar sesión solo existe en la barra lateral del kiosko (`src/kiosk/SideBar.tsx`), y la dropzone no muestra el usuario.
  - Para confirmarlo: abrir la web en incógnito. Si ahí el login no se salta, la causa es la sesión guardada.
- **Diagnóstico:** confirmado en el código: es la sesión de Google guardada en el navegador (la de la prueba del BUG-001). No hay un inicio de sesión sin cuenta: Firebase restaura el usuario guardado. El fallo es de la interfaz: mostraba el login mientras Firebase comprobaba la sesión, y después no indicaba la cuenta ni permitía salir.
- **Corrección:**
  - Mientras Firebase comprueba la sesión, el login muestra "Comprobando tu sesión…" en lugar del botón (`state.authChecked`).
  - En la web, una barra arriba a la derecha muestra la cuenta activa (foto o iniciales, nombre y correo) con "Cambiar de cuenta" y "Cerrar sesión" (`src/phases/WebAccountBar.tsx`). Se ve en la dropzone, el tiempo y la confirmación.
  - Al cambiar de cuenta o cerrar sesión se descartan los archivos y el borrador de la cuenta anterior.
  - Pruebas: `src/phases/WebAccountBar.test.tsx`.

#### Reabierto (2026-10-08)

- **Prueba:** con una sesión guardada, la web seguía entrando sola a la dropzone sin mostrar el login. [Completar: ¿aparecía la barra de la cuenta arriba a la derecha? sí / no. ¿En una ventana privada se quedaba en el login? sí / no]
- **Qué debería pasar (aclarado):** la web siempre tiene que pedir la cuenta de Google al abrirla o recargarla. No debe recordar la sesión entre aperturas: es para computadoras compartidas del TECBA y para la demo. Mostrar la cuenta activa y "Cerrar sesión" está bien y se queda.
- **Hallazgo:** `/` se servía con `Cache-Control: max-age=3600` (solo `**/*.html` tenía `no-cache`). Después de publicar 9b5e112, el navegador podía seguir mostrando hasta una hora la versión anterior, sin la barra de la cuenta.
- **Corrección:**
  - Web: `initializeAuth` con `inMemoryPersistence` (y `browserPopupRedirectResolver` para la ventana de Google) en `src/firebase/app.ts`. Se eligió en memoria y no `browserSessionPersistence` porque lo pedido es pedir la cuenta también al recargar.
  - Al arrancar la web se borra la sesión guardada por versiones anteriores (IndexedDB `firebaseLocalStorageDb` y claves `firebase:authUser:*`): los navegadores que ya habían iniciado sesión vuelven al login.
  - El escritorio no cambia (no inicia sesión con Google).
  - `firebase.json`: `/` también con `Cache-Control: no-cache`.
  - Pruebas: `src/firebase/persistence.test.ts`.
- **Para probar:** abrir la web con una sesión iniciada antes → debe mostrar el login con "Continuar con Google". Iniciar sesión → dropzone con la barra de la cuenta. Recargar → vuelve a pedir la cuenta.

### BUG-003 — El .yaleh abierto con doble clic empieza la sesión sin conexión

- **Reportado:** 2026-10-22, por Mario, con la app instalada (v1.0.0).
- **Dónde:** escritorio (app instalada) → abrir un `.yaleh` con doble clic con YALEH cerrada.
- **Qué pasó:** con internet, la sesión empezó en modo sin conexión: sin herramientas de Google y con la IA sin conexión.
- **Qué debería pasar:** con internet, la sesión empieza con conexión (herramientas de Google y Gemini).
- **Diagnóstico (confirmado en el código):** al arrancar, la primera comprobación de la red (`connectivity.start()`) no se espera y el modo queda en `unknown` hasta que responde la web de YALEH (hasta 5 s, `CONNECTIVITY.probeTimeoutMs`). El `.yaleh` se abre apenas carga la interfaz, y el modo de la sesión convertía `unknown` en `offline`; el modo se fija al empezar y no cambia después. El botón "Iniciar" usaba la misma función.
- **Corrección:**
  - `ConnectivityMonitor.sessionMode()` (`electron/connectivity.ts`): comprueba la conexión en el momento de empezar la sesión (reutiliza la comprobación en curso si la hay; sin red es inmediato; con red, como máximo el tiempo límite de 5 s). Así tampoco se usa un resultado viejo de hasta 30 s.
  - Lo usan los dos puntos de entrada en `electron/main.ts`: abrir un `.yaleh` (`openSessionFile`, ahora con el modo asíncrono) y el inicio local (`session:start`).
  - `openSessionFile` vuelve a comprobar, después de esperar, que no haya empezado otra sesión ni se haya usado el mismo archivo.
  - Pruebas: `electron/connectivity.test.ts` (modo `unknown` + respuesta "con conexión" después → online; sin internet → offline; límite de 5 s) y `electron/session-file-service.test.ts`.
- **Para probar (app instalada):** con internet y YALEH cerrada, doble clic en un `.yaleh` nuevo → con conexión. Con YALEH abierta, otro `.yaleh` → con conexión. Sin internet → sin conexión, con una espera de unos 5 s como máximo.

### BUG-004 — El login con Google de la web dice "Este dominio no está autorizado"

- **Estado:** En corrección (código listo; falta autorizar el dominio en la consola de Firebase cuando se sepa cuál es). ORION #81.
- **Gravedad:** Alta (sin login no se prepara ninguna sesión ni se descarga el .yaleh)
- **Dónde:** Web (navegador de una máquina del laboratorio; no se anotó la dirección)
- **Modo:** Con conexión
- **Fecha:** 2026-10-26
- **Pasos para reproducirlo:**
  1. Abrir la web de YALEH en el navegador.
  2. Pulsar "Continuar con Google".
- **Qué pasó:** debajo del botón, en rojo: "Este dominio no está autorizado para iniciar sesión. Avisa al administrador de YALEH." No entra.
- **Qué debería pasar:** se abre la ventana de Google, se elige la cuenta y se entra, como en `https://yaleh-fbe1c.web.app`.
- **Causa:** Firebase devuelve `auth/unauthorized-domain`: la web se abrió desde un dominio que no está en Authentication → Configuración → Dominios autorizados del proyecto `yaleh-fbe1c` (por defecto solo `localhost`, `yaleh-fbe1c.web.app` y `yaleh-fbe1c.firebaseapp.com`). Casos probables: un canal de vista previa de Hosting (`yaleh-fbe1c--<canal>.web.app`), la IP de la red local con `vite --host` (`192.168.x.x:5173`), `127.0.0.1` u otro hosting. No es un fallo del código de la web publicada.
- **Corrección en el código:**
  - `describeAuthError` (`src/firebase/auth.ts`) agrega la dirección de la página al mensaje: "Este dominio (192.168.1.20:5173) no está autorizado…". La próxima captura dice qué dominio autorizar.
  - `resolveAuthDomain` (`src/firebase/app.ts`) también usa el propio dominio en los canales de vista previa (`YALEH_PREVIEW_ORIGIN` en `shared/config.ts`); si no, usaría `yaleh-fbe1c.firebaseapp.com` y volvería el BUG-001 en Chrome.
  - Con ese error, la pantalla de entrar (`src/phases/LoginPhase.tsx`) muestra el botón "Abrir la web oficial (yaleh-fbe1c.web.app)": desde cualquier dirección se puede seguir sin tocar la consola.
  - Pruebas en `src/firebase/auth.test.ts` y `src/phases/LoginPhase.domain.test.tsx`.
- **La red no influye en este error:** Firebase compara la dirección de la página con la lista de dominios autorizados (comprobado el 2026-10-29: `localhost`, `yaleh-fbe1c.firebaseapp.com`, `yaleh-fbe1c.web.app`). En `https://yaleh-fbe1c.web.app` funciona desde cualquier red, siempre que la red deje pasar `yaleh-fbe1c.web.app`, `accounts.google.com`, `apis.google.com`, `www.gstatic.com` y `*.googleapis.com` (si los bloquea, el mensaje es "No hay conexión", no este).
- **Paso manual (lo hace el administrador):** agregar el host que muestra el mensaje (sin `https://` ni puerto) en Firebase → Authentication → Configuración → Dominios autorizados. Si es un canal de vista previa, agregar además `https://<ese host>/__/auth/handler` a los URI de redireccionamiento del cliente OAuth "Web client (auto created by Google Service)", como en el BUG-001.
