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
let claveStaff = leerGuardado("lasfritas_staff", "", "session");
let cargando = false;
let timerCarga;
let fallosCarga = 0;
let ultimaFirma = "";
let ultimaActualizacion = null;
let sesionVersion = 0;
let resumenActual = null;
const cambiando = new Set();
const nuevosSinRevisar = new Set();
let audioCocina = null;
let sonidoActivo = false;
let timerAlarma;

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
  const focoFiltro = document.activeElement.dataset.filtro;
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
    btn.setAttribute("aria-pressed", String(btn.dataset.filtro === filtroActual));
    btn.addEventListener("click", function () {
      filtroActual = btn.dataset.filtro;
      renderTabs();
      renderPedidos();
    });
  });

  const activos = pedidosActuales.filter(function (p) { return p.estado !== "Entregado"; }).length;
  $("#contador-activos").textContent = activos + (activos === 1 ? " pedido activo" : " pedidos activos");
  if (focoFiltro) [...$("#tabs-estado").querySelectorAll("button")].find(b => b.dataset.filtro === focoFiltro)?.focus({ preventScroll: true });
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
  lista = lista.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

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
  contenedor.querySelectorAll("[data-imprimir]").forEach(btn => btn.addEventListener("click", () => imprimirPedido(btn.dataset.imprimir)));
}

function renderTarjeta(pedido) {
  const items = leerItems(pedido);

  const info = estadoInfo(pedido.estado);
  const siguienteKey = siguienteEstadoEnFlujo(pedido.estado, pedido.tipo);
  const siguiente = siguienteKey ? estadoInfo(siguienteKey) : null;
  const esNuevo = nuevosSinRevisar.has(pedido.id);
  const esEntregado = pedido.estado === "Entregado";

  const listaItems = items.map(function (it) {
    return "<li><span>" + htmlSeguro(it.cantidad) + "× " + escaparHtml(it.nombre) +
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
    '<article class="tarjeta-pedido' + (esNuevo ? " nuevo" : "") + (esEntregado ? " entregado" : "") + (Date.now() - new Date(pedido.timestamp) > 1200000 && !esEntregado ? " espera" : "") + '" data-pedido="' + htmlSeguro(pedido.id) + '" style="--estado-color:' + info.color + '">' +
      '<div class="cabecera-pedido">' +
        '<span class="id-corto">#' + htmlSeguro(pedido.id) + "</span>" +
        '<span class="hace" data-fecha="' + htmlSeguro(pedido.timestamp) + '">' + tiempoDesde(pedido.timestamp) + "</span>" +
      "</div>" +
      '<div class="tipo-badge">' + (pedido.tipo === "domicilio" ? "🏠 A domicilio" : "🏬 Recoger en el local") + "</div>" +
      '<div class="cliente-nombre">' + escaparHtml(pedido.cliente) + " · " + escaparHtml(pedido.telefono) + "</div>" +
      (pedido.tipo === "domicilio" ? '<div class="direccion">' + escaparHtml(pedido.direccion) + "</div>" : "") +
      '<ul class="items">' + listaItems + "</ul>" +
      (pedido.notas ? '<div class="notas">📝 ' + escaparHtml(pedido.notas) + "</div>" : "") +
      '<div class="pedido-utilidades"><strong class="total-pedido">' + formatoPesos(pedido.total) + '</strong><button class="btn btn-secundario" data-imprimir="' + htmlSeguro(pedido.id) + '">Imprimir ticket</button>' + enlaceWhatsAppPedido(pedido) + '</div>' +
      '<div class="pie-pedido">' +
        '<select class="selector-estado" aria-label="Estado del pedido ' + htmlSeguro(pedido.id) + '" data-id="' + htmlSeguro(pedido.id) + '"' + (cambiando.has(pedido.id) ? " disabled" : "") + '>' + opciones + "</select>" +
        (siguiente
          ? '<button class="btn btn-primario btn-siguiente" data-id="' + htmlSeguro(pedido.id) + '" data-siguiente="' + siguiente.key + '"' + (cambiando.has(pedido.id) ? " disabled" : "") + '>' + siguiente.icon + " " + siguiente.label + "</button>"
          : "") +
      "</div>" +
    "</article>"
  );
}

function escaparHtml(texto) {
  return htmlSeguro(texto);
}

// ============================================================
// ACCIONES
// ============================================================
async function cambiarEstado(id, estado) {
  if (cambiando.has(id)) return;
  const pedido = pedidosActuales.find(p => p.id === id);
  if (!pedido) return;
  const version = sesionVersion;
  cambiando.add(id);
  renderPedidos();
  try {
    await apiPost({ accion: "actualizarEstado", token: claveStaff, id, estado, estadoAnterior: pedido.estado });
    if (version !== sesionVersion) return;
    pedido.estado = estado;
    nuevosSinRevisar.delete(id);
    actualizarAlerta();
    ultimaFirma = "";
  } catch (err) {
    if (version !== sesionVersion) return;
    if (err.code === "AUTH") { cerrarSesion(); return; }
    mostrarAviso("No se pudo actualizar: " + err.message);
  } finally {
    cambiando.delete(id);
    if (version === sesionVersion && claveStaff) { renderTabs(); renderPedidos(); cargarPedidos(); }
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
  clearTimeout(timerCarga);
  if (!claveStaff || cargando || cambiando.size) { programarCarga(); return; }
  const version = sesionVersion;
  cargando = true;
  $("#btn-actualizar").disabled = true;
  try {
    const data = await apiPost({ accion: "listar", token: claveStaff });
    if (version !== sesionVersion) return;
    mostrarPanel(true);
    guardar("lasfritas_staff", claveStaff, "session");
    fallosCarga = 0;
    ultimaActualizacion = new Date();
    $("#estado-conexion").classList.remove("error");
    $("#estado-conexion").textContent = "● Conectado · " + ultimaActualizacion.toLocaleTimeString("es-CO");
    const firma = JSON.stringify(data.pedidos);
    (data.pedidos || []).forEach(p => {
      if ((!primeraCarga && !idsYaVistos.has(p.id) && p.estado !== "Entregado") || (primeraCarga && p.estado === "Recibido")) nuevosSinRevisar.add(p.id);
    });
    pedidosActuales = data.pedidos || [];
    if (firma !== ultimaFirma) {
      const foco = document.activeElement;
      const selectorAbierto = foco?.matches("select.selector-estado");
      // Espera a que el operador termine de elegir; los datos sí se actualizan.
      if (!selectorAbierto) { renderTabs(); renderPedidos(); ultimaFirma = firma; }
    }
    resumenActual = data.resumen;
    renderResumen();
    actualizarAlerta();
    pedidosActuales.forEach(function (p) { idsYaVistos.add(p.id); });
  primeraCarga = false;
  } catch (err) {
    if (version !== sesionVersion) return;
    fallosCarga++;
    if (err.code === "AUTH") { cerrarSesion(); $("#error-login").textContent = err.message; return; }
    $("#error-login").textContent = err.message + (err.message.includes("desconocida") ? " Publica primero el nuevo Code.gs; consulta LEEME.md." : "");
    $("#estado-conexion").classList.add("error");
    $("#estado-conexion").textContent = "⚠ Sin actualizar" + (ultimaActualizacion ? " · último dato " + ultimaActualizacion.toLocaleTimeString("es-CO") : "") + ". Reintentando…";
  } finally {
    cargando = false;
    $("#btn-actualizar").disabled = false;
    $("#btn-entrar").disabled = false;
    programarCarga();
  }
}

function programarCarga() {
  clearTimeout(timerCarga);
  if (claveStaff) timerCarga = setTimeout(cargarPedidos, Math.min(60000, 8000 * Math.pow(2, Math.min(fallosCarga, 3))));
}
function mostrarPanel(visible) {
  $("#staff-login").classList.toggle("oculto", visible);
  ["staff-panel", "staff-herramientas", "staff-buscador", "staff-filtros"].forEach(id => document.getElementById(id).classList.toggle("oculto", !visible));
}
function cerrarSesion() {
  sesionVersion++;
  claveStaff = "";
  guardar("lasfritas_staff", "", "session");
  pedidosActuales = []; idsYaVistos.clear(); nuevosSinRevisar.clear(); primeraCarga = true; ultimaFirma = "";
  clearTimeout(timerCarga); clearInterval(timerAlarma); timerAlarma = null;
  $("#columna-pedidos").innerHTML = ""; $("#ticket-impresion").innerHTML = "";
  $("#clave-staff").value = "";
  document.title = "Las Fritas — Cocina";
  mostrarPanel(false);
}
$("#staff-login").addEventListener("submit", e => {
  e.preventDefault(); if (cargando) return;
  claveStaff = $("#clave-staff").value;
  $("#error-login").textContent = "Conectando…"; $("#btn-entrar").disabled = true;
  cargarPedidos();
});
$("#btn-salir").addEventListener("click", cerrarSesion);
$("#btn-actualizar").addEventListener("click", cargarPedidos);
window.addEventListener("online", cargarPedidos);
document.addEventListener("visibilitychange", () => { if (!document.hidden) cargarPedidos(); });

function renderResumen() {
  if (!resumenActual) return;
  $("#metrica-pedidos").textContent = resumenActual.pedidos;
  $("#metrica-valor").textContent = formatoPesos(resumenActual.valor);
  $("#metrica-entregados").textContent = resumenActual.entregados;
  $("#metrica-entregado-valor").textContent = formatoPesos(resumenActual.valorEntregado);
  $("#fecha-resumen").textContent = resumenActual.fecha + " · Colombia";
}
function mostrarAviso(mensaje) {
  $("#toast").textContent = mensaje; $("#toast").classList.remove("oculto");
  setTimeout(() => $("#toast").classList.add("oculto"), 6000);
}
function sonar() {
  if (!sonidoActivo || !audioCocina) return;
  if (audioCocina.state !== "running") { $("#btn-sonido").textContent = "Reactivar sonido"; return; }
  [0, .22, .44].forEach((offset, i) => {
    const osc = audioCocina.createOscillator(), gain = audioCocina.createGain();
    const t = audioCocina.currentTime + offset;
    osc.type = "sine"; osc.frequency.value = i === 1 ? 1046 : 784;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.22, t + .025); gain.gain.exponentialRampToValueAtTime(.001, t + .18);
    osc.connect(gain); gain.connect(audioCocina.destination); osc.start(t); osc.stop(t + .2);
  });
}
$("#btn-sonido").addEventListener("click", async () => {
  try {
    if (!audioCocina) audioCocina = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCocina.state !== "running") { await audioCocina.resume(); sonidoActivo = true; }
    else sonidoActivo = !sonidoActivo;
    $("#btn-sonido").setAttribute("aria-pressed", String(sonidoActivo));
    $("#btn-sonido").textContent = sonidoActivo ? "Sonido activo ✓" : "Activar sonido";
    sonar();
  } catch (_) { mostrarAviso("No se pudo activar el sonido. Las alertas visuales siguen funcionando."); }
});
function actualizarAlerta() {
  [...nuevosSinRevisar].forEach(id => { if (!pedidosActuales.some(p => p.id === id && p.estado === "Recibido")) nuevosSinRevisar.delete(id); });
  const cantidad = nuevosSinRevisar.size;
  $("#alerta-pedidos").classList.toggle("oculto", !cantidad);
  $("#texto-alerta").textContent = cantidad + (cantidad === 1 ? " pedido recibido por revisar" : " pedidos recibidos por revisar");
  document.title = cantidad ? "(" + cantidad + ") ¡Pedido nuevo! · Las Fritas" : "Las Fritas — Cocina";
  if (cantidad && !timerAlarma) { sonar(); timerAlarma = setInterval(sonar, 15000); }
  if (!cantidad) { clearInterval(timerAlarma); timerAlarma = null; }
}
$("#btn-revisar-nuevos").addEventListener("click", () => {
  filtroActual = "Recibido"; terminoBusquedaStaff = ""; $("#input-buscar-staff").value = "";
  nuevosSinRevisar.clear(); actualizarAlerta(); renderTabs(); renderPedidos();
  $("#columna-pedidos").scrollIntoView({ behavior: "auto", block: "start" });
});
function enlaceWhatsAppPedido(pedido) {
  let numero = String(pedido.telefono || "").replace(/\D/g, "");
  if (numero.length === 10 && numero.startsWith("3")) numero = "57" + numero;
  if (!/^\d{10,15}$/.test(numero)) return "";
  const url = new URL("index.html", location.href); url.searchParams.set("id", pedido.id);
  const mensaje = "Hola " + pedido.cliente + ", tu pedido #" + pedido.id + " en Las Fritas está: " + pedido.estado + ". Sigue el pedido aquí: " + url.href;
  return '<a class="btn btn-secundario" href="https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje) + '" target="_blank" rel="noopener noreferrer">Avisar por WhatsApp ↗</a>';
}
function imprimirPedido(id) {
  const p = pedidosActuales.find(p => p.id === id); if (!p) return;
  const items = leerItems(p);
  $("#ticket-impresion").innerHTML = '<h1>LAS FRITAS</h1><p>Ticket de cocina · no es factura</p><hr><h2>#' + htmlSeguro(p.id) + '</h2><p>' + htmlSeguro(new Date(p.timestamp).toLocaleString("es-CO", { timeZone: "America/Bogota" })) + '</p><h2>' + (p.tipo === "domicilio" ? "A DOMICILIO" : "RECOGER EN LOCAL") + '</h2><p>' + htmlSeguro(p.cliente) + '</p><p>Tel: ' + htmlSeguro(p.telefono) + '</p>' + (p.tipo === "domicilio" ? '<p>' + htmlSeguro(p.direccion) + '</p>' : '') + '<hr><ul>' + items.map(it => '<li><b>' + htmlSeguro(it.cantidad) + ' × ' + htmlSeguro(it.nombre) + '</b>' + (it.nota ? '<p>NOTA: ' + htmlSeguro(it.nota) + '</p>' : '') + '<p>' + formatoPesos(it.precio * it.cantidad) + '</p></li>').join('') + '</ul><hr>' + (p.notas ? '<p><b>NOTAS: ' + htmlSeguro(p.notas) + '</b></p><hr>' : '') + '<h2>Total productos: ' + formatoPesos(p.total) + '</h2><p>Estado: ' + htmlSeguro(p.estado) + '</p>';
  window.print();
}
window.addEventListener("afterprint", () => { $("#ticket-impresion").innerHTML = ""; });
setInterval(() => {
  document.querySelectorAll("[data-fecha]").forEach(el => {
    el.textContent = tiempoDesde(el.dataset.fecha);
    const tarjeta = el.closest(".tarjeta-pedido");
    tarjeta.classList.toggle("espera", !tarjeta.classList.contains("entregado") && Date.now() - new Date(el.dataset.fecha) > 1200000);
  });
}, 30000);
if (claveStaff) cargarPedidos();
