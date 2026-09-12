"use strict";
const { $, all, safe, money, toast } = LF;
let category = 0;
let compared = new Set();
let query = "";
function renderMenu() {
  const list = PRESENTATION.products.filter((p) =>
    query
      ? LF.norm(p.nombre + " " + p.descripcion + " " + p.category).includes(
          LF.norm(query),
        )
      : p.categoryIndex === category,
  );
  $("#category-title").innerHTML =
    safe(query ? "Tu búsqueda" : MENU[category].categoria) + "<span>.</span>";
  $("#filter-meta").textContent = query
    ? list.length + " resultados para “" + query + "”"
    : "";
  $("#products").innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<article class="product ${p.nota === "Para compartir" ? "share" : ""} ${p.categoryIndex >= 7 || p.id === "combo-burger" ? "compact" : ""}" data-product="${p.id}"><div class="product-art">${PRESENTATION.image(p)}<span class="art-label">ILUSTRACIÓN</span></div><div class="product-info">${p.nota === "Para compartir" ? '<span class="product-tag">PARA COMPARTIR</span>' : ""}<button class="product-name" data-detail="${p.id}">${safe(p.nombre)}</button><p class="product-description">${safe(PRESENTATION.highlight(p))}</p><div class="product-bottom"><span class="product-price money">${money(p.precio)}</span><button class="quick-add" data-add="${p.id}" aria-label="Agregar ${safe(p.nombre)}">+</button></div>${p.categoryIndex === 0 ? `<label class="check-row"><input type="checkbox" data-compare="${p.id}" ${compared.has(p.id) ? "checked" : ""}>Comparar ingredientes</label>` : ""}</div></article>`,
        )
        .join("")
    : '<div class="empty"><h2>Ese antojo no aparece.</h2><p>Prueba otro nombre o ingrediente.</p></div>';
  all("#categories button[data-cat]").forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(!query && Number(b.dataset.cat) === category),
    ),
  );
  $("#clear-search").hidden = !query;
}
function chooseCategory(i) {
  category = i;
  query = "";
  $("#search").value = "";
  renderMenu();
  $("#menu").scrollIntoView({ block: "start", behavior: "auto" });
  window.Motion?.category();
}
$("#categories").innerHTML =
  '<button class="all-categories" id="all-categories">Todas</button>' +
  MENU.map(
    (g, i) =>
      `<button data-cat="${i}" aria-pressed="${i === 0}">${safe(g.categoria)}</button>`,
  ).join("");
$("#category-index").innerHTML = MENU.map(
  (g, i) =>
    `<button data-cat="${i}">${safe(g.categoria)} <span class="small">(${g.items.length})</span></button>`,
).join("");
$("#categories").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (b) chooseCategory(Number(b.dataset.cat));
});
$("#all-categories").onclick = () => LF.open($("#categories-dialog"));
$("#category-index").onclick = (e) => {
  const b = e.target.closest("[data-cat]");
  if (b) {
    $("#categories-dialog").close();
    chooseCategory(Number(b.dataset.cat));
  }
};
$("#search").oninput = (e) => {
  query = e.target.value.trim();
  renderMenu();
};
$("#clear-search").onclick = () => {
  query = "";
  $("#search").value = "";
  renderMenu();
  $("#search").focus();
};
$("#products").onclick = (e) => {
  const b = e.target.closest("[data-add]");
  if (b) {
    try {
      const p = PRESENTATION.index[b.dataset.add];
      if (p.id === "combo-burger" || p.id === "granizado-licor") {
        openDetail(p.id);
        return;
      }
      Cart.quick(p.id);
      window.Motion?.fly(b);
      toast(p.nombre + " agregado");
      LF.animate(
        b,
        [{ transform: "scale(.87)" }, { transform: "scale(1)" }],
        100,
      );
      feedback();
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  const d = e.target.closest("[data-detail]");
  if (d) openDetail(d.dataset.detail);
};
$("#products").onchange = (e) => {
  const id = e.target.dataset.compare;
  if (!id) return;
  if (e.target.checked && compared.size >= 3) {
    e.target.checked = false;
    toast("Compara hasta tres salchipapas.");
    return;
  }
  e.target.checked ? compared.add(id) : compared.delete(id);
  updateCompare();
};
function updateCompare() {
  $("#compare-bar").hidden = !compared.size;
  $("#compare-count").textContent = compared.size + " seleccionadas";
}
$("#compare-clear").onclick = () => {
  compared.clear();
  updateCompare();
  renderMenu();
};
$("#compare-open").onclick = () => {
  $("#comparison").innerHTML =
    '<div class="comparison-grid">' +
    [...compared]
      .map((id) => {
        const p = PRESENTATION.index[id];
        return `<article class="compare-product">${PRESENTATION.image(p)}<h3>${safe(p.nombre)}</h3><strong>${money(p.precio)}</strong><p>${safe(PRESENTATION.highlight(p))}</p><p class="small">${safe(p.descripcion)}</p><button class="button" data-choose="${id}">Ver y personalizar</button></article>`;
      })
      .join("") +
    "</div>";
  LF.open($("#compare-dialog"));
};
$("#comparison").onclick = (e) => {
  const b = e.target.closest("[data-choose]");
  if (b) {
    $("#compare-dialog").close();
    openDetail(b.dataset.choose);
  }
};
let priorTrayCount = 0;
function renderTray() {
  const count = Cart.count();
  $("#tray-bar").hidden = !count || !$("#tracking-view").hidden;
  $("#tray-count").textContent = count;
  $("#tray-total").textContent = money(Cart.total());
  $("#desktop-tray").innerHTML =
    `<span class="eyebrow">AQUÍ SE JUNTA LO BUENO</span><div class="tray-graphic"><img src="assets/illustrations/${count ? "fries" : "tray"}.svg" width="240" height="180" alt=""></div><div class="tray-filling" aria-hidden="true">${Array.from({ length: Math.min(count, 8) }, () => "<span></span>").join("")}</div><h2>Tu bandeja<span>.</span></h2>${
      count
        ? Cart.blocks
            .slice(0, 3)
            .map(
              (b) =>
                `<div class="tray-line"><span>${b.quantity} × ${safe(PRESENTATION.index[b.id].nombre)}</span></div>`,
            )
            .join("") +
          (Cart.blocks.length > 3
            ? `<p>Y ${Cart.blocks.length - 3} platos más.</p>`
            : "") +
          `<div class="tray-total"><span>Productos</span><span>${money(Cart.total())}</span></div><button class="button" id="desktop-checkout">Revisar y enviar ↗</button>`
        : '<p>Tú eliges el antojo.<br>Nosotros le ponemos todo.</p><span class="small">Agrega un plato para empezar.</span>'
    }`;
  $("#desktop-checkout")?.addEventListener("click", openCart);
  $("#cart-live").textContent =
    count + " unidades en tu pedido. Total productos " + money(Cart.total());
  if (count > priorTrayCount) {
    LF.animate(
      $(".tray-filling"),
      [
        { transform: "translateY(-7px)", opacity: 0.2 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      220,
    );
    LF.animate(
      $("#tray-count"),
      [{ transform: "scale(.8)" }, { transform: "scale(1)" }],
      160,
    );
  }
  priorTrayCount = count;
}
document.addEventListener("cartchange", () => {
  renderTray();
  if ($("#cart-dialog").open) renderCart();
});
$("#tray-bar").onclick = () => openCart();
renderMenu();
renderTray();

let detailId = null,
  detailKey = null,
  detailQty = 1;
let detailExtras = [];
function openDetail(id, key) {
  if (Cart.pending || Cart.busy) {
    toast("Confirma primero el envío pendiente desde tu pedido.");
    return;
  }
  const p = PRESENTATION.index[id];
  if (!p) return;
  const source = document.querySelector(
    `[data-product="${id}"] .product-art img`,
  );
  const sourceRect = source?.getBoundingClientRect();
  const b = Cart.blocks.find((x) => x.key === key);
  detailId = id;
  detailKey = key || null;
  detailQty = b?.quantity || 1;
  detailExtras = structuredClone(b?.extras || []);
  const hasExtras = p.categoryIndex < 7 && p.id !== "combo-burger";
  const ref = b?.ref || String(Cart.next);
  const max = 200 - ("[Plato " + ref + "] ").length;
  $("#detail-body").innerHTML =
    `<div class="detail-hero">${PRESENTATION.image(p)}<div><h2 id="detail-title">${safe(p.nombre)}</h2><span class="detail-price">${money(p.precio)}</span></div></div><p class="detail-original">${safe(p.descripcion)}</p>${id === "mega-frita-queso" ? '<p class="notice">El show de queso se realiza en la mesa según el menú. Confirma con el local cómo aplica si pides para recoger o a domicilio.</p>' : ""}${id === "granizado-licor" ? '<label class="check-row notice"><input id="adult" type="checkbox">Confirmo que soy mayor de edad.</label>' : ""}<label for="product-note">Indicaciones para este plato (opcional)</label><textarea id="product-note" maxlength="${max}" rows="2" placeholder="Por ejemplo: sin cebolla">${safe(b?.note || "")}</textarea><p class="small"><span id="note-left">${max - (b?.note || "").length}</span> caracteres disponibles. Escribe datos de contacto solo al enviar.</p><div class="quantity-row"><strong>Cantidad de platos</strong><div class="stepper"><button id="detail-minus" aria-label="Quitar una unidad">−</button><span id="detail-quantity">${detailQty}</span><button id="detail-plus" aria-label="Agregar una unidad">+</button></div></div>${hasExtras ? `<div class="extras"><h3>¿Le ponemos algo más?</h3><p class="small">Opcional. Las cantidades de adicionales son por cada plato.</p>${p.categoryIndex === 1 ? `<label class="check-row"><input id="combo" type="checkbox" ${detailExtras.some((x) => x.id === "combo-burger") ? "checked" : ""}>${safe(PRESENTATION.index["combo-burger"].nombre)} · ${money(8000)} por plato</label><div id="combo-options" class="combo-options" ${detailExtras.some((x) => x.id === "combo-burger") ? "" : "hidden"}>${comboFields(detailExtras.find((x) => x.id === "combo-burger")?.note)}</div>` : ""}<details><summary>Ver los 15 adicionales</summary><div id="extras-options"></div></details></div>` : id === "combo-burger" ? `<div class="combo-options">${comboFields(b?.note)}</div>` : ""}<div class="detail-actions"><p id="detail-breakdown" class="detail-breakdown"></p><button id="detail-add" class="button primary">${key ? "Guardar cambios" : "Agregar al pedido"}</button></div>`;
  $("#detail-minus").onclick = () => {
    detailQty = Math.max(1, detailQty - 1);
    updateDetail();
  };
  $("#detail-plus").onclick = () => {
    detailQty = Math.min(50, detailQty + 1);
    updateDetail();
  };
  $("#product-note").oninput = () => {
    $("#note-left").textContent = max - $("#product-note").value.length;
  };
  const extraSection = $(".extras details");
  if (extraSection)
    extraSection.addEventListener("toggle", () => {
      if (!extraSection.open || $("#extras-options").childElementCount) return;
      $("#extras-options").innerHTML = MENU[9].items
        .map(
          (x) =>
            `<div class="extra-row"><label for="extra-${x.id}">${safe(x.nombre)}<br><strong>${money(x.precio)}</strong></label><select id="extra-${x.id}" data-extra="${x.id}" aria-label="Cantidad de ${safe(x.nombre)} por plato">${Array.from({ length: 51 }, (_, i) => `<option value="${i}" ${detailExtras.find((a) => a.id === x.id)?.perUnit === i ? "selected" : ""}>${i}</option>`).join("")}</select></div>`,
        )
        .join("");
      all("[data-extra]", $("#detail-body")).forEach(
        (s) =>
          (s.onchange = () => {
            detailExtras = detailExtras.filter((x) => x.id !== s.dataset.extra);
            if (Number(s.value))
              detailExtras.push({
                id: s.dataset.extra,
                perUnit: Number(s.value),
                note: "",
              });
            updateDetail();
          }),
      );
    });
  $("#combo")?.addEventListener("change", (e) => {
    $("#combo-options").hidden = !e.target.checked;
    detailExtras = detailExtras.filter((x) => x.id !== "combo-burger");
    if (e.target.checked)
      detailExtras.push({ id: "combo-burger", perUnit: 1, note: "" });
    updateDetail();
  });
  $("#detail-add").onclick = () => {
    try {
      if (id === "granizado-licor" && !$("#adult").checked) {
        toast("Confirma que eres mayor de edad para agregar este producto.");
        $("#adult").focus();
        return;
      }
      let note = $("#product-note").value.trim();
      const combo = detailExtras.find((x) => x.id === "combo-burger");
      if (combo || id === "combo-burger") {
        const potato = $("#combo-potato").value,
          drink = $("#combo-drink").value;
        if (!potato || !drink) {
          toast("Elige la papa y la bebida del combo.");
          (!potato ? $("#combo-potato") : $("#combo-drink")).focus();
          return;
        }
        const c = potato + " + " + drink;
        if (combo) combo.note = c;
        else note = c + (note ? " · " + note : "");
      }
      Cart.add(id, detailQty, note, detailExtras, detailKey);
      window.Motion?.fly($("#detail-add"));
      $("#detail-dialog").close();
      toast(key ? "Plato actualizado" : p.nombre + " agregado");
      feedback();
    } catch (e) {
      toast(e.message);
    }
  };
  updateDetail();
  LF.open($("#detail-dialog"));
  window.Motion?.connect(source, sourceRect, $(".detail-hero img"));
}
function comboFields(note = "") {
  return `<div><label for="combo-potato">Papa del combo</label><select id="combo-potato"><option value="">Elige una</option><option ${note?.includes("Papa francesa") ? "selected" : ""}>Papa francesa</option><option ${note?.includes("Papa criolla") ? "selected" : ""}>Papa criolla</option></select></div><div><label for="combo-drink">Bebida del combo</label><select id="combo-drink"><option value="">Elige una</option><option ${note?.includes("Gaseosa personal") ? "selected" : ""}>Gaseosa personal</option><option ${note?.includes("Limonada natural") ? "selected" : ""}>Limonada natural</option></select></div>`;
}
function updateDetail() {
  renderIngredientLayers();
  $("#detail-quantity").textContent = detailQty;
  const base = PRESENTATION.index[detailId].precio * detailQty;
  const extra = detailExtras.reduce(
    (n, x) => n + PRESENTATION.index[x.id].precio * x.perUnit * detailQty,
    0,
  );
  $("#detail-breakdown").textContent =
    `Platos: ${money(base)}${extra ? " + adicionales: " + money(extra) : ""}`;
  $("#detail-add").textContent =
    (detailKey ? "Guardar cambios" : "Agregar al pedido") +
    " · " +
    money(base + extra);
}
function renderIngredientLayers() {
  const img = $(".detail-hero>img");
  if (img) {
    const wrapper = document.createElement("div");
    wrapper.className = "detail-art";
    img.replaceWith(wrapper);
    wrapper.append(img);
    const layer = document.createElement("div");
    layer.className = "detail-layers";
    layer.setAttribute("aria-hidden", "true");
    wrapper.append(layer);
  }
  const layer = $(".detail-layers");
  if (!layer) return;
  const previous = layer.dataset.ids || "";
  layer.innerHTML = detailExtras
    .map(
      (x) =>
        `<span class="detail-layer">+ ${safe(PRESENTATION.index[x.id].nombre.replace("Agrega combo a tu burger", "Combo"))}</span>`,
    )
    .join("");
  layer.dataset.ids = detailExtras.map((x) => x.id).join(",");
  if (previous !== layer.dataset.ids)
    LF.animate(
      layer,
      [
        { transform: "translateY(-7px)", opacity: 0.3 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      160,
    );
}
$("#surprise").onclick = () => {
  const choices = PRESENTATION.products.filter(
    (p) => p.categoryIndex < 7 && p.id !== "combo-burger",
  );
  const pool = choices.filter((p) => p.categoryIndex === category);
  const options = pool.length ? pool : choices;
  const p = options[Math.floor(Math.random() * options.length)];
  openDetail(p.id);
  window.Motion?.surprise($(".detail-hero"), options, p);
};

function renderCart() {
  const focused = document.activeElement;
  const key = focused?.closest("[data-block]")?.dataset.block;
  const action = focused?.dataset.action;
  $("#cart-body").innerHTML = Cart.blocks.length
    ? Cart.blocks
        .map((b) => {
          const p = PRESENTATION.index[b.id];
          const sum =
            (p.precio +
              b.extras.reduce(
                (n, x) => n + PRESENTATION.index[x.id].precio * x.perUnit,
                0,
              )) *
            b.quantity;
          return `<article class="block" data-block="${safe(b.key)}"><div class="block-head"><div>${b.ref ? `<span class="eyebrow">PLATO ${safe(b.ref)}</span>` : ""}<h3>${safe(p.nombre)}</h3><p>${b.quantity} × ${money(p.precio)}</p>${b.note ? `<p>${safe(b.note)}</p>` : ""}</div><strong class="money">${money(sum)}</strong></div>${b.extras.length ? '<div class="block-extras">' + b.extras.map((x) => `<div class="extra-cart"><span>${b.quantity * x.perUnit} × ${safe(PRESENTATION.index[x.id].nombre)} · ${money(PRESENTATION.index[x.id].precio * b.quantity * x.perUnit)}${x.note ? "<br>" + safe(x.note) : ""}</span><button class="plain" data-extra-remove="${x.id}" ${Cart.pending || Cart.busy ? "disabled" : ""} aria-label="Quitar ${safe(PRESENTATION.index[x.id].nombre)}">Quitar</button></div>`).join("") + "</div>" : ""}<div class="block-tools"><div class="stepper"><button data-action="minus" aria-label="Quitar una unidad de ${safe(p.nombre)}" ${Cart.pending || Cart.busy ? "disabled" : ""}>−</button><span>${b.quantity}</span><button data-action="plus" aria-label="Agregar una unidad de ${safe(p.nombre)}" ${Cart.pending || Cart.busy ? "disabled" : ""}>+</button></div><button class="plain" data-action="edit" ${Cart.pending || Cart.busy ? "disabled" : ""}>Editar</button><button class="plain" data-action="remove" ${Cart.pending || Cart.busy ? "disabled" : ""}>Quitar</button></div></article>`;
        })
        .join("") +
      `<div class="checkout-total"><span>Total productos</span><span>${money(Cart.total())}</span></div>`
    : '<div class="empty"><h3>Tu bandeja está esperando.</h3><p>Elige algo del menú para empezar.</p><button class="button" data-close>Ver el menú</button></div>';
  $("#checkout").hidden = !Cart.blocks.length && !Cart.pending;
  $("#checkout-fields").disabled = !!Cart.pending || Cart.busy;
  $("#pending-warning").hidden = !Cart.pending;
  $("#send").disabled = Cart.busy;
  $("#send").textContent = Cart.busy
    ? "Confirmando tu pedido…"
    : Cart.pending
      ? "Reintentar el mismo pedido"
      : "Enviar pedido · " + money(Cart.total());
  if (Cart.pending) {
    const payload = Cart.pending;
    $("#cart-body").innerHTML =
      payload.items
        .map(
          (it) =>
            `<article class="block"><h3>${safe(it.nombre || PRESENTATION.index[it.id]?.nombre || it.id)}</h3><p>${safe(it.cantidad)} × ${money(it.precio)}</p><p>${safe(it.nota || "")}</p></article>`,
        )
        .join("") +
      `<div class="checkout-total"><span>Total productos</span><span>${money(payload.total)}</span></div>`;
  }
  if (key && action) {
    const row = all("[data-block]", $("#cart-body")).find(
      (el) => el.dataset.block === key,
    );
    (
      row?.querySelector(`[data-action="${action}"]`) || $("#cart-body button")
    )?.focus({ preventScroll: true });
  }
}
function openCart() {
  renderCart();
  const pending = Cart.pending;
  const contact = LF.read("lasfritas_contacto");
  const remembered =
    contact && Date.now() - contact.date < 30 * 86400000 ? contact : null;
  if (contact && !remembered) LF.save("lasfritas_contacto", null);
  const data = pending || remembered;
  if (data) {
    $("#name").value = data.cliente || "";
    $("#phone").value = data.telefono || "";
    $("#address").value = data.direccion || "";
    if (pending) $("#notes").value = pending.notas || "";
  }
  $("#remember").checked = !!remembered;
  all("[name=tipo]").forEach(
    (r) => (r.checked = r.value === (pending?.tipo || Cart.type)),
  );
  deliveryChanged(false);
  $("#checkout-error").hidden = true;
  LF.open($("#cart-dialog"));
}
$("#cart-body").onclick = (e) => {
  const row = e.target.closest("[data-block]");
  if (!row) return;
  const b = Cart.blocks.find((x) => x.key === row.dataset.block);
  try {
    const extra = e.target.closest("[data-extra-remove]");
    if (extra) {
      Cart.removeExtra(b.key, extra.dataset.extraRemove);
      return;
    }
    switch (e.target.dataset.action) {
      case "plus":
        Cart.change(b.key, 1);
        break;
      case "minus":
        Cart.change(b.key, -1);
        break;
      case "remove": {
        const undo = Cart.remove(b.key);
        toast("Plato y adicionales retirados.", undo);
        break;
      }
      case "edit":
        $("#cart-dialog").close();
        openDetail(b.id, b.key);
        break;
    }
  } catch (err) {
    toast(err.message);
  }
};
function deliveryChanged(save = true) {
  const type = $("[name=tipo]:checked").value;
  $("#address-wrap").hidden = type !== "domicilio";
  $("#address").required = type === "domicilio";
  if (save) {
    try {
      Cart.setType(type);
    } catch (e) {
      toast(e.message);
    }
  }
}
all("[name=tipo]").forEach((r) => (r.onchange = () => deliveryChanged()));
function validateField(id) {
  const input = $("#" + id),
    v = input.value.trim();
  let msg = "";
  if (id === "name" && !v) msg = "Escribe tu nombre.";
  if (
    id === "phone" &&
    (!/^[+\d\s()-]+$/.test(v) || !/^\d{7,15}$/.test(v.replace(/\D/g, "")))
  )
    msg = "Escribe un teléfono de 7 a 15 dígitos.";
  if (id === "address" && $("[name=tipo]:checked").value === "domicilio" && !v)
    msg = "Escribe la dirección de entrega.";
  input.setAttribute("aria-invalid", String(!!msg));
  $("#" + id + "-error").textContent = msg;
  return !msg;
}
["name", "phone", "address"].forEach(
  (id) => ($("#" + id).onblur = () => validateField(id)),
);
$("#checkout").onsubmit = async (e) => {
  e.preventDefault();
  if (Cart.busy) return;
  const error = $("#checkout-error");
  error.hidden = true;
  if (!navigator.onLine) {
    error.hidden = false;
    error.textContent =
      "Necesitas conexión para enviar. Tu carrito sigue aquí.";
    error.focus();
    return;
  }
  if (!Cart.pending) {
    const results = ["name", "phone", "address"].map(validateField);
    if (results.includes(false)) {
      $("#" + ["name", "phone", "address"][results.indexOf(false)]).focus();
      return;
    }
    try {
      if (!Cart.blocks.length)
        throw Error("Agrega un producto antes de enviar.");
      Cart.validate(Cart.blocks);
    } catch (err) {
      error.hidden = false;
      error.textContent = err.message;
      return;
    }
  }
  const payload = Cart.pending || {
    accion: "crear",
    cliente: $("#name").value.trim(),
    telefono: $("#phone").value.trim(),
    tipo: $("[name=tipo]:checked").value,
    direccion: $("#address").value.trim(),
    notas: $("#notes").value.trim(),
    items: Cart.lineItems(),
    total: Cart.total(),
    requestId: LF.uuid(),
  };
  Cart.busy = true;
  window.Motion?.sending(true);
  const saved = Cart.lock(payload);
  renderCart();
  if (!saved) {
    error.hidden = false;
    error.textContent =
      "Este navegador no permite guardar el envío. Mantén esta página abierta hasta confirmar su código.";
  }
  try {
    const data = await LF.request(payload);
    if (!/^[a-f0-9]{16}$/.test(String(data.id)))
      throw Error(
        "La respuesta no contiene un código válido. Reintenta el mismo pedido.",
      );
    if ($("#remember").checked)
      LF.save("lasfritas_contacto", {
        date: Date.now(),
        cliente: payload.cliente,
        telefono: payload.telefono,
        direccion: payload.direccion,
      });
    else LF.save("lasfritas_contacto", null);
    LF.save("lasfritas_ultimo_pedido", data.id);
    Cart.complete();
    $("#cart-dialog").close();
    $("#notes").value = "";
    $("#name").value = "";
    $("#phone").value = "";
    $("#address").value = "";
    openTracking(data.id, true);
    window.Motion?.celebrate();
    toast("¡Pedido registrado! Guarda tu ticket.");
    feedback();
  } catch (err) {
    if (
      err.confirmed &&
      ["VALIDACION", "PRECIO", "CONFIGURACION", "OCUPADO"].includes(err.code)
    )
      Cart.unlock();
    error.hidden = false;
    error.textContent =
      (Cart.pending
        ? "Aún no podemos confirmar si se recibió. "
        : "El pedido no se confirmó. ") +
      err.message +
      (err.code === "PRECIO"
        ? " Conservamos tu carrito. Cierra las pestañas de Las Fritas y vuelve a abrir el menú actualizado antes de revisar y enviar."
        : "");
    error.focus();
  } finally {
    Cart.busy = false;
    window.Motion?.sending(false);
    renderCart();
  }
};
$("#forget").onclick = () => {
  LF.save("lasfritas_contacto", null);
  $("#remember").checked = false;
  toast("Datos recordados eliminados.");
};

let trackingVersion = 0,
  trackingTimer,
  lastTracking = null,
  trackingCode = "";
let trackingAbort;
function stopTracking() {
  trackingVersion++;
  clearTimeout(trackingTimer);
  trackingAbort?.abort();
}
function openTracking(id, confirmed = false, push = true) {
  stopTracking();
  $("#menu-view").hidden = true;
  $("#tracking-view").hidden = false;
  $("#tray-bar").hidden = true;
  $("#compare-bar").hidden = true;
  $("#tracking-code").value = id || "";
  $("#tracking-status").textContent = confirmed
    ? "Pedido registrado. Consultando su estado…"
    : "";
  if (push) {
    const u = new URL(location.href);
    u.hash = "mi-pedido";
    if (id) u.searchParams.set("id", id);
    history.pushState({ view: "tracking" }, "", u);
  }
  window.Motion?.view(true);
  if (id) startTracking(id);
  else
    $("#tracking-result").innerHTML =
      '<p class="notice">Escribe el código de tu pedido para ver cómo va.</p>';
  window.scrollTo(0, 0);
}
function backMenu(push = true) {
  window.Motion?.view(false);
  stopTracking();
  $("#tracking-view").hidden = true;
  $("#menu-view").hidden = false;
  renderTray();
  updateCompare();
  if (push) {
    const u = new URL(location.href);
    u.searchParams.delete("id");
    u.hash = "";
    history.pushState({ view: "menu" }, "", u);
  }
}
all(".tracking-open").forEach(
  (b) =>
    (b.onclick = () => {
      const last = LF.read("lasfritas_ultimo_pedido");
      let legacy = last;
      try {
        if (!legacy) legacy = localStorage.getItem("lasfritas_ultimo_pedido");
      } catch {}
      openTracking(legacy || "");
    }),
);
$("#back-menu").onclick = () => backMenu();
$("#tracking-form").onsubmit = (e) => {
  e.preventDefault();
  const id = $("#tracking-code").value.trim().toLowerCase();
  if (!/^[a-f0-9]{8,32}$/.test(id)) {
    toast("Revisa tu código de seguimiento.");
    return;
  }
  openTracking(id);
};
function startTracking(id) {
  stopTracking();
  trackingCode = id;
  lastTracking = null;
  $("#tracking-result").innerHTML = "";
  const version = trackingVersion;
  consultTracking(id, version);
}
async function consultTracking(id, version) {
  if (version !== trackingVersion) return;
  if (document.hidden) {
    trackingTimer = setTimeout(() => consultTracking(id, version), 10000);
    return;
  }
  let repeat = true;
  trackingAbort = new AbortController();
  try {
    const data = await LF.request({ id }, trackingAbort.signal);
    if (version !== trackingVersion) return;
    const p = data.pedidos?.[0];
    if (!p) {
      $("#tracking-status").textContent =
        "No encontramos ese código. Revisa que esté completo.";
      repeat = false;
      return;
    }
    if (JSON.stringify(p) !== JSON.stringify(lastTracking)) {
      renderTracking(p);
      lastTracking = p;
    }
    $("#tracking-status").textContent =
      "Última actualización: " +
      new Date().toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      (p.estado === "Entregado"
        ? " · Pedido entregado."
        : " · Consultamos automáticamente.");
    repeat = p.estado !== "Entregado";
  } catch (err) {
    if (version !== trackingVersion) return;
    $("#tracking-status").textContent =
      "Sin actualización. " +
      (lastTracking ? "Conservamos el último estado recibido. " : "") +
      err.message;
  } finally {
    if (repeat && version === trackingVersion)
      trackingTimer = setTimeout(() => consultTracking(id, version), 10000);
  }
}
function renderTracking(p) {
  const previousState = lastTracking?.estado;
  const info = ESTADOS.find((s) => s.key === p.estado) || ESTADOS[0];
  const words = {
    Recibido: "Tu pedido quedó registrado.",
    Preparando: "Cocina está preparando tu pedido.",
    "Listo para entregar":
      p.tipo === "domicilio"
        ? "Tu pedido está listo para despacho."
        : "Tu pedido está listo para recoger.",
    "En camino": "Tu pedido salió a domicilio.",
    Entregado: "¡Con todo! Gracias por pedir en Las Fritas.",
  };
  const link = LF.link(p.id);
  const message =
    "Mi pedido en Las Fritas #" + p.id + " · " + p.estado + "\n" + link;
  $("#tracking-result").innerHTML =
    `<article class="ticket"><div class="ticket-status" style="--state:${info.color}"><span class="state-icon" aria-hidden="true">${info.icon}</span><div><h2>${safe(p.estado)}</h2><p>${words[p.estado] || "Consulta el estado de tu pedido."}</p></div></div><span class="eyebrow">LAS FRITAS · TU CÓDIGO</span><p class="ticket-code">${safe(p.id)}</p><p>${p.tipo === "domicilio" ? "A domicilio · cobertura y costo por confirmar" : "Recoger en el local"}</p><ol class="steps">${LF.flow(
      p.tipo,
    )
      .map(
        (s) =>
          `<li class="${s.key === p.estado ? "current" : ""}" ${s.key === p.estado ? 'aria-current="step"' : ""}>${s.icon} ${s.label}</li>`,
      )
      .join("")}</ol><div class="ticket-items">${LF.items(p)
      .map(
        (it) =>
          `<div class="ticket-item"><span>${safe(it.cantidad)} × ${safe(it.nombre)}${it.nota ? `<small>${safe(it.nota)}</small>` : ""}</span><strong class="money">${money(it.cantidad * it.precio)}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="checkout-total"><span>Total productos</span><span>${money(p.total)}</span></div><div class="ticket-actions"><button class="button" id="copy-ticket">Copiar enlace</button><a class="button" href="https://wa.me/${MARCA.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></div><p class="small" style="margin:16px 0 0">El enlace permite consultar los productos y sus notas. Compártelo solo con quien corresponda.</p></article>`;
  window.Motion?.tracking(p, previousState);
  $("#copy-ticket").onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Enlace de seguimiento copiado.");
    } catch {
      toast("Copia el código visible para consultar tu pedido.");
    }
  };
  LF.animate(
    $(".ticket"),
    [
      { opacity: 0.5, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    360,
  );
}
document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden &&
    !$("#tracking-view").hidden &&
    trackingCode &&
    lastTracking?.estado !== "Entregado"
  ) {
    clearTimeout(trackingTimer);
    trackingAbort?.abort();
    const version = ++trackingVersion;
    consultTracking(trackingCode, version);
  }
});
window.addEventListener("online", () => {
  if (
    !$("#tracking-view").hidden &&
    trackingCode &&
    lastTracking?.estado !== "Entregado"
  ) {
    clearTimeout(trackingTimer);
    trackingAbort?.abort();
    consultTracking(trackingCode, ++trackingVersion);
  }
});
window.addEventListener("popstate", () => {
  all("dialog[open]").forEach((d) => d.close());
  const id = new URLSearchParams(location.search).get("id");
  if (id || location.hash === "#mi-pedido")
    openTracking(id || "", false, false);
  else backMenu(false);
});
let sensory = LF.read("lasfritas_sensory", false);
let audio;
function sensoryLabel() {
  $("#sensory").textContent = "Sonido: " + (sensory ? "activado" : "apagado");
  $("#sensory").setAttribute("aria-pressed", String(sensory));
}
sensoryLabel();
function feedback() {
  if (!sensory) return;
  window.Motion?.haptic();
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.05, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.1);
  } catch {}
}
$("#sensory").onclick = () => {
  sensory = !sensory;
  LF.save("lasfritas_sensory", sensory);
  sensoryLabel();
  feedback();
};
if ("serviceWorker" in navigator && location.protocol !== "file:")
  navigator.serviceWorker
    .register("sw.js")
    .then((r) => {
      const notice = () =>
        toast(
          "Menú actualizado disponible. Se activará al cerrar y volver a abrir Las Fritas.",
        );
      if (r.waiting) notice();
      r.addEventListener("updatefound", () =>
        r.installing?.addEventListener("statechange", () => {
          if (r.waiting && navigator.serviceWorker.controller) notice();
        }),
      );
    })
    .catch(() => {});
let installPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  $("#install").hidden = false;
});
$("#install").onclick = async () => {
  if (installPrompt) await installPrompt.prompt();
  installPrompt = null;
  $("#install").hidden = true;
};
const initialId = new URLSearchParams(location.search).get("id");
if (initialId) openTracking(initialId, false, false);
else if (location.hash === "#mi-pedido") openTracking("", false, false);
if (Cart.pending)
  toast("Tienes un envío pendiente. Abre tu pedido para recuperar su código.");

$("#nav-order").onclick = () => backMenu();
