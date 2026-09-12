"use strict";
const LF = (() => {
  const $ = (s, root = document) => root.querySelector(s);
  const all = (s, root = document) => [...root.querySelectorAll(s)];
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
  const safe = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const read = (k, fallback = null, session = false) => {
    try {
      return (
        JSON.parse((session ? sessionStorage : localStorage).getItem(k)) ??
        fallback
      );
    } catch {
      return fallback;
    }
  };
  const save = (k, v, session = false) => {
    try {
      const s = session ? sessionStorage : localStorage;
      v === null ? s.removeItem(k) : s.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : [...crypto.getRandomValues(new Uint8Array(16))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
  const items = (p) => {
    try {
      const v = typeof p.items === "string" ? JSON.parse(p.items) : p.items;
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const flow = (tipo) =>
    ESTADOS.filter((s) => tipo === "domicilio" || s.key !== "En camino");
  let toastTimer;
  function toast(message, undo) {
    const box = $("#toast");
    if (!box) return;
    // Un dialog modal está en la capa superior: el aviso interactivo debe vivir dentro.
    const activeDialog = document.querySelector("dialog[open]");
    if (activeDialog && box.parentElement !== activeDialog)
      activeDialog.append(box);
    else if (!activeDialog && box.parentElement !== document.body)
      document.body.append(box);
    clearTimeout(toastTimer);
    $("span", box).textContent = message;
    const b = $("button", box);
    if (b) {
      b.hidden = !undo;
      b.onclick = () => {
        undo?.();
        box.hidden = true;
        if (document.activeElement === b)
          activeDialog
            ?.querySelector("button:not(:disabled)")
            ?.focus({ preventScroll: true });
      };
    }
    box.hidden = false;
    toastTimer = setTimeout(() => (box.hidden = true), undo ? 10000 : 4500);
  }
  async function request(payload, signal) {
    if (!navigator.onLine)
      throw Error("No hay conexión. Conservamos tu pedido.");
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 25000);
    try {
      const url = payload.accion
        ? API_URL
        : API_URL + "?" + new URLSearchParams(payload);
      const res = await fetch(url, {
        method: payload.accion ? "POST" : "GET",
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
        ...(payload.accion
          ? {
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload),
            }
          : {}),
      });
      if (!res.ok) throw Error("No recibimos una respuesta del restaurante.");
      const data = await res.json();
      if (!data.ok) {
        const e = Error(data.error || "No se pudo completar la solicitud.");
        e.code = data.code;
        e.confirmed = true;
        throw e;
      }
      return data;
    } catch (e) {
      if (e.name === "AbortError")
        throw Error(
          "La conexión tardó demasiado. Reintenta para confirmar el mismo pedido.",
        );
      if (e instanceof TypeError)
        throw Error(
          "No pudimos conectar con el restaurante. Reintenta el mismo pedido cuando vuelva la conexión.",
        );
      throw e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = read("lasfritas_pausa", false);
  function motionAllowed() {
    return !paused && !reduced.matches && !document.hidden;
  }
  function syncMotion() {
    document.documentElement.classList.toggle("paused", !motionAllowed());
    const b = $("#motion-toggle");
    if (b) {
      b.textContent =
        paused || reduced.matches
          ? "Animaciones pausadas"
          : "Pausar animaciones";
      b.setAttribute("aria-pressed", String(paused || reduced.matches));
    }
    if (!motionAllowed()) document.getAnimations().forEach((a) => a.cancel());
    document.dispatchEvent(new CustomEvent("lf:motion"));
  }
  $("#motion-toggle")?.addEventListener("click", () => {
    if (reduced.matches) {
      toast("Respetamos la reducción de movimiento del dispositivo.");
      return;
    }
    paused = !paused;
    save("lasfritas_pausa", paused);
    syncMotion();
  });
  reduced.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  syncMotion();
  function animate(el, frames, ms = 220) {
    if (
      el?.animate &&
      motionAllowed() &&
      el.getBoundingClientRect().bottom > 0 &&
      el.getBoundingClientRect().top < innerHeight
    )
      el.animate(frames, { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  function open(dialog) {
    dialog._returnFocus = document.activeElement;
    dialog.showModal();
    document.dispatchEvent(new CustomEvent("lf:dialog", { detail: dialog }));
    document.body.style.overflow = "hidden";
    animate(dialog, [
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" },
    ]);
  }
  all("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) d.close();
    });
    d.addEventListener("close", () => {
      const notice = d.querySelector("#toast");
      if (notice) document.body.append(notice);
      if (!document.querySelector("dialog[open]"))
        document.body.style.overflow = "";
      if (d._returnFocus?.isConnected)
        d._returnFocus.focus({ preventScroll: true });
    });
    d.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = all(
        'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
        d,
      ).filter((el) => el.getClientRects().length);
      if (!f.length) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
        e.preventDefault();
        f[0].focus();
      }
    });
  });
  function network() {
    const box = $("#network");
    if (box) {
      box.hidden = navigator.onLine;
      box.textContent =
        "Sin conexión · el menú guardado sigue disponible. Para enviar o consultar necesitas internet.";
    }
  }
  window.addEventListener("online", network);
  window.addEventListener("offline", network);
  network();
  function link(id) {
    const u = new URL("index.html", location.href);
    u.searchParams.set("id", id);
    u.hash = "";
    return u.href;
  }
  return {
    $,
    all,
    money,
    safe,
    read,
    save,
    norm,
    uuid,
    items,
    flow,
    toast,
    request,
    motionAllowed,
    animate,
    open,
    link,
  };
})();
