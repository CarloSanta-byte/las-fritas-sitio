"use strict";
window.Mostrador = (() => {
  let initialized = false,
    lines = [],
    pending = null,
    busy = false,
    ref = 1,
    product = null;
  const key = "lasfritas_mostrador_v4";
  let stored = LF.read(key, null, true);
  if (stored && Date.now() - stored.date < 86400000) {
    lines = stored.lines || [];
    ref = stored.ref || 1;
  }
  pending = LF.read("lasfritas_mostrador_pendiente", null, true);
  function snapshot() {
    const contact = initialized
      ? {
          cliente: $("#manual-name").value,
          telefono: $("#manual-phone").value,
          tipo: $("#manual-type").value,
          direccion: $("#manual-address").value,
          notas: $("#manual-notes").value,
        }
      : stored?.contact;
    stored = { date: Date.now(), lines, ref, contact };
    LF.save(key, stored, true);
  }
  const total = () =>
    pending
      ? pending.total
      : lines.reduce((s, l) => s + l.precio * l.cantidad, 0);
  function init() {
    if (initialized) return;
    initialized = true;
    if (!document.querySelector('link[href="css/analisis.css"]')) {
      const c = document.createElement("link");
      c.rel = "stylesheet";
      c.href = "css/analisis.css";
      document.head.append(c);
    }
    $("#view-mostrador").innerHTML =
      `<header class="analysis-head"><span class="eyebrow">MESA · CAJA · EQUIPO</span><h2>Pedido de mostrador<span>.</span></h2><p>Se guarda en la misma cola con origen mostrador. El importe no confirma el pago.</p></header><p id="manual-result" class="notice" role="status" hidden></p><div class="manual-layout"><section><label for="manual-search">Buscar producto o ingrediente</label><input id="manual-search" type="search" placeholder="Salchi, burger, bebida…"><div id="manual-catalog" class="manual-catalog"></div><section id="manual-editor" hidden></section></section><form id="manual-form"><fieldset id="manual-fields"><legend>Pedido y entrega</legend><ul class="manual-lines" id="manual-lines"></ul><p id="manual-total" class="manual-total"></p><label for="manual-name">Nombre</label><input id="manual-name" maxlength="80" required autocomplete="off"><label for="manual-phone">Teléfono</label><input id="manual-phone" type="tel" maxlength="24" required autocomplete="off"><label for="manual-type">Entrega</label><select id="manual-type"><option value="local">En el local</option><option value="domicilio">A domicilio</option></select><div id="manual-address-wrap" hidden><label for="manual-address">Dirección</label><input id="manual-address" maxlength="250" autocomplete="off"></div><label for="manual-notes">Notas generales (opcional)</label><textarea id="manual-notes" maxlength="500" rows="2"></textarea></fieldset><p id="manual-error" class="notice" role="alert" hidden></p><div class="manual-actions"><button id="manual-submit" class="button primary">Registrar pedido</button></div><p class="manual-help">Precios y cantidades se validan en Google. Un envío pendiente se reintenta con el mismo identificador; nunca se envía solo al reconectar.</p></form></div>`;
    const c = pending || stored?.contact;
    if (c) {
      $("#manual-name").value = c.cliente || "";
      $("#manual-phone").value = c.telefono || "";
      $("#manual-type").value = c.tipo || "local";
      $("#manual-address").value = c.direccion || "";
      $("#manual-notes").value = c.notas || "";
    }
    $("#manual-search").oninput = catalog;
    $("#manual-type").onchange = () => {
      delivery();
      snapshot();
    };
    $("#manual-form").addEventListener("input", snapshot);
    $("#manual-form").onsubmit = submit;
    $("#manual-catalog").onclick = (e) => {
      const b = e.target.closest("[data-manual]");
      if (b && !pending && !busy) editor(b.dataset.manual);
    };
    $("#manual-lines").onclick = (e) => {
      const b = e.target.closest("[data-remove-line]");
      if (!b || pending || busy) return;
      const k = b.dataset.removeLine,
        old = lines;
      lines = lines.filter((l) => l.key !== k && l.parent !== k);
      snapshot();
      render();
      LF.toast("Línea retirada", () => {
        if (pending || busy) return;
        const missing = old.filter((l) => !lines.some((x) => x.key === l.key));
        if (lines.length + missing.length <= 60) {
          lines.push(...missing);
          snapshot();
          render();
        }
      });
    };
    $("#manual-lines").onchange = (e) => {
      const input = e.target.closest("[data-line-quantity]");
      if (!input || pending || busy) return;
      const n = Number(input.value);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        input.reportValidity();
        return;
      }
      lines.find((l) => l.key === input.dataset.lineQuantity).cantidad = n;
      snapshot();
      render();
    };
    delivery();
    catalog();
    render();
  }
  function delivery() {
    const d = $("#manual-type").value === "domicilio";
    $("#manual-address-wrap").hidden = !d;
    $("#manual-address").required = d;
  }
  function catalog() {
    const q = LF.norm($("#manual-search").value);
    const ps = PRESENTATION.products.filter(
      (p) => !q || LF.norm(p.nombre + " " + p.descripcion).includes(q),
    );
    $("#manual-catalog").innerHTML =
      ps
        .map(
          (p) =>
            `<button type="button" class="button manual-product" data-manual="${p.id}" ${pending || busy ? "disabled" : ""}><span>${safe(p.nombre)}<br><small>${safe(p.category)}</small></span><strong>${money(p.precio)} +</strong></button>`,
        )
        .join("") || "<p>Sin coincidencias</p>";
  }
  function editor(id) {
    product = PRESENTATION.index[id];
    const p = product;
    const extras = p.categoryIndex === 9 || p.id === "combo-burger";
    const parentOptions = lines.filter(
      (l) =>
        !l.parent &&
        PRESENTATION.index[l.id]?.categoryIndex < 7 &&
        l.id !== "combo-burger",
    );
    $("#manual-editor").hidden = false;
    $("#manual-editor").innerHTML =
      `<h3>${safe(p.nombre)}</h3><p>${safe(p.descripcion)}</p><label for="manual-product-qty">Cantidad total de unidades</label><input id="manual-product-qty" type="number" min="1" max="50" value="1"><label for="manual-product-note">Nota (opcional)</label><input id="manual-product-note" maxlength="140">${extras ? `<label for="manual-parent">Asociar a plato</label><select id="manual-parent"><option value="">Producto suelto</option>${parentOptions.map((l) => `<option value="${safe(l.key)}">Plato ${l.ref} · ${safe(l.nombre)}</option>`).join("")}</select>` : ""}${p.id === "combo-burger" ? '<label for="manual-potato">Papa del combo</label><select id="manual-potato"><option value="">Elegir</option><option>Papa francesa</option><option>Papa criolla</option></select><label for="manual-drink">Bebida del combo</label><select id="manual-drink"><option value="">Elegir</option><option>Gaseosa personal</option><option>Limonada natural</option></select>' : ""}${p.id === "granizado-licor" ? '<label class="check-row"><input id="manual-adult" type="checkbox">Mayoría de edad verificada</label>' : ""}<button class="button primary" id="manual-add">Sumar al pedido · ${money(p.precio)}</button><button class="plain" id="manual-cancel">Cerrar detalle</button>`;
    $("#manual-cancel").onclick = () => ($("#manual-editor").hidden = true);
    $("#manual-add").onclick = () => {
      if (pending || busy) return;
      const n = Number($("#manual-product-qty").value);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        LF.toast("Cantidad de 1 a 50.");
        return;
      }
      if (lines.length >= 60) {
        LF.toast("Máximo 60 líneas.");
        return;
      }
      if (p.id === "granizado-licor" && !$("#manual-adult").checked) {
        LF.toast("Verifica la mayoría de edad.");
        return;
      }
      let note = $("#manual-product-note").value.trim();
      if (p.id === "combo-burger") {
        const potato = $("#manual-potato").value,
          drink = $("#manual-drink").value;
        if (!potato || !drink) {
          LF.toast("Selecciona papa y bebida.");
          return;
        }
        note = potato + " + " + drink + (note ? " · " + note : "");
      }
      const parent = lines.find((l) => l.key === $("#manual-parent")?.value);
      const prefix = parent
        ? `Para Plato ${parent.ref} · ${parent.nombre} · `
        : `[Plato ${ref}] `;
      if ((prefix + note).length > 200) {
        LF.toast("La nota con su referencia supera 200 caracteres.");
        return;
      }
      lines.push({
        key: LF.uuid(),
        ref: ref++,
        parent: parent?.key || "",
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        cantidad: n,
        nota: prefix + note,
      });
      snapshot();
      render();
      $("#manual-editor").hidden = true;
      $("#manual-search").focus();
    };
    $("#manual-editor").scrollIntoView({ block: "nearest" });
    $("#manual-product-qty").focus({ preventScroll: true });
  }
  function render() {
    const shown = pending?.items || lines;
    $("#manual-lines").innerHTML =
      shown
        .map(
          (l) =>
            `<li><strong>${safe(l.nombre || PRESENTATION.index[l.id]?.nombre)} · ${money(l.precio)}</strong><p class="manual-line-note">${safe(l.nota)}</p><div class="manual-line-tools">${pending ? `<span>${l.cantidad} unidades</span>` : `<label>Cantidad<input type="number" min="1" max="50" value="${l.cantidad}" data-line-quantity="${l.key}"></label><button class="button" type="button" data-remove-line="${l.key}">Quitar</button>`}<strong>${money(l.precio * l.cantidad)}</strong></div></li>`,
        )
        .join("") || "<li>Busca y suma el primer producto.</li>";
    $("#manual-total").textContent = "Total productos: " + money(total());
    $("#manual-fields").disabled = !!pending || busy;
    $("#manual-submit").disabled = busy || measurementVersion < 4;
    $("#manual-submit").textContent = busy
      ? "Confirmando registro…"
      : pending
        ? "Reintentar el mismo pedido"
        : "Registrar pedido · " + money(total());
    catalog();
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || measurementVersion < 4) return;
    const error = $("#manual-error");
    error.hidden = true;
    if (!navigator.onLine) {
      error.hidden = false;
      error.textContent =
        "Sin conexión. Conservamos el pedido; pulsa Registrar cuando vuelva internet.";
      return;
    }
    if (!pending) {
      if (!lines.length || lines.length > 60) {
        error.hidden = false;
        error.textContent = "Agrega de 1 a 60 líneas.";
        return;
      }
      if (
        !/^[+\d\s()-]+$/.test($("#manual-phone").value) ||
        !/^\d{7,15}$/.test($("#manual-phone").value.replace(/\D/g, ""))
      ) {
        error.hidden = false;
        error.textContent = "Teléfono de 7 a 15 dígitos.";
        return;
      }
      pending = {
        accion: "crearMostrador",
        requestId: LF.uuid(),
        cliente: $("#manual-name").value.trim(),
        telefono: $("#manual-phone").value.trim(),
        tipo: $("#manual-type").value,
        direccion: $("#manual-address").value.trim(),
        notas: $("#manual-notes").value.trim(),
        items: lines.map(({ id, nombre, precio, cantidad, nota }) => ({
          id,
          nombre,
          precio,
          cantidad,
          nota,
        })),
        total: total(),
      };
      if (!LF.save("lasfritas_mostrador_pendiente", pending, true)) {
        error.hidden = false;
        error.textContent =
          "No se pudo guardar el envío en este navegador. Mantén esta pestaña abierta hasta confirmar.";
      }
    }
    busy = true;
    render();
    const version = session;
    try {
      const data = await LF.request({ ...pending, token });
      if (version !== session) return;
      if (!/^[a-f0-9]{16}$/.test(data.id))
        throw Error("No llegó un código válido. Reintenta el mismo pedido.");
      pending = null;
      lines = [];
      ref = 1;
      LF.save("lasfritas_mostrador_pendiente", null, true);
      LF.save(key, null, true);
      stored = null;
      $("#manual-form").reset();
      delivery();
      $("#manual-result").hidden = false;
      $("#manual-result").textContent =
        "Registrado #" +
        data.id +
        " · Total productos " +
        money(data.total) +
        ". Ya aparece en Operación.";
      window.Analisis?.invalidate();
      load();
    } catch (err) {
      if (version !== session) return;
      if (
        err.confirmed &&
        ["VALIDACION", "PRECIO", "CONFIGURACION", "OCUPADO"].includes(err.code)
      ) {
        pending = null;
        LF.save("lasfritas_mostrador_pendiente", null, true);
      }
      error.hidden = false;
      error.textContent =
        (pending ? "Envío pendiente de confirmar. " : "") + err.message;
    } finally {
      if (version === session) {
        busy = false;
        render();
      }
    }
  }
  return {
    open() {
      init();
      render();
    },
    reset() {
      initialized = false;
      busy = false;
      product = null;
    },
  };
})();
