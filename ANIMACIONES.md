# Inventario de animaciones · Las Fritas v2

Sin librerías de producción. CSS y Web Animations API. Curva de salida: cubic-bezier(.2,.8,.2,1); curvas cíclicas ease-in-out. Todas usan transform y/o opacity. Los cambios de color de estado son instantáneos: no se animan propiedades que recalculen el diseño.

| Dónde | Disparador | Qué comunica | Duración / curva | Pausa o movimiento reducido |
|---|---|---|---|---|
| Marca compacta | Entrada | Presenta identidad sin desplazar la comida | 420 ms / salida | Visible, quieta |
| Categorías | Entran en área visible | Hace reconocible la navegación | 180 ms / salida | Visibles sin transición |
| Tarjetas | IntersectionObserver | Acompaña el descubrimiento al desplazarse | 240 ms completos; 120 moderados / salida | Visibles inmediatamente |
| Título de categoría | Selección | Confirma cambio de conjunto | 180 ms / salida | Sustitución inmediata |
| Botones | Pulsación | Confirma toque | 100 ms / salida | Respuesta funcional inmediata |
| Hoja de producto | Apertura | Conecta la elección con su detalle | 220 ms / salida | Abre inmediatamente |
| Copia visual del producto | Tarjeta a detalle | Conserva continuidad espacial | 280 ms / salida | Sin copia animada |
| Cabecera de hoja | Arrastre hacia abajo | Expresa cierre reversible del diálogo | Sigue el dedo, sin interpolación temporal | Botón de cierre y Escape disponibles; sin transformación |
| Adicionales | Cambia selección | Confirma qué se suma | 160 ms / salida | Etiquetas inmediatas |
| Partícula al carrito | Agregar | Conecta origen y destino de la acción | 400 ms / salida | Contador y aviso, sin partícula |
| Contador y bandeja | Agregar | Hace visible la cantidad nueva | 180 ms / salida | Actualización estática |
| Línea de carrito | Arrastre horizontal | Permite quitar y deshacer | Sigue el dedo | Quitar y Deshacer por botón |
| Pedir / Mi pedido | Navegación | Mantiene orientación entre vistas | 220 ms / salida | Cambio inmediato |
| Botón de envío | Solicitud en curso | Informa espera de confirmación | 1.200 ms / ease-in-out | Texto Confirmando; sin pulso |
| Confirmación | Google devuelve código válido | Celebra registro confirmado | 650 ms / salida | Código visible, sin partículas |
| Progreso de seguimiento | Estado confirmado distinto | Sitúa el pedido en el flujo real | 350 ms / salida | Paso actualizado inmediatamente |
| Icono de estado | Estado activo en pantalla | Distingue preparación y reparto | 1.800 ms / ease-in-out | Icono estático |
| Entregado | Primera llegada a Entregado en la consulta | Hace perceptible el final | 650 ms / salida | Mensaje final estático |
| Sorpréndeme | Pulsación | Propone un plato con una carta que gira | 650 ms / salida | Abre directamente la propuesta |
| Cocina: pedido nuevo | Primera representación de un pedido reciente | Señala entrada a la cola | 220 ms / salida | Nueva tarjeta estática |
| Cocina: umbral | Cambia nivel de demora | Señala necesidad de revisión | 240 ms / salida | Color y texto de alerta |

El producto sugerido está disponible para revisar desde el inicio de Sorpréndeme; no hay espera obligatoria ni agregado automático. Las copias y partículas tienen pointer-events:none y son ocultas para tecnologías de asistencia. La operación comercial nunca espera la promesa de una animación.

## Control integral

- Pausar animaciones está en la franja superior, tiene objetivo táctil mínimo de 44 px y guarda elección.
- prefers-reduced-motion tiene prioridad absoluta. El usuario no puede activar movimiento contra esa preferencia del dispositivo.
- Ocultar la pestaña cancela efectos y detiene bucles. Al volver, los indicadores pueden recuperar su movimiento si siguen visibles y permitido.
- IntersectionObserver revela elementos visibles y cancela sus animaciones al salir de pantalla. Solo se anima el icono activo visible, no toda la lista de estados.
- La cantidad de partículas se limita a 12 y se eliminan al terminar o pausar. No hay videos, GIF ni animaciones descargadas de terceros.
- hardwareConcurrency <= 4, deviceMemory <= 4 o saveData son señales para activar efectos moderados. Son aproximaciones; si faltan, se mantiene funcionamiento normal. El control del pie permite elegir completos, salvo movimiento reducido del sistema.
- Efectos moderados eliminan partículas, copia espacial, celebración y ciclos decorativos. Conservan respuestas cortas a las acciones.
- Sonido y vibración son elecciones independientes; vibración empieza apagada y usa navigator.vibrate solo cuando existe.
- Desplazamiento de categorías es nativo; no se secuestra el scroll. El arrastre para cerrar se limita a la cabecera de la hoja y el gesto de quitar conserva desplazamiento vertical.
- Si motion.js no carga, se mantiene menú, carrito, envío y seguimiento. El módulo se invoca de forma opcional.

## Rendimiento y comprobaciones

Los adicionales se construyen al abrir su sección, en vez de crear cientos de opciones ocultas al abrir cualquier plato. Las ilustraciones reservan ancho y alto. Las gráficas y sus cálculos no se cargan en el cliente. Análisis usa un Worker cuando está disponible.

VERIFICACION.md recoge Lighthouse y pruebas de interacción con efectos completos, CPU simulada 4x, pausa y reducción del sistema. Una captura estática no demuestra fluidez. Las cifras de laboratorio no certifican 60 fps ni INP de campo en Android real: la revisión del teléfono con datos móviles sigue en PRUEBAS-MANUALES.md.
