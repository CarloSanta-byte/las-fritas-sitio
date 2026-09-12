# Verificación de Las Fritas v2

Comprobación final: 12 de septiembre de 2026. Todo lo indicado aquí se ejecutó sobre archivos locales y una simulación de Sheets. No se hicieron pedidos reales, no se migró la hoja del negocio ni se publicó esta Fase 2 en producción.

## Resultados

| Comprobación | Resultado |
|---|---|
| Backend y validaciones originales | 30 pruebas correctas |
| Carrito y compatibilidad de envíos | 9 pruebas correctas |
| Migración, marcas, correcciones, medición y paginación | 20 pruebas correctas |
| Navegador: compra, cocina, red, seguridad y PWA | 10 grupos correctos |
| Pruebas avanzadas: foco, datos persistentes, 20 pedidos y accesibilidad | 7 grupos correctos |
| Vistas nuevas: columnas, análisis, CSV y mostrador | 4 grupos correctos |
| Tamaños | 320, 360, 390, 430, 768, 1024 y 1440 px sin desborde de página |
| Texto ampliado | 200% a 320 px, menú y detalle sin desborde |
| Lighthouse móvil simulado | Rendimiento 100; accesibilidad 100 |
| LCP de laboratorio | 1.720 ms |
| CLS | 0 |
| TBT | 6 ms |
| Interacciones con efectos completos y CPU 4x | Máximo observado 176 ms; 28 muestras de eventos |
| Intervalo entre cuadros, percentil 95 en esa prueba | 16,8 ms |
| Código nuevo de movimiento | JS 12.971 bytes; gzip 3.722 bytes |
| CSS de movimiento | 3.733 bytes; gzip 1.230 bytes |
| Librerías nuevas de producción | Ninguna |

El total comprimido estimado del módulo y CSS de movimiento es 4.952 bytes, por debajo del presupuesto de 15 KB. Es una estimación gzip por archivo, no una medición del tráfico real de Netlify.

El ensayo de interacción usa Chrome headless y ralentización de CPU 4x, con los efectos completos activados. El máximo observado de eventos no es INP de campo. El intervalo entre cuadros tampoco certifica 60 fps en Android real. Lighthouse simula un escenario móvil; sus puntuaciones no son una garantía para todos los teléfonos y redes.

Durante las pruebas se detectó y corrigió que Deshacer podía quedar detrás de un diálogo modal. El aviso interactivo se coloca ahora dentro del diálogo abierto. También se difirió la construcción de los selectores de adicionales hasta abrir esa sección, reduciendo trabajo al abrir un producto.

## Alcance de los nuevos tests

- Migración repetida de 10/12 columnas, conservación de filas y columnas adicionales, rechazo de cabeceras duplicadas y lecturas sin escrituras.
- tsRecibido idéntico a timestamp, canal fijado por el servidor, mostrador autenticado y reintentos entre canales protegidos.
- Primeras marcas preservadas, correcciones con motivo, saltos sin horas inventadas, histórico sin tsRecibido reconstruido y conflicto al cambiar causa.
- doGet público con exactamente id, timestamp, tipo, items, estado y total.
- Cero frente a ausencia, mediana par, P90 por rango próximo, negativos/secuencias inválidas y pedidos que atraviesan medianoche.
- Pendientes fuera de denominadores de entregados, correcciones separadas, muestras comunes de barras apiladas, Pareto, grupos de producto y CSV sin contacto.
- WIP reconstruido con intervalos y reaperturas.
- Cola de 20 pedidos y avance en columnas; análisis con tablas accesibles; filtros y exportación.
- Mostrador con producto y adicional: pérdida de respuesta, recarga y reintento con el mismo requestId, una única fila.
- Pausa persistente, preferencia del sistema, propuesta aleatoria sin compra y ausencia de errores JavaScript en los recorridos probados.

## Escala simulada

| Filas | Peticiones de hasta 500 | Lectura simulada | Cálculo local |
|---|---:|---:|---:|
| 1.000 | 2 | 12 ms | 27 ms |
| 10.000 | 20 | 87 ms | 194 ms |
| 50.000 | 100 | 474 ms | 924 ms |

Estas cifras provienen de memoria local, SIN llamadas a Google. Demuestran que la paginación reúne la muestra y el cálculo devuelve resultados consistentes en ese ensayo. No miden latencia, concurrencia real, cuotas ni capacidad de producción. En el navegador, el cálculo usa un Worker cuando está disponible. Una consulta de 50.000 filas exige 100 peticiones y puede tardar considerablemente en Google.

## Evidencia incluida

- `pruebas-visuales/resumen-v2.json`: resumen de resultados.
- `pruebas-visuales/lighthouse.html` y `.json`: auditoría móvil.
- `pruebas-visuales/movimiento.json`: muestra de interacción y cuadros.
- `pruebas-visuales/escala.json`: ensayo de volumen.
- `pruebas-visuales/v2-tablero.png`, `v2-analisis.png`, `v2-mostrador.png`, `v2-cliente.png`: capturas de las vistas nuevas.
- `pruebas-visuales/ejemplo-simulado.csv`: exportación de pedidos ficticios, NO usar como resultados del proyecto académico.
- Informes y capturas de los recorridos anteriores, regenerados durante esta entrega.

## Pendiente en el restaurante

Ensayo en copia real de Google, migración real, publicación de Apps Script, revisión de la impresora de 72 mm, Android/iPhone con red móvil, pulsaciones a tiempos físicos conocidos, latencia/volumen de la hoja y posterior recopilación de datos del negocio. El PDF sirve como línea base documental; los pedidos ficticios de pruebas no demuestran una mejora operativa. Para satisfacción se requiere una encuesta independiente.
