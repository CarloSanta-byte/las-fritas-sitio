# Verificación de la entrega

Comprobaciones realizadas el 10 de septiembre de 2026 sobre los archivos de esta entrega. No se publicaron cambios en Netlify ni Apps Script y no se escribieron pedidos en la hoja real.

## Resultado funcional

- **30 pruebas de backend:** autenticación, catálogo, precios, totales, disponibilidad, cantidades, notas, idempotencia, conflictos, migración original y ambos flujos. Code.gs se ejecutó con una simulación de los servicios de Google.
- **9 pruebas de carrito:** asociación de extras, cantidades por plato, límite atómico de 50 unidades y 60 líneas, notas con referencia, deshacer, recuperación de carrito anterior y conservación exacta de envíos pendientes.
- **10 grupos de pruebas en Chrome:** menú, anchos 320–1440, combo y notas, envío, seguimiento, cocina, respuesta perdida y reintento tras recargar, conflictos, impresión, cierre de sesión, teclado, comparación, mayoría de edad, accesibilidad y PWA sin red.
- **7 grupos avanzados:** recuperación desde el formato anterior con el mismo código; conservación del estado de seguimiento al fallar la red; rechazo de precio con carrito intacto; foco y pausa persistentes; interacciones con CPU ralentizada; cola de 20 pedidos con alertas bajo filtros y botón estable; cocina adaptable y accesible.
- **Texto al 200% en 320 px:** menú y detalle sin desbordamiento horizontal.
- **Archivos estáticos:** comprobación de referencias, sintaxis JavaScript, entradas, 64 productos y recursos de la caché.

Las pruebas de navegador interceptan la dirección de Google y responden mediante la simulación. No hay contacto con la hoja real. Las capturas de cocina contienen exclusivamente pedidos de prueba. El texto con una etiqueta `<img>` en algunas capturas es una prueba de seguridad: aparece como texto y nunca se ejecuta.

## Rendimiento medido

Lighthouse 13.4.1, Chrome sin interfaz, servidor local, configuración móvil predeterminada con ralentización simulada. Informe completo: `pruebas-visuales/lighthouse.html` y versión JSON junto a él.

| Indicador | Resultado de laboratorio |
|---|---:|
| Rendimiento Lighthouse | 100/100 |
| Accesibilidad Lighthouse | 100/100 |
| LCP | 1,66 s |
| CLS | 0 |
| Tiempo total de bloqueo (TBT) | 0 ms |
| Mayor duración de evento observada en el recorrido con CPU 4× más lenta | 56 ms |

La muestra de eventos está en `pruebas-visuales/interacciones.json`. **No equivale al INP de campo.** El INP, los percentiles de visitas reales y los 60 fps sostenidos en el Android del cliente necesitan comprobación en dispositivos y tráfico reales. No se hizo una medición de datos móviles en Villavicencio ni una prueba física de impresora.

El informe conserva recomendaciones de minificación y carga diferida. Se priorizó entregar fuentes legibles y evitar compilación obligatoria. No bloquean los objetivos de Lighthouse medidos. El conjunto público pesa aproximadamente 185 KB sin compresión; la suma estimada de sus recursos del cliente comprimidos individualmente con gzip es aproximadamente 55 KB. Son sumas de archivos, no una medición del tráfico facturado o de cabeceras de una visita. El detalle está en `pruebas-visuales/peso-archivos.json`.

## Accesibilidad

Axe no encontró infracciones de las reglas WCAG 2 A/AA y WCAG 2.1 AA seleccionadas en menú, formulario, acceso y panel de cocina. Los informes JSON están en `pruebas-visuales`. También se probaron Tab, Escape, foco dentro del diálogo, preferencia de movimiento reducido y pausa persistente. Estos resultados no constituyen una certificación integral de accesibilidad ni sustituyen una revisión con lector de pantalla.

## Toques del recorrido sencillo

Conteo de controles y campos; no incluye escritura, desplazamiento ni teclas del teclado. Es un análisis del flujo, no una prueba cronometrada con clientes.

| Pedido de un producto para recoger | Antes | Ahora |
|---|---:|---:|
| Usando antes “Explorar el menú” | 6 | 5 |
| Llegando antes al producto por scroll | 5 | 5 |
| Con contacto recordado voluntariamente en la nueva versión | 5 | 3 |

Ahora: agregar → abrir pedido → nombre → teléfono → enviar. Domicilio añade elegir domicilio y escribir dirección. Personalizar y añadir extras agrega acciones según la elección. El menú ya muestra opciones comprables desde la primera pantalla de 390 × 844; la captura de referencia anterior no mostraba un producto completo.

## Límites que conserva el sistema

- Google Sheets recorre el historial al consultar; este rediseño no elimina las cuotas ni el crecimiento de ese costo.
- Cocina necesita una página operativa y conexión. No hay notificaciones con el navegador cerrado, GPS ni reparto en tiempo real.
- Google valida cada adicional como producto independiente; su asociación a un plato se expresa en notas, no en una relación validada por el servidor.
- Los enlaces públicos permiten ver productos y sus notas, pero no nombre, teléfono, dirección o notas generales.
- Los precios y la disponibilidad siguen requiriendo coordinación entre Catalogo y config.js. Un menú guardado desactualizado puede ser rechazado por Google; nunca se reemplaza el precio sin revisión del cliente.
- El carrito y la recuperación de un envío tras cerrar dependen de que el navegador permita almacenamiento. La interfaz informa cuando no puede guardar.
- Faltan las verificaciones operativas y datos enumerados en PRUEBAS-MANUALES.md y DATOS-PENDIENTES.md.
