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

- **Estado:** En corrección (falta registrar la URI de redirección en Google Cloud y publicar)
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
