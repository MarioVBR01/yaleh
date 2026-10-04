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
