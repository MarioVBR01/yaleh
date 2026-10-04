# Mediciones del asistente sin conexión

Medido con `npm run bench:local-ai` el 3/10/2026, 11:16:24 p. m..

- **Equipo:** 12th Gen Intel(R) Core(TM) i7-1255U, 12 hilos, 11,7 GB de RAM, Windows 11 Home.
- **Modelo:** Qwen3.5-4B (GGUF Q4_K_M, 2,55 GB), llama.cpp vía node-llama-cpp en un utilityProcess de Electron, con GPU (Vulkan), contexto de 8192 tokens, "pensamiento" desactivado.
- **Fuente:** `docs/BRIEF_YALEH.md` (49.465 caracteres). Al modelo se envían como máximo 6.000 caracteres de fragmentos (FTS5 para el chat; repartidos para resumen y tarjetas).

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Fragmentos enviados | Salida válida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chat (primera pregunta, incluye cargar el modelo) | 23,8 s | 17,9 s | 280 | 4 | 110,9 s | 6 (5.986 car.) | sí |
| Chat (segunda pregunta, modelo ya cargado) | — | 17,3 s | 218 | 4,1 | 70,3 s | 6 (5.975 car.) | sí |
| Resumen | — | 18,3 s | 312 | 3,9 | 98,5 s | 6 (5.978 car.) | sí |
| Tarjetas de estudio | — | 18,3 s | 677 | 3,9 | 191,0 s | 6 (5.978 car.) | sí |

"Hasta el primer texto" incluye leer los fragmentos (procesar el contexto); "Tokens/s" es la velocidad de generación después del primer texto. "Tiempo total" va desde el pedido hasta la respuesta completa (incluye la carga del modelo en la primera prueba).

## Muestras de las respuestas

- **Chat (primera pregunta, incluye cargar el modelo):** Basado en los fragmentos proporcionados, aquí tienes la información: * **¿Qué es YALEH?** * Es un **kiosco de estudio** (escritorio) diseñado para bloquear el equipo y facilitar la concentración. * Utiliza una arquitectura en dos capas: un **proceso principal bloqueante** (Electron) y
- **Chat (segunda pregunta, modelo ya cargado):** Según los fragmentos de **BRIEF_YALEH.md**, la aplicación web y la de escritorio se unen de la siguiente manera: * **Vía archivo de sesión:** Ambas aplicaciones funcionan de forma independiente hasta que se genera un archivo de sesión llamado `.yaleh` (formato JSON). * **Contenido del archivo:*
- **Resumen:** Evolución y Arquitectura Técnica de YALEH v1 — 6 puntos clave
- **Tarjetas de estudio:** 8 tarjetas; primera: ¿Qué formato de archivo se usa para guardar las sesiones en la versión 1?
