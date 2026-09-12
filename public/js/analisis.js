"use strict";
window.Analisis = (() => {
  const fmt = (v) =>
    v === null || !Number.isFinite(v)
      ? "Sin datos"
      : v.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  const metric = (s) =>
    s.n
      ? `${fmt(s.mediana)} min${s.n < 5 ? " · muestra pequeña" : ""}`
      : "Sin datos";
  let allOrders = [],
    analysis = null,
    rangeKey = "",
    loadingRange = false,
    generation = 0,
    initialized = false,
    worker = null;
  const host = () => $("#view-analisis");
  function init() {
    if (initialized) return;
    initialized = true;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "css/analisis.css";
    if (!document.querySelector('link[href="css/analisis.css"]'))
      document.head.append(css);
    host().innerHTML = `<header class="analysis-head"><span class="eyebrow">INGENIERÍA DE PROCESOS</span><h2>Del pedido a la entrega<span>.</span></h2><p>Medimos lo que registra el equipo. Si el botón se pulsa tarde, el indicador también lo refleja.</p></header>
    <form id="analysis-form" class="analysis-filters"><label>Periodo<select id="period"><option value="1">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="custom">Rango personalizado</option></select></label><label>Desde<input type="date" id="from" required></label><label>Hasta<input type="date" id="to" required></label><label>Entrega<select id="analysis-type"><option value="todos">Todos</option><option value="local">Local</option><option value="domicilio">Domicilio</option></select></label><label>Meta interna (min)<input type="number" id="goal" min="1" max="240" step="1" value="${targetMinutes}" required></label><label class="check-row"><input type="checkbox" id="include-corrected">Incluir pedidos corregidos</label><button class="button primary">Calcular periodo</button><button type="button" class="button" id="reload-analysis">Actualizar datos</button><button type="button" class="button" id="export-analysis" disabled>Exportar CSV</button></form>
    <p id="analysis-status" role="status"></p><div id="analysis-output"></div>`;
    const setDates = () => {
      if ($("#period").value === "custom") return;
      const end = Metricas.dia(Date.now());
      $("#to").value = end;
      $("#from").value = Metricas.dia(
        new Date(end + "T12:00:00-05:00").getTime() -
          (Number($("#period").value) - 1) * 86400000,
      );
    };
    setDates();
    $("#period").onchange = setDates;
    ["from", "to"].forEach(
      (id) => ($("#" + id).onchange = () => ($("#period").value = "custom")),
    );
    $("#analysis-form").onsubmit = (e) => {
      e.preventDefault();
      loadRange();
    };
    $("#reload-analysis").onclick = () => {
      invalidate();
      loadRange();
    };
    $("#export-analysis").onclick = () => {
      if (!analysis || loadingRange) return;
      const u = URL.createObjectURL(
        new Blob([Metricas.csv(analysis)], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = u;
      a.download = `las-fritas-${$("#from").value}-${$("#to").value}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    };
    host().addEventListener("change", () => {
      analysis = null;
      $("#export-analysis").disabled = true;
      $("#analysis-output").innerHTML = "";
      $("#analysis-status").textContent =
        "Filtros modificados. Pulsa Calcular periodo.";
    });
  }
  async function loadRange() {
    if (loadingRange) return;
    if (measurementVersion < 4) {
      $("#analysis-status").textContent =
        "Publica primero el backend de medición y ejecuta prepararSistema. No se han inventado datos para esta vista.";
      return;
    }
    if (!$("#analysis-form").reportValidity()) return;
    const from = $("#from").value,
      to = $("#to").value;
    if (from > to) {
      $("#analysis-status").textContent =
        "La fecha final debe ser igual o posterior a la inicial.";
      return;
    }
    const key = from + ":" + to,
      version = session,
      g = ++generation;
    loadingRange = true;
    $("#export-analysis").disabled = true;
    all("input,select,button", $("#analysis-form")).forEach(
      (e) => (e.disabled = true),
    );
    try {
      if (key !== rangeKey) {
        let cursor,
          tope,
          rows = [],
          data;
        do {
          data = await LF.request({
            accion: "listarRango",
            token,
            desde: from,
            hasta: to,
            ...(cursor ? { cursor, tope } : {}),
          });
          if (version !== session || g !== generation) return;
          if (!Array.isArray(data.pedidos) || data.versionMedicion !== 4)
            throw Error("La respuesta de medición no es compatible.");
          rows.push(...data.pedidos);
          cursor = data.cursor;
          tope = data.tope;
          $("#analysis-status").textContent =
            `Leyendo registros: ${tope - (cursor || 1)} de ${Math.max(0, tope - 1)}. Las cifras se mostrarán al completar la consulta.`;
        } while (cursor);
        allOrders = [...new Map(rows.map((p) => [p.id, p])).values()];
        rangeKey = key;
      }
      targetMinutes = Number($("#goal").value);
      LF.save("lasfritas_meta", targetMinutes);
      const args = [
        allOrders,
        from,
        to,
        targetMinutes,
        $("#include-corrected").checked,
        Date.now(),
        $("#analysis-type").value,
      ];
      let calculated;
      if (typeof Worker !== "undefined") {
        calculated = await new Promise((resolve, reject) => {
          worker = new Worker("js/metricas-worker.js");
          worker.onmessage = (e) => {
            worker?.terminate();
            worker = null;
            e.data.ok ? resolve(e.data.result) : reject(Error(e.data.error));
          };
          worker.onerror = () => {
            worker?.terminate();
            worker = null;
            reject(Error("No se pudo calcular el periodo. Reintenta."));
          };
          worker.postMessage(args);
        });
      } else calculated = Metricas.analizar(...args);
      if (version !== session || g !== generation) return;
      analysis = calculated;
      render();
      $("#analysis-status").textContent =
        `Periodo completo · ${from} a ${to} · Bogotá · ${new Date().toLocaleTimeString("es-CO")}. Datos conservados en esta sesión; pulsa Actualizar datos para consultar cambios.`;
    } catch (e) {
      if (version === session && g === generation) {
        $("#analysis-status").textContent =
          "Consulta incompleta: " +
          e.message +
          " Los resultados anteriores, si existen, no se han recalculado.";
      }
    } finally {
      if (version === session && g === generation) {
        loadingRange = false;
        all("input,select,button", $("#analysis-form")).forEach(
          (e) => (e.disabled = false),
        );
        $("#export-analysis").disabled = !analysis;
      }
    }
  }
  function table(head, rows, caption = "") {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${safe(caption || head.join(", "))}"><table>${caption ? `<caption>${safe(caption)}</caption>` : ""}<thead><tr>${head.map((h) => `<th scope="col">${safe(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${safe(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function bars(items, title, percent = false) {
    const max = Math.max(1, ...items.map((i) => i.n));
    return `<svg viewBox="0 0 640 ${items.length * 38 + 25}" role="img" aria-label="${safe(title)}" class="chart">${items.map((i, k) => `<text x="0" y="${k * 38 + 20}" font-size="13">${safe(i.label)}</text><rect x="185" y="${k * 38 + 4}" width="${(i.n / max) * 360}" height="23" fill="#a23c70" rx="3"/><text x="${195 + (i.n / max) * 360}" y="${k * 38 + 20}" font-size="13">${fmt(i.n)}${percent ? "%" : ""}</text>`).join("")}</svg>`;
  }
  function render() {
    const a = analysis;
    const sample = (s) =>
      `${s.n} pedidos${s.n > 0 && s.n < 5 ? " · muestra pequeña" : ""}`;
    const cards = Metricas.etapas
      .map((e) => {
        const s = a.resumen[e.key];
        const delta = s.mediana === null ? null : e.base - s.mediana;
        return `<article class="vsm-stage ${delta === null ? "" : delta >= 0 ? "improved" : "slower"}"><span>${safe(e.label)}</span><strong>${metric(s)}</strong><p>Base: ${e.base} min</p><p>${delta === null ? "Sin comparación" : `${fmt(Math.abs(delta))} min ${delta >= 0 ? "por debajo" : "por encima"} de la referencia`}</p><small>${sample(s)}</small></article>`;
      })
      .join("");
    let interpretation =
      "Aún no hay mediciones suficientes para interpretar el proceso.";
    if (a.resumen.total.n) {
      interpretation = `${a.cumplidos} de ${a.resumen.total.n} pedidos medidos terminaron dentro de ${a.meta} minutos (${fmt(a.porcentaje)}%). `;
      if (a.cuello)
        interpretation += `${a.cuello.etapa} concentra el ${fmt(a.cuello.porcentaje)}% del tiempo de ${a.cuello.n} recorridos completos${a.cuello.n < 5 ? " (muestra pequeña)" : ""}. `;
      const s = a.resumen.atencion;
      if (s.n >= 5)
        interpretation += `La mediana de atención inicial es ${fmt(s.mediana)} min, ${fmt(Math.abs(2 - s.mediana))} min ${s.mediana <= 2 ? "inferior" : "superior"} a la referencia de 2 min; los intervalos no miden exactamente la misma actividad. `;
      if (a.resumen.total.n < 5)
        interpretation +=
          "Muestra pequeña: no permite concluir que exista una mejora sostenida.";
    }
    const channelRows = a.canales.map((c) => [
      c.canal,
      metric(c.atencion),
      c.atencion.n,
      metric(c.total),
      c.total.n,
    ]);
    const diffText = Object.entries(a.diferencias)
      .map(([k, d]) =>
        d.minutos === null
          ? `${k}: sin comparación disponible.`
          : `${k}: mostrador − web = ${fmt(d.minutos)} min${d.porcentaje !== null ? ` (${fmt(d.porcentaje)}%)` : ""}.${!d.fiable ? " Muestra pequeña." : ""}`,
      )
      .join(" ");
    const colors = ["#a23c70", "#8c4b00", "#216452", "#364c9b"];
    const stack = a.apiladas
      .map((row) => {
        const total = row.valores.reduce((s, v) => s + (v || 0), 0);
        let x = 0;
        return `<h4>${row.tipo === "local" ? "Local" : "Domicilio"} · ${row.n} recorridos completos${row.n && row.n < 5 ? " · muestra pequeña" : ""}</h4>${
          row.n
            ? `<svg viewBox="0 0 640 48" class="chart" role="img" aria-label="Tiempo promedio por etapa, ${row.tipo}">${row.valores
                .map((v, i) => {
                  const w = total > 0 ? ((v || 0) / total) * 640 : 0;
                  const el = `<rect x="${x}" y="5" width="${w}" height="32" fill="${colors[i]}"/>`;
                  x += w;
                  return el;
                })
                .join("")}</svg>`
            : "<p>Sin recorridos completos</p>"
        }${table(
          ["Etapa", "Promedio (min)"],
          Metricas.etapas
            .slice(0, 4)
            .map((e, i) => [e.label, fmt(row.valores[i])]),
          "Descomposición " + row.tipo,
        )}`;
      })
      .join("");
    const nonzero = a.pareto.filter((c) => c.n);
    const pareto = nonzero.length
      ? `${bars(
          nonzero.map((c) => ({ label: c.causa, n: c.n })),
          "Frecuencia de causas de demora",
        )}<svg viewBox="0 0 640 130" role="img" aria-label="Porcentaje acumulado del Pareto" class="chart"><line x1="30" y1="110" x2="610" y2="110" stroke="#777"/><polyline fill="none" stroke="#364c9b" stroke-width="3" points="${nonzero.map((c, i) => `${30 + (i * 570) / Math.max(1, nonzero.length - 1)},${110 - c.acumulado}`).join(" ")}"/>${nonzero.map((c, i) => `<text x="${30 + (i * 550) / Math.max(1, nonzero.length - 1)}" y="${100 - c.acumulado}" font-size="12">${fmt(c.acumulado)}%</text>`).join("")}</svg>`
      : "<p>Sin causas registradas: todavía no hay Pareto.</p>";
    $("#analysis-output").innerHTML =
      `<div class="quality"><strong>${a.cohorte.length} pedidos creados en el periodo</strong><p>${a.pendientes} pendientes · ${a.sinTotal} entregados sin lead time válido · ${a.corregidos} corregidos · ${a.invalidos} con fechas/historial inválidos · ${a.sinCanal} sin canal.</p><p>Las cifras describen estados registrados, no pagos, utilidad ni cierre de caja. La mediana reduce la influencia de pedidos excepcionalmente largos; el promedio muestra su peso.</p></div>
    <section class="analysis-section"><h3>VSM · Referencia y medición</h3><p>PDF del proyecto, página 8: 20 min de procesamiento + 2 min de espera. Suma secuencial: 22 min. La meta interna inicial de 20 min no es una promesa al cliente ni una equivalencia entre métodos.</p><div class="vsm">${cards}</div><p>Atención incluye cola; alistamiento puede incluir espera del cliente o repartidor. Los estados no separan las esperas del trabajo físico.</p>${table(
      ["Indicador", "Mediana (min)", "Promedio (min)", "P90 (min)", "Muestra"],
      Metricas.etapas.map((e) => {
        const s = a.resumen[e.key];
        return [e.label, fmt(s.mediana), fmt(s.media), fmt(s.p90), sample(s)];
      }),
      "Resumen estadístico",
    )}</section>
    <section class="analysis-section interpretation"><h3>Lectura del periodo</h3><p>${safe(interpretation)}</p>${a.cuello ? `<p><strong>Mayor concentración observada: ${safe(a.cuello.etapa)}</strong>. Esto no demuestra por sí solo una restricción de capacidad.</p>` : ""}</section>
    <section class="analysis-section"><h3>¿Dónde se acumula el tiempo?</h3><p>Promedios de la misma muestra completa por tipo de entrega; los segmentos suman el lead time promedio.</p>${stack}</section>
    <section class="analysis-section"><h3>Distribución del lead time</h3>${bars(
      a.histograma.map((h) => ({ label: h.label + " min", n: h.n })),
      "Histograma de duración total",
    )}${table(
      ["Intervalo (min)", "Pedidos"],
      a.histograma.map((h) => [h.label, h.n]),
      "Histograma",
    )}</section>
    <section class="analysis-section"><h3>Causas de demora · Pareto</h3><p>${a.sinCausa} pedidos demorados sin causa registrada. Las frecuencias describen motivos indicados por el equipo.</p>${pareto}${table(
      ["Causa", "Pedidos", "Acumulado (%)"],
      a.pareto.map((c) => [c.causa, c.n, fmt(c.acumulado)]),
      "Pareto de causas",
    )}</section>
    <section class="analysis-section"><h3>Web y mostrador</h3>${table(["Canal", "Atención: mediana", "n", "Lead time: mediana", "n"], channelRows, "Comparación de canales")}<p>${safe(diffText)}</p><p>Comparación observacional: ambos canales usan la plataforma. No mide toda la toma presencial ni prueba causalidad. Compara tipos de entrega, franjas y productos semejantes.</p></section>
    <section class="analysis-section"><h3>Productos para compartir</h3>${table(
      ["Grupo", "Mediana lead time", "Muestra"],
      a.grupos.map((g) => [g.grupo, metric(g.total), g.total.n]),
      "Variación por producto",
    )}<p>Incluye Mega Frita y Mega Frita Show Queso; cada pedido mixto se cuenta una sola vez.</p></section>
    <section class="analysis-section"><h3>WIP y hora pico</h3><p>WIP actual de los registros consultados, incluidos activos anteriores al periodo. ${a.sinHistoria} registros sin historial completo no permiten reconstruir su WIP histórico.</p>${table(
      ["Estado", "Activos"],
      a.wip.map((w) => [w.estado, w.n]),
      "Trabajo en proceso",
    )}${bars(
      a.horas.map((h) => ({
        label: String(h.hora).padStart(2, "0") + ":00",
        n: h.llegadas,
      })),
      "Llegadas por hora de Bogotá",
    )}${table(
      [
        "Hora Bogotá",
        "Llegadas",
        "Entregas",
        "Entregas / franja diaria",
        "Mediana total por hora de llegada",
      ],
      a.horas.map((h) => [
        h.hora + ":00",
        h.llegadas,
        h.entregados,
        fmt(h.entregasPorFranja),
        metric(h.total),
      ]),
      "Distribución horaria",
    )}<p>Entregas agrupadas por hora de entrega; tiempos por hora de creación. La franja diaria divide por días seleccionados, incluye horas sin servicio y hoy puede estar incompleto.</p><details><summary>WIP histórico por hora</summary>${table(
      ["Hora inicial Bogotá", "WIP medio conocido"],
      a.wipHistorico.map((h) => [
        new Date(h.hora).toLocaleString("es-CO", {
          timeZone: "America/Bogota",
        }),
        fmt(h.promedio),
      ]),
      "Promedio de pedidos simultáneos",
    )}</details></section>
    <section class="analysis-section"><h3>Para el informe</h3><p>Declara el periodo, la muestra por indicador, las exclusiones, la disciplina de pulsación y la diferencia entre tiempo registrado y tiempo físico. La satisfacción del cliente requiere una encuesta independiente; esta pantalla no la mide.</p><p>Consulta de hasta 500 filas por petición. Una carga completa aún puede recorrer toda la hoja; las cifras solo aparecen al terminar. La copia en memoria se borra al cerrar sesión.</p></section>`;
  }
  function invalidate() {
    rangeKey = "";
    analysis = null;
    if (initialized) {
      $("#export-analysis").disabled = true;
      $("#analysis-output").innerHTML = "";
      $("#analysis-status").textContent =
        "Hay cambios en los pedidos. Vuelve a calcular el periodo.";
    }
  }
  function reset() {
    generation++;
    worker?.terminate();
    worker = null;
    loadingRange = false;
    allOrders = [];
    analysis = null;
    rangeKey = "";
    initialized = false;
  }
  return {
    open() {
      init();
      if (!analysis) loadRange();
    },
    invalidate,
    reset,
  };
})();
