/* Interacciones ligeras. No modifica la comunicación de pedidos. */
let temporizadorToast;
function avisar(mensaje) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = mensaje; toast.classList.remove("oculto");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.add("oculto"), 3500);
}
function movimientoPermitido() {
  return !matchMedia("(prefers-reduced-motion: reduce)").matches && !document.documentElement.classList.contains("movimiento-pausado") && !document.hidden;
}
(function () {
  const root = document.documentElement;
  const pausa = document.getElementById("btn-movimiento");
  function actualizarMovimiento() {
    const pausado = leerGuardado("lasfritas_pausa", false) || matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.toggle("movimiento-pausado", pausado);
    pausa.setAttribute("aria-pressed", String(pausado));
    pausa.textContent = pausado ? "Animaciones pausadas" : "Pausar animaciones";
  }
  pausa.addEventListener("click", () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { avisar("Respetamos la opción de reducir movimiento de tu dispositivo."); return; }
    guardar("lasfritas_pausa", !root.classList.contains("movimiento-pausado")); actualizarMovimiento();
  });
  actualizarMovimiento();
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", actualizarMovimiento);
  document.addEventListener("visibilitychange", () => root.classList.toggle("pagina-oculta", document.hidden));
  document.getElementById("btn-cerrar-detalle").addEventListener("click", cerrarDetalleProducto);
  document.getElementById("btn-sorprendeme").addEventListener("click", () => {
    const opciones = MENU.filter(g => !["Adicionales", "Bebidas", "Granizados y Jugos"].includes(g.categoria)).flatMap(g => g.items);
    abrirDetalleProducto(opciones[Math.floor(Math.random() * opciones.length)].id);
  });
  document.getElementById("btn-copiar-seguimiento").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(enlaceSeguimiento(ultimoIdEnviado)); avisar("Enlace copiado. Guárdalo para seguir tu pedido."); }
    catch (_) { avisar("Puedes guardar el código que aparece arriba para consultar tu pedido."); }
  });
  window.addEventListener("resize", () => {
    actualizarResumenCarrito();
    if (document.getElementById("vista-pedir").classList.contains("oculto")) barraCarrito.classList.add("oculto");
  });
  document.addEventListener("click", e => {
    const boton = e.target.closest(".btn-primario");
    if (boton && movimientoPermitido()) {
      const r = boton.getBoundingClientRect(); const onda = document.createElement("span");
      onda.className = "ripple"; onda.setAttribute("aria-hidden", "true");
      onda.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + "px";
      onda.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + "px";
      boton.appendChild(onda); setTimeout(() => onda.remove(), 700);
    }
  });
  // Captura antes de que el contador reemplace al botón pulsado.
  document.addEventListener("click", e => {
    const boton = e.target.closest('[data-accion="add-rapido"], [data-accion="stepper-rapido"] [data-op="sumar"]');
    if (!boton || pedidoPendiente || envioEnCurso || !movimientoPermitido()) return;
    const inicio = boton.getBoundingClientRect();
    const destino = (innerWidth >= 1000 ? document.getElementById("titulo-carrito") : iconoCarrito).getBoundingClientRect();
    const punto = document.createElement("span"); punto.className = "particula-carrito"; punto.textContent = "+"; punto.setAttribute("aria-hidden", "true");
    punto.style.left = inicio.left + "px"; punto.style.top = inicio.top + "px"; document.body.appendChild(punto);
    const dx = destino.left - inicio.left, dy = destino.top - inicio.top;
    const anim = punto.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * .55}px,${dy - 60}px) scale(1.15)`, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.3)`, opacity: 0 }], { duration: 650, easing: "ease-in-out" });
    anim.onfinish = () => punto.remove();
  }, true);

  // Diálogos: foco encerrado, Escape, devolución del foco y fondo inerte.
  let dialogo = null, focoAnterior = null;
  const overlays = [...document.querySelectorAll(".overlay")];
  const titulos = { "overlay-carrito": "titulo-carrito", "overlay-detalle-producto": "detalle-nombre", "overlay-confirmacion": "texto-id-confirmacion" };
  function modalVisible(ov) { return !ov.classList.contains("oculto") && !(ov.id === "overlay-carrito" && innerWidth >= 1000); }
  function actualizarDialogo() {
    const siguiente = overlays.filter(modalVisible).at(-1) || null;
    if (dialogo === siguiente) return;
    document.querySelectorAll("[data-inerte-lf]").forEach(el => { el.inert = false; el.removeAttribute("data-inerte-lf"); });
    if (dialogo) { const hoja = dialogo.querySelector(".hoja"); hoja.removeAttribute("aria-modal"); hoja.removeAttribute("role"); }
    const cerrado = dialogo; dialogo = siguiente;
    if (siguiente) {
      if (!cerrado) focoAnterior = document.activeElement;
      const hoja = siguiente.querySelector(".hoja");
      hoja.setAttribute("role", "dialog"); hoja.setAttribute("aria-modal", "true"); hoja.setAttribute("aria-labelledby", titulos[siguiente.id]); hoja.tabIndex = -1;
      let rama = siguiente;
      while (rama.parentElement && rama !== document.body) {
        [...rama.parentElement.children].forEach(el => {
          if (el !== rama && !["SCRIPT", "STYLE"].includes(el.tagName) && !el.inert && el.id !== "toast") { el.inert = true; el.setAttribute("data-inerte-lf", ""); }
        }); rama = rama.parentElement;
      }
      document.body.style.overflow = "hidden";
      const foco = hoja.querySelector("button:not([disabled]), input:not([disabled])") || hoja;
      foco.focus({ preventScroll: true });
    } else {
      document.body.style.overflow = "";
      if (focoAnterior?.isConnected && focoAnterior.getClientRects().length) focoAnterior.focus({ preventScroll: true });
      else if (cerrado) document.getElementById("btn-abrir-buscador").focus({ preventScroll: true });
      focoAnterior = null;
    }
  }
  overlays.forEach(ov => new MutationObserver(actualizarDialogo).observe(ov, { attributes: true, attributeFilter: ["class"] }));
  window.addEventListener("resize", actualizarDialogo);
  document.addEventListener("keydown", e => {
    if (!dialogo) return;
    if (e.key === "Escape") {
      if (dialogo.id === "overlay-detalle-producto") cerrarDetalleProducto();
      else dialogo.classList.add("oculto");
      return;
    }
    if (e.key !== "Tab") return;
    const focos = [...dialogo.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!focos.length) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === focos[0]) { e.preventDefault(); focos.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === focos.at(-1)) { e.preventDefault(); focos[0].focus(); }
  });
  actualizarDialogo();
  function conexion() {
    const aviso = document.getElementById("aviso-conexion");
    aviso.classList.toggle("oculto", navigator.onLine);
    aviso.textContent = "Sin conexión · puedes explorar el menú. Para enviar y seguir pedidos necesitas internet.";
  }
  window.addEventListener("online", conexion); window.addEventListener("offline", conexion); conexion();
  // Instalable en navegadores compatibles. Nunca se guardan respuestas de pedidos en caché.
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  let instalacion;
  const instalar = document.getElementById("btn-instalar");
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalacion = e; instalar.classList.remove("oculto"); });
  instalar.addEventListener("click", async () => {
    if (!instalacion) return;
    await instalacion.prompt(); instalacion = null; instalar.classList.add("oculto");
  });
  window.addEventListener("appinstalled", () => instalar.classList.add("oculto"));
})();
