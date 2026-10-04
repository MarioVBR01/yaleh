# Mediciones del asistente sin conexión (para la tesis)

Mediciones reales del 3 y 4 de octubre de 2026 en el equipo de desarrollo, con el mismo código que usa la app (`LocalAiService`, recuperación FTS5, instrucciones y `utilityProcess` con node-llama-cpp). Se repiten con `npm run bench:local-ai` (configuración por defecto), `BENCH_GPU=off` (solo CPU) o `BENCH_GPU=auto` (GPU). El detalle de cada corrida, con muestras de las respuestas, está en [mediciones/ia-local-gpu.md](mediciones/ia-local-gpu.md) y [mediciones/ia-local-cpu.md](mediciones/ia-local-cpu.md).

## Condiciones

| | |
| --- | --- |
| Equipo | Intel Core i7-1255U (10 núcleos, 12 hilos, portátil de 15 W), gráfica integrada Intel Iris Xe, 11,7 GB de RAM, Windows 11 Home |
| Modelo | Qwen3.5-4B, GGUF Q4_K_M (2,74 GB), "pensamiento" desactivado |
| Motor | llama.cpp vía node-llama-cpp 3.22.1 en un `utilityProcess` de Electron 42 |
| Contexto | 8 192 tokens; al modelo se envían hasta 6 000 caracteres de fragmentos (~1 700 tokens) |
| Fuente de prueba | `docs/BRIEF_YALEH.md` (44 591 caracteres, texto real en español) |
| Memoria del proceso del modelo | ~3,9 GB |

## Resultados con la configuración elegida (GPU automática: Vulkan en la Iris Xe)

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Salida válida |
| --- | --- | --- | --- | --- | --- | --- |
| Chat, primera pregunta (incluye cargar el modelo) | 23,8 s | 17,9 s | 280 | 4,0 | 110,9 s | sí |
| Chat, segunda pregunta | — | 17,3 s | 218 | 4,1 | 70,3 s | sí |
| Resumen (título, síntesis y 6 puntos clave) | — | 18,3 s | 312 | 3,9 | 98,5 s | sí |
| Tarjetas de estudio (8 tarjetas) | — | 18,3 s | 677 | 3,9 | 191,0 s | sí |

## Comparación CPU frente a GPU

| Medida | Solo CPU | GPU (Vulkan) |
| --- | --- | --- |
| Lectura del contexto (tokens/s) | ~36 | ~100 |
| Generación (tokens/s) | 6,2 | 4,0 |
| Carga del modelo (primer uso) | 5,4 s | 23,8 s |
| Hasta el primer texto | ~55 s | **~18 s** |
| Chat, segunda pregunta (total) | 93,4 s | **70,3 s** |
| Resumen (total) | 111,7 s | **98,5 s** |
| Tarjetas (total) | **165,3 s** | 191,0 s |

**Decisión:** GPU automática (`LOCAL_AI.gpu = 'auto'`). El estudiante empieza a leer la respuesta en ~18 s en lugar de ~55 s, y el chat y el resumen terminan antes; las tarjetas tardan algo más. En un equipo sin GPU compatible, node-llama-cpp usa la CPU. Si el proceso del modelo se cae (por ejemplo, por un driver de video), YALEH vuelve a intentarlo solo con la CPU.

## Ajustes que salieron de las mediciones

1. **Presupuesto de fragmentos: de 12 000 a 6 000 caracteres.** Con 12 000 (solo CPU), el primer texto tardaba ~110 s, porque leer el contexto es lo más lento en este procesador (~36 tokens/s; no mejoró cambiando hilos, tamaño de lote ni flash attention).
2. **Largo máximo en el esquema del resumen y de las tarjetas.** En la primera corrida, el resumen llegó al límite de 900 tokens y el JSON quedó cortado (inválido). Con largos máximos por campo y un límite de 1 200 tokens, las cuatro salidas fueron válidas.
3. **Solo CPU frente a GPU:** ver la comparación.

## Lectura para la tesis

- En un portátil de gama media sin internet, el asistente responde preguntas sobre los documentos en 1 a 2 minutos, mostrando el texto desde los ~18 s, y genera un resumen en ~1,5 minutos y 8 tarjetas en ~3 minutos.
- Es mucho más lento que Gemini (que responde en segundos), a cambio de funcionar sin conexión, sin cuota y sin que los documentos salgan del equipo.
- Con documentos largos, el modelo solo lee los fragmentos más relevantes (6 000 caracteres): las respuestas se limitan a esa parte del material.
