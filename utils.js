// ============================================================
// LAS FRITAS — Utilidades compartidas
// ============================================================

function formatoPesos(numero) {
  return "$" + Number(numero || 0).toLocaleString("es-CO");
}

function tiempoDesde(isoString) {
  const entonces = new Date(isoString).getTime();
  const ahora = Date.now();
  const minutos = Math.max(0, Math.round((ahora - entonces) / 60000));
  if (minutos < 1) return "hace un momento";
  if (minutos === 1) return "hace 1 min";
  if (minutos < 60) return "hace " + minutos + " min";
  const horas = Math.round(minutos / 60);
  return "hace " + horas + (horas === 1 ? " hora" : " horas");
}

// Apps Script no siempre maneja bien el "preflight" de las peticiones
// JSON entre dominios distintos. Enviar el cuerpo como texto plano evita
// ese problema; el backend igual lo interpreta como JSON.
async function apiPost(payload) {
  if (!API_URL || API_URL.indexOf("http") !== 0) {
    throw new Error("Falta configurar API_URL en config.js");
  }
  return solicitarApi(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

async function apiGet(params) {
  if (!API_URL || API_URL.indexOf("http") !== 0) {
    throw new Error("Falta configurar API_URL en config.js");
  }
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return solicitarApi(API_URL + query, { cache: "no-store" });
}

async function solicitarApi(url, opciones) {
  if (!navigator.onLine) throw new Error("No hay conexión. Tu carrito sigue guardado.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { ...opciones, signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error("El servidor no respondió correctamente. Intenta de nuevo.");
    const data = await res.json();
    if (!data.ok) {
      const error = new Error(data.error || "No se pudo completar la solicitud.");
      error.code = data.code;
      error.confirmado = true;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("La conexión tardó demasiado. Reintenta para confirmar el mismo pedido.");
    throw error;
  } finally { clearTimeout(timeout); }
}

function htmlSeguro(texto) {
  return String(texto == null ? "" : texto).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function leerGuardado(clave, valorInicial = null, tipoAlmacen = "local") {
  try { const almacen = tipoAlmacen === "session" ? window.sessionStorage : window.localStorage; return JSON.parse(almacen.getItem(clave)) ?? valorInicial; } catch (_) { return valorInicial; }
}
function guardar(clave, valor, tipoAlmacen = "local") {
  try { const almacen = tipoAlmacen === "session" ? window.sessionStorage : window.localStorage; almacen.setItem(clave, JSON.stringify(valor)); return true; } catch (_) { return false; }
}
function leerItems(pedido) {
  try { const items = typeof pedido.items === "string" ? JSON.parse(pedido.items) : pedido.items; return Array.isArray(items) ? items : []; } catch (_) { return []; }
}
function fechaColombia(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(fecha));
}

function estadoInfo(clave) {
  return ESTADOS.find(function (e) { return e.key === clave; }) || ESTADOS[0];
}

function indiceEstado(clave) {
  return ESTADOS.findIndex(function (e) { return e.key === clave; });
}

// El flujo real de un pedido depende del tipo de entrega: los que se
// recogen en el local se saltan el paso "En camino".
function indiceEnFlujo(clave, tipo) {
  const flujo = flujoParaTipo(tipo);
  return flujo.indexOf(clave);
}

function siguienteEstadoEnFlujo(clave, tipo) {
  const flujo = flujoParaTipo(tipo);
  const idx = flujo.indexOf(clave);
  if (idx === -1 || idx === flujo.length - 1) return null;
  return flujo[idx + 1];
}

// Quita tildes y pasa a minúsculas, para que buscar "salchipapa" también
// encuentre "Salchipapa" o "SALCHIPAPA" sin importar acentos.
function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
