> Documento histórico del ZIP del 7 de septiembre. Sus instrucciones de cambiar sitio y backend juntos corresponden a aquella versión, no a esta entrega. En Con todo no cambió Code.gs. Consulta primero LEEME.md de esta carpeta.

# Las Fritas · Proyecto actualizado
Versión del 7 de septiembre de 2026. HTML, CSS y JavaScript puro; Google Sheets + Apps Script. No necesita npm, frameworks, compilación ni servicios de pago nuevos.

## Lo primero: actualizar las dos partes
La URL que compartiste ya está en config.js y respondió correctamente a una consulta de un código inexistente. No se crearon pedidos reales durante las pruebas.

**Esta versión necesita publicar el nuevo apps-script/Code.gs y el sitio juntos.** El panel nuevo usa una clave y una operación que el backend anterior no tiene. Cambiar solo el sitio dejaría cocina sin acceso. Cambiar solo Apps Script impediría listar pedidos al panel antiguo.

La carpeta local ya está actualizada. Fuera de ella hay una copia de respaldo: las-fritas-antes-mejoras-20260907.zip. El ZIP original también se conserva. No se publicaron cambios en tu cuenta de Google ni en Netlify.

## 1. Preparar Google sin borrar pedidos
Haz esto en un momento sin pedidos entrando y conserva abiertas las notas de los pedidos activos.

1. Abre tu Google Sheet actual. Haz una copia desde Archivo → Hacer una copia.
2. En Extensiones → Apps Script, conserva una copia del código que tienes publicado.
3. Reemplaza el contenido de Code.gs por el archivo completo apps-script/Code.gs de este proyecto. Incluye el catálogo de productos al final; no copies solo una parte.
4. En Configuración del proyecto (engranaje), busca Propiedades del script. Añade una propiedad llamada STAFF_KEY y como valor una contraseña privada de al menos 12 caracteres. Usa una frase larga y difícil de adivinar. No escribas esa contraseña en config.js, en Netlify ni en archivos que compartas.
5. Guarda. En el selector de funciones del editor, elige prepararSistema y pulsa Ejecutar. Autoriza el acceso de tu propio script a la hoja si Google lo solicita.
6. Verifica que siguen todos los pedidos y aparece la pestaña Catalogo con los productos y precios. La pestaña Pedidos conserva sus diez columnas originales y añade requestId y requestHash al final. No borres ni reordenes sus primeras diez columnas:
   id | timestamp | cliente | telefono | tipo | direccion | items | notas | estado | total
7. Si aparece un error de columnas, detente y compara los encabezados. El script evita escribir pedidos sobre una estructura distinta. No elimines filas para solucionar ese aviso.
8. En Implementar → Gestionar implementaciones, edita la implementación actual con el lápiz, elige Nueva versión y pulsa Implementar. Conserva «Ejecutar como: yo» y acceso de «Cualquier usuario». La clave se comprueba dentro del código para las operaciones de cocina.
9. Al editar la implementación actual mantienes la URL /exec que ya está configurada. Si creas otra implementación con otra URL, copia la nueva dirección en config.js.

Los códigos antiguos de ocho caracteres siguen funcionando. Los pedidos nuevos usan dieciséis caracteres para hacer más difícil adivinarlos. No se borra el historial. No vuelvas a ejecutar prepararSistema para intentar reiniciar precios: si Catalogo ya existe, se conserva.

## 2. Publicar el sitio en Netlify
1. Publica la carpeta que contiene index.html, con sus archivos y la carpeta assets. Arrastra la carpeta a Netlify o actualiza los archivos de tu repositorio como acostumbras. No hay comando de compilación.
2. También deben incluirse mejoras.css, experiencia.js, sw.js, manifest.webmanifest, offline.html y _headers.
3. apps-script, tests, pruebas-visuales y los archivos .md son documentación y pruebas; no hacen falta en el sitio publicado. Pueden conservarse en tu proyecto y el ZIP completo.
4. Abre staff.html, escribe la misma clave STAFF_KEY y verifica que aparecen los pedidos actuales.
5. Haz las dos pruebas de pedido descritas abajo antes de volver a compartir el enlace con clientes.

### Actualizaciones después de instalar la app
Cuando cambies HTML, CSS, JS o el menú, cambia también el texto VERSION al principio de sw.js, por ejemplo el último número de 1 a 2. Esto permite descargar el conjunto nuevo de archivos. La nueva versión se activa al cerrar todas las pestañas y ventanas instaladas de Las Fritas y abrir otra vez. Así un pedido que se está escribiendo no recibe una actualización forzada.

Si necesitas volver atrás, restaura en Netlify los archivos anteriores y selecciona la versión anterior de la implementación de Apps Script. Las columnas nuevas pueden permanecer. Si esta versión ya estaba instalada como app, borra los datos de ese sitio en el navegador del dispositivo para retirar su copia guardada. Hacerlo elimina el carrito local; confirma cualquier envío pendiente primero.

## 3. Uso diario de cocina
- Abre staff.html y entra con la clave. Se recuerda en esa pestaña durante la sesión. Cerrar sesión limpia la información visible y la clave guardada.
- Pulsa Activar sonido al iniciar cada sesión. Escucharás tres tonos de prueba. Sube el volumen del dispositivo.
- Una franja amarilla y el título de la pestaña señalan pedidos recibidos pendientes de revisión, incluso si estabas filtrando otro estado. El sonido se repite cada 15 segundos hasta revisar la alerta o avanzar los pedidos.
- Ver recibidos limpia la búsqueda y muestra la cola. Revisar la alerta no cambia el estado del pedido.
- Los pedidos más antiguos aparecen primero. Una marca lateral roja destaca pedidos activos que llevan más de 20 minutos desde su creación. Es tiempo transcurrido, no una promesa de entrega.
- Usa el botón grande para avanzar. Para recoger se salta «En camino». El selector sigue permitiendo corregir un estado manualmente.
- Si otro operador cambió el pedido al mismo tiempo, se solicita actualizar el panel para evitar pisar su cambio.
- Imprimir ticket abre el diálogo de impresión del navegador. Incluye productos, cantidades, notas, tipo de entrega, contacto y total. El diseño mide 72 mm de ancho: funciona como base para papel de 80 mm; elige en tu impresora su tamaño real y revisa la escala. También puedes guardar PDF o imprimir en A4. No es factura.
- Avisar por WhatsApp abre un mensaje ya escrito para el cliente. Tú decides enviarlo. El sistema no envía mensajes solo.

Deja cocina abierta, el equipo conectado y la pantalla activa. El sonido y la actualización dependen del navegador; una pantalla bloqueada o una app cerrada pueden suspenderlos. Esta versión no tiene notificaciones que despierten un celular cerrado. Si ves «Reactivar sonido», pulsa el botón.

El panel consulta cada ocho segundos cuando las consultas van bien. Si falla, espera progresivamente hasta un minuto y conserva los últimos pedidos visibles. Actualizar permite reintentar manualmente. No toma la ausencia de conexión como ausencia de pedidos.

## 4. Qué significan las cifras
El día va de 00:00 a 23:59 en America/Bogota y se atribuye según la fecha de creación del pedido.

- Pedidos de hoy: cantidad de pedidos creados hoy, en cualquier estado.
- Valor de pedidos de hoy: suma de sus productos.
- Entregados de hoy: cuántos pedidos creados hoy están marcados como entregados.
- Valor entregado de hoy: suma de esos pedidos entregados.

**No equivalen a pagos recibidos, utilidades o cierre de caja.** No hay registro de pagos ni se incluye una tarifa de domicilio. Un pedido creado ayer y entregado hoy no se suma a las cifras de hoy. Los pedidos activos de días anteriores siguen visibles; los entregados de otros días se consultan directamente en Google Sheets.

## 5. Menú y datos del negocio
No modifiqué productos ni precios del menú recibido. Conservé el número de WhatsApp existente: 573232374229. Verifica que sea el del restaurante y que la frase de aniversario siga vigente.

Los precios se validan en la pestaña Catalogo, del lado de Google. El navegador no puede decidir cobrar un precio distinto.

Para cambiar un precio:
1. Edita precio en Catalogo usando un número sin puntos, por ejemplo 26000.
2. Cambia el mismo precio del producto con ese id en config.js.
3. Publica el sitio actualizado y cambia VERSION en sw.js.

Para agregar un producto, añádelo con el mismo id, nombre y precio en Catalogo y config.js. En Catalogo, disponible debe ser TRUE/VERDADERO. Para agotarlo, cambia disponible a FALSE/FALSO; Google rechazará nuevos pedidos con él. Retíralo también de config.js si quieres dejar de mostrarlo. Los pedidos ya recibidos conservan sus precios y notas originales.

Mantener ambos archivos es necesario en esta versión: config.js es el menú público y Catalogo valida lo que se cobra. Una mejora futura sería sincronizar disponibilidad y precios automáticamente desde Sheets.

No inventé dirección, horarios, tarifa de domicilio ni tiempos prometidos. En domicilio se avisa que cobertura y costo deben confirmarse con el local.

## 6. Qué gana el cliente
- Portada nueva, papas ilustradas en CSS, elementos flotantes, órbitas, subrayado animado, marquesina continua, tarjetas al desplazarse, movimientos al pasar el cursor, ondas al pulsar y un punto que viaja al carrito.
- Sorpréndeme abre un plato del menú para que lo revise y personalice. No agrega ni compra automáticamente.
- Pausar animaciones y respeto por reducir movimiento en el dispositivo.
- Carrito recuperable durante 24 horas, conservando las notas de cada línea.
- En un envío sin respuesta se conserva el contenido original, incluidos los datos de contacto, hasta confirmar el resultado. «Reintentar el mismo pedido» recupera el código sin crear otro. Durante ese proceso se bloquea cambiar el contenido.
- Código, enlace copiable y mensaje de WhatsApp preparado después de recibir confirmación de Google.
- Seguimiento automático que conserva el último estado cuando falla la conexión y deja de consultar al entregarse.
- Navegación con teclado, cierre con Escape, foco dentro de los diálogos, etiquetas y avisos para lectores de pantalla, y controles más fáciles de tocar.
- Menú disponible sin conexión después de la primera carga, mediante una app instalable en navegadores compatibles. Para enviar y seguir pedidos siempre se necesita internet. Nunca se envían pedidos automáticamente al reconectar.

En Chrome/Edge/Android puede aparecer Instalar app cuando el navegador lo permita. También puedes usar su menú de instalación. En iPhone, abre el sitio con Safari y usa Compartir → Añadir a pantalla de inicio. Requiere la página publicada por HTTPS. Abrir index.html con doble clic permite explorar el diseño, pero no reproduce correctamente la instalación y todos los permisos del navegador.

## 7. Lista corta de pruebas en el restaurante
1. En computador y celular: busca «quesuda», abre un producto, escribe una nota y añade dos unidades. Añade otra línea con una nota distinta. Comprueba cantidad y total.
2. Recarga: debe volver el carrito. Vacíalo con los botones de quitar.
3. Haz un pedido pequeño para recoger. Guarda el código. En cocina revisa la alerta y avanza Recibido → Preparando → Listo para entregar → Entregado. Comprueba el mismo estado en el teléfono.
4. Repite con domicilio y dirección: ahora debe aparecer En camino antes de Entregado.
5. Imprime un ticket real y revisa que salgan completas las notas y la dirección. Ajusta el papel desde el diálogo de impresión si hace falta.
6. Pulsa WhatsApp: debe abrir el destinatario y texto correctos. El envío final lo haces tú.
7. Desconecta temporalmente el wifi: la página debe mostrar el aviso; cocina conservará datos con aviso de falta de actualización. Al volver, pulsa Actualizar.
8. Instala la app y abre el menú sin internet tras una primera visita. Verifica que no permite enviar.
9. Prueba Tab, Enter y Escape; luego Pausar animaciones.
10. Comprueba la clave incorrecta y Cerrar sesión. No debe quedar accesible la lista de pedidos.

Si aparece un envío pendiente, reintenta desde la misma página. No borres los datos del navegador ni hagas otro pedido idéntico hasta confirmar con el local. El carrito normal guarda productos y notas; los datos de contacto solo se guardan localmente para recuperar un envío pendiente. Si el navegador bloquea el almacenamiento, la recuperación tras cerrar o recargar puede no estar disponible.

## 8. Pruebas realizadas y límites
Pasaron 30 pruebas automatizadas de la lógica de Apps Script usando una hoja simulada: validación, autenticación, migración, precios, cantidades, duplicados, conflictos y ambos flujos.

También pasaron pruebas en Chrome con servidor local y backend simulado: cliente ↔ cocina, notas con caracteres peligrosos, teclado, recuperación del carrito, respuesta perdida/reintento tras recargar, impresión simulada, cierre de sesión, PWA y menú sin conexión. Se revisaron anchos de 320, 390, 768, 1024 y 1440 px sin desbordamiento horizontal; las capturas están en pruebas-visuales. La simulación de red incluye la señal de desconexión, porque Chrome puede conservar navigator.onLine al simular cortes desde sus herramientas.

La dirección real /exec respondió ok=true y cero pedidos al consultar un código inexistente. No se hicieron escrituras reales, pruebas con impresora física, revisión manual en Safari/iPhone ni publicación en tus cuentas. Haz la lista anterior después de publicar la pareja sitio/backend.

Para repetir las pruebas de lógica, una persona con Node instalado puede ejecutar node tests/backend.test.cjs. Las pruebas de navegador están en tests/browser.test.cjs y usan Playwright y Chrome instalados en el entorno de pruebas. Estos programas son herramientas de comprobación: el sitio publicado no los necesita.

## Referencias técnicas consultadas
- Propiedades privadas de Apps Script: https://developers.google.com/apps-script/guides/properties
- Bloqueos para escrituras simultáneas: https://developers.google.com/apps-script/reference/lock/lock-service
- Actualizar una implementación: https://developers.google.com/apps-script/concepts/deployments
- Límites reales de Google: https://developers.google.com/apps-script/guides/services/quotas
- Caché de una app web: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

Las cuotas de Apps Script dependen del servicio, la cuenta y las políticas vigentes. La cifra anterior de «20.000 solicitudes diarias» no era una garantía para este sistema. Un historial muy grande y muchos dispositivos consultando pueden volver lento Google Sheets; consulta AUDITORIA.md para las siguientes mejoras.

