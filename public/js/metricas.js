/* Cálculos puros: minutos sin redondear, null significa ausencia, nunca cero sintético. */
"use strict";
const Metricas = (() => {
  const etapas = [
    { key: "atencion", label: "Atención inicial", base: 2 },
    { key: "preparacion", label: "Preparación", base: 15 },
    { key: "empaque", label: "Alistamiento / retiro", base: 1 },
    { key: "entrega", label: "Entrega a domicilio", base: 2 },
    { key: "total", label: "Lead time total", base: 20 },
  ];
  const marcas = [
    "tsRecibido",
    "tsPreparando",
    "tsListo",
    "tsEnCamino",
    "tsEntregado",
  ];
  const estados = [
    "Recibido",
    "Preparando",
    "Listo para entregar",
    "En camino",
    "Entregado",
  ];
  const fecha = (v) => {
    if (v === null || v === undefined || v === "" || typeof v === "number")
      return null;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : null;
  };
  const formatoDia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatoHora = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const dia = (v) => formatoDia.format(new Date(v));
  const hora = (v) => Number(formatoHora.format(new Date(v)));
  function tiempos(p) {
    const t = Object.fromEntries(marcas.map((k) => [k, fecha(p[k])]));
    let historial = [],
      corrupto = false;
    try {
      historial = JSON.parse(p.historialEstados || "[]");
      if (!Array.isArray(historial)) throw Error();
    } catch {
      corrupto = true;
      historial = [];
    }
    const corregido = historial.some((e) => e.correccion);
    const cadena = marcas
      .filter((k) => p.tipo === "domicilio" || k !== "tsEnCamino")
      .map((k) => t[k])
      .filter((v) => v !== null);
    const invalido =
      cadena.some((v, i) => i && v < cadena[i - 1]) ||
      corrupto ||
      marcas.some(
        (k) =>
          p[k] !== undefined && p[k] !== null && p[k] !== "" && t[k] === null,
      );
    const diff = (a, b) =>
      invalido || t[a] === null || t[b] === null || t[b] < t[a]
        ? null
        : (t[b] - t[a]) / 60000;
    return {
      atencion: diff("tsRecibido", "tsPreparando"),
      preparacion: diff("tsPreparando", "tsListo"),
      empaque: diff(
        "tsListo",
        p.tipo === "domicilio" ? "tsEnCamino" : "tsEntregado",
      ),
      entrega:
        p.tipo === "domicilio" ? diff("tsEnCamino", "tsEntregado") : null,
      total:
        p.estado === "Entregado" ? diff("tsRecibido", "tsEntregado") : null,
      corregido,
      invalido,
      historial,
      t,
    };
  }
  function stats(values) {
    const a = values
        .filter((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)
        .sort((a, b) => a - b),
      n = a.length;
    return {
      n,
      media: n ? a.reduce((s, v) => s + v, 0) / n : null,
      mediana: n
        ? n % 2
          ? a[(n - 1) / 2]
          : (a[n / 2 - 1] + a[n / 2]) / 2
        : null,
      p90: n ? a[Math.ceil(0.9 * n) - 1] : null,
    };
  }
  function grupo(p, compartir = ["mega-frita", "mega-frita-queso"]) {
    try {
      return JSON.parse(p.items || "[]").some((i) => compartir.includes(i.id))
        ? "Para compartir"
        : "Resto";
    } catch {
      return "Sin clasificar";
    }
  }
  function analizar(
    pedidos,
    desde,
    hasta,
    meta = 20,
    incluirCorregidos = false,
    ahora = Date.now(),
    tipo = "todos",
  ) {
    const start = fecha(desde + "T00:00:00-05:00"),
      end = fecha(hasta + "T00:00:00-05:00") + 86400000;
    const rows = pedidos
      .filter((p) => tipo === "todos" || p.tipo === tipo)
      .map((p) => ({ p, m: tiempos(p) }));
    const cohorte = rows.filter(
      ({ p }) => fecha(p.timestamp) >= start && fecha(p.timestamp) < end,
    );
    const validos = cohorte.filter(
      (r) => !r.m.invalido && (incluirCorregidos || !r.m.corregido),
    );
    const resumen = Object.fromEntries(
      etapas.map((e) => [e.key, stats(validos.map((r) => r.m[e.key]))]),
    );
    const completos = validos.filter(
      (r) =>
        r.m.total !== null &&
        [
          "atencion",
          "preparacion",
          "empaque",
          ...(r.p.tipo === "domicilio" ? ["entrega"] : []),
        ].every((k) => r.m[k] !== null),
    );
    const sumas = etapas
      .slice(0, 4)
      .map((e) => completos.reduce((s, r) => s + (r.m[e.key] ?? 0), 0));
    const suma = sumas.reduce((s, v) => s + v, 0),
      idx = sumas.indexOf(Math.max(...sumas));
    const cuello =
      suma > 0
        ? {
            etapa: etapas[idx].label,
            porcentaje: (100 * sumas[idx]) / suma,
            n: completos.length,
          }
        : null;
    const apiladas = ["local", "domicilio"].map((tipo) => {
      const rs = completos.filter((r) => r.p.tipo === tipo);
      return {
        tipo,
        n: rs.length,
        valores: etapas
          .slice(0, 4)
          .map((e) => stats(rs.map((r) => r.m[e.key])).media),
      };
    });
    const cumplidos = validos.filter(
      (r) => r.m.total !== null && r.m.total <= meta,
    ).length;
    const canales = ["web", "mostrador"].map((canal) => {
      const rs = validos.filter((r) => r.p.canal === canal);
      return {
        canal,
        atencion: stats(rs.map((r) => r.m.atencion)),
        total: stats(rs.map((r) => r.m.total)),
      };
    });
    const diferencia = (k) => {
      const web = canales[0][k],
        mostrador = canales[1][k];
      return {
        minutos:
          web.mediana !== null && mostrador.mediana !== null
            ? mostrador.mediana - web.mediana
            : null,
        porcentaje:
          web.mediana !== null && mostrador.mediana > 0
            ? (100 * (mostrador.mediana - web.mediana)) / mostrador.mediana
            : null,
        fiable: web.n >= 5 && mostrador.n >= 5,
      };
    };
    const horas = Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      llegadas: 0,
      entregados: 0,
      tiempos: [],
    }));
    cohorte.forEach(({ p }) => horas[hora(p.timestamp)].llegadas++);
    validos.forEach(({ p, m }) => {
      if (m.total !== null) horas[hora(p.timestamp)].tiempos.push(m.total);
    });
    rows.forEach(({ p, m }) => {
      const t = m.t.tsEntregado;
      if (p.estado === "Entregado" && t !== null && t >= start && t < end)
        horas[hora(t)].entregados++;
    });
    horas.forEach((h) => (h.total = stats(h.tiempos)));
    const dias = Math.round((end - start) / 86400000);
    horas.forEach((h) => (h.entregasPorFranja = h.entregados / dias));
    const grupos = ["Para compartir", "Resto", "Sin clasificar"].map((g) => ({
      grupo: g,
      total: stats(
        validos.filter((r) => grupo(r.p) === g).map((r) => r.m.total),
      ),
    }));
    const limites = [0, 10, 20, 30, 45, 60, Infinity];
    const histograma = limites
      .slice(0, -1)
      .map((v, i) => ({
        label: i === 5 ? "60+" : `${v}–<${limites[i + 1]}`,
        n: validos.filter(
          (r) =>
            r.m.total !== null && r.m.total >= v && r.m.total < limites[i + 1],
        ).length,
      }));
    const demorados = validos.filter(({ m, p }) =>
      m.total !== null
        ? m.total > meta
        : p.estado !== "Entregado" &&
          m.t.tsRecibido !== null &&
          (ahora - m.t.tsRecibido) / 60000 > meta,
    );
    const causas = [
      "falta de insumo",
      "equipo ocupado",
      "pedido grande",
      "alta demanda",
      "error en el pedido",
      "otro",
    ];
    const pareto = causas
      .map((causa) => ({
        causa,
        n: demorados.filter((r) => r.p.motivoDemora === causa).length,
      }))
      .sort((a, b) => b.n - a.n);
    let acumulado = 0;
    const conCausa = pareto.reduce((s, c) => s + c.n, 0);
    pareto.forEach((c) => {
      acumulado += c.n;
      c.acumulado = conCausa ? (100 * acumulado) / conCausa : null;
    });
    const wip = estados
      .slice(0, 4)
      .map((estado) => ({
        estado,
        n: rows.filter((r) => r.p.estado === estado).length,
      }));
    // Cada evento define intervalos reales, incluso reaperturas. No se rellenan historiales antiguos.
    const intervalos = [];
    let sinHistoria = 0;
    rows.forEach(({ p, m }) => {
      const es = m.historial.filter((e) => !e.tipo && fecha(e.hora) !== null);
      if (!es.length || es[0].de !== null) {
        sinHistoria++;
        return;
      }
      es.forEach((e, i) => {
        if (e.a !== "Entregado")
          intervalos.push([
            fecha(e.hora),
            i + 1 < es.length ? fecha(es[i + 1].hora) : ahora,
          ]);
      });
    });
    const wipHistorico = [];
    for (let t = start; t < Math.min(end, ahora); t += 3600000) {
      const fin = Math.min(t + 3600000, end, ahora);
      const area = intervalos.reduce(
        (s, [a, b]) => s + Math.max(0, Math.min(b, fin) - Math.max(a, t)),
        0,
      );
      wipHistorico.push({
        hora: new Date(t).toISOString(),
        promedio: fin > t ? area / (fin - t) : null,
      });
    }
    return {
      cohorte,
      validos,
      resumen,
      completos: completos.length,
      cuello,
      apiladas,
      cumplidos,
      meta,
      porcentaje: resumen.total.n ? (cumplidos / resumen.total.n) * 100 : null,
      canales,
      diferencias: {
        atencion: diferencia("atencion"),
        total: diferencia("total"),
      },
      horas,
      grupos,
      histograma,
      pareto,
      sinCausa: demorados.length - conCausa,
      wip,
      wipHistorico,
      sinHistoria,
      pendientes: cohorte.filter((r) => r.p.estado !== "Entregado").length,
      corregidos: cohorte.filter((r) => r.m.corregido).length,
      invalidos: cohorte.filter((r) => r.m.invalido).length,
      sinTotal: cohorte.filter(
        (r) => r.p.estado === "Entregado" && r.m.total === null,
      ).length,
      sinCanal: cohorte.filter((r) => !["web", "mostrador"].includes(r.p.canal))
        .length,
    };
  }
  const csvCell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r\n]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  function csv(a) {
    const keys = [
      "id",
      "timestamp",
      "tipo",
      "estado",
      "canal",
      ...marcas,
      "tsUltimoCambio",
      "motivoDemora",
      "historialEstados",
    ];
    const head = [
      ...keys,
      ...etapas.map((e) => e.key + "_min"),
      "grupo",
      "registro_corregido",
      "fechas_invalidas",
      "meta_min",
      "cumple_meta",
    ];
    return (
      "\ufeff" +
      [
        head,
        ...a.cohorte.map(({ p, m }) => [
          ...keys.map((k) => p[k]),
          ...etapas.map((e) => m[e.key]),
          grupo(p),
          m.corregido,
          m.invalido,
          a.meta,
          m.total === null ? "" : m.total <= a.meta,
        ]),
      ]
        .map((r) => r.map(csvCell).join(";"))
        .join("\r\n")
    );
  }
  return {
    etapas,
    marcas,
    fecha,
    dia,
    hora,
    tiempos,
    stats,
    analizar,
    grupo,
    csv,
  };
})();
if (typeof module !== "undefined") module.exports = Metricas;
