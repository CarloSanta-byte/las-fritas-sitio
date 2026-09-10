# Pruebas en Las Fritas antes de compartir el enlace

Acuerda con cocina que los pedidos de esta lista son pruebas. Un envío desde el sitio publicado sí llega a la hoja real. No ejecutes estas pruebas durante un pico de servicio.

- [ ] Abrir en un Android habitual del local con datos móviles. El primer plato, precio y botón deben verse sin desplazarse. Probar también escritorio, 320 px y texto ampliado.
- [ ] Buscar “queso”, “maduro” y un nombre con tilde; limpiar. Abrir Todas y cambiar categoría. Comparar dos salchipapas y leer sus descripciones originales.
- [ ] Agregar un plato directamente. Abrirlo desde el pedido, escribir “sin cebolla”, aumentar cantidad, quitar y deshacer.
- [ ] Agregar dos burgers iguales con notas distintas. A una añadir combo con papa criolla y limonada; a la otra, queso. Revisar cantidades y precio antes de enviar. En cocina e impresión, confirmar que cada adicional corresponde al plato correcto.
- [ ] Probar dos platos con dos extras de queso por plato: cocina debe recibir cuatro unidades de queso. Probar un conjunto que supere 50 unidades de un extra: no debe agregarse parcialmente.
- [ ] Recargar con carrito. Deben volver platos, cantidades y notas. Recordar contacto solo si se desea; comprobar el botón de borrado.
- [ ] Probar teléfono inválido y domicilio sin dirección. Debe señalar el campo y conservar el contenido.
- [ ] Enviar un pedido pequeño para recoger. Guardar código y enlace. El seguimiento debe aparecer al confirmarse Google.
- [ ] En cocina, comprobar clave incorrecta, clave correcta, Activar sonido y aviso persistente. Filtrar Preparando mientras entra otro pedido: la alerta de recibido debe seguir visible.
- [ ] Avanzar el pedido para recoger: Recibido → Preparando → Listo para entregar → Entregado. Nunca debe ofrecer En camino.
- [ ] Repetir con domicilio. Comprobar dirección y flujo con En camino.
- [ ] Con dos operadores, intentar cambiar el mismo pedido desde el mismo estado. El segundo debe consultar el cambio ya confirmado, sin avanzar otro estado accidentalmente.
- [ ] Imprimir un ticket real. Verificar papel, ancho, código completo, dirección, notas largas, extras y que no se corta un producto. El ticket debe indicar que no es factura.
- [ ] Abrir WhatsApp desde cliente y cocina, revisar número y texto. El mensaje debe requerir envío manual.
- [ ] Quitar temporalmente conexión en cocina. Debe conservar los pedidos y mostrar la última actualización. Recuperar conexión y comprobar la lectura nueva.
- [ ] Quitar conexión al consultar seguimiento. El estado anterior debe permanecer; no debe afirmarse que el pedido desapareció.
- [ ] Instalar la PWA, visitarla una vez y abrir de nuevo sin red. Explorar y preparar un carrito. Enviar debe requerir conexión y no se debe disparar automáticamente cuando vuelva.
- [ ] Si ocurre naturalmente un envío sin respuesta, mantener la misma pestaña y pulsar Reintentar el mismo pedido. Debe recuperar un único código. Para provocar deliberadamente una respuesta perdida usa las pruebas automáticas con simulación, no cortes el servicio del restaurante.
- [ ] Probar Tab, Shift+Tab, Enter y Escape dentro de los diálogos. El foco debe permanecer dentro y volver al origen al cerrar.
- [ ] Activar reducción de movimiento en el teléfono, y después la pausa visible. Ninguna de las dos debe impedir pedir.
- [ ] Cerrar sesión en cocina. No deben quedar accesibles pedidos ni datos del ticket. Volver a entrar y revisar activos.
- [ ] Antes de publicar, resolver los datos pendientes que afectan el servicio: WhatsApp, dirección para recoger, cobertura, tarifa y tratamiento de Show Queso fuera de la mesa.

## Si algo no coincide

Anota el código completo, hora, dispositivo, acción y lo que mostró la pantalla. Consulta Google Sheets antes de repetir un pedido incierto. No borres filas ni datos del navegador para “reiniciar” un envío pendiente.
