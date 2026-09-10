# Las Fritas · Con todo

Entrega del 10 de septiembre de 2026. Menú, personalización, carrito, seguimiento y cocina rediseñados. El sitio funciona con HTML, CSS y JavaScript, sin compilación ni servicios nuevos.

## Qué publicar

La carpeta **public** contiene el sitio completo. `index.html` es el menú y `staff.html` es cocina. También deben publicarse todos sus archivos JS, CSS, ilustraciones, iconos, `_headers`, `sw.js`, manifiesto y página sin conexión.

El catálogo de `public/config.js` y `apps-script/Code.gs` se conservaron idénticos a los del ZIP recibido. No cambió ningún producto, precio, nombre, descripción o identificador. La dirección /exec sigue configurada. **No necesitas reemplazar el backend si producción ya usa el Code.gs del ZIP original.** No ejecutamos operaciones sobre tu hoja real.

## Publicar en Netlify con Git

1. Guarda una copia del proyecto y apunta cuál es el despliegue actual de Netlify para poder restaurarlo.
2. Añade el contenido de esta carpeta al repositorio del sitio. `public`, `netlify.toml`, documentación y pruebas pueden estar en Git. No subas `node_modules` ni `.test-runtime`; `.gitignore` ya los excluye.
3. Conserva `netlify.toml` en la raíz. Configura **public** como directorio base, **.** como directorio de publicación relativo a esa base, y deja vacío el comando de compilación. El archivo ya fija estos valores. De este modo Netlify publica el sitio sin instalar las herramientas de prueba de la carpeta superior. [Referencia oficial de configuración](https://docs.netlify.com/build/configure-builds/overview/).
4. Publica primero una vista previa desde una rama. Revisa el menú y el panel. Esa vista usa la URL real de Google de `config.js`: cualquier pedido que envíes manualmente desde ella será real. Las pruebas automáticas incluidas sí usan una simulación aislada.
5. Publica la rama de producción en un momento tranquilo. Cierra y abre de nuevo las pestañas de cocina. Entra con la misma clave privada de siempre y verifica que siguen los pedidos activos.
6. Completa las pruebas del restaurante de `PRUEBAS-MANUALES.md`, incluida una impresión real.

También puedes arrastrar **solo public** a Netlify. El ZIP `las-fritas-con-todo-netlify.zip`, cuando se entrega junto al proyecto, contiene directamente esos archivos y puede usarse para publicación manual.

## Conservar pedidos y carritos al cambiar de versión

No se modifica ninguna fila ni columna de Google Sheets. Los pedidos anteriores y sus enlaces continúan funcionando. La nueva cocina también puede gestionar pedidos creados desde la versión anterior.

El navegador recupera el carrito anterior de 24 horas. Un envío sin respuesta se reconoce con la misma clave local que antes: `lasfritas_envio_pendiente`. Se conserva su contenido exacto y su identificador de envío, incluso los nombres accesorios enviados por la versión anterior. **No se reconstruye con los precios actuales al reintentarlo.** Google reconoce ese envío y devuelve el código original si ya lo había guardado.

Un cliente con envío pendiente debe pulsar **Reintentar el mismo pedido**. No borres los datos del navegador ni le pidas que haga otro pedido idéntico para resolverlo.

La PWA prepara la nueva versión y espera a que se cierren las pestañas anteriores. No fuerza una recarga mientras alguien está pidiendo. Si una persona ve la versión anterior, debe resolver primero cualquier envío pendiente, cerrar todas las ventanas de Las Fritas y abrir el sitio otra vez. No es necesario borrar sus datos.

Si la hoja de producción todavía usa un backend anterior al del ZIP del 7 de septiembre, compara antes sus funciones y columnas. Conserva una copia de la hoja y del script; sigue la guía original de preparación incluida en `REFERENCIA-BACKEND.md`. El rediseño no exige esa migración por sí mismo.

## Si necesitas volver atrás

Restaura el despliegue anterior en Netlify. El backend no requiere reversión. Los pedidos ya guardados siguen en Sheets y las referencias de adicionales son texto que también entiende el panel anterior.

No borres almacenamiento local para forzar el cambio: podría contener un envío pendiente. El carrito nuevo usa bloques que la versión anterior no sabe reconstruir; antes de volver atrás, deja terminar los pedidos en curso y conserva las pestañas que aún los tengan. La recuperación de un envío ya pendiente sí usa el formato compatible. Para que una PWA ya instalada reciba inmediatamente el código de una reversión, prepara el despliegue anterior con un identificador de caché nuevo en su `sw.js`, y cierra y abre las ventanas una vez resueltos los envíos pendientes.

## Uso del cliente

El menú empieza con Salchi Papas. El buscador está visible. **Todas** abre el índice completo. El signo **+** añade el plato sin extras; pulsar su nombre permite leer la descripción completa y personalizarlo. Puedes comparar hasta tres salchipapas. “Sorpréndeme” propone un plato para revisar; nunca agrega automáticamente, y excluye el combo suelto, bebidas y licor.

Las ilustraciones son interpretaciones gráficas de las familias e ingredientes documentados, no fotografías ni una representación de porciones. Los textos de comparación se derivan del menú; no son declaraciones de alérgenos.

En una burger puedes elegir combo, papa y bebida. Los demás adicionales están en el detalle del plato. Ninguno viene seleccionado. Para productos con distintas indicaciones, crea bloques separados.

El formulario muestra dirección solo para domicilio. El total corresponde a productos; cobertura y tarifa se confirman con el local. No hay pago electrónico ni promesas de tiempos. El Granizado con Licor requiere confirmación de mayoría de edad en la interfaz; esto no sustituye la verificación del restaurante.

El contacto puede recordarse voluntariamente por 30 días en ese dispositivo. El botón **Borrar mis datos recordados** lo elimina. El carrito dura 24 horas; un envío incierto conserva sus datos hasta resolverlo. No se envía nada automáticamente al reconectar.

## Cómo llegan los adicionales a cocina

Cada bloque tiene una referencia, por ejemplo `[Plato 1] Sin cebolla`. Sus adicionales llegan como líneas independientes con notas como `Para Plato 1 · Burger Clásica`. El combo incluye también la papa y la bebida elegidas.

Los precios continúan validándose por cada identificador de Catalogo. No hay nuevos campos del servidor ni precios escondidos en notas. Google no valida el vínculo entre plato y adicional: es una convención de presentación legible para cocina y para el ticket.

La cantidad de extras se expresa **por plato**. Dos platos con dos adicionales de queso cada uno envían cuatro unidades de queso. La interfaz valida el conjunto antes de incorporarlo: hasta 50 unidades por línea y 60 líneas en total. No guarda medio conjunto si excede un límite. La referencia automática consume parte de los 200 caracteres de nota; el contador muestra el espacio restante.

Quitar un bloque retira también sus extras; Deshacer permite recuperarlo. Los adicionales también continúan disponibles como productos sueltos del catálogo.

## Uso de cocina

1. Abre `staff.html` e introduce la clave del local. La clave no está en los archivos, enlaces ni URL. Se conserva en la sesión de esa pestaña.
2. Pulsa **Activar sonido**, comprueba los tonos y deja el equipo conectado con pantalla activa. Sonido y actualización dependen de que el navegador esté operativo; no son notificaciones con la app cerrada.
3. Los recibidos sin revisar activan la franja amarilla, el título de pestaña y tonos cada 15 segundos si el sonido está activo. **Ver recibidos** reconoce la alerta y muestra la cola; no cambia el estado.
4. Selecciona un pedido. Revisa cantidades, notas por plato y notas generales. Los más antiguos aparecen primero. A partir de 20 minutos desde la creación se destaca el tiempo: es atención operativa, no retraso frente a una promesa.
5. Usa el botón principal para avanzar. Recoger: Recibido → Preparando → Listo para entregar → Entregado. Domicilio añade En camino antes de Entregado.
6. El estado cambia tras la confirmación de Google. Si otro operador actuó, se consulta de nuevo; no se sobrescribe silenciosamente. Si se pierde la respuesta, se verifica el estado antes de habilitar otra transición.
7. **Corregir estado** permite rectificar manualmente dentro de los estados del tipo de entrega. Revisa el pedido y el estado destino antes de confirmar.
8. **Imprimir ticket** abre el diálogo del navegador. La base de impresión es de 72 mm de ancho. Ajusta el tamaño de papel real y la escala. El ticket no es una factura fiscal.
9. **Avisar por WhatsApp** prepara el mensaje. La persona decide enviarlo.
10. Al cerrar sesión se retiran clave y datos visibles, incluido el contenido de impresión.

Las cifras del día están separadas de la operación. Se calculan por fecha de creación en Colombia, igual que antes. Valor entregado no significa pago recibido. Los activos de días anteriores se conservan en la cola.

## Editar y mantener

- `public/config.js`: catálogo y URL de Google. Cambiar precios exige coordinar Catalogo y este archivo. No cambies identificadores existentes.
- `public/js/presentation.js`: diferencias de ingredientes e ilustración de cada familia. No contiene precios alternativos.
- `public/js/cart.js`: bloques, extras, límites, almacenamiento y recuperación.
- `public/js/cliente.js`: menú, detalle, formulario y seguimiento.
- `public/js/cocina.js`: cola, acceso, alarmas y estados.
- `public/js/shared.js`: red, texto seguro, diálogos y preferencias de movimiento.
- `public/css`: diseño del cliente, cocina y ticket, con colores comunes en `tokens.css`.
- `public/assets/illustrations`: SVG ligeros. Las fotos reales futuras pueden añadirse bajo `assets/photos`, manteniendo proporciones reservadas y textos alternativos.

Al cambiar recursos públicos, actualiza VERSION al principio de `sw.js`. Si agregas un recurso necesario sin conexión, inclúyelo en FILES. No incluyas cocina, respuestas de pedidos o direcciones del backend. No añadas activación forzada del service worker.

El CSS respeta reducción de movimiento y pausa manual. Las animaciones usan solo transformaciones y opacidad, con respuestas cortas; no se necesitan librerías. Menú y carrito usan la lógica principal independientemente de que el navegador admita animaciones.

## Datos que falta confirmar

Todos figuran como [DATO PENDIENTE] en `DATOS-PENDIENTES.md`. No se añadió dirección, horario, costo de reparto, tiempo prometido, promociones nuevas, reseñas ni fotos ficticias. Las frases de aniversario y “Nuevo” se conservan en el catálogo original, pero no se presentan como campañas actuales en el nuevo menú.

## Pruebas y límites

Lee `VERIFICACION.md` para resultados, condiciones y límites. La entrega incluye pruebas con una hoja simulada y capturas. No reemplazan revisar el teléfono, la impresora y el flujo real del restaurante.

Para repetirlas, instala Node.js 22.19 o posterior y pnpm. Desde esta carpeta ejecuta `pnpm install --frozen-lockfile` y `pnpm test`. Las pruebas de navegador esperan Chrome en su ruta habitual de Windows; puedes indicar otra ruta con `CHROME_PATH`. `pnpm start` abre el servidor local en `http://127.0.0.1:4173`; con él en marcha, `pnpm test:performance` genera el informe Lighthouse. Las dependencias son exclusivamente herramientas locales de prueba: no se publican con el sitio.
