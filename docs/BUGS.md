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

- **Estado:** En corrección (falta publicar y probar)
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
