// ============================================================
// LAS FRITAS — Panel de cocina / recepción
// ============================================================

const $ = (sel) => document.querySelector(sel);

let filtroActual = "todos";
let pedidosActuales = [];
const idsYaVistos = new Set();
let primeraCarga = true;

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
// TABS DE ESTADO
// ============================================================
function renderTabs() {
  const conteos = {};
  ESTADOS.forEach(function (e) { conteos[e.key] = 0; });
  pedidosActuales.forEach(function (p) { if (conteos[p.estado] !== undefined) conteos[p.estado]++; });

  const tabs = ['<button class="tab-estado' + (filtroActual === "todos" ? " activa" : "") +
    '" data-filtro="todos" style="' + (filtroActual === "todos" ? "background:var(--gold)" : "") +
    '">Todos <span class="contador">' + pedidosActuales.length + "</span></button>"];

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
}

// ============================================================
// TARJETAS DE PEDIDO
// ============================================================
function renderPedidos() {
  const contenedor = $("#columna-pedidos");
  const lista = filtroActual === "todos"
    ? pedidosActuales
    : pedidosActuales.filter(function (p) { return p.estado === filtroActual; });

  if (lista.length === 0) {
    contenedor.innerHTML = '<div class="estado-vacio" style="grid-column:1/-1"><span class="emoji">🍽️</span>No hay pedidos en este estado.</div>';
    return;
  }

  contenedor.innerHTML = lista.map(renderTarjeta).join("");

  contenedor.querySelectorAll("select.selector-estado").forEach(function (sel) {
    sel.addEventListener("change", function () {
      cambiarEstado(sel.dataset.id, sel.value);
    });
  });
  contenedor.querySelectorAll(".btn-siguiente").forEach(function (btn) {
    btn.addEventListener("click", function () {
      cambiarEstado(btn.dataset.id, btn.dataset.siguiente);
    });
  });
}

function renderTarjeta(pedido) {
  let items = [];
  try { items = JSON.parse(pedido.items); } catch (e) {}

  const info = estadoInfo(pedido.estado);
  const idx = indiceEstado(pedido.estado);
  const siguiente = idx >= 0 && idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null;
  const esNuevo = !idsYaVistos.has(pedido.id) && !primeraCarga;

  const listaItems = items.map(function (it) {
    return "<li><span>" + it.cantidad + "× " + it.nombre + "</span><span>" + formatoPesos(it.precio * it.cantidad) + "</span></li>";
  }).join("");

  const opciones = ESTADOS.map(function (e) {
    return '<option value="' + e.key + '"' + (e.key === pedido.estado ? " selected" : "") + ">" + e.icon + " " + e.label + "</option>";
  }).join("");

  return (
    '<article class="tarjeta-pedido' + (esNuevo ? " nuevo" : "") + '" style="--estado-color:' + info.color + '">' +
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
          ? '<button class="btn btn-primario btn-siguiente" data-id="' + pedido.id + '" data-siguiente="' + siguiente.key + '">' + siguiente.icon + " Siguiente</button>"
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

cargarPedidos();
setInterval(cargarPedidos, 4000);
