"use strict";
const { $, all, safe, money, toast } = LF;
let token = LF.read("lasfritas_staff", "", true);
let orders = [],
  summary = null,
  selected = null,
  filter = "activos",
  search = "",
  loading = false,
  changing = false,
  failures = 0,
  timer,
  session = 0,
  lastUpdate = null;
let unseen = new Set(),
  seen = new Set(),
  first = true;
let acknowledged = new Set();
let pendingRender = false;
let uncertain = new Set();
let soundOn = false,
  audio,
  timerSound;
function info(state) {
  return ESTADOS.find((s) => s.key === state) || ESTADOS[0];
}
function age(timestamp) {
  const n = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000),
  );
  return n < 1
    ? "Ahora"
    : n < 60
      ? n + " min"
      : Math.floor(n / 60) + " h " + (n % 60) + " min";
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function showPanel() {
  $("#login").hidden = true;
  $("#kitchen-panel").hidden = false;
  $("#kitchen-controls").hidden = false;
}
function schedule() {
  clearTimeout(timer);
  if (token)
    timer = setTimeout(
      load,
      Math.min(60000, 8000 * 2 ** Math.min(failures, 3)),
    );
}
async function load() {
  clearTimeout(timer);
  if (!token || loading || changing) {
    schedule();
    return;
  }
  loading = true;
  const version = session;
  $("#refresh").disabled = true;
  try {
    const data = await LF.request({ accion: "listar", token });
    if (version !== session) return;
    if (!Array.isArray(data.pedidos))
      throw Error("La lista de pedidos no llegó completa.");
    showPanel();
    LF.save("lasfritas_staff", token, true);
    $("#staff-key").value = "";
    failures = 0;
    lastUpdate = new Date();
    $("#connection").textContent =
      "Actualizado " + lastUpdate.toLocaleTimeString("es-CO");
    $("#connection").classList.remove("stale");
    orders = data.pedidos;
    summary = data.resumen;
    orders.forEach((p) => {
      if (
        p.estado === "Recibido" &&
        !acknowledged.has(p.id) &&
        (first || !seen.has(p.id))
      )
        unseen.add(p.id);
      seen.add(p.id);
    });
    [...unseen].forEach((id) => {
      if (!orders.some((p) => p.id === id && p.estado === "Recibido"))
        unseen.delete(id);
    });
    first = false;
    uncertain.clear();
    if (!selected || !orders.some((p) => p.id === selected))
      selected =
        orders.find((p) => p.estado !== "Entregado")?.id ||
        orders[0]?.id ||
        null;
    renderFilters();
    renderQueue();
    if (
      document.activeElement.closest("#order-detail") ||
      $("#correct-dialog").open
    )
      pendingRender = true;
    else renderDetail();
    renderAlert();
  } catch (e) {
    if (version !== session) return;
    failures++;
    if (e.code === "AUTH") {
      logout();
      $("#login-error").textContent = e.message;
      return;
    }
    $("#login-error").textContent = e.message;
    $("#connection").textContent =
      "Sin actualizar" +
      (lastUpdate
        ? " · último dato " + lastUpdate.toLocaleTimeString("es-CO")
        : "") +
      ". Reintentando…";
    $("#connection").classList.add("stale");
  } finally {
    loading = false;
    $("#refresh").disabled = false;
    $("#login-submit").disabled = false;
    schedule();
  }
}
function matches(p) {
  return (
    (filter === "activos" ? p.estado !== "Entregado" : p.estado === filter) &&
    (!search ||
      LF.norm(p.cliente + " " + p.telefono + " " + p.id).includes(
        LF.norm(search),
      ))
  );
}
function renderFilters() {
  const focus = document.activeElement.dataset.filter;
  $("#state-filters").innerHTML = [
    { key: "activos", label: "Activos" },
    ...ESTADOS,
  ]
    .map(
      (s) =>
        `<button data-filter="${s.key}" aria-pressed="${s.key === filter}">${safe(s.label)} ${orders.filter((p) => (s.key === "activos" ? p.estado !== "Entregado" : p.estado === s.key)).length}</button>`,
    )
    .join("");
  if (focus)
    all("[data-filter]")
      .find((b) => b.dataset.filter === focus)
      ?.focus({ preventScroll: true });
}
function renderQueue() {
  const list = orders
    .filter(matches)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const focus = document.activeElement.dataset.select;
  const scroll = $("#queue").scrollTop;
  $("#queue-count").textContent = list.length + " pedidos";
  $("#queue").innerHTML = list.length
    ? list
        .map((p) => {
          const s = info(p.estado);
          const items = LF.items(p);
          return `<button class="queue-order" data-select="${safe(p.id)}" aria-pressed="${selected === p.id}" style="--state:${s.color}"><div class="queue-meta"><code>#${safe(p.id.slice(-6))}</code><span class="age ${Date.now() - new Date(p.timestamp) > 1200000 && p.estado !== "Entregado" ? "waiting" : ""}" data-date="${safe(p.timestamp)}">${age(p.timestamp)}</span></div><h3>${safe(p.cliente)}</h3><p class="queue-products">${items
            .slice(0, 2)
            .map((it) => safe(it.cantidad) + " × " + safe(it.nombre))
            .join(
              "<br>",
            )}${items.length > 2 ? "<br>+ " + (items.length - 2) + " líneas más" : ""}</p><div class="queue-foot"><span>${s.icon} ${safe(s.label)}</span><span>${p.tipo === "domicilio" ? "Domicilio" : "Recoger"}</span></div>${unseen.has(p.id) ? '<span class="received-tag">POR REVISAR</span>' : ""}</button>`;
        })
        .join("")
    : '<div class="empty"><p>' +
      (search ? "Ningún pedido coincide." : "No hay pedidos en este estado.") +
      "</p></div>";
  $("#queue").scrollTop = scroll;
  if (focus)
    all("[data-select]")
      .find((b) => b.dataset.select === focus)
      ?.focus({ preventScroll: true });
}
function renderDetail() {
  pendingRender = false;
  const p = orders.find((p) => p.id === selected);
  if (!p) {
    $("#order-detail").innerHTML =
      '<div class="empty"><h2>Todo a la vista.</h2><p>Los pedidos aparecerán aquí al recibirlos.</p></div>';
    return;
  }
  const s = info(p.estado),
    flow = LF.flow(p.tipo),
    next = flow[flow.findIndex((x) => x.key === p.estado) + 1];
  const actions = {
    Preparando: "Empezar preparación",
    "Listo para entregar": "Marcar listo",
    "En camino": "Marcar en camino",
    Entregado: "Marcar entregado",
  };
  $("#order-detail").innerHTML =
    `<button id="back-queue" class="plain back-queue">← Volver a la cola</button><div class="order-header"><div><span class="eyebrow">${p.tipo === "domicilio" ? "A DOMICILIO" : "RECOGER EN EL LOCAL"}</span><h2>${safe(p.cliente)}</h2><span class="order-code">#${safe(p.id)}</span></div><span class="state-badge" style="--state:${s.color}">${s.icon} ${safe(s.label)}</span></div><div class="order-customer"><p><strong>Teléfono:</strong> ${safe(p.telefono)}</p>${p.tipo === "domicilio" ? `<p><strong>Dirección:</strong> ${safe(p.direccion)}</p>` : ""}<p>Creado ${safe(new Date(p.timestamp).toLocaleString("es-CO", { timeZone: "America/Bogota" }))} · <strong data-date="${safe(p.timestamp)}">${age(p.timestamp)}</strong></p></div><ul class="order-items">${LF.items(
      p,
    )
      .map(
        (it) =>
          `<li><div class="item-line"><span class="item-count">${safe(it.cantidad)}×</span><span class="item-name">${safe(it.nombre)}</span></div>${it.nota ? `<p class="item-note">${safe(it.nota)}</p>` : ""}</li>`,
      )
      .join(
        "",
      )}</ul>${p.notas ? `<div class="order-general-note"><strong>NOTAS DEL PEDIDO</strong><br>${safe(p.notas)}</div>` : ""}${uncertain.has(p.id) ? '<p class="notice">No pudimos confirmar el cambio. Actualiza para consultar el estado antes de volver a avanzar.</p>' : ""}<div class="order-actions"><div><span class="small">Total productos</span><div class="order-total">${money(p.total)}</div></div>${next ? `<button id="next-state" class="button primary next-state" data-next="${next.key}" data-previous="${p.estado}" ${changing || uncertain.has(p.id) ? "disabled" : ""}>${changing ? "Confirmando…" : actions[next.key]}</button>` : "<strong>🎉 Entregado</strong>"}</div><div class="order-tools"><button id="print" class="button">Imprimir ticket</button>${whatsapp(p)}<button id="correct" class="plain" ${changing || uncertain.has(p.id) ? "disabled" : ""}>Corregir estado</button></div>`;
  $("#back-queue").onclick = () => {
    document.body.classList.remove("detail-open");
    all("[data-select]")
      .find((b) => b.dataset.select === selected)
      ?.focus();
  };
  $("#next-state")?.addEventListener("click", (e) =>
    changeState(
      p.id,
      e.currentTarget.dataset.next,
      e.currentTarget.dataset.previous,
    ),
  );
  $("#print").onclick = () => printOrder(p);
  $("#correct").onclick = () => openCorrection(p);
}
async function changeState(id, state, previous) {
  if (changing || uncertain.has(id)) return;
  if (!navigator.onLine) {
    toast("Sin conexión. Conservamos el estado anterior.");
    return;
  }
  const version = session;
  changing = true;
  renderDetail();
  try {
    await LF.request({
      accion: "actualizarEstado",
      token,
      id,
      estado: state,
      estadoAnterior: previous,
    });
    if (version !== session) return;
    const p = orders.find((p) => p.id === id);
    if (p) p.estado = state;
    unseen.delete(id);
    acknowledged.add(id);
    toast("Estado confirmado: " + state);
    LF.animate($("#order-detail"), [{ opacity: 0.7 }, { opacity: 1 }], 160);
  } catch (e) {
    if (version !== session) return;
    if (e.code === "AUTH") {
      logout();
      return;
    }
    uncertain.add(id);
    toast("No se confirmó el cambio. " + e.message);
  } finally {
    changing = false;
    if (version === session && token) {
      renderFilters();
      renderQueue();
      renderDetail();
      renderAlert();
      load();
    }
  }
}
function openCorrection(p) {
  $("#correct-description").textContent =
    "Pedido #" + p.id + " · Estado actual: " + p.estado;
  $("#correct-state").innerHTML = LF.flow(p.tipo)
    .map(
      (s) =>
        `<option value="${s.key}" ${s.key === p.estado ? "selected" : ""}>${s.label}</option>`,
    )
    .join("");
  $("#correct-confirm").onclick = () => {
    const state = $("#correct-state").value;
    $("#correct-dialog").close();
    if (state !== p.estado) changeState(p.id, state, p.estado);
  };
  LF.open($("#correct-dialog"));
}
function renderAlert() {
  const n = unseen.size;
  $("#new-alert").hidden = !n;
  $("#new-count").textContent =
    n +
    (n === 1
      ? " pedido recibido por revisar"
      : " pedidos recibidos por revisar");
  document.title = n
    ? "(" + n + ") ¡Pedido nuevo! · Las Fritas"
    : "Las Fritas · Cocina";
  if (n && !timerSound) {
    beep();
    timerSound = setInterval(beep, 15000);
  }
  if (!n) {
    clearInterval(timerSound);
    timerSound = null;
  }
}
function beep() {
  if (!soundOn || !audio) return;
  if (audio.state !== "running") {
    $("#sound").textContent = "Reactivar sonido";
    return;
  }
  [0, 0.22, 0.44].forEach((offset, i) => {
    const o = audio.createOscillator(),
      g = audio.createGain(),
      t = audio.currentTime + offset;
    o.frequency.value = i === 1 ? 1046 : 784;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + 0.2);
  });
}
$("#sound").onclick = async () => {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state !== "running") {
      await audio.resume();
      soundOn = true;
    } else soundOn = !soundOn;
    $("#sound").textContent = soundOn ? "Sonido activo" : "Activar sonido";
    $("#sound").setAttribute("aria-pressed", String(soundOn));
    if (soundOn) beep();
  } catch {
    toast("No se pudo activar el sonido. La alerta visual permanece.");
  }
};
$("#review-new").onclick = () => {
  filter = "Recibido";
  search = "";
  $("#staff-search").value = "";
  unseen.forEach((id) => acknowledged.add(id));
  unseen.clear();
  renderAlert();
  renderFilters();
  renderQueue();
  document.body.classList.remove("detail-open");
  $("#queue").focus();
};
$("#queue").onclick = (e) => {
  const b = e.target.closest("[data-select]");
  if (!b) return;
  selected = b.dataset.select;
  renderQueue();
  renderDetail();
  document.body.classList.add("detail-open");
  $("#order-detail").focus({ preventScroll: true });
};
$("#state-filters").onclick = (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  filter = b.dataset.filter;
  renderFilters();
  renderQueue();
  document.body.classList.remove("detail-open");
};
$("#staff-search").oninput = (e) => {
  search = e.target.value;
  renderQueue();
};
$("#summary-open").onclick = () => {
  if (!summary) return;
  $("#summary-body").innerHTML =
    `<p>${safe(summary.fecha)} · Colombia</p><div class="summary-grid"><div class="metric"><span>Pedidos de hoy</span><strong>${safe(summary.pedidos)}</strong></div><div class="metric"><span>Valor de pedidos de hoy</span><strong>${money(summary.valor)}</strong></div><div class="metric"><span>Entregados de hoy</span><strong>${safe(summary.entregados)}</strong></div><div class="metric"><span>Valor entregado de hoy</span><strong>${money(summary.valorEntregado)}</strong></div></div>`;
  LF.open($("#summary-dialog"));
};
$("#large-mode").onclick = () => {
  const active = document.body.classList.toggle("large");
  $("#large-mode").setAttribute("aria-pressed", String(active));
  LF.save("lasfritas_cocina_grande", active);
};
if (LF.read("lasfritas_cocina_grande")) {
  document.body.classList.add("large");
  $("#large-mode").setAttribute("aria-pressed", "true");
}
function whatsapp(p) {
  let number = String(p.telefono).replace(/\D/g, "");
  if (number.length === 10 && number.startsWith("3")) number = "57" + number;
  if (!/^\d{10,15}$/.test(number)) return "";
  const msg =
    "Hola " +
    p.cliente +
    ", tu pedido #" +
    p.id +
    " en Las Fritas está: " +
    p.estado +
    ".\n" +
    LF.link(p.id);
  return `<a class="button" href="https://wa.me/${number}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">Avisar por WhatsApp ↗</a>`;
}
function printOrder(p) {
  $("#print-ticket").innerHTML =
    `<h1>LAS FRITAS</h1><p>Ticket de cocina · no es factura</p><hr><h2>#${safe(p.id)}</h2><p>${safe(new Date(p.timestamp).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</p><h2>${p.tipo === "domicilio" ? "A DOMICILIO" : "RECOGER EN LOCAL"}</h2><p>${safe(p.cliente)}</p><p>Tel: ${safe(p.telefono)}</p>${p.tipo === "domicilio" ? `<p>${safe(p.direccion)}</p>` : ""}<hr><ul>${LF.items(
      p,
    )
      .map(
        (it) =>
          `<li><strong>${safe(it.cantidad)} × ${safe(it.nombre)}</strong>${it.nota ? `<p>NOTA: ${safe(it.nota)}</p>` : ""}<p>${money(it.precio * it.cantidad)}</p></li>`,
      )
      .join(
        "",
      )}</ul><hr>${p.notas ? `<p>NOTAS: ${safe(p.notas)}</p>` : ""}<h2>Total productos: ${money(p.total)}</h2><p>Estado: ${safe(p.estado)}</p>`;
  window.print();
}
window.addEventListener(
  "afterprint",
  () => ($("#print-ticket").innerHTML = ""),
);
function logout() {
  session++;
  clearTimeout(timer);
  clearInterval(timerSound);
  timerSound = null;
  token = "";
  LF.save("lasfritas_staff", null, true);
  orders = [];
  summary = null;
  selected = null;
  seen.clear();
  unseen.clear();
  acknowledged.clear();
  uncertain.clear();
  first = true;
  $("#staff-key").value = "";
  $("#kitchen-panel").hidden = true;
  $("#kitchen-controls").hidden = true;
  $("#login").hidden = false;
  $("#queue").innerHTML = "";
  $("#order-detail").innerHTML = "";
  $("#print-ticket").innerHTML = "";
  $("#summary-body").innerHTML = "";
  $("#correct-description").textContent = "";
  all("dialog[open]").forEach((d) => d.close());
  document.title = "Las Fritas · Cocina";
  $("#staff-key").focus();
}
$("#login").onsubmit = (e) => {
  e.preventDefault();
  if (loading) return;
  token = $("#staff-key").value;
  $("#login-submit").disabled = true;
  $("#login-error").textContent = "Conectando…";
  load();
};
$("#logout").onclick = logout;
$("#refresh").onclick = load;
window.addEventListener("online", load);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load();
});
$("#order-detail").addEventListener("focusout", () =>
  setTimeout(() => {
    if (
      pendingRender &&
      !document.activeElement.closest("#order-detail") &&
      !$("#correct-dialog").open
    )
      renderDetail();
  }, 0),
);
setInterval(() => {
  all("[data-date]").forEach((el) => (el.textContent = age(el.dataset.date)));
  all(".queue-order").forEach((el) => {
    const p = orders.find((p) => p.id === el.dataset.select);
    $(".age", el)?.classList.toggle(
      "waiting",
      p &&
        p.estado !== "Entregado" &&
        Date.now() - new Date(p.timestamp) > 1200000,
    );
  });
}, 30000);
if (token) load();
