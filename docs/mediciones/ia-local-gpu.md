# Mediciones del asistente sin conexión

Medido con `npm run bench:local-ai` el 15/10/2026, 12:40:50 a. m..

- **Equipo:** 12th Gen Intel(R) Core(TM) i7-1255U, 12 hilos, 11,7 GB de RAM, Windows 11 Home.
- **Modelo:** Qwen3.5-4B (GGUF Q4_K_M, 2,55 GB), llama.cpp vía node-llama-cpp en un utilityProcess de Electron, con GPU (Vulkan), contexto de 8192 tokens, "pensamiento" desactivado.
- **Fuente:** `docs/BRIEF_YALEH.md` (51.713 caracteres). Al modelo se envían como máximo 6.000 caracteres de fragmentos (FTS5 para el chat; repartidos para resumen y tarjetas).

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Fragmentos enviados | Salida válida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chat (primera pregunta, incluye cargar el modelo) | 39,9 s | 18,7 s | 103 | 3,9 | 84,6 s | 6 (5.982 car.) | sí |
| Chat (segunda pregunta, modelo ya cargado) | — | 17,8 s | 116 | 4 | 47,1 s | 6 (5.993 car.) | sí |
| Resumen | — | 18,3 s | 220 | 3,2 | 86,9 s | 6 (5.968 car.) | sí |
| Tarjetas de estudio | — | 20,6 s | 468 | 3,2 | 165,3 s | 6 (5.968 car.) | sí |
| Cuestionario (5 preguntas) | — | 22,6 s | 618 | 3,4 | 205,5 s | 6 (5.968 car.) | sí |
| Informe corto | — | 19,4 s | 314 | 3,2 | 116,8 s | 6 (5.968 car.) | sí |
| Mapa mental | — | 19,4 s | 129 | 3,1 | 61,1 s | 6 (5.968 car.) | sí |
| Tabla de datos | — | 18,6 s | 198 | 3,2 | 80,5 s | 6 (5.968 car.) | sí |
| Infografía | — | 19,7 s | 275 | 3,4 | 100,4 s | 6 (5.968 car.) | sí |

"Hasta el primer texto" incluye leer los fragmentos (procesar el contexto); "Tokens/s" es la velocidad de generación después del primer texto. "Tiempo total" va desde el pedido hasta la respuesta completa (incluye la carga del modelo en la primera prueba).

## Muestras de las respuestas

- **Chat (primera pregunta, incluye cargar el modelo):** YALEH es una **aplicación de kiosco** diseñada principalmente para **estudiantes del TECBA** en Bolivia que necesitan un entorno de estudio seguro y controlado. Su objetivo es **bloquear el equipo** durante sesiones de estudio, permitiendo acceso solo a herramientas específicas (como IA, notas y ed
- **Chat (segunda pregunta, modelo ya cargado):** La aplicación web y de escritorio funcionan como sistemas **independientes** que se unen exclusivamente mediante un **archivo de sesión `.yaleh`**. Este archivo JSON contiene la duración y el texto de las fuentes, y vale 24 horas para una sola sesión. El escritorio detecta la conexión a internet par
- **Resumen:** Evolución y funcionamiento de YALEH v1 — 4 puntos clave
- **Tarjetas de estudio:** 5 tarjetas; primera: ¿Qué formato de archivo usa YALEH para sesiones y cómo se bloquea el equipo?
- **Cuestionario (5 preguntas):** 5 preguntas; primera: ¿Qué formato de archivo se usa para sincronizar sesiones entre la web y el escritorio?
- **Informe corto:** 228 palabras: # Informe de Análisis del Proyecto YALEH v1 El proyecto **YALEH**, desarrollado por Mario Víctor Brañez Rodriguez para el TECBA, es una aplicación de estudio diseñada para funcionar tanto en navegado
- **Mapa mental:** YALEH v1 (Modo Offline) — 3 ramas
- **Tabla de datos:** Datos Clave de YALEH v1 — 3 columnas × 5 filas
- **Infografía:** YALEH v1: Diseño y Restricciones — 3 datos, 3 puntos
