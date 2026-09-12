"use strict";
const Cart = (() => {
  const { read, save, uuid } = LF;
  const { index } = PRESENTATION;
  let pending = read("lasfritas_envio_pendiente");
  let busy = false;
  let blocks = [];
  let next = 1;
  let type = "local";
  let storageWarning = false;
  const stored = read("lasfritas_carrito_con_todo");
  function valid(b) {
    return (
      b &&
      index[b.id] &&
      Number.isInteger(b.quantity) &&
      b.quantity > 0 &&
      b.quantity <= 50
    );
  }
  if (
    stored &&
    Date.now() - stored.date < 86400000 &&
    Array.isArray(stored.blocks)
  ) {
    blocks = stored.blocks.filter(valid).map((b) => ({
      ...b,
      extras: Array.isArray(b.extras)
        ? b.extras.filter(
            (x) =>
              index[x.id] &&
              Number.isInteger(x.perUnit) &&
              x.perUnit > 0 &&
              x.perUnit <= 50,
          )
        : [],
    }));
    type = stored.type === "domicilio" ? "domicilio" : "local";
    next = Number.isInteger(stored.next) ? stored.next : blocks.length + 1;
  } else {
    const old = read("lasfritas_carrito_v2");
    if (old && Date.now() - old.fecha < 86400000 && Array.isArray(old.lineas)) {
      type = old.tipo === "domicilio" ? "domicilio" : "local";
      blocks = old.lineas
        .filter(
          (l) =>
            index[l.id] &&
            Number.isInteger(l.cantidad) &&
            l.cantidad > 0 &&
            l.cantidad <= 50,
        )
        .map((l) => ({
          key: uuid(),
          id: l.id,
          quantity: l.cantidad,
          note: String(l.nota || ""),
          extras: [],
          legacy: true,
        }));
    }
  }
  if (pending?.accion === "crear" && Array.isArray(pending.items)) {
    type = pending.tipo;
    blocks = pending.items
      .filter((l) => index[l.id])
      .map((l) => ({
        key: uuid(),
        id: l.id,
        quantity: l.cantidad,
        note: l.nota || "",
        extras: [],
        legacy: true,
      }));
  } else pending = null;
  function prefix(b) {
    return b.legacy ? "" : `[Plato ${b.ref}] `;
  }
  function lineItems(list = blocks) {
    return list.flatMap((b) => [
      {
        id: b.id,
        precio: index[b.id].precio,
        cantidad: b.quantity,
        nota: prefix(b) + (b.note || ""),
      },
      ...(b.extras || []).map((x) => ({
        id: x.id,
        precio: index[x.id].precio,
        cantidad: b.quantity * x.perUnit,
        nota: `Para Plato ${b.ref} · ${index[b.id].nombre}${x.note ? " · " + x.note : ""}`,
      })),
    ]);
  }
  function validate(list) {
    const lines = lineItems(list);
    if (lines.length > 60)
      throw Error("Máximo 60 líneas por pedido, incluidos los adicionales.");
    for (const l of lines) {
      if (!Number.isInteger(l.cantidad) || l.cantidad < 1 || l.cantidad > 50)
        throw Error(
          "Cada línea admite hasta 50 unidades. Reduce la cantidad del plato o del adicional.",
        );
      if (l.nota.length > 200)
        throw Error(
          "La nota, incluida la referencia del plato, supera 200 caracteres.",
        );
    }
    return lines;
  }
  function persist() {
    const ok = save("lasfritas_carrito_con_todo", {
      date: Date.now(),
      blocks,
      type,
      next,
    });
    if (!ok && !storageWarning) {
      storageWarning = true;
      LF.toast("Este navegador no permite guardar el carrito al cerrar.");
    }
    return ok;
  }
  function changed() {
    persist();
    document.dispatchEvent(new CustomEvent("cartchange"));
  }
  function guard() {
    if (pending || busy)
      throw Error("Confirma primero el envío pendiente desde tu pedido.");
  }
  function add(id, quantity = 1, note = "", extras = [], key) {
    guard();
    const original = blocks.find((b) => b.key === key);
    const b = {
      key: original?.key || uuid(),
      ref: original?.ref || String(next),
      id,
      quantity,
      note,
      extras,
      legacy: false,
    };
    let candidate = original
      ? blocks.map((x) => (x.key === key ? b : x))
      : [...blocks, b];
    validate(candidate);
    blocks = candidate;
    if (!original?.ref) next++;
    changed();
    return b;
  }
  function quick(id) {
    guard();
    const existing = blocks.find(
      (b) => b.id === id && !b.note && !b.extras.length && !b.legacy,
    );
    if (existing) return change(existing.key, 1);
    return add(id);
  }
  function change(key, delta) {
    guard();
    const b = blocks.find((x) => x.key === key);
    if (!b) return;
    if (b.quantity + delta < 1) return remove(key);
    const candidate = blocks.map((x) =>
      x.key === key ? { ...x, quantity: x.quantity + delta } : x,
    );
    validate(candidate);
    blocks = candidate;
    changed();
  }
  function remove(key) {
    guard();
    const before = structuredClone(blocks);
    blocks = blocks.filter((x) => x.key !== key);
    changed();
    return () => {
      try {
        guard();
        const missing = before.filter(
          (x) => !blocks.some((b) => b.key === x.key),
        );
        const candidate = [...blocks, ...missing];
        validate(candidate);
        blocks = candidate;
        changed();
      } catch (e) {
        LF.toast(e.message);
      }
    };
  }
  function removeExtra(key, id) {
    guard();
    const candidate = blocks.map((b) =>
      b.key === key ? { ...b, extras: b.extras.filter((x) => x.id !== id) } : b,
    );
    validate(candidate);
    blocks = candidate;
    changed();
  }
  function total() {
    return pending
      ? pending.total
      : lineItems().reduce((n, l) => n + l.precio * l.cantidad, 0);
  }
  function count() {
    return pending
      ? pending.items.reduce((n, l) => n + l.cantidad, 0)
      : blocks.reduce((n, b) => n + b.quantity, 0);
  }
  function lock(payload) {
    pending = payload;
    const ok = save("lasfritas_envio_pendiente", payload);
    document.dispatchEvent(new CustomEvent("cartchange"));
    return ok;
  }
  function unlock() {
    pending = null;
    save("lasfritas_envio_pendiente", null);
    changed();
  }
  function complete() {
    pending = null;
    blocks = [];
    save("lasfritas_envio_pendiente", null);
    save("lasfritas_carrito_v2", null);
    changed();
  }
  function setType(t) {
    guard();
    type = t;
    persist();
  }
  function reprice() {
    guard();
    changed();
  }
  persist();
  return {
    get blocks() {
      return blocks;
    },
    get pending() {
      return pending;
    },
    get type() {
      return type;
    },
    get next() {
      return next;
    },
    get busy() {
      return busy;
    },
    set busy(v) {
      busy = v;
    },
    add,
    quick,
    change,
    remove,
    removeExtra,
    total,
    count,
    lineItems,
    validate,
    lock,
    unlock,
    complete,
    setType,
    reprice,
  };
})();
