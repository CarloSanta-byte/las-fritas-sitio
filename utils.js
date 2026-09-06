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
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data;
}

async function apiGet(params) {
  if (!API_URL || API_URL.indexOf("http") !== 0) {
    throw new Error("Falta configurar API_URL en config.js");
  }
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(API_URL + query);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error desconocido");
  return data;
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
