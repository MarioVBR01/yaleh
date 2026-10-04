# Mediciones del asistente sin conexión

Medido con `npm run bench:local-ai` el 4/10/2026, 12:03:59 a. m..

- **Equipo:** 12th Gen Intel(R) Core(TM) i7-1255U, 12 hilos, 11,7 GB de RAM, Windows 11 Home.
- **Modelo:** Qwen3.5-4B (GGUF Q4_K_M, 2,55 GB), llama.cpp vía node-llama-cpp en un utilityProcess de Electron, con GPU (Vulkan), contexto de 8192 tokens, "pensamiento" desactivado.
- **Fuente:** `docs/BRIEF_YALEH.md` (49.751 caracteres). Al modelo se envían como máximo 6.000 caracteres de fragmentos (FTS5 para el chat; repartidos para resumen y tarjetas).

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Fragmentos enviados | Salida válida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chat (primera pregunta, incluye cargar el modelo) | 20,0 s | 19,9 s | 79 | 3,8 | 61,0 s | 6 (5.973 car.) | sí |
| Chat (segunda pregunta, modelo ya cargado) | — | 20,2 s | 91 | 3,8 | 44,4 s | 6 (5.967 car.) | sí |
| Resumen | — | 21,4 s | 270 | 3,3 | 103,2 s | 6 (5.982 car.) | sí |
| Tarjetas de estudio | — | 22,7 s | 420 | 3,5 | 143,5 s | 6 (5.982 car.) | sí |

"Hasta el primer texto" incluye leer los fragmentos (procesar el contexto); "Tokens/s" es la velocidad de generación después del primer texto. "Tiempo total" va desde el pedido hasta la respuesta completa (incluye la carga del modelo en la primera prueba).

## Muestras de las respuestas

- **Chat (primera pregunta, incluye cargar el modelo):** YALEH es una **aplicación educativa y de productividad** que bloquea el dispositivo para garantizar concentración en sesiones de estudio estructuradas (como Pomodoro). Está diseñada específicamente para **estudiantes universitarios** que necesitan un entorno controlado sin distracciones digitales. L
- **Chat (segunda pregunta, modelo ya cargado):** Según la **Revisión 1.5** del documento *BRIEF_YALEH.md*, la web y el escritorio funcionan por separado y se unen exclusivamente mediante un **archivo de sesión `.yaleh`**. Este archivo JSON descarga los datos de la web (como la duración y el texto de las fuentes) para iniciar la sesión en el kiosko
- **Resumen:** YALEH v1: Arquitectura y Funcionalidades — 4 puntos clave
- **Tarjetas de estudio:** 5 tarjetas; primera: ¿Cómo se sincronizan la web y el escritorio en la versión 1?
