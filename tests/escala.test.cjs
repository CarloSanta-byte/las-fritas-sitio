// Benchmark de simulación local. No representa latencia ni cuotas de Google.
const { crearBackend } = require("./backend-fixture.cjs"),
  M = require("../public/js/metricas.js"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const resultados = [];
for (const n of [1000, 10000, 50000]) {
  const b = crearBackend();
  b.preparar();
  b.properties.STAFF_KEY = "clave-benchmark-v4";
  const s = b.hojas.get("Pedidos"),
    h = s.rows[0];
  const modelo = {
    timestamp: "2026-09-11T15:00:00Z",
    tsRecibido: "2026-09-11T15:00:00Z",
    tsPreparando: "2026-09-11T15:02:00Z",
    tsListo: "2026-09-11T15:17:00Z",
    tsEntregado: "2026-09-11T15:20:00Z",
    estado: "Entregado",
    canal: "web",
    tipo: "local",
    items: "[]",
    historialEstados:
      '[{"hora":"2026-09-11T15:00:00Z","de":null,"a":"Recibido"},{"hora":"2026-09-11T15:20:00Z","de":"Listo para entregar","a":"Entregado"}]',
  };
  for (let i = 0; i < n; i++)
    s.appendRow(h.map((k) => (k === "id" ? "simulado" + i : modelo[k] || "")));
  const begin = performance.now();
  let cursor,
    tope,
    rows = [],
    calls = 0;
  do {
    const r = b.post({
      accion: "listarRango",
      token: b.properties.STAFF_KEY,
      desde: "2026-08-13",
      hasta: "2026-09-11",
      ...(cursor ? { cursor, tope } : {}),
    });
    assert.equal(r.ok, true);
    assert.ok(r.leidas <= 500);
    rows.push(...r.pedidos);
    cursor = r.cursor;
    tope = r.tope;
    calls++;
  } while (cursor);
  const reading = performance.now() - begin,
    start = performance.now(),
    a = M.analizar(
      rows,
      "2026-08-13",
      "2026-09-11",
      20,
      false,
      Date.parse("2026-09-11T23:00:00Z"),
    );
  assert.equal(a.resumen.total.n, n);
  assert.equal(a.resumen.total.mediana, 20);
  assert.equal(a.cumplidos, n);
  resultados.push({
    filas: n,
    peticiones: calls,
    lecturaSimuladaMs: Math.round(reading),
    calculoMs: Math.round(performance.now() - start),
  });
}
fs.writeFileSync(
  path.join(__dirname, "../pruebas-visuales/escala.json"),
  JSON.stringify(
    {
      simulado: true,
      nota: "Sin Google ni red; no establece capacidad de producción.",
      resultados,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(resultados, null, 2));
