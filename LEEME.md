# Las Fritas v2 · Pedidos y medición de procesos

Entrega de Fase 2, 12 de septiembre de 2026. El backend de medición identifica su contrato como versión 4 para distinguirlo del backend histórico que ya se llamaba v2. Sitio estático, sin servicios nuevos de pago ni dependencias de producción.

## Qué contiene

- `public/index.html`: menú, personalización, carrito, animación y seguimiento.
- `public/staff.html`: operación en lista o columnas, registro de mostrador y análisis del proceso.
- `apps-script/Code.gs`: archivo COMPLETO para el proyecto de Google vinculado a la hoja.
- `OPERACION-COCINA.md`: instrucciones breves para el equipo.
- `PRUEBAS-MANUALES.md`: comprobaciones del restaurante.
- `ANIMACIONES.md`: inventario, duración, propósito y comportamiento reducido.
- `VERIFICACION.md`: resultados y límites de las pruebas.

Esta entrega contiene código y pruebas locales. No ejecuta la migración sobre la hoja real ni publica automáticamente este nuevo backend. La instalación se hace en el orden siguiente. No publiques solo los archivos HTML dejando fuera sus JS y CSS.

## Migración exacta sin perder pedidos

1. Escoge un momento tranquilo y deja terminar los envíos que estén pendientes de confirmación. No borres carritos ni datos del navegador.
2. En la hoja real de Google, usa Archivo > Hacer una copia. Identifica la copia con fecha y hora. Anota el número de filas de Pedidos y conserva varios códigos de pedidos antiguos como muestra.
3. Desde esa misma hoja abre Extensiones > Apps Script. Copia el código existente a un archivo de respaldo y anota la implementación web actual y su URL terminada en `/exec`. Conserva también el despliegue actual de Netlify.
4. Ensaya primero con una COPIA de la hoja y su propio proyecto vinculado: pega el Code.gs nuevo, revisa STAFF_KEY en Configuración del proyecto > Propiedades del script, ejecuta `prepararSistema` y repite la ejecución. Verifica las columnas y filas. La clave debe tener al menos 12 caracteres; no la pegues en archivos públicos ni enlaces.
5. En la copia verifica un pedido local y uno a domicilio. Nunca dirijas las pruebas automáticas al restaurante real; ya incluyen una simulación independiente.
6. Tras el ensayo, pega el Code.gs completo en el proyecto ORIGINAL vinculado a la hoja. No cambies de hoja ni borres pestañas. Guarda y ejecuta `prepararSistema`. Autoriza a Google si lo solicita. Ejecútalo una segunda vez y verifica que no aparecen columnas duplicadas ni filas borradas.
7. Las primeras 12 cabeceras siguen siendo: id, timestamp, cliente, telefono, tipo, direccion, items, notas, estado, total, requestId, requestHash. A continuación se añaden, si faltan: tsRecibido, tsPreparando, tsListo, tsEnCamino, tsEntregado, canal, anuladoMotivo, motivoDemora, tsUltimoCambio, historialEstados. Las columnas adicionales propias se conservan; si ya existen, las nuevas se anexan después de ellas. No reordenes físicamente las cabeceras para parecerte a un ejemplo.
8. Si se informa una incompatibilidad, detente y revisa la estructura. No renombres columnas ni borres pedidos para quitar el mensaje. Se admite la migración de la estructura original de 10 columnas, añadiendo primero los identificadores; cabeceras duplicadas o posiciones incompatibles requieren revisión.
9. Compara el número de filas, códigos, importes y notas con la copia. Los nuevos campos de pedidos antiguos siguen vacíos. El catálogo existente NO se sobrescribe.
10. En Apps Script abre Implementar > Gestionar implementaciones > editar la implementación web existente > Nueva versión > Implementar. Conserva el mismo acceso público y ejecución como propietario que usa la aplicación actual. Actualizar esa implementación conserva la dirección `/exec`. No basta con guardar el editor.
11. El `public/config.js` de esta entrega conserva exactamente el catálogo y la URL anterior. Si actualizaste la implementación existente, no necesitas cambiarlo. Si creaste otra, revisa la URL antes de publicar.
12. Publica el sitio por Git/Netlify como se indica abajo. Entra a cocina con la clave habitual. La franja debe indicar que se registran tiempos; si dice “Backend anterior”, revisa versión, preparación y URL.
13. Completa las pruebas del restaurante. Los pedidos antiguos deben seguir operándose; aparecerán sin datos completos de tiempo.

Todas las escrituras usan LockService. Las lecturas no migran ni crean columnas. Cada transición actualiza la fila con su historial; las fórmulas existentes en otras celdas se preservan. El sistema conserva las primeras marcas, no rellena etapas omitidas y nunca cambia una hora antigua por una estimación.

## Publicar el sitio en Netlify con Git

1. Trabaja desde una rama de revisión del repositorio `CarloSanta-byte/las-fritas-sitio`.
2. Copia `public`, `apps-script`, pruebas, documentación y `netlify.toml` a la raíz del proyecto. No subas `node_modules`, `.test-runtime` ni credenciales.
3. `netlify.toml` ya establece base `public`, publicación `.` relativa a esa base y comando vacío. Solo se publica el contenido público; el backend se instala por separado en Google.
4. Revisa la vista previa. Usa una URL de Google de ensayo si vas a enviar pedidos desde ella: una vista previa con la URL real CREA PEDIDOS REALES.
5. Tras instalar y verificar el backend, integra la rama en `main`. Comprueba el despliegue listo de Netlify, el menú, el acceso a cocina y sus 3 vistas.
6. Cada publicación que cambia recursos públicos debe cambiar `VERSION` en `public/sw.js`. Esta entrega usa `lasfritas-publico-procesos-20260911-1`. No fuerces `skipWaiting`: una persona puede estar terminando un pedido en la versión anterior.
7. Resuelve primero los envíos pendientes, cierra todas las pestañas/ventanas de Las Fritas y vuelve a abrir. No limpies el almacenamiento para actualizar.

El ZIP de Netlify contiene los archivos de `public` directamente. El ZIP completo contiene también el Code.gs, documentación y pruebas. **Subir el ZIP público a Netlify no instala el backend.**

## Cómo volver atrás

- Si falla la interfaz, restaura el despliegue anterior de Netlify. Conserva la hoja con los pedidos nuevos y sus columnas; no reemplaces la hoja real por una copia antigua.
- El backend nuevo conserva la creación pública, los reintentos de pedidos anteriores, el seguimiento y los avances normales del panel anterior. Las correcciones excepcionales ahora exigen motivo; deben hacerse desde el panel nuevo.
- Si también falla el backend, vuelve a implementar la versión anterior del script sin borrar columnas. No restaures los datos antiguos sobre filas nuevas. Durante ese intervalo no se capturarán las marcas nuevas; esas etapas quedarán sin medir.
- Al reactivar la medición, no reconstruyas las horas faltantes. Documenta el intervalo sin medición.
- Para que una reversión llegue a una PWA instalada, publica el código anterior con una VERSION de caché distinta, resuelve los envíos pendientes y cierra/reabre las ventanas. No borres los pedidos del navegador.

## Cómo usar los indicadores para el informe del proyecto

### Fuente y alcance

El PDF “Mejora en el proceso de despacho del producto en la empresa Las Fritas Salchipapería”, Universidad Santo Tomás Villavicencio, 5 de septiembre de 2026, fue leído completo y se revisaron sus diagramas. En su página 8 el VSM indica CT de 2 / 15 / 1 / 2 minutos, total de procesamiento 20 minutos y esperas de 0,5 / 0,5 / 1 minutos, total 2 minutos. La suma secuencial es 22 minutos. La referencia de 20 minutos solicitada se conserva como comparación y meta interna inicial; no equivale al tiempo físico total con esperas ni es una promesa comercial.

Las páginas 5–7 describen recepción, verificación, materias primas, cocción, acondicionamiento, ensamble, inspección y despacho. Los estados digitales agrupan varias actividades. La página 11 incluye satisfacción en el tercer objetivo: esta versión permite evaluar los tiempos, pero la satisfacción requiere una encuesta independiente.

### Qué mide cada intervalo

| Indicador | Fórmula, en minutos | Limitación |
|---|---|---|
| Atención inicial | (tsPreparando − tsRecibido) / 60000 | Incluye cola; no toda la toma en mesa ni navegación web. |
| Preparación | (tsListo − tsPreparando) / 60000 | Inicio y fin registrados por el equipo, no sensores. |
| Alistamiento domicilio | (tsEnCamino − tsListo) / 60000 | Puede incluir espera del repartidor. |
| Alistamiento/retiro local | (tsEntregado − tsListo) / 60000 | Puede incluir espera del cliente. |
| Entrega domicilio | (tsEntregado − tsEnCamino) / 60000 | Depende de que se registre la entrega real. No aplica a local. |
| Lead time total | (tsEntregado − tsRecibido) / 60000 | Solo pedidos terminados con extremos válidos. |

**Los tiempos reflejan cuándo el equipo registra cada cambio de estado. Si el botón se pulsa tarde, el indicador también lo refleja. No son un cronómetro del proceso físico.**

### Obtener una comparación reproducible

1. En cocina abre Análisis del proceso. Selecciona periodo y tipo de entrega. Las fechas usan America/Bogota; se guardan horas ISO del servidor.
2. La cohorte de duraciones se elige por fecha de creación. Pedidos pendientes y entregados sin marcas quedan contados y separados. Throughput se agrupa por hora de entrega; no se confunde con hora de llegada.
3. Pulsa Calcular periodo y espera a que la consulta termine. Mientras hay páginas por leer no hay una conclusión parcial. Actualizar datos descarta la copia de la sesión y consulta Google otra vez.
4. Anota periodo, meta, filtros, cantidad de observaciones por etapa y pedidos excluidos. Con menos de 5 observaciones la cifra se acompaña de “muestra pequeña”. No basta con reunir 5 para garantizar significancia estadística.
5. La mediana es la cifra principal; promedio y P90 se muestran al lado. P90 usa rango más próximo: ordenar de menor a mayor y elegir la posición techo(0,9 × n). La mediana par promedia los dos valores centrales. No se redondea antes del cálculo.
6. Vacío significa sin dato. Cero real significa que dos marcas válidas coinciden. Los valores negativos o secuencias incoherentes no entran en los indicadores. Un pedido largo válido no se elimina automáticamente.
7. Los pedidos corregidos se separan por defecto; puedes incluirlos expresamente para una lectura de sensibilidad. El CSV conserva sus marcas y banderas independientemente de esa exclusión. No los presentes como recorridos sin correcciones.
8. La barra apilada usa una misma muestra de recorridos completos por tipo. Sus promedios sí suman el lead time promedio. No sumes medianas ni promedios de muestras diferentes.
9. El cuello de botella señalado es la mayor proporción del tiempo de recorridos completos. Es una concentración observada, no una prueba de saturación de capacidad.
10. Cumplimiento = entregados con tiempo válido menor o igual a la meta / entregados con tiempo válido. Los pendientes no entran como ceros ni se ocultan; se muestran aparte. Cambiar la meta recalcula la lectura, no altera pedidos. La preferencia se guarda en ese navegador; consigna la meta de cada exportación.
11. Web/mostrador compara medianas. La diferencia es mostrador menos web; positiva significa menor duración web. Se muestran tamaños de muestra. Ambos canales usan la plataforma, por lo que mostrador no reproduce por sí solo el método antiguo. Compara franjas, productos y entrega semejantes y no afirmes causalidad.
12. Para medir la toma presencial completa hace falta observación independiente desde que empieza la conversación; registrar al terminar no recupera ese inicio.
13. La agrupación Para compartir incluye Mega Frita y Mega Frita Show Queso. Un pedido mixto se cuenta una vez en ese grupo. Resto agrupa los demás. No se atribuye la duración del pedido a un ingrediente aislado.
14. Pareto cuenta la causa indicada por el equipo en los pedidos que superan la meta; “sin causa” se muestra aparte. No identifica causas reales automáticamente.
15. WIP actual conserva activos anteriores al periodo. WIP histórico integra intervalos entre eventos, incluidas reaperturas, y muestra promedio simultáneo por hora. No puede reconstruir la operación anterior a la instalación. Los históricos incompletos se cuentan como desconocidos.
16. Throughput muestra entregas por franja horaria y entregas/franja diaria divididas por los días seleccionados. Incluye horas sin servicio porque no se han proporcionado horarios; hoy puede estar incompleto. No es productividad por hora laboral ni capacidad máxima.
17. Exporta CSV: separador punto y coma, UTF-8 con BOM. Ábrelo en Excel mediante Datos > Desde texto/CSV y selecciona ese separador; en pandas utiliza `read_csv(archivo, sep=';', encoding='utf-8-sig')`. Los decimales del archivo usan punto. Las celdas vacías de tiempos siguen vacías.
18. El CSV contiene identificador, tipo, canal, marcas ISO, historial, tiempos, grupo, banderas y meta. No contiene nombre, teléfono, dirección ni notas de cliente. Conserva el archivo de manera privada: contiene identificadores de pedidos e historial operativo. Los campos que podrían iniciar fórmulas se exportan como texto.

### Correcciones y pedidos incompletos

Avanzar escribe la primera marca de ese estado solo si estaba vacía. Corregir exige motivo y registra el evento; nunca sustituye la primera hora. `tsUltimoCambio` sí cambia y alimenta el cronómetro del estado actual. Un salto no rellena los estados omitidos. Históricos sin `tsRecibido` permanecen sin esa marca, incluso al retroceder a Recibido. Un pedido no entregado puede permanecer activo toda la noche; no se cierra ni se anula automáticamente.

`historialEstados` conserva transiciones y cambios de causa. La pantalla muestra los últimos 30 eventos de un pedido y el CSV contiene todos. A 45.000 caracteres en un historial se detiene la escritura con un mensaje, sin truncar evidencia. Una revisión humana debe resolver ese caso extraordinario. La clave compartida identifica acceso del equipo, no a una persona concreta; no se atribuye autoría individual.

`anuladoMotivo` queda reservada y vacía. No existe nuevo estado de anulación ni función de cobro. Importes y entregados no representan pagos, utilidad ni cierre de caja.

## Rendimiento e históricos

`listarRango` recibe fechas y token en POST text/plain;charset=utf-8. Lee como máximo 500 filas por petición y devuelve cursor. El panel solo usa la unión completa de páginas, por identificador. El tope de filas se fija al comenzar; pedidos que lleguen después aparecerán al actualizar. No es una transacción histórica congelada: correcciones durante la carga pueden reflejarse en distintos momentos. Para una exportación académica, actualiza en un momento tranquilo y guarda fecha de extracción.

La cola operativa nueva también usa páginas y conserva la cola anterior hasta completar una carga. No se ocultan pendientes antiguos por un corte de fecha. La compatibilidad con el panel anterior mantiene `listar` tradicional.

Se evita una lectura completa de todas las columnas en una única petición paginada, pero la primera consulta todavía recorre toda la hoja para no depender de su orden manual. No hay índice persistente. 1.000 / 10.000 / 50.000 filas requieren 2 / 20 / 100 peticiones. La simulación no mide latencia, límites ni cuotas de Google. Con decenas de miles de filas la primera carga puede ser lenta; ese es el límite práctico que debe medirse en la cuenta real. No se promete una capacidad de producción a partir de tiempos locales.

La copia de análisis vive solo en memoria de la sesión; actualizar la reemplaza y cerrar sesión la elimina. Los cálculos se ejecutan en un Worker cuando el navegador lo admite, para mantener disponible la interfaz. Si no lo admite se usa el mismo cálculo local. No se agregan fórmulas a Sheets ni gráficas al cliente.

## Cliente y mostrador

El menú conserva 64 productos con los mismos nombres, descripciones, precios e identificadores. La validación de Catalogo en Google es la autoridad del precio. Permanecen todos los límites: cantidad 1–50, 60 líneas, nombre 80, teléfono 7–15 dígitos, dirección 250, notas 500 y nota de línea 200.

El carrito del cliente conserva la recuperación de 24 horas y los envíos anteriores con su contenido exacto y requestId. Nunca se reenvía al recuperar conexión sin pulsación del usuario. Las notas [Plato N] y Para Plato N vinculan adicionales; el texto de referencia cuenta en el límite de 200 caracteres.

Mostrador tiene borrador y envío pendiente independientes, en la sesión de la pestaña. No se guarda la clave en el envío pendiente; se añade al cuerpo al reintentar tras autenticación. El formulario conserva nombre y teléfono obligatorio. Busca producto, indica cantidad y nota, suma y registra. Los adicionales se pueden asociar a un plato existente. En mostrador su cantidad es TOTAL, no por plato: al cambiar unidades del plato revisa también los adicionales. Quitar el plato retira los adicionales asociados. No se registran pagos desde este formulario.

Pausar animaciones recuerda la preferencia y detiene los efectos. Movimiento reducido del sistema manda siempre. Efectos moderados se activan con señales de poca memoria, CPU o ahorro de datos; pueden cambiarse. Sonido y vibración son opcionales e independientes. Sorpréndeme presenta un plato y nunca agrega ni compra. El seguimiento anima estados confirmados, sin porcentaje ficticio de cocción ni tiempo de entrega prometido.

## Seguridad y mantenimiento

STAFF_KEY permanece en Propiedades del script, nunca en URL. El token viaja en el cuerpo. Cocina usa noindex y no-store. El service worker solo cachea una lista de recursos públicos: no pedidos, respuestas de Google, análisis, mostrador ni cocina. No incluyas los nuevos módulos internos en esa lista. Se preservan cabeceras de seguridad y neutralización de texto y fórmulas. La consulta pública mantiene exactamente los seis campos anteriores: id, timestamp, tipo, items, estado y total; las notas dentro de items ya formaban parte del enlace, por eso el cliente recuerda compartirlo con cuidado.

`config.js` conserva los datos comerciales conocidos. Dirección del local, horarios, tarifa/cobertura exacta, promesas de entrega, fotografías reales y reseñas siguen como [DATO PENDIENTE] en `DATOS-PENDIENTES.md`.

## Repetir las pruebas

Instala Node.js compatible con las herramientas y pnpm. En esta carpeta ejecuta `pnpm install --frozen-lockfile` y `pnpm test`. Las dependencias son solo de desarrollo. Chrome se busca en su ruta habitual de Windows; las pruebas principales admiten CHROME_PATH. Las pruebas v2 usan esa misma ruta de Windows.

`pnpm start` sirve el sitio en http://127.0.0.1:4174. `pnpm test:performance` abre su propio servidor temporal y genera Lighthouse; no necesita el servidor de vista previa. `pnpm test:scale` ejecuta 1.000, 10.000 y 50.000 filas simuladas. Los resultados y capturas llevan pedidos ficticios; no son evidencia de mejora real del negocio.

