// ============================================================
// LAS FRITAS — Lógica del cliente
// ============================================================

const carrito = {}; // { [id]: { producto, cantidad } }
let tipoEntrega = "local";
let ultimoIdEnviado = null;
let intervaloSeguimiento = null;

// ---------- Elementos ----------
const $ = (sel) => document.querySelector(sel);
const contenedorMenu = $("#contenedor-menu");
const listaCategorias = $("#lista-categorias");
const badgeCarrito = $("#badge-carrito");
const iconoCarrito = $("#btn-abrir-carrito");
const barraCarrito = $("#barra-carrito");

// ============================================================
// RENDER DEL MENÚ
// ============================================================
function idSeccion(categoria) {
  return "cat-" + categoria.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function renderCategorias() {
  listaCategorias.innerHTML = MENU.map(function (grupo, i) {
    return '<button class="pill' + (i === 0 ? " activa" : "") + '" data-target="' +
      idSeccion(grupo.categoria) + '">' + grupo.categoria + "</button>";
  }).join("");

  listaCategorias.querySelectorAll(".pill").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.getElementById(btn.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderMenu() {
  contenedorMenu.innerHTML = MENU.map(function (grupo) {
    const tarjetas = grupo.items.map(renderTarjetaProducto).join("");
    return '<section class="seccion-categoria" id="' + idSeccion(grupo.categoria) + '">' +
      "<h2>" + grupo.categoria + "</h2>" + tarjetas + "</section>";
  }).join("");

  contenedorMenu.querySelectorAll("[data-accion]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.dataset.id;
      if (btn.dataset.accion === "sumar") cambiarCantidad(id, 1);
      if (btn.dataset.accion === "restar") cambiarCantidad(id, -1);
    });
  });
}

function buscarProducto(id) {
  for (const grupo of MENU) {
    const p = grupo.items.find(function (it) { return it.id === id; });
    if (p) return p;
  }
  return null;
}

function renderTarjetaProducto(p) {
  return (
    '<article class="tarjeta-producto">' +
      '<div class="nombre-fila"><h3>' + p.nombre + "</h3>" +
      '<span class="precio">' + formatoPesos(p.precio) + "</span></div>" +
      (p.nota ? '<span class="nota">' + p.nota + "</span>" : "") +
      '<p class="descripcion">' + p.descripcion + "</p>" +
      '<div class="fila-agregar">' +
        '<div class="stepper" id="stepper-' + p.id + '">' +
          '<button data-accion="restar" data-id="' + p.id + '" aria-label="Quitar uno">−</button>' +
          '<span class="cantidad" id="cantidad-' + p.id + '">0</span>' +
          '<button data-accion="sumar" data-id="' + p.id + '" aria-label="Agregar uno">+</button>' +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

// ============================================================
// CARRITO
// ============================================================
function cambiarCantidad(id, delta) {
  const producto = buscarProducto(id);
  if (!producto) return;

  const actual = carrito[id] ? carrito[id].cantidad : 0;
  const nueva = Math.max(0, actual + delta);

  if (nueva === 0) {
    delete carrito[id];
  } else {
    carrito[id] = { producto: producto, cantidad: nueva };
  }

  const spanCantidad = document.getElementById("cantidad-" + id);
  if (spanCantidad) spanCantidad.textContent = nueva;

  if (delta > 0) {
    iconoCarrito.classList.remove("animar");
    void iconoCarrito.offsetWidth; // reinicia la animación
    iconoCarrito.classList.add("animar");
  }

  actualizarResumenCarrito();
}

function totalCarrito() {
  return Object.values(carrito).reduce(function (acc, l) {
    return acc + l.producto.precio * l.cantidad;
  }, 0);
}

function cantidadTotalCarrito() {
  return Object.values(carrito).reduce(function (acc, l) { return acc + l.cantidad; }, 0);
}

function actualizarResumenCarrito() {
  const cantidad = cantidadTotalCarrito();
  const total = totalCarrito();

  if (cantidad > 0) {
    badgeCarrito.textContent = cantidad;
    badgeCarrito.classList.remove("oculto");
    barraCarrito.classList.remove("oculto");
    $("#texto-barra-carrito").textContent = cantidad + (cantidad === 1 ? " producto" : " productos");
    $("#texto-barra-total").textContent = formatoPesos(total);
  } else {
    badgeCarrito.classList.add("oculto");
    barraCarrito.classList.add("oculto");
  }
}

function renderListaCarritoEnHoja() {
  const contenedor = $("#lista-items-carrito");
  const lineas = Object.values(carrito);

  if (lineas.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--muted); text-align:center; padding:16px 0;">Tu carrito está vacío.</p>';
  } else {
    contenedor.innerHTML = lineas.map(function (l) {
      return (
        '<div class="fila-carrito">' +
          '<div class="info"><strong>' + l.producto.nombre + '</strong>' +
          '<span>' + l.cantidad + " × " + formatoPesos(l.producto.precio) + "</span></div>" +
          '<div class="stepper">' +
            '<button data-accion="restar" data-id="' + l.producto.id + '" aria-label="Quitar uno">−</button>' +
            '<span class="cantidad">' + l.cantidad + "</span>" +
            '<button data-accion="sumar" data-id="' + l.producto.id + '" aria-label="Agregar uno">+</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    contenedor.querySelectorAll("[data-accion]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.id;
        cambiarCantidad(id, btn.dataset.accion === "sumar" ? 1 : -1);
        renderListaCarritoEnHoja();
      });
    });
  }

  $("#total-carrito").textContent = formatoPesos(totalCarrito());
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
  $("#overlay-carrito").classList.add("oculto");
}

iconoCarrito.addEventListener("click", abrirCarrito);
barraCarrito.addEventListener("click", abrirCarrito);
$("#btn-cerrar-carrito").addEventListener("click", cerrarCarrito);

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

  const items = Object.values(carrito).map(function (l) {
    return { id: l.producto.id, nombre: l.producto.nombre, precio: l.producto.precio, cantidad: l.cantidad };
  });

  try {
    const data = await apiPost({
      accion: "crear",
      cliente: nombre,
      telefono: telefono,
      tipo: tipoEntrega,
      direccion: direccion,
      items: items,
      notas: notas,
      total: totalCarrito(),
    });

    ultimoIdEnviado = data.id;
    try { localStorage.setItem("lasfritas_ultimo_pedido", data.id); } catch (e) {}

    Object.keys(carrito).forEach(function (id) { delete carrito[id]; });
    document.querySelectorAll(".cantidad").forEach(function (el) { el.textContent = "0"; });
    actualizarResumenCarrito();

    cerrarCarrito();
    $("#texto-id-confirmacion").textContent = data.id;
    $("#overlay-confirmacion").classList.remove("oculto");
  } catch (err) {
    cajaError.innerHTML = '<div class="mensaje-error">No pudimos enviar tu pedido. ' + err.message + "</div>";
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar pedido";
  }
});

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
// NAVEGACIÓN ENTRE VISTAS
// ============================================================
function cambiarVista(vista) {
  $("#vista-pedir").classList.toggle("oculto", vista !== "pedir");
  $("#vista-seguimiento").classList.toggle("oculto", vista !== "seguimiento");
  $("#tab-pedir").classList.toggle("activo", vista === "pedir");
  $("#tab-seguimiento").classList.toggle("activo", vista === "seguimiento");
  barraCarrito.classList.toggle("oculto", vista !== "pedir" || cantidadTotalCarrito() === 0);

  if (vista !== "seguimiento" && intervaloSeguimiento) {
    clearInterval(intervaloSeguimiento);
    intervaloSeguimiento = null;
  }
}
$("#tab-pedir").addEventListener("click", function () { cambiarVista("pedir"); });
$("#tab-seguimiento").addEventListener("click", function () { cambiarVista("seguimiento"); });

// ============================================================
// SEGUIMIENTO DE PEDIDO
// ============================================================
$("#btn-buscar-pedido").addEventListener("click", function () {
  buscarPedido($("#input-id-pedido").value.trim());
});
$("#input-id-pedido").addEventListener("keydown", function (e) {
  if (e.key === "Enter") buscarPedido($("#input-id-pedido").value.trim());
});

function renderEstadoVacio(mensaje, emoji) {
  $("#resultado-seguimiento").innerHTML =
    '<div class="estado-vacio"><span class="emoji">' + (emoji || "🔎") + "</span>" + mensaje + "</div>";
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

  const idxActual = indiceEstado(pedido.estado);

  const pasos = ESTADOS.map(function (estado, i) {
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
    return '<div class="fila">' + it.cantidad + "× " + it.nombre + '<strong>' + formatoPesos(it.precio * it.cantidad) + "</strong></div>";
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
// INICIO
// ============================================================
function init() {
  renderCategorias();
  renderMenu();
  actualizarResumenCarrito();

  // Si llegan con un link tipo index.html?id=abc123, los llevamos directo
  // a ver el estado de ese pedido.
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
