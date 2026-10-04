# Mediciones del asistente sin conexión (para la tesis)

Mediciones reales del 3 y 4 de octubre de 2026 en el equipo de desarrollo, con el mismo código que usa la app (`LocalAiService`, recuperación FTS5, instrucciones y `utilityProcess` con node-llama-cpp). Se repiten con `npm run bench:local-ai` (configuración por defecto), `BENCH_GPU=off` (solo CPU) o `BENCH_GPU=auto` (GPU). El detalle de cada corrida, con muestras de las respuestas, está en [mediciones/](mediciones/):

- [ia-local-gpu.md](mediciones/ia-local-gpu.md): configuración actual (GPU, respuestas breves), 04/10/2026.
- [ia-local-gpu-antes.md](mediciones/ia-local-gpu-antes.md): GPU con las respuestas largas anteriores, 03/10/2026.
- [ia-local-cpu.md](mediciones/ia-local-cpu.md): solo CPU con las respuestas largas anteriores, 03/10/2026.

## Condiciones

| | |
| --- | --- |
| Equipo | Intel Core i7-1255U (10 núcleos, 12 hilos, portátil de 15 W), gráfica integrada Intel Iris Xe, 11,7 GB de RAM, Windows 11 Home |
| Modelo | Qwen3.5-4B, GGUF Q4_K_M (2,74 GB), "pensamiento" desactivado |
| Motor | llama.cpp vía node-llama-cpp 3.22.1 en un `utilityProcess` de Electron 42, GPU automática (Vulkan en la Iris Xe) |
| Contexto | 8 192 tokens; al modelo se envían hasta 6 000 caracteres de fragmentos (~1 700 tokens) |
| Fuente de prueba | `docs/BRIEF_YALEH.md` (44 591 caracteres, texto real en español) |
| Memoria del proceso del modelo | ~3,9 GB |

## Resultados actuales (respuestas breves, 04/10/2026)

Chat de unos 150 tokens como máximo (500 si el estudiante pide más detalle), resumen de 4 ideas clave y 5 tarjetas.

| Prueba | Carga del modelo | Hasta el primer texto | Tokens generados | Tokens/s | Tiempo total | Salida válida |
| --- | --- | --- | --- | --- | --- | --- |
| Chat, primera pregunta (incluye cargar el modelo) | 20,0 s | 19,9 s | 79 | 3,8 | 61,0 s | sí |
| Chat, segunda pregunta | — | 20,2 s | 91 | 3,8 | 44,4 s | sí |
| Resumen (título, síntesis y 4 ideas clave) | — | 21,4 s | 270 | 3,3 | 103,2 s | sí |
| Tarjetas de estudio (5 tarjetas) | — | 22,7 s | 420 | 3,5 | 143,5 s | sí |

## Antes y después de acortar las respuestas (GPU)

| Prueba | Antes (03/10) | Después (04/10) | Cambio |
| --- | --- | --- | --- |
| Chat, primera pregunta | 110,9 s (280 tokens) | **61,0 s** (79 tokens) | −45 % |
| Chat, segunda pregunta | 70,3 s (218 tokens) | **44,4 s** (91 tokens) | −37 % |
| Resumen | 98,5 s (312 tokens, 6 ideas) | 103,2 s (270 tokens, 4 ideas) | +5 % |
| Tarjetas | 191,0 s (677 tokens, 8 tarjetas) | **143,5 s** (420 tokens, 5 tarjetas) | −25 % |

- El **chat** bajó a menos de un minuto: generar es lo que más tarda, y la respuesta tiene un tercio de los tokens.
- El **resumen** no mejoró. Generó un 13 % menos de tokens, pero esa corrida fue más lenta (3,3 frente a 3,9 tokens/s; primer texto a los 21 s frente a 18 s). La velocidad varía entre corridas en un portátil de 15 W (temperatura, energía), y el JSON con gramática genera algo más lento que el texto libre.
- Las **tarjetas** bajaron un 25 %, pero siguen por encima de los dos minutos. Cada tarjeta ocupa ~84 tokens, incluida la estructura del JSON.
- Con 5 tarjetas y 4 ideas clave, el aviso "puede tardar hasta un minuto" se cumple en el chat, pero no en el resumen ni en las tarjetas (1,5 a 2,5 minutos en este equipo).

## Comparación CPU frente a GPU (03/10, respuestas largas)

| Medida | Solo CPU | GPU (Vulkan) |
| --- | --- | --- |
| Lectura del contexto (tokens/s) | ~36 | ~100 |
| Generación (tokens/s) | 6,2 | 4,0 |
| Carga del modelo (primer uso) | 5,4 s | 23,8 s |
| Hasta el primer texto | ~55 s | **~18 s** |
| Chat, segunda pregunta (total) | 93,4 s | **70,3 s** |
| Resumen (total) | 111,7 s | **98,5 s** |
| Tarjetas (total) | **165,3 s** | 191,0 s |

**Decisión:** GPU automática (`LOCAL_AI.gpu = 'auto'`). El estudiante empieza a leer la respuesta en ~18–20 s en lugar de ~55 s. Con respuestas breves, generar pesa menos, así que la ventaja de la GPU (leer el contexto rápido) gana más. En un equipo sin GPU compatible, node-llama-cpp usa la CPU. Si el proceso del modelo se cae (por ejemplo, por un driver de video), YALEH vuelve a intentarlo solo con la CPU.

## Ajustes que salieron de las mediciones

1. **Presupuesto de fragmentos: de 12 000 a 6 000 caracteres.** Con 12 000 (solo CPU), el primer texto tardaba ~110 s, porque leer el contexto es lo más lento en este procesador (~36 tokens/s; no mejoró cambiando hilos, tamaño de lote ni flash attention).
2. **Largo máximo en el esquema del resumen y de las tarjetas.** En la primera corrida, el resumen llegó al límite de tokens y el JSON quedó cortado (inválido). Con largos máximos por campo, todas las salidas fueron válidas.
3. **GPU automática** en lugar de solo CPU (ver la comparación).
4. **Respuestas breves** (04/10): chat de ~150 tokens salvo que se pida más detalle, 4 ideas clave y 5 tarjetas.

## Lectura para la tesis

- En un portátil de gama media sin internet, el asistente responde preguntas sobre los documentos en 45 a 60 segundos, mostrando el texto desde los ~20 s. Genera un resumen en ~1,5 minutos y 5 tarjetas en ~2,5 minutos.
- Es mucho más lento que Gemini (que responde en segundos), a cambio de funcionar sin conexión, sin cuota y sin que los documentos salgan del equipo.
- Con documentos largos, el modelo solo lee los fragmentos más relevantes (6 000 caracteres): las respuestas se limitan a esa parte del material.
