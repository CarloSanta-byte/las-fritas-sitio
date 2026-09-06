// ============================================================
// LAS FRITAS — Panel de cocina / recepción
// ============================================================

const $ = (sel) => document.querySelector(sel);

let filtroActual = "todos";
let pedidosActuales = [];
const idsYaVistos = new Set();
let primeraCarga = true;
let terminoBusquedaStaff = "";
let mostrarEntregadosEnTodos = false;

// ============================================================
// RELOJ
// ============================================================
function actualizarReloj() {
  const ahora = new Date();
  $("#reloj").textContent = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
actualizarReloj();
setInterval(actualizarReloj, 15000);

// ============================================================
// BÚSQUEDA Y TOGGLE DE ENTREGADOS
// ============================================================
$("#input-buscar-staff").addEventListener("input", function (e) {
  terminoBusquedaStaff = e.target.value;
  $("#btn-limpiar-busqueda-staff").classList.toggle("oculto", terminoBusquedaStaff.trim() === "");
  renderPedidos();
});
$("#btn-limpiar-busqueda-staff").addEventListener("click", function () {
  $("#input-buscar-staff").value = "";
  terminoBusquedaStaff = "";
  $("#btn-limpiar-busqueda-staff").classList.add("oculto");
  renderPedidos();
});
$("#chk-mostrar-entregados").addEventListener("change", function (e) {
  mostrarEntregadosEnTodos = e.target.checked;
  renderTabs();
  renderPedidos();
});

function pedidoCoincideBusqueda(pedido, query) {
  if (!query) return true;
  const texto = normalizarTexto(pedido.cliente + " " + pedido.telefono + " " + pedido.id);
  return texto.indexOf(query) !== -1;
}

// ============================================================
// TABS DE ESTADO
// ============================================================
function renderTabs() {
  const conteos = {};
  ESTADOS.forEach(function (e) { conteos[e.key] = 0; });
  pedidosActuales.forEach(function (p) { if (conteos[p.estado] !== undefined) conteos[p.estado]++; });

  const totalTodos = pedidosActuales.filter(function (p) {
    return mostrarEntregadosEnTodos || p.estado !== "Entregado";
  }).length;

  const tabs = ['<button class="tab-estado' + (filtroActual === "todos" ? " activa" : "") +
    '" data-filtro="todos" style="' + (filtroActual === "todos" ? "background:var(--gold)" : "") +
    '">📋 Todos <span class="contador">' + totalTodos + "</span></button>"];

  ESTADOS.forEach(function (e) {
    const activa = filtroActual === e.key;
    tabs.push(
      '<button class="tab-estado' + (activa ? " activa" : "") + '" data-filtro="' + e.key +
      '" style="' + (activa ? "background:" + e.color : "") + '">' +
      e.icon + " " + e.label + ' <span class="contador">' + conteos[e.key] + "</span></button>"
    );
  });

  $("#tabs-estado").innerHTML = tabs.join("");
  $("#tabs-estado").querySelectorAll("[data-filtro]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      filtroActual = btn.dataset.filtro;
      renderTabs();
      renderPedidos();
    });
  });

  const activos = pedidosActuales.filter(function (p) { return p.estado !== "Entregado"; }).length;
  $("#contador-activos").textContent = activos + (activos === 1 ? " pedido activo" : " pedidos activos");
}

// ============================================================
// TARJETAS DE PEDIDO
// ============================================================
function renderPedidos() {
  const contenedor = $("#columna-pedidos");
  const query = normalizarTexto(terminoBusquedaStaff.trim());

  let lista = pedidosActuales;
  if (filtroActual === "todos") {
    lista = lista.filter(function (p) { return mostrarEntregadosEnTodos || p.estado !== "Entregado"; });
  } else {
    lista = lista.filter(function (p) { return p.estado === filtroActual; });
  }
  lista = lista.filter(function (p) { return pedidoCoincideBusqueda(p, query); });

  if (lista.length === 0) {
    contenedor.innerHTML = '<div class="estado-vacio" style="grid-column:1/-1"><span class="emoji">🍽️</span>' +
      (query ? "Ningún pedido coincide con esa búsqueda." : "No hay pedidos en este estado.") + "</div>";
    return;
  }

  contenedor.innerHTML = lista.map(renderTarjeta).join("");

  contenedor.querySelectorAll("select.selector-estado").forEach(function (sel) {
    sel.addEventListener("change", function () { cambiarEstado(sel.dataset.id, sel.value); });
  });
  contenedor.querySelectorAll(".btn-siguiente").forEach(function (btn) {
    btn.addEventListener("click", function () { cambiarEstado(btn.dataset.id, btn.dataset.siguiente); });
  });
}

function renderTarjeta(pedido) {
  let items = [];
  try { items = JSON.parse(pedido.items); } catch (e) {}

  const info = estadoInfo(pedido.estado);
  const siguienteKey = siguienteEstadoEnFlujo(pedido.estado, pedido.tipo);
  const siguiente = siguienteKey ? estadoInfo(siguienteKey) : null;
  const esNuevo = !idsYaVistos.has(pedido.id) && !primeraCarga;
  const esEntregado = pedido.estado === "Entregado";

  const listaItems = items.map(function (it) {
    return "<li><span>" + it.cantidad + "× " + escaparHtml(it.nombre) +
      (it.nota ? '<span class="nota-item">📝 ' + escaparHtml(it.nota) + "</span>" : "") +
      "</span><span>" + formatoPesos(it.precio * it.cantidad) + "</span></li>";
  }).join("");

  // El selector solo ofrece los estados que tienen sentido para este tipo
  // de pedido (recoger en el local se salta "En camino").
  const flujo = flujoParaTipo(pedido.tipo);
  const opciones = flujo.map(function (clave) {
    const e = estadoInfo(clave);
    return '<option value="' + clave + '"' + (clave === pedido.estado ? " selected" : "") + ">" + e.icon + " " + e.label + "</option>";
  }).join("");

  return (
    '<article class="tarjeta-pedido' + (esNuevo ? " nuevo" : "") + (esEntregado ? " entregado" : "") + '" style="--estado-color:' + info.color + '">' +
      '<div class="cabecera-pedido">' +
        '<span class="id-corto">#' + pedido.id + "</span>" +
        '<span class="hace">' + tiempoDesde(pedido.timestamp) + "</span>" +
      "</div>" +
      '<div class="tipo-badge">' + (pedido.tipo === "domicilio" ? "🏠 A domicilio" : "🏬 Recoger en el local") + "</div>" +
      '<div class="cliente-nombre">' + escaparHtml(pedido.cliente) + " · " + escaparHtml(pedido.telefono) + "</div>" +
      (pedido.tipo === "domicilio" ? '<div class="direccion">' + escaparHtml(pedido.direccion) + "</div>" : "") +
      '<ul class="items">' + listaItems + "</ul>" +
      (pedido.notas ? '<div class="notas">📝 ' + escaparHtml(pedido.notas) + "</div>" : "") +
      '<div class="pie-pedido">' +
        '<select class="selector-estado" data-id="' + pedido.id + '">' + opciones + "</select>" +
        (siguiente
          ? '<button class="btn btn-primario btn-siguiente" data-id="' + pedido.id + '" data-siguiente="' + siguiente.key + '">' + siguiente.icon + " " + siguiente.label + "</button>"
          : "") +
      "</div>" +
    "</article>"
  );
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto || "";
  return div.innerHTML;
}

// ============================================================
// ACCIONES
// ============================================================
async function cambiarEstado(id, estado) {
  try {
    await apiPost({ accion: "actualizarEstado", id: id, estado: estado });
    await cargarPedidos();
  } catch (err) {
    alert("No se pudo actualizar el pedido: " + err.message);
  }
}

// ============================================================
// CARGA PERIÓDICA
// ============================================================
function mostrarSkeletons() {
  const contenedor = $("#columna-pedidos");
  contenedor.innerHTML = '<div class="skeleton-pedido"></div><div class="skeleton-pedido"></div><div class="skeleton-pedido"></div>';
}

async function cargarPedidos() {
  try {
    const data = await apiGet();
    pedidosActuales = data.pedidos || [];
    renderTabs();
    renderPedidos();
    pedidosActuales.forEach(function (p) { idsYaVistos.add(p.id); });
    primeraCarga = false;
  } catch (err) {
    $("#columna-pedidos").innerHTML =
      '<div class="estado-vacio" style="grid-column:1/-1"><span class="emoji">⚠️</span>No se pudo conectar con la base de pedidos.<br>' +
      "Revisa API_URL en config.js.<br><small>" + err.message + "</small></div>";
  }
}

mostrarSkeletons();
cargarPedidos();
setInterval(cargarPedidos, 4000);
