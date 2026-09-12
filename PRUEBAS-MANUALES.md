# Pruebas manuales antes de confiar en las cifras

Realizar primero con copia de Sheets y URL de ensayo. El menú de una vista previa con la URL real crea pedidos reales. Registrar quién comprueba, fecha, dispositivo, versión del script, VERSION del service worker y resultado.

## Migración

- Guardar copia de hoja/script y despliegue de Netlify. Anotar filas y comprobar códigos antiguos.
- Ejecutar prepararSistema dos veces: mismas filas, catálogo sin cambio, 12 columnas iniciales intactas y ninguna cabecera duplicada.
- Revisar pedidos antiguos: marcas nuevas vacías, sin ceros inventados ni canal inferido.
- Consultar un código público: solo los campos permitidos, sin nombre, teléfono, dirección, marcas internas ni historial.
- Confirmar que actualizar la implementación web conserva la URL /exec y que cocina detecta medición disponible.

## Operación

- Crear un pedido web y otro de mostrador con los mismos productos. Comprobar canal y total oficial.
- Introducir una cantidad 51, 61 líneas, nota larga y precio manipulado en el entorno de ensayo: deben rechazarse sin fila nueva.
- Recorrer estados de un local: jamás En camino. Recorrer un domicilio con En camino.
- Comparar con un reloj: pulsar cada paso en el momento real y comprobar su marca en Sheets.
- Corregir hacia atrás con motivo y avanzar otra vez: primera marca intacta, último cambio actualizado e historial completo.
- Saltar una etapa usando corrección: la marca intermedia continúa vacía y el análisis separa la corrección.
- Abrir dos pantallas y actuar sobre el mismo pedido: la segunda recibe conflicto, sin sobrescribir la acción de la primera.
- Con 2 y con 20 pedidos comprobar lista, columnas, letra grande, botones, foco y que los controles no se mueven durante una pulsación.
- Recibir otro pedido estando en Análisis o Mostrador: alarma y aviso siguen visibles. Ver recibidos debe conducir a la operación.
- Poner un pedido cerca de la meta en la copia: comprobar ámbar, rojo preventivo, meta superada y selección de causa.
- Desconectar internet: se conserva la última cola. Los cambios inciertos obligan a consultar, no a avanzar a ciegas.
- Simular respuesta perdida después de crear un pedido de mostrador: recargar/reintentar recupera el mismo código sin duplicar. No se guarda el token dentro del borrador.
- Dejar un pedido activo de ayer: sigue en la cola; no se cierra al cambiar de fecha.
- Imprimir en la impresora real de 72 mm, con notas largas y adicionales. Revisar papel/escala y legibilidad.
- Preparar aviso por WhatsApp; solo enviar si corresponde a una prueba acordada.

## Análisis

- Crear un recorrido conocido de 2 / 15 / 1 / 2 minutos en la copia. Debe sumar 20.
- Combinar marcas vacías, cero real y duraciones largas: comprobar denominadores, media, mediana y P90.
- Comprobar una secuencia de fechas incoherentes: queda advertida y excluida.
- Con menos de 5 casos por etapa: “muestra pequeña”. Con ninguno: “Sin datos”.
- Pedidos locales: entrega a domicilio no aplicable. El retiro puede incluir espera del cliente.
- Filtrar hoy, 7, 30 días y rango; probar cambio de mes y medianoche de Bogotá.
- Verificar throughput por fecha/hora de entrega y tiempos por fecha/hora de creación.
- Pedidos corregidos separados por defecto. Incluirlos voluntariamente y comprobar que la comparación cambia con advertencia.
- Pareto sin causas: no inventa gráfico; registra una causa conocida y comprueba conteo/acumulado.
- Comparar web/mostrador y Para compartir/Resto con muestras reales equivalentes.
- Actualizar mientras se añaden pedidos: confirmar la fecha de extracción y repetir al finalizar la operación para obtener una foto estable.
- Exportar CSV y abrir en Excel: campos alineados, acentos, vacíos preservados, minutos reproducibles, sin datos de contacto.
- Cronometrar una consulta real de 30 días en Google: registrar filas, peticiones, duración y posibles errores de cuota. La simulación local no sustituye esta prueba.

## Cliente móvil

- Probar 320, 360, 390, 430, 768, 1024 y 1440 px; revisar texto al 200%, sin desborde horizontal de la página.
- Android real con datos móviles: menú, búsqueda, añadir, personalizar, quitar/deshacer, teclado abierto y envío.
- iPhone: zona segura, barra del navegador y botones de hojas visibles con teclado.
- Deslizar categorías, cerrar la hoja desde su cabecera y quitar una línea del carrito con Deshacer. Todos deben tener alternativa por botón y teclado.
- Pausar animaciones, recargar y comprobar que no hay movimiento. Activar reducción del sistema: el botón no puede anularla.
- Cambiar efectos moderados/completos y vibración opcional. La compra debe funcionar aunque falle motion.js.
- Sorpréndeme abre una propuesta para revisar; cantidad y total no cambian solos.
- Seguimiento solo avanza con la respuesta de Google. Sin red conserva el último estado, sin inventar progreso ni tiempo restante.
- Enviar y perder conexión: recuperar el mismo requestId. Volver a estar online nunca envía automáticamente.
- PWA: nueva VERSION espera el cierre de pestañas; no interrumpe carritos ni cachea cocina/respuestas de Google.

## Cierre del ensayo

Guardar resultados y corregir fallos antes de tomar los datos como evidencia académica. No marcar las casillas de dispositivo, impresora, latencia de Google o medición física basándose únicamente en los tests automáticos.
