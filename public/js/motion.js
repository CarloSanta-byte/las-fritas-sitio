/* Mejora progresiva. Ninguna transacción depende del resultado de una animación. */
"use strict";
window.Motion = (() => {
  const ease = "cubic-bezier(.2,.8,.2,1)";
  const constrained =
    !!navigator.connection?.saveData ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  let full = LF.read("lasfritas_efectos_completos", !constrained),
    vibration = LF.read("lasfritas_vibracion", false);
  const seen = new WeakSet(),
    loops = new Set();
  const visible = (el) => {
    const r = el?.getBoundingClientRect();
    return (
      !!r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
    );
  };
  function run(el, frames, duration = 240, options = {}) {
    if (!el?.animate || !LF.motionAllowed() || !visible(el)) return null;
    return el.animate(frames, { duration, easing: ease, ...options });
  }
  function finite(el, frames, duration, remove = false) {
    const a = run(el, frames, duration);
    if (remove) {
      if (a) a.finished.catch(() => {}).finally(() => el.remove());
      else el.remove();
    }
    return a;
  }
  function sync() {
    document.documentElement.classList.toggle("effects-lite", !full);
    const b = document.querySelector("#effects-mode");
    if (b) {
      b.textContent = full
        ? "Efectos completos activos"
        : "Efectos moderados · activar completos";
      b.setAttribute("aria-pressed", String(full));
    }
    loops.forEach((el) =>
      el.classList.toggle(
        "motion-live",
        full && LF.motionAllowed() && visible(el),
      ),
    );
    if (!LF.motionAllowed())
      document
        .querySelectorAll(".motion-particle,.motion-copy,.surprise-overlay")
        .forEach((el) => el.remove());
  }
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach(({ target, isIntersecting }) => {
              if (!isIntersecting) {
                target
                  .getAnimations({ subtree: true })
                  .forEach((a) => a.cancel());
                target.classList.remove("motion-live");
                return;
              }
              if (target.matches(".product") && !seen.has(target)) {
                seen.add(target);
                finite(
                  target,
                  [
                    { transform: "translateY(12px)", opacity: 0.65 },
                    { transform: "translateY(0)", opacity: 1 },
                  ],
                  full ? 240 : 120,
                );
              }
              if (target.matches("#categories button") && !seen.has(target)) {
                seen.add(target);
                finite(
                  target,
                  [
                    { transform: "translateX(6px)", opacity: 0.65 },
                    { transform: "translateX(0)", opacity: 1 },
                  ],
                  180,
                );
              }
              if (target.matches(".state-icon,.sending")) {
                loops.add(target);
                sync();
              }
            });
          },
          { threshold: 0.05 },
        )
      : null;
  function observe() {
    document
      .querySelectorAll(".product,.state-icon,#categories button")
      .forEach((el) => {
        if (!el.dataset.motionObserved) {
          el.dataset.motionObserved = "true";
          io?.observe(el);
        }
      });
    loops.forEach((el) => {
      if (!el.isConnected) {
        loops.delete(el);
        io?.unobserve(el);
      }
    });
  }
  new MutationObserver(observe).observe(document.body, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("lf:motion", sync);
  document.addEventListener("visibilitychange", sync);
  document.querySelector("#effects-mode").onclick = () => {
    full = !full;
    LF.save("lasfritas_efectos_completos", full);
    sync();
  };
  const hb = document.querySelector("#haptic-toggle");
  const hlabel = () => {
    hb.textContent = "Vibración: " + (vibration ? "activada" : "apagada");
    hb.setAttribute("aria-pressed", String(vibration));
  };
  function haptic() {
    if (vibration) navigator.vibrate?.(15);
  }
  hb.onclick = () => {
    vibration = !vibration;
    LF.save("lasfritas_vibracion", vibration);
    hlabel();
    haptic();
  };
  hlabel();
  sync();
  observe();
  finite(
    document.querySelector(".wordmark"),
    [
      { transform: "translateY(-8px) rotate(-4deg)", opacity: 0.5 },
      { transform: "translateY(0) rotate(-4deg)", opacity: 1 },
    ],
    420,
  );
  function fly(source) {
    haptic();
    const dest = document.querySelector(
      innerWidth < 1000 ? "#tray-count" : ".desktop-tray h2",
    );
    finite(
      dest,
      [
        { transform: "scale(.85)" },
        { transform: "scale(1.15)", offset: 0.55 },
        { transform: "scale(1)" },
      ],
      180,
    );
    const tray = document.querySelector(
      innerWidth < 1000 ? "#tray-bar" : "#desktop-tray",
    );
    finite(
      tray,
      [
        { transform: "translateY(3px)" },
        { transform: "translateY(-3px)", offset: 0.5 },
        { transform: "translateY(0)" },
      ],
      180,
    );
    if (!full || !LF.motionAllowed() || !visible(source) || !visible(dest))
      return;
    const a = source.getBoundingClientRect(),
      b = dest.getBoundingClientRect();
    const el = document.createElement("span");
    el.className = "motion-particle";
    el.textContent = "✦";
    el.setAttribute("aria-hidden", "true");
    el.style.left = a.left + a.width / 2 + "px";
    el.style.top = a.top + "px";
    document.body.append(el);
    finite(
      el,
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(.2)`,
          opacity: 0,
        },
      ],
      400,
      true,
    );
  }
  function connect(source, rect, target) {
    if (
      !full ||
      !LF.motionAllowed() ||
      !source ||
      !rect ||
      !target ||
      rect.bottom < 0 ||
      rect.top > innerHeight
    )
      return;
    const to = target.getBoundingClientRect(),
      copy = source.cloneNode(true);
    copy.className = "motion-copy";
    copy.setAttribute("aria-hidden", "true");
    copy.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;`;
    // El clon vive en la capa superior del diálogo y nunca captura interacción.
    const dialog = target.closest("dialog");
    (dialog || document.body).append(copy);
    finite(
      copy,
      [
        {
          transform: `translate(${rect.left - to.left}px,${rect.top - to.top}px) scale(${rect.width / to.width},${rect.height / to.height})`,
          opacity: 0.8,
        },
        { transform: "translate(0,0) scale(1)", opacity: 0 },
      ],
      280,
      true,
    );
  }
  function category() {
    finite(
      document.querySelector("#category-title"),
      [
        { transform: "translateX(8px)", opacity: 0.5 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      180,
    );
  }
  function celebrate() {
    if (!full || !LF.motionAllowed()) return;
    document.querySelectorAll(".motion-particle").forEach((e) => e.remove());
    for (let i = 0; i < 12; i++) {
      const el = document.createElement("span");
      el.className = "motion-particle confetti";
      el.setAttribute("aria-hidden", "true");
      el.style.left = innerWidth / 2 + "px";
      el.style.top = "35dvh";
      el.style.background = ["#f5b921", "#e6297b", "#216452"][i % 3];
      document.body.append(el);
      finite(
        el,
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          {
            transform: `translate(${(i - 5.5) * 24}px,${70 + Math.abs(i - 5.5) * 8}px) rotate(${i * 50}deg)`,
            opacity: 0,
          },
        ],
        650,
        true,
      );
    }
  }
  function view(tracking) {
    const el = document.querySelector(
      tracking ? "#tracking-view" : "#menu-view",
    );
    document.querySelectorAll(".mobile-nav button").forEach((b) => {
      if (b.id === (tracking ? "nav-tracking" : "nav-order"))
        b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    requestAnimationFrame(() =>
      finite(
        el,
        [
          { transform: "translateX(10px)", opacity: 0.7 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        220,
      ),
    );
  }
  function tracking(p, previous) {
    const steps = LF.flow(p.tipo);
    const index = steps.findIndex((s) => s.key === p.estado);
    const list = document.querySelector(".steps");
    if (!list) return;
    const progress = document.createElement("div");
    progress.className = "tracking-progress";
    progress.setAttribute("aria-hidden", "true");
    progress.innerHTML = "<span></span>";
    list.before(progress);
    const bar = progress.firstElementChild;
    const end = Math.max(0, index) / Math.max(1, steps.length - 1);
    bar.style.transform = `scaleX(${end})`;
    if (previous !== p.estado)
      finite(
        bar,
        [
          {
            transform: `scaleX(${
              Math.max(
                0,
                steps.findIndex((s) => s.key === previous),
              ) / Math.max(1, steps.length - 1)
            })`,
          },
          { transform: `scaleX(${end})` },
        ],
        350,
      );
    document.querySelector(".state-icon")?.setAttribute("data-state", p.estado);
    document
      .querySelector(".ticket")
      ?.classList.toggle("delivered", p.estado === "Entregado");
    if (p.estado === "Entregado" && previous !== "Entregado") {
      celebrate();
      haptic();
    }
    observe();
    sync();
  }
  function sending(on) {
    const b = document.querySelector("#send");
    b.classList.toggle("sending", on);
    if (on) {
      loops.add(b);
      io?.observe(b);
    } else {
      loops.delete(b);
      io?.unobserve(b);
      b.classList.remove("motion-live");
    }
    sync();
  }
  function surprise(el, options, p) {
    if (!full || !LF.motionAllowed()) return;
    const overlay = document.createElement("div");
    overlay.className = "surprise-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.textContent = "✳ " + p.nombre;
    el.append(overlay);
    finite(
      overlay,
      [
        {
          transform: "perspective(500px) rotateY(-180deg) scale(.8)",
          opacity: 0,
        },
        {
          transform: "perspective(500px) rotateY(-30deg) scale(1.04)",
          opacity: 1,
          offset: 0.45,
        },
        { transform: "perspective(500px) rotateY(0) scale(1)", opacity: 0 },
      ],
      650,
      true,
    );
  }
  // Deslizar requiere predominio horizontal; el desplazamiento vertical queda en manos del navegador.
  let gesture = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("input,textarea,select,button,a"))
      return;
    const head = e.target.closest("dialog .dialog-head"),
      row = e.target.closest("#cart-body [data-block]"),
      cats = e.target.closest("#categories");
    if (!head && !row && !cats) return;
    gesture = { x: e.clientX, y: e.clientY, head, row, cats, id: e.pointerId };
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!gesture || !LF.motionAllowed()) return;
      const dx = e.clientX - gesture.x,
        dy = e.clientY - gesture.y;
      if (gesture.head && dy > 0) {
        const d = gesture.head.closest("dialog");
        d.style.transform = `translateY(${Math.min(dy, 180)}px)`;
      }
      if (gesture.row && Math.abs(dx) > Math.abs(dy) * 1.6)
        gesture.row.style.transform = `translateX(${Math.max(-120, Math.min(0, dx))}px)`;
    },
    { passive: true },
  );
  function endGesture(e, cancel = false) {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    if (g.head) {
      const d = g.head.closest("dialog");
      d.style.transform = "";
      if (!cancel && dy > 90 && Math.abs(dy) > Math.abs(dx)) d.close();
    }
    if (g.row) {
      g.row.style.transform = "";
      if (!cancel && dx < -75 && Math.abs(dx) > Math.abs(dy) * 1.6)
        g.row.querySelector('[data-action="remove"]')?.click();
    }
  }
  document.addEventListener("pointerup", (e) => endGesture(e));
  document.addEventListener("pointercancel", (e) => endGesture(e, true));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b)
      finite(b, [{ transform: "scale(.96)" }, { transform: "scale(1)" }], 100);
  });
  return {
    fly,
    connect,
    category,
    celebrate,
    view,
    tracking,
    sending,
    surprise,
    haptic,
  };
})();
