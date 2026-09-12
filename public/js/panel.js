"use strict";
let measurementVersion = 0;
let boardMode = LF.read("lasfritas_tablero", false);
let targetMinutes = LF.read("lasfritas_meta", 20);
if (!Number.isFinite(targetMinutes) || targetMinutes < 1 || targetMinutes > 240)
  targetMinutes = 20;
let activeView = "operacion";
const paintedOrders = new Set();
const panelModules = new Map();
async function loadModule(name) {
  if (panelModules.has(name)) return panelModules.get(name);
  const promise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "js/" + name + ".js";
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      panelModules.delete(name);
      reject(Error("No se pudo cargar la vista. Intenta de nuevo."));
    };
    document.head.append(s);
  });
  panelModules.set(name, promise);
  return promise;
}
async function loadOperational(key) {
  const version = session;
  let cursor,
    tope,
    data,
    result = [];
  do {
    data = await LF.request({
      accion: "listar",
      token: key,
      paginado: true,
      ...(cursor ? { cursor, tope } : {}),
    });
    if (version !== session) throw Error("Sesión terminada.");
    if (!Array.isArray(data.pedidos)) throw Error("Respuesta incompleta.");
    if (!data.versionMedicion) return data;
    result.push(...data.pedidos);
    cursor = data.cursor;
    tope = data.tope;
  } while (cursor);
  const unique = [...new Map(result.map((p) => [p.id, p])).values()];
  const day = today(),
    dateFormat = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  const todayOrders = unique.filter(
    (p) =>
      Number.isFinite(new Date(p.timestamp).getTime()) &&
      dateFormat.format(new Date(p.timestamp)) === day,
  );
  const delivered = todayOrders.filter((p) => p.estado === "Entregado");
  return {
    ...data,
    pedidos: unique,
    resumen: {
      fecha: day,
      pedidos: todayOrders.length,
      valor: todayOrders.reduce((s, p) => s + Number(p.total || 0), 0),
      entregados: delivered.length,
      valorEntregado: delivered.reduce((s, p) => s + Number(p.total || 0), 0),
    },
  };
}
function updateBackendStatus() {
  $("#backend-status").textContent =
    measurementVersion >= 4
      ? "Pulsa cada avance cuando ocurra. Los tiempos reflejan el registro del equipo, no un cronómetro físico."
      : "Backend anterior: puedes operar; para medir y registrar mostrador debes publicar Code.gs v4 y ejecutar prepararSistema.";
}
function timeLevel(p) {
  const start = new Date(p.timestamp).getTime();
  if (!Number.isFinite(start) || p.estado === "Entregado") return "";
  const ratio = (Date.now() - start) / (targetMinutes * 60000);
  return ratio >= 1
    ? "late"
    : ratio >= 0.9
      ? "urgent"
      : ratio >= 0.75
        ? "soon"
        : "";
}
function elapsedText(p) {
  const end =
    p.estado === "Entregado" && p.tsEntregado
      ? new Date(p.tsEntregado).getTime()
      : Date.now();
  const start = new Date(p.timestamp).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end))
    return "Sin datos de tiempo";
  return Math.max(0, Math.floor((end - start) / 60000)) + " min";
}
function timerMarkup(p) {
  const level = timeLevel(p);
  return `<strong class="process-clock ${level}">${safe(elapsedText(p))}</strong><span class="state-clock">En este estado: ${p.tsUltimoCambio ? safe(p.estado === "Entregado" ? "Finalizado" : age(p.tsUltimoCambio)) : "sin datos de tiempo"}</span>${level ? `<span class="time-label">${level === "late" ? "Meta superada" : level === "urgent" ? "Cerca de la meta" : "Revisar avance"}</span>` : ""}`;
}
function decorateTimers() {
  all(".queue-order").forEach((el) => {
    const p = orders.find((p) => p.id === el.dataset.select);
    if (!p) return;
    let box = $(".process-times", el);
    if (!box) {
      box = document.createElement("div");
      box.className = "process-times";
      el.append(box);
    }
    const prev = el.dataset.level;
    el.dataset.level = timeLevel(p);
    box.innerHTML = timerMarkup(p);
    if (!paintedOrders.has(p.id)) {
      paintedOrders.add(p.id);
      if (Date.now() - new Date(p.timestamp).getTime() < 60000)
        LF.animate(
          el,
          [
            { transform: "translateY(6px)", opacity: 0.7 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          220,
        );
    }
    if (prev && prev !== el.dataset.level && el.dataset.level)
      LF.animate(el, [{ opacity: 0.65 }, { opacity: 1 }], 240);
  });
}
function renderBoard() {
  const q = $("#queue");
  const previous = document.activeElement;
  const id = previous?.dataset.id || previous?.dataset.select;
  const advance = previous?.dataset.advance;
  if (q.contains(previous) && previous.matches(":active")) return;
  $("#queue-count").textContent = orders.filter(matches).length + " pedidos";
  q.innerHTML = ESTADOS.filter((s) =>
    filter === "activos" ? s.key !== "Entregado" : s.key === filter,
  )
    .map((s) => {
      const list = orders
        .filter((p) => p.estado === s.key && matches(p))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return `<section class="state-column" aria-label="${safe(s.label)}"><h2 style="--state:${s.color}">${safe(s.label)} <b>${list.length}</b></h2>${
        list
          .map((p) => {
            const f = LF.flow(p.tipo),
              next = f[f.findIndex((s) => s.key === p.estado) + 1];
            const labels = {
              Preparando: "Empezar preparación",
              "Listo para entregar": "Marcar listo",
              "En camino": "Marcar en camino",
              Entregado: "Marcar entregado",
            };
            return `<article class="board-order" data-order="${safe(p.id)}"><button class="queue-order" data-select="${safe(p.id)}" aria-pressed="${selected === p.id}" style="--state:${s.color}"><div class="queue-meta"><code>#${safe(p.id.slice(-6))}</code><b>${p.tipo === "domicilio" ? "DOMICILIO" : "LOCAL"}</b></div><div class="process-times">${timerMarkup(p)}</div><p>${safe(p.cliente)}</p><p>${LF.items(
              p,
            )
              .slice(0, 2)
              .map((i) => `${safe(i.cantidad)} × ${safe(i.nombre)}`)
              .join(
                "<br>",
              )}</p>${unseen.has(p.id) ? '<span class="received-tag">POR REVISAR</span>' : ""}</button>${next ? `<button class="button primary board-advance" data-id="${safe(p.id)}" data-advance="${next.key}" data-previous="${p.estado}" ${changing || uncertain.has(p.id) ? "disabled" : ""}>${labels[next.key]}</button>` : ""}</article>`;
          })
          .join("") || '<p class="column-empty">Sin pedidos</p>'
      }</section>`;
    })
    .join("");
  decorateTimers();
  if (id)
    all(advance ? "[data-advance]" : "[data-select]", q)
      .find((b) => (b.dataset.id || b.dataset.select) === id)
      ?.focus({ preventScroll: true });
}
function appendProcessDetail(p) {
  const tools = $(".order-tools");
  if (!tools) return;
  const box = document.createElement("section");
  box.className = "process-detail";
  box.innerHTML = `<div class="process-times">${timerMarkup(p)}</div><p class="small">Canal: ${safe(p.canal || "sin dato histórico")} · Meta interna: ${targetMinutes} min</p>`;
  if (
    measurementVersion >= 4 &&
    (timeLevel(p) === "late" ||
      p.motivoDemora ||
      (p.tsEntregado &&
        p.tsRecibido &&
        new Date(p.tsEntregado) - new Date(p.tsRecibido) >
          targetMinutes * 60000))
  ) {
    box.innerHTML += `<fieldset><legend>Motivo de demora (opcional)</legend><div class="delay-options">${["falta de insumo", "equipo ocupado", "pedido grande", "alta demanda", "error en el pedido", "otro"].map((m) => `<button class="button" data-delay="${m}" aria-pressed="${p.motivoDemora === m}">${m}</button>`).join("")}</div><p class="small">Se guarda la causa indicada por el equipo; no implica una causa comprobada.</p></fieldset>`;
    box.onclick = async (e) => {
      const b = e.target.closest("[data-delay]");
      if (!b || changing) return;
      changing = true;
      const version = session;
      all("[data-delay]", box).forEach((b) => (b.disabled = true));
      try {
        await LF.request({
          accion: "motivoDemora",
          token,
          id: p.id,
          estadoAnterior: p.estado,
          motivo: b.dataset.delay,
          motivoAnterior: p.motivoDemora || "",
        });
        if (version === session) {
          toast("Causa registrada");
          window.Analisis?.invalidate();
        }
      } catch (err) {
        if (version === session) toast(err.message);
      } finally {
        changing = false;
        if (version === session) load();
      }
    };
  }
  let events = [];
  try {
    events = JSON.parse(p.historialEstados || "[]");
  } catch {}
  if (events.length)
    box.innerHTML += `<details><summary>Historial del registro (${events.length})</summary><ol>${events
      .slice(-30)
      .map(
        (e) =>
          `<li>${safe(new Date(e.hora).toLocaleString("es-CO", { timeZone: "America/Bogota" }))} · ${safe(e.tipo === "demora" ? "Causa: " + e.a : (e.de || "Nuevo") + " → " + e.a)}${e.correccion ? " · Corrección: " + safe(e.motivo) : ""}</li>`,
      )
      .join(
        "",
      )}</ol>${events.length > 30 ? "<p>Últimos 30 eventos. El CSV incluye el historial completo.</p>" : ""}</details>`;
  tools.after(box);
}
function syncBoard() {
  document.body.classList.toggle("board-mode", boardMode);
  $("#board-mode").textContent = boardMode ? "Ver lista" : "Ver columnas";
  $("#board-mode").setAttribute("aria-pressed", String(boardMode));
}
$("#board-mode").onclick = () => {
  boardMode = !boardMode;
  LF.save("lasfritas_tablero", boardMode);
  syncBoard();
  renderQueue();
};
syncBoard();
async function chooseView(view) {
  const version = session;
  activeView = view;
  ["operacion", "mostrador", "analisis"].forEach(
    (v) => ($("#view-" + v).hidden = v !== view),
  );
  all("[data-view]").forEach((b) => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (view === "operacion") return;
  const box = $("#view-" + view);
  try {
    if (view === "analisis") {
      await loadModule("metricas");
      await loadModule("analisis");
      if (version === session && activeView === view) window.Analisis.open();
    } else {
      await loadModule("mostrador");
      if (version === session && activeView === view) window.Mostrador.open();
    }
  } catch (e) {
    if (version === session) box.textContent = e.message;
  }
}
all("[data-view]").forEach(
  (b) => (b.onclick = () => chooseView(b.dataset.view)),
);
function resetPanel() {
  window.Analisis?.reset();
  window.Mostrador?.reset();
  activeView = "operacion";
  $("#view-mostrador").innerHTML = "";
  $("#view-analisis").innerHTML = "";
  chooseView("operacion");
  measurementVersion = 0;
  paintedOrders.clear();
}
setInterval(() => {
  if (!token || document.hidden) return;
  decorateTimers();
}, 15000);
