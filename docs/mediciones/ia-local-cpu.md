# Mediciones del asistente sin conexión

Medido con `npm run bench:local-ai` el 3/10/2026, 11:08:32 p. m..

- **Equipo:** 12th Gen Intel(R) Core(TM) i7-1255U, 12 hilos, 11,7 GB de RAM, Windows 11 Home.
- **Modelo:** Qwen3.5-4B (GGUF Q4_K_M, 2,55 GB), llama.cpp vía node-llama-cpp en un utilityProcess de Electron, solo CPU, contexto de 8192 tokens, "pensamiento" desactivado.
- **Fuente:** `docs/BRIEF_YALEH.md` (49.465 caracteres). Al modelo se envían como máximo 6.000 caracteres de fragmentos (FTS5 para el chat; repartidos para resumen y tarjetas).

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Fragmentos enviados | Salida válida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chat (primera pregunta, incluye cargar el modelo) | 5,4 s | 54,6 s | 231 | 6,2 | 97,0 s | 6 (5.986 car.) | sí |
| Chat (segunda pregunta, modelo ya cargado) | — | 55,6 s | 238 | 6,3 | 93,4 s | 6 (5.975 car.) | sí |
| Resumen | — | 58,3 s | 328 | 6,1 | 111,7 s | 6 (5.978 car.) | sí |
| Tarjetas de estudio | — | 57,7 s | 671 | 6,2 | 165,3 s | 6 (5.978 car.) | sí |

"Hasta el primer texto" incluye leer los fragmentos (procesar el contexto); "Tokens/s" es la velocidad de generación después del primer texto. "Tiempo total" va desde el pedido hasta la respuesta completa (incluye la carga del modelo en la primera prueba).

## Muestras de las respuestas

- **Chat (primera pregunta, incluye cargar el modelo):** Basado en los fragmentos proporcionados, aquí tienes la información: * **Qué es YALEH:** * Es una aplicación de escritorio y web que reemplaza a "SRB" y "Safe Research Browser". * Funciona como un **kiosko educativo** que bloquea el equipo del estudiante para limitar el tiempo de uso.
- **Chat (segunda pregunta, modelo ya cargado):** Según los fragmentos de las fuentes del estudiante (específicamente en **BRIEF_YALEH.md, fragmento 1 y 3**), la unión entre la aplicación web y la de escritorio en la versión 1 ocurre de la siguiente manera: * **Vía Archivo de Sesión:** Ambas aplicaciones funcionan de forma independiente y se une
- **Resumen:** Evolución y Arquitectura de YALEH v1 — 6 puntos clave
- **Tarjetas de estudio:** 8 tarjetas; primera: ¿Qué formato de archivo se usa para exportar sesiones de estudio en YALEH v1?
