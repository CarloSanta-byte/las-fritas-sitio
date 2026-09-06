// ============================================================
// LAS FRITAS — Lógica del cliente
// ============================================================

const $ = (sel) => document.querySelector(sel);

// El carrito se guarda como líneas independientes, porque un mismo
// producto puede pedirse dos veces con notas distintas (ej: una
// hamburguesa normal y otra sin cebolla son dos líneas separadas).
const carritoLineas = {}; // { [lineId]: { producto, cantidad, nota, categoriaInfo } }
let tipoEntrega = "local";
let ultimoIdEnviado = null;
let intervaloSeguimiento = null;
let productoEnDetalle = null;
let cantidadDetalle = 1;
let terminoBusqueda = "";

const badgeCarrito = $("#badge-carrito");
const iconoCarrito = $("#btn-abrir-carrito");
const barraCarrito = $("#barra-carrito");

// ============================================================
// ÍNDICE DE PRODUCTOS (para búsqueda y detalle)
// ============================================================
const indiceProductos = {}; // id -> { producto, categoria }
MENU.forEach(function (grupo) {
  grupo.items.forEach(function (p) {
    indiceProductos[p.id] = { producto: p, categoria: grupo };
  });
});

function idSeccion(categoria) {
  return "cat-" + categoria.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
function lineId(productoId, nota) {
  return productoId + "|" + normalizarTexto(nota || "").trim();
}

// ============================================================
// MARQUESINA
// ============================================================
function iniciarMarquesina() {
  const frases = FRASES_MARQUESINA.concat(FRASES_MARQUESINA);
  $("#marquesina-track").innerHTML = frases.map(function (f) { return "<span>" + f + "</span>"; }).join("");
}

// ============================================================
// RENDER DE CATEGORÍAS Y MENÚ
// ============================================================
function renderCategorias() {
  const lista = $("#lista-categorias");
  lista.innerHTML = MENU.map(function (grupo, i) {
    return '<button class="pill' + (i === 0 ? " activa" : "") + '" data-target="' + idSeccion(grupo.categoria) + '">' +
      '<span class="pill-icono">' + grupo.icono + "</span>" + grupo.categoria + "</button>";
  }).join("");

  lista.querySelectorAll(".pill").forEach(function (btn) {
    btn.addEventListener("click", function () {
      cerrarBusqueda();
      marcarPillActiva(btn.dataset.target);
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function marcarPillActiva(targetId) {
  const lista = $("#lista-categorias");
  lista.querySelectorAll(".pill").forEach(function (p) {
    p.classList.toggle("activa", p.dataset.target === targetId);
  });
  const activa = lista.querySelector(".pill.activa");
  if (activa) activa.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function iniciarScrollSpy() {
  const secciones = document.querySelectorAll(".seccion-categoria");
  const observer = new IntersectionObserver(
    function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) marcarPillActiva(entrada.target.id);
      });
    },
    { rootMargin: "-190px 0px -65% 0px", threshold: 0 }
  );
  secciones.forEach(function (s) { observer.observe(s); });
}

function renderMenu() {
  const contenedor = $("#contenedor-menu");
  contenedor.innerHTML = MENU.map(function (grupo) {
    const tarjetas = grupo.items.map(function (p) { return renderTarjetaProducto(p, grupo, false); }).join("");
    return (
      '<section class="seccion-categoria" id="' + idSeccion(grupo.categoria) + '">' +
        '<div class="encabezado-categoria">' +
          '<div class="icono-categoria" style="--color-cat:' + grupo.color + '">' + grupo.icono + "</div>" +
          "<h2>" + grupo.categoria + "</h2>" +
          '<span class="contador-cat">' + grupo.items.length + " opciones</span>" +
        "</div>" +
        '<div class="fila-productos">' + tarjetas + "</div>" +
      "</section>"
    );
  }).join("");

  cablearTarjetas(contenedor);
  revelarTarjetasVisibles();
}

function renderTarjetaProducto(p, grupo, esResultado) {
  const linea = carritoLineas[lineId(p.id, "")];
  const cantidadSinNota = linea ? linea.cantidad : 0;
  const chipNuevo = p.nota === "Nuevo" ? '<span class="chip-nuevo">Nuevo</span>' : "";

  return (
    '<article class="tarjeta-producto' + (esResultado ? " tarjeta-resultado" : "") + '" style="--color-cat:' + grupo.color + '" data-id="' + p.id + '" tabindex="0" role="button" aria-label="Ver detalle de ' + p.nombre + '">' +
      '<div class="icono-mini">' + grupo.icono + "</div>" +
      chipNuevo +
      (esResultado ? '<div class="info-resultado">' : "") +
      (esResultado ? '<span class="categoria-resultado">' + grupo.categoria + "</span>" : "") +
      "<h3>" + p.nombre + "</h3>" +
      '<p class="descripcion-corta">' + p.descripcion + "</p>" +
      (esResultado ? "</div>" : "") +
      '<div class="pie-tarjeta">' +
        '<span class="precio">' + formatoPesos(p.precio) + "</span>" +
        renderControlCantidad(p.id, cantidadSinNota) +
      "</div>" +
    "</article>"
  );
}

function renderControlCantidad(productoId, cantidad) {
  if (cantidad === 0) {
    return '<button class="btn-add-rapido" data-accion="add-rapido" data-id="' + productoId + '" aria-label="Agregar">+</button>';
  }
  return (
    '<div class="stepper-mini" data-accion="stepper-rapido" data-id="' + productoId + '">' +
      '<button data-op="restar">−</button>' +
      '<span class="cant">' + cantidad + "</span>" +
      '<button data-op="sumar">+</button>' +
    "</div>"
  );
}

// Los clics dentro de una tarjeta pueden ser: el botón "+" rápido, el
// mini-stepper, o la tarjeta misma (abre el detalle completo).
function cablearTarjetas(contenedor) {
  contenedor.querySelectorAll(".tarjeta-producto").forEach(function (tarjeta) {
    const id = tarjeta.dataset.id;

    tarjeta.addEventListener("click", function (e) {
      if (e.target.closest("[data-accion]")) return; // el stepper maneja su propio click
      abrirDetalleProducto(id);
    });
    tarjeta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") abrirDetalleProducto(id);
    });
  });

  contenedor.querySelectorAll('[data-accion="add-rapido"]').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      cambiarCantidadLinea(lineId(btn.dataset.id, ""), btn.dataset.id, "", 1);
      animarIconoCarrito();
      actualizarTarjetaProducto(btn.dataset.id);
    });
  });

  contenedor.querySelectorAll('[data-accion="stepper-rapido"]').forEach(function (grupo) {
    grupo.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const id = grupo.dataset.id;
        const delta = btn.dataset.op === "sumar" ? 1 : -1;
        if (delta > 0) animarIconoCarrito();
        cambiarCantidadLinea(lineId(id, ""), id, "", delta);
        actualizarTarjetaProducto(id);
      });
    });
  });
}

function actualizarTarjetaProducto(productoId) {
  document.querySelectorAll('.tarjeta-producto[data-id="' + productoId + '"] .pie-tarjeta').forEach(function (pie) {
    const linea = carritoLineas[lineId(productoId, "")];
    const cantidad = linea ? linea.cantidad : 0;
    const controlViejo = pie.querySelector('[data-accion]');
    const controlNuevo = document.createElement("div");
    controlNuevo.innerHTML = renderControlCantidad(productoId, cantidad);
    const nuevoEl = controlNuevo.firstElementChild;
    pie.replaceChild(nuevoEl, controlViejo);

    if (nuevoEl.dataset.accion === "add-rapido") {
      nuevoEl.addEventListener("click", function (e) {
        e.stopPropagation();
        cambiarCantidadLinea(lineId(productoId, ""), productoId, "", 1);
        animarIconoCarrito();
        actualizarTarjetaProducto(productoId);
      });
    } else {
      nuevoEl.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          const delta = btn.dataset.op === "sumar" ? 1 : -1;
          if (delta > 0) animarIconoCarrito();
          cambiarCantidadLinea(lineId(productoId, ""), productoId, "", delta);
          actualizarTarjetaProducto(productoId);
        });
      });
    }
  });
}

// Revela las tarjetas con una pequeña animación a medida que aparecen
// en pantalla (rieles horizontales incluidos).
function revelarTarjetasVisibles() {
  const observer = new IntersectionObserver(function (entradas, obs) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visible");
        obs.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".tarjeta-producto:not(.visible)").forEach(function (t) { observer.observe(t); });
}

// ============================================================
// CARRITO (líneas)
// ============================================================
function cambiarCantidadLinea(id, productoId, nota, delta) {
  const info = indiceProductos[productoId];
  if (!info) return;

  const actual = carritoLineas[id] ? carritoLineas[id].cantidad : 0;
  const nueva = Math.max(0, actual + delta);

  if (nueva === 0) {
    delete carritoLineas[id];
  } else {
    carritoLineas[id] = { producto: info.producto, categoria: info.categoria, cantidad: nueva, nota: nota || "" };
  }
  actualizarResumenCarrito();
}

function animarIconoCarrito() {
  iconoCarrito.classList.remove("animar");
  void iconoCarrito.offsetWidth;
  iconoCarrito.classList.add("animar");
}

function totalCarrito() {
  return Object.values(carritoLineas).reduce(function (acc, l) { return acc + l.producto.precio * l.cantidad; }, 0);
}
function cantidadTotalCarrito() {
  return Object.values(carritoLineas).reduce(function (acc, l) { return acc + l.cantidad; }, 0);
}

function actualizarResumenCarrito() {
  const cantidad = cantidadTotalCarrito();
  const total = totalCarrito();

  if (cantidad > 0) {
    badgeCarrito.textContent = cantidad;
    badgeCarrito.classList.remove("oculto");
    if (window.innerWidth < 1000) barraCarrito.classList.remove("oculto");
    $("#texto-barra-carrito").textContent = cantidad + (cantidad === 1 ? " producto" : " productos");
    $("#texto-barra-total").textContent = formatoPesos(total);
  } else {
    badgeCarrito.classList.add("oculto");
    barraCarrito.classList.add("oculto");
  }
  renderListaCarritoEnHoja();
}

function renderListaCarritoEnHoja() {
  const contenedor = $("#lista-items-carrito");
  const lineas = Object.entries(carritoLineas);

  if (lineas.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--muted); text-align:center; padding:16px 0;">Tu carrito está vacío. Toca cualquier producto del menú para agregarlo.</p>';
  } else {
    contenedor.innerHTML = lineas.map(function (entrada) {
      const id = entrada[0], l = entrada[1];
      return (
        '<div class="fila-carrito">' +
          '<div class="info"><strong>' + l.producto.nombre + '</strong>' +
          '<span>' + l.cantidad + " × " + formatoPesos(l.producto.precio) + "</span>" +
          (l.nota ? '<span class="nota-linea">📝 ' + escaparHtmlCliente(l.nota) + "</span>" : "") +
          "</div>" +
          '<div class="stepper-mini" data-lineid="' + id + '">' +
            '<button data-op="restar">−</button>' +
            '<span class="cant">' + l.cantidad + "</span>" +
            '<button data-op="sumar">+</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    contenedor.querySelectorAll("[data-lineid]").forEach(function (grupo) {
      grupo.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const id = grupo.dataset.lineid;
          const l = carritoLineas[id];
          if (!l) return;
          const delta = btn.dataset.op === "sumar" ? 1 : -1;
          cambiarCantidadLinea(id, l.producto.id, l.nota, delta);
          actualizarTarjetaProducto(l.producto.id);
        });
      });
    });
  }

  $("#total-carrito").textContent = formatoPesos(totalCarrito());
}

function escaparHtmlCliente(texto) {
  const div = document.createElement("div");
  div.textContent = texto || "";
  return div.innerHTML;
}

// ============================================================
// HOJA DE DETALLE DE PRODUCTO
// ============================================================
function abrirDetalleProducto(productoId) {
  const info = indiceProductos[productoId];
  if (!info) return;
  productoEnDetalle = info;
  cantidadDetalle = 1;

  $("#detalle-icono").textContent = info.categoria.icono;
  $("#detalle-icono").style.setProperty("--color-cat", info.categoria.color);
  $("#detalle-nombre").textContent = info.producto.nombre;
  $("#detalle-precio").textContent = formatoPesos(info.producto.precio);
  $("#detalle-descripcion").textContent = info.producto.descripcion;
  $("#detalle-nota").value = "";
  $("#detalle-cantidad").textContent = "1";

  $("#overlay-detalle-producto").classList.remove("oculto");
}
function cerrarDetalleProducto() {
  $("#overlay-detalle-producto").classList.add("oculto");
  productoEnDetalle = null;
}
$("#detalle-sumar").addEventListener("click", function () {
  cantidadDetalle++;
  $("#detalle-cantidad").textContent = cantidadDetalle;
});
$("#detalle-restar").addEventListener("click", function () {
  cantidadDetalle = Math.max(1, cantidadDetalle - 1);
  $("#detalle-cantidad").textContent = cantidadDetalle;
});
$("#btn-agregar-detalle").addEventListener("click", function () {
  if (!productoEnDetalle) return;
  const nota = $("#detalle-nota").value.trim();
  const id = lineId(productoEnDetalle.producto.id, nota);
  cambiarCantidadLinea(id, productoEnDetalle.producto.id, nota, cantidadDetalle);
  animarIconoCarrito();
  actualizarTarjetaProducto(productoEnDetalle.producto.id);
  cerrarDetalleProducto();
});
document.querySelectorAll("#overlay-detalle-producto").forEach(function (ov) {
  ov.addEventListener("click", function (e) { if (e.target === ov) cerrarDetalleProducto(); });
});

// ============================================================
// BUSCADOR
// ============================================================
$("#btn-abrir-buscador").addEventListener("click", function () {
  const wrap = $("#buscador-wrap");
  wrap.classList.toggle("oculto");
  if (!wrap.classList.contains("oculto")) $("#input-buscar-menu").focus();
  else cerrarBusqueda();
});
$("#input-buscar-menu").addEventListener("input", function (e) {
  terminoBusqueda = e.target.value;
  $("#btn-limpiar-busqueda").classList.toggle("oculto", terminoBusqueda.trim() === "");
  renderBusqueda();
});
$("#btn-limpiar-busqueda").addEventListener("click", function () {
  $("#input-buscar-menu").value = "";
  terminoBusqueda = "";
  $("#btn-limpiar-busqueda").classList.add("oculto");
  renderBusqueda();
});

function cerrarBusqueda() {
  $("#buscador-wrap").classList.add("oculto");
  $("#input-buscar-menu").value = "";
  terminoBusqueda = "";
  renderBusqueda();
}

function renderBusqueda() {
  const query = normalizarTexto(terminoBusqueda.trim());
  const contResultados = $("#contenedor-resultados");
  const contMenu = $("#contenedor-menu");
  const catPills = $("#lista-categorias");

  if (query === "") {
    contResultados.classList.add("oculto");
    contMenu.classList.remove("oculto");
    catPills.classList.remove("oculto");
    return;
  }

  contMenu.classList.add("oculto");
  catPills.classList.add("oculto");
  contResultados.classList.remove("oculto");

  const coincidencias = [];
  MENU.forEach(function (grupo) {
    grupo.items.forEach(function (p) {
      const texto = normalizarTexto(p.nombre + " " + p.descripcion + " " + grupo.categoria);
      if (texto.indexOf(query) !== -1) coincidencias.push({ producto: p, grupo: grupo });
    });
  });

  if (coincidencias.length === 0) {
    contResultados.innerHTML = '<div class="estado-vacio"><span class="emoji">🔍</span>No encontramos nada con "' + escaparHtmlCliente(terminoBusqueda) + '". Prueba con otra palabra.</div>';
    return;
  }

  contResultados.innerHTML =
    '<div class="resultados-busqueda">' +
      '<div class="titulo-resultados">' + coincidencias.length + (coincidencias.length === 1 ? " resultado" : " resultados") + "</div>" +
      '<div class="grid-resultados">' +
        coincidencias.map(function (c) { return renderTarjetaProducto(c.producto, c.grupo, true); }).join("") +
      "</div>" +
    "</div>";

  cablearTarjetas(contResultados);
  revelarTarjetasVisibles();
}

// ============================================================
// HOJA DE CARRITO (abrir / cerrar)
// ============================================================
function abrirCarrito() {
  $("#error-carrito").innerHTML = "";
  renderListaCarritoEnHoja();
  $("#overlay-carrito").classList.remove("oculto");
}
function cerrarCarrito() {
  if (window.innerWidth >= 1000) return; // en desktop el carrito es un panel fijo
  $("#overlay-carrito").classList.add("oculto");
}
iconoCarrito.addEventListener("click", abrirCarrito);
barraCarrito.addEventListener("click", abrirCarrito);
$("#btn-cerrar-carrito").addEventListener("click", cerrarCarrito);
$("#overlay-carrito").addEventListener("click", function (e) {
  if (e.target === $("#overlay-carrito")) cerrarCarrito();
});

$("#btn-tipo-local").addEventListener("click", function () { seleccionarTipoEntrega("local"); });
$("#btn-tipo-domicilio").addEventListener("click", function () { seleccionarTipoEntrega("domicilio"); });
function seleccionarTipoEntrega(tipo) {
  tipoEntrega = tipo;
  $("#btn-tipo-local").classList.toggle("activo", tipo === "local");
  $("#btn-tipo-domicilio").classList.toggle("activo", tipo === "domicilio");
  $("#campo-direccion-wrap").classList.toggle("oculto", tipo !== "domicilio");
}

// ============================================================
// ENVIAR PEDIDO
// ============================================================
$("#btn-enviar-pedido").addEventListener("click", async function () {
  const errores = [];
  const nombre = $("#campo-nombre").value.trim();
  const telefono = $("#campo-telefono").value.trim();
  const direccion = $("#campo-direccion").value.trim();
  const notas = $("#campo-notas").value.trim();

  if (cantidadTotalCarrito() === 0) errores.push("Agrega al menos un producto.");
  if (!nombre) errores.push("Escribe tu nombre.");
  if (!telefono) errores.push("Escribe un teléfono de contacto.");
  if (tipoEntrega === "domicilio" && !direccion) errores.push("Escribe la dirección de entrega.");

  const cajaError = $("#error-carrito");
  if (errores.length > 0) {
    cajaError.innerHTML = '<div class="mensaje-error">' + errores.join("<br>") + "</div>";
    return;
  }
  cajaError.innerHTML = "";

  const btn = $("#btn-enviar-pedido");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  const items = Object.values(carritoLineas).map(function (l) {
    return { id: l.producto.id, nombre: l.producto.nombre, precio: l.producto.precio, cantidad: l.cantidad, nota: l.nota || "" };
  });

  try {
    const data = await apiPost({
      accion: "crear", cliente: nombre, telefono: telefono, tipo: tipoEntrega,
      direccion: direccion, items: items, notas: notas, total: totalCarrito(),
    });

    ultimoIdEnviado = data.id;
    try { localStorage.setItem("lasfritas_ultimo_pedido", data.id); } catch (e) {}

    Object.keys(carritoLineas).forEach(function (id) { delete carritoLineas[id]; });
    document.querySelectorAll(".tarjeta-producto").forEach(function (t) { actualizarTarjetaProducto(t.dataset.id); });
    actualizarResumenCarrito();

    if (window.innerWidth < 1000) $("#overlay-carrito").classList.add("oculto");
    $("#texto-id-confirmacion").textContent = data.id;
    $("#overlay-confirmacion").classList.remove("oculto");
    lanzarConfeti();
  } catch (err) {
    cajaError.innerHTML = '<div class="mensaje-error">No pudimos enviar tu pedido. ' + err.message + "</div>";
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar pedido";
  }
});

function lanzarConfeti() {
  const contenedor = $("#contenedor-confeti");
  const emojis = ["🎉", "🔥", "🍟", "🍔", "✨"];
  for (let i = 0; i < 14; i++) {
    const pieza = document.createElement("span");
    pieza.className = "confeti-pieza";
    pieza.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    pieza.style.left = Math.random() * 100 + "%";
    pieza.style.animationDelay = Math.random() * 0.4 + "s";
    contenedor.appendChild(pieza);
    setTimeout(function () { pieza.remove(); }, 2000);
  }
}

$("#btn-seguir-pidiendo").addEventListener("click", function () {
  $("#overlay-confirmacion").classList.add("oculto");
});
$("#btn-ver-mi-pedido").addEventListener("click", function () {
  $("#overlay-confirmacion").classList.add("oculto");
  cambiarVista("seguimiento");
  $("#input-id-pedido").value = ultimoIdEnviado || "";
  buscarPedido(ultimoIdEnviado);
});

// ============================================================
// NAVEGACIÓN ENTRE VISTAS (mobile + desktop)
// ============================================================
function cambiarVista(vista) {
  $("#vista-pedir").classList.toggle("oculto", vista !== "pedir");
  $("#vista-seguimiento").classList.toggle("oculto", vista !== "seguimiento");
  document.querySelectorAll('[data-vista="pedir"]').forEach(function (b) { b.classList.toggle("activo", vista === "pedir"); });
  document.querySelectorAll('[data-vista="seguimiento"]').forEach(function (b) { b.classList.toggle("activo", vista === "seguimiento"); });
  if (window.innerWidth < 1000) {
    barraCarrito.classList.toggle("oculto", vista !== "pedir" || cantidadTotalCarrito() === 0);
  }

  if (vista !== "seguimiento" && intervaloSeguimiento) {
    clearInterval(intervaloSeguimiento);
    intervaloSeguimiento = null;
  }
}
document.querySelectorAll('[data-vista]').forEach(function (btn) {
  btn.addEventListener("click", function () { cambiarVista(btn.dataset.vista); });
});

// ============================================================
// SEGUIMIENTO DE PEDIDO
// ============================================================
$("#btn-buscar-pedido").addEventListener("click", function () { buscarPedido($("#input-id-pedido").value.trim()); });
$("#input-id-pedido").addEventListener("keydown", function (e) { if (e.key === "Enter") buscarPedido($("#input-id-pedido").value.trim()); });

function renderEstadoVacio(mensaje, emoji) {
  $("#resultado-seguimiento").innerHTML = '<div class="estado-vacio"><span class="emoji">' + (emoji || "🔎") + "</span>" + mensaje + "</div>";
}

async function buscarPedido(id) {
  if (intervaloSeguimiento) { clearInterval(intervaloSeguimiento); intervaloSeguimiento = null; }
  if (!id) { renderEstadoVacio("Escribe el código que te dimos al hacer el pedido."); return; }
  await consultarYRenderizar(id);
  intervaloSeguimiento = setInterval(function () { consultarYRenderizar(id); }, 5000);
}

async function consultarYRenderizar(id) {
  try {
    const data = await apiGet({ id: id });
    if (!data.pedidos || data.pedidos.length === 0) {
      renderEstadoVacio("No encontramos un pedido con ese código. Revisa que esté bien escrito.", "🤔");
      return;
    }
    renderSeguimiento(data.pedidos[0]);
  } catch (err) {
    renderEstadoVacio("No pudimos consultar tu pedido ahora mismo. Intenta de nuevo en un momento.", "⚠️");
  }
}

function renderSeguimiento(pedido) {
  let items = [];
  try { items = JSON.parse(pedido.items); } catch (e) {}

  const flujo = flujoParaTipo(pedido.tipo);
  const idxActual = flujo.indexOf(pedido.estado);

  const pasos = flujo.map(function (clave, i) {
    const estado = estadoInfo(clave);
    let clase = "";
    if (i < idxActual) clase = "completado";
    if (i === idxActual) clase = "actual";
    return (
      '<div class="paso-estado ' + clase + '" style="--estado-color:' + estado.color + '">' +
        '<div class="linea"></div>' +
        '<div class="punto">' + estado.icon + "</div>" +
        '<div class="texto"><strong>' + estado.label + "</strong>" +
        (i === idxActual ? "<span>Estado actual</span>" : "") +
        "</div>" +
      "</div>"
    );
  }).join("");

  const listaItems = items.map(function (it) {
    return '<div class="fila">' + it.cantidad + "× " + it.nombre + (it.nota ? " (" + it.nota + ")" : "") + '<strong>' + formatoPesos(it.precio * it.cantidad) + "</strong></div>";
  }).join("");

  $("#resultado-seguimiento").innerHTML =
    '<div class="tarjeta-resumen-pedido">' +
      '<div class="fila"><span>Código</span><strong>' + pedido.id + "</strong></div>" +
      '<div class="fila"><span>Tipo</span><strong>' + (pedido.tipo === "domicilio" ? "🏠 A domicilio" : "🏬 Recoger en el local") + "</strong></div>" +
      listaItems +
      '<div class="fila"><span>Total</span><strong>' + formatoPesos(pedido.total) + "</strong></div>" +
    "</div>" +
    '<div class="stepper-estado">' + pasos + "</div>";
}

// ============================================================
// BOTÓN "VOLVER ARRIBA"
// ============================================================
function iniciarBotonArriba() {
  const boton = $("#btn-arriba");
  const objetivoScroll = window.innerWidth >= 1000 ? window : $("#vista-pedir");
  window.addEventListener("scroll", function () {
    boton.classList.toggle("mostrar", window.scrollY > 500);
  });
  boton.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ============================================================
// INICIO
// ============================================================
function init() {
  iniciarMarquesina();
  renderCategorias();
  renderMenu();
  actualizarResumenCarrito();
  iniciarScrollSpy();
  iniciarBotonArriba();

  const params = new URLSearchParams(window.location.search);
  const idEnLink = params.get("id");
  if (idEnLink) {
    cambiarVista("seguimiento");
    $("#input-id-pedido").value = idEnLink;
    buscarPedido(idEnLink);
  } else {
    try {
      const guardado = localStorage.getItem("lasfritas_ultimo_pedido");
      if (guardado) $("#input-id-pedido").value = guardado;
    } catch (e) {}
  }
}

init();
