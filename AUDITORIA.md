# Auditoría de Las Fritas
Revisión del 7 de septiembre de 2026. Se revisaron completos index.html, staff.html, style.css, cliente.js, staff.js, config.js, utils.js, apps-script/Code.gs y LEEME.md. Se trabajó sobre la carpeta local; el ZIP original quedó intacto.

## Prioridades y resultado

| Prioridad | Hallazgo original / impacto | Resultado |
|---|---|---|
| Crítica | Sin clave en Apps Script: conocer la URL permitía listar teléfonos, nombres, direcciones y cambiar estados. Ocultar staff.html no protegía la base de datos. | Implementado: listado y cambios requieren STAFF_KEY validada en Google. La clave se envía en el cuerpo de la petición, nunca en la URL ni en config.js. |
| Crítica | El backend aceptaba total, nombre y precio de productos enviados desde el navegador. Era posible alterar un cobro. | Implementado: catálogo privado de validación en Sheets, cálculo de total en Google y rechazo de cantidades/precios inválidos. |
| Alta | Las notas del cliente se insertaban sin escapar en el seguimiento; el identificador de línea con notas se insertaba dentro de un atributo HTML. | Corregido: caracteres tratados como texto, incluido comillas y símbolos. Probado con una nota que intentaba insertar una imagen con código. |
| Alta | Una respuesta perdida podía llevar al cliente a repetir un pedido ya guardado. | Implementado: identificador por envío, firma del contenido, recuperación del mismo pedido y bloqueo de escrituras simultáneas. La nueva garantía requiere el nuevo backend. |
| Alta | Datos comenzando con signo igual podían interpretarse como fórmulas de Sheets. | Corregido: campos de texto se guardan como texto literal. |
| Alta | No había límites fiables ni validación de flujo en Google. | Implementado: teléfono, nombre, dirección, tipos, notas, cantidades 1–50 y máximo 60 líneas; recoger no puede pasar a En camino. |
| Alta | Cocina no emitía un aviso audible ni una alerta persistente; un pedido podía pasar desapercibido bajo un filtro. | Implementado: sonido activable, aviso amarillo, título de pestaña y revisión de recibidos. Incluye recibidos pendientes al entrar. |
| Alta | El panel perdía toda la lista cuando una consulta fallaba. | Corregido: conserva datos y avisa que no están actualizados. Reintentos más espaciados, sin consultas solapadas. |
| Alta | El carrito se perdía al recargar. | Implementado: recuperación de productos y notas por 24 horas. Los envíos pendientes se conservan hasta confirmar. |
| Media | El seguimiento podía aplicar una respuesta antigua después de cambiar de código y seguía consultando pedidos entregados. | Corregido: descarta respuestas fuera de la consulta actual, espera a terminar antes de repetir, pausa consultas ocultas y termina al entregar. |
| Media | Cocina reconstruía toda la lista cada cuatro segundos, reiniciaba animaciones y podía interrumpir un selector abierto. | Corregido: consulta cada ocho segundos, redibuja solo ante cambios y respeta el selector en uso. |
| Media | Dos operadores podían sobrescribir el estado sin saberlo. | Implementado: se comprueba el estado anterior antes de guardar. |
| Media | Tarjetas con rol de botón contenían otros botones; Enter en el contador podía abrir también el detalle. | Corregido: botón de detalle separado y controles de cantidad independientes; foco conservado al cambiar cantidades. |
| Media | Carrito móvil era un div clicable, faltaban nombres en algunos controles y no había manejo de foco o Escape en diálogos. | Corregido: botón real, etiquetas, avisos accesibles, fondo inerte y foco dentro del diálogo. |
| Media | El observador de categorías podía desplazar la página verticalmente para centrar una categoría. | Corregido: solo desplaza el riel horizontal. |
| Media | CSS pedía fuentes de Google mediante @import y dependía de una descarga adicional. | Corregido: fuentes del dispositivo; no hay peticiones a tipografías ni fotografías remotas. |
| Media | El menú usaba iconos; no existían fotos pesadas que comprimir. | Se conserva la ligereza, con una ilustración propia hecha en CSS e iconos locales para la app. |
| Media | No había ticket ni resumen operativo. | Implementado: ticket imprimible y cuatro cifras del día, con definiciones claras. |
| Media | Efectos continuos sin pausa manual. | Implementado: más animaciones, pausa global y respeto por reducir movimiento. |
| Media | No había instalación ni menú sin red. | Implementado: manifiesto, iconos y caché exclusiva del contenido público. |
| Media | No estaba claro si el total incluía domicilio. | Corregido: se etiqueta «Total productos» y se avisa que tarifa y cobertura se confirman con el local. |
| Documentación | API_URL seguía como texto de ejemplo y LEEME describía una conexión por hacer; incluía una garantía de cuotas imprecisa. | URL incorporada, consulta real de solo lectura satisfactoria y guía reemplazada por pasos de migración, límites reales y pruebas. |

## Experiencia y animaciones implementadas
La portada conserva negro, amarillo y fucsia, con jerarquía tipográfica más clara, llamadas a explorar y personalizar, y una ilustración de papas que no necesita descargar una foto.

Incluye entrada progresiva de contenido, papas flotantes, órbita giratoria, estrellas, subrayado que se dibuja, marquesina continua, tarjetas que aparecen al desplazarse, elevación e iconos en movimiento al pasar el cursor, ondas al pulsar botones, una partícula que viaja al carrito, animación del icono del carrito, transición de las hojas y confeti en la confirmación. Los efectos se pausan en segundo plano. Pausar animaciones y la preferencia del sistema reducen el movimiento.

Se preservaron categorías, buscador, productos con notas independientes, cantidades, carrito de escritorio, carrito móvil, tipos de entrega y flujo de seguimiento. No se cambiaron los precios ni se inventaron promociones nuevas.

## Cambios de organización
- utils.js concentra llamadas a Google, tiempos de espera, errores, texto seguro, almacenamiento y lectura de productos de un pedido.
- cliente.js mantiene menú, carrito, envío y seguimiento.
- experiencia.js contiene efectos visuales, diálogos, instalación y aviso de conexión.
- mejoras.css agrupa el nuevo diseño y ajustes, dejando reconocible la hoja original.
- staff.js concentra la operación de cocina.
- Code.gs sigue siendo un solo archivo que se pega en Google; incluye los productos iniciales.
- tests contiene simulaciones y comprobaciones; no participa en el sitio publicado.

La separación visual en mejoras.css facilita revisar y revertir esta entrega. Una limpieza futura podría consolidar las reglas antiguas sustituidas, pero reescribir toda la base a la vez añadiría riesgo innecesario al flujo de pedidos.

## Lo siguiente que más aportaría al negocio

| Orden | Mejora siguiente | Qué falta decidir |
|---|---|---|
| 1 | Sincronizar precios y disponibilidad de Catalogo con el menú público, para actualizar en un solo lugar. | Acordar si todo el menú se mantendrá en Sheets y cómo mostrar agotados; ahora deben coordinarse Catalogo y config.js. |
| 2 | Dirección, horario, indicador de local cerrado y costo de domicilio por zonas. | Necesita los datos reales del negocio y las reglas de cobertura. No se asumieron. |
| 3 | Registrar pagos y cancelaciones, con motivo y responsable, para hacer cierre diario. | Definir medios de pago y quién puede corregir registros. Las cifras actuales no son contabilidad. |
| 4 | Fotografías reales de platos, en WebP y con tamaño adecuado. | Necesita fotos propias y permiso de uso. La ilustración actual no se presenta como fotografía de comida servida. |
| 5 | Historial consultable por fecha y archivo de pedidos antiguos. | Volumen real y tiempo que se quiere conservar; ayudará cuando la hoja crezca. |
| 6 | Acceso individual por empleado e historial de cambios. | Hoy la clave es compartida: no identifica quién cambió cada pedido. |
| 7 | Notificaciones con la app cerrada o mensajes de WhatsApp realmente automáticos. | Requiere evaluar un servicio de notificaciones o la integración empresarial correspondiente, cuentas y condiciones. No se contrató ni habilitó ninguno. |

WhatsApp está integrado con enlaces y mensajes preparados: no se presenta como confirmación automática. El cliente obtiene confirmación en la página únicamente después de que Google responde que el pedido está guardado.

## Límites técnicos que permanecen
- Google Sheets se recorre para localizar pedidos, construir el panel y evitar duplicados. Se reduce la información enviada al panel —activos más entregados creados hoy—, pero el costo de lectura de la hoja todavía crece con el historial.
- La clave compartida protege cocina, pero no es un sistema de usuarios, sesiones revocables por dispositivo ni una barrera contra tráfico abusivo a la URL pública. El endpoint de crear debe ser público para clientes. No se añadió CAPTCHA ni control de abuso distribuido.
- Un enlace de seguimiento permite ver productos, notas por producto, estado y total a quien lo tenga. No revela nombre, teléfono ni dirección. Debe compartirse solo con quien corresponda.
- Los códigos antiguos de ocho caracteres se conservan por compatibilidad; los nuevos son más largos.
- Los reintentos de esta versión se reconocen usando requestId. Clientes con archivos anteriores no generan ese identificador; conviene cerrar sus pestañas y abrir la nueva versión tras publicar.
- Marcar Entregado no confirma un pago. El cálculo del día se basa en creación y estado actual, no en la hora exacta de cobro o entrega.
- Cocina necesita la página abierta y una conexión activa. Las alarmas no son notificaciones del sistema.
- El navegador puede impedir guardar datos localmente; la recuperación tras recargar depende de ese almacenamiento.
- No se hizo una certificación completa de accesibilidad. Se verificaron teclado, diálogos, etiquetas, reducción de movimiento y tamaños de pantalla.
- No hay pasarela de pago, GPS, factura fiscal, horario automático ni tarifa automática de domicilio.

## Evidencia de la entrega
- 30 pruebas de backend simulando los servicios de Google: todas pasaron.
- Pruebas de navegador en Chrome con la lógica real del proyecto y la hoja simulada: ambos flujos completos, recuperación, inyección, errores de red, impresión, alarmas, logout y PWA.
- Cinco anchos probados: 320, 390, 768, 1024 y 1440 píxeles.
- Capturas revisadas: cliente-escritorio.png, cliente-movil.png, cocina.png y ticket.png en pruebas-visuales.
- La URL real /exec respondió correctamente a una consulta de un código inexistente. No se escribieron pedidos de prueba en la hoja real.
- La publicación real de Apps Script/Netlify y la prueba con impresora/celulares del local quedan para la instalación descrita en LEEME.md.

La referencia de cuotas se corrigió consultando la documentación oficial de Google: https://developers.google.com/apps-script/guides/services/quotas. La caché pública sigue el ciclo de instalación/activación descrito por MDN: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers.
