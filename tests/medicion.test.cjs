const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  fs = require("node:fs");
const { crearBackend } = require("./backend-fixture.cjs");
const M = require("../public/js/metricas.js");
let count = 0;
const test = (name, fn) => {
  fn();
  count++;
  console.log("OK · " + name);
};
const b = crearBackend();
b.preparar();
b.properties.STAFF_KEY = "clave-pruebas-privada";
const token = b.properties.STAFF_KEY;
const pedido = () => ({
  accion: "crear",
  requestId: crypto.randomUUID(),
  cliente: "Prueba",
  telefono: "3001234567",
  tipo: "local",
  direccion: "",
  items: [{ id: "salchi-quesuda", cantidad: 1, precio: 24000, nota: "" }],
  notas: "",
  total: 24000,
});
const sheet = b.hojas.get("Pedidos");
const headers = sheet.rows[0];
const get = (id) =>
  b.post({ accion: "listar", token }).pedidos.find((p) => p.id === id);
const set = (id, key, value) => {
  const row = sheet.rows.find((r) => r[0] === id);
  row[headers.indexOf(key)] = value;
};
test("Migración idempotente de 12 columnas, preserva extra y filas", () => {
  const old = crearBackend(),
    s = old.ss.insertSheet("Pedidos");
  s.appendRow(headers.slice(0, 12).concat("datoPropio"));
  s.appendRow([
    "abcd1234",
    "2020-01-01",
    "Cliente",
    "3001234567",
    "local",
    "",
    "[]",
    "",
    "Recibido",
    0,
    "",
    "",
    42,
  ]);
  const before = s.rows[1].slice();
  old.preparar();
  old.preparar();
  assert.deepEqual(s.rows[1], before);
  assert.equal(new Set(s.rows[0]).size, s.rows[0].length);
  assert.equal(s.rows[0][12], "datoPropio");
  assert.equal(s.rows[1][13], undefined);
});
test("Lectura pública nunca crea cabeceras", () => {
  const old = crearBackend(),
    s = old.ss.insertSheet("Pedidos");
  s.appendRow(headers.slice(0, 10));
  s.appendRow([
    "abcd1234",
    "2020-01-01",
    "C",
    "3001234567",
    "local",
    "",
    "[]",
    "",
    "Recibido",
    1,
  ]);
  old.get({ id: "abcd1234" });
  assert.equal(s.rows[0].length, 10);
});
test("Cabeceras duplicadas detienen preparación sin tocar filas", () => {
  const bad = crearBackend(),
    s = bad.ss.insertSheet("Pedidos");
  s.appendRow(headers.slice(0, 12).concat("id"));
  assert.throws(() => bad.preparar());
});
const data = pedido(),
  id = b.post(data).id;
test("Creación toma una sola hora del servidor", () => {
  const p = get(id);
  assert.equal(p.timestamp, p.tsRecibido);
  assert.equal(p.tsRecibido, p.tsUltimoCambio);
  assert.equal(p.canal, "web");
});
test("Canal mostrador autenticado y no falsificable", () => {
  assert.equal(b.post({ ...pedido(), canal: "mostrador" }).code, "AUTH");
  assert.equal(b.post({ ...pedido(), accion: "crearMostrador" }).code, "AUTH");
  const p = { ...pedido(), accion: "crearMostrador", token },
    r = b.post(p);
  assert.equal(r.ok, true);
  assert.equal(get(r.id).canal, "mostrador");
  assert.equal(b.post(p).id, r.id);
  assert.equal(
    b.post({ ...p, accion: "crear", token: undefined }).code,
    "CONFLICTO",
  );
});
const op = {
  accion: "actualizarEstado",
  token,
  id,
  estado: "Preparando",
  estadoAnterior: "Recibido",
  operacionId: crypto.randomUUID(),
};
b.post(op);
test("Estado, primera marca e historial; reintento exacto", () => {
  const p = get(id);
  assert.ok(p.tsPreparando);
  assert.equal(b.post(op).repetido, true);
  assert.equal(JSON.parse(get(id).historialEstados).length, 2);
  assert.equal(b.post({ ...op, estado: "Entregado" }).code, "CONFLICTO");
});
test("Corrección conserva primera llegada y pide motivo", () => {
  const first = get(id).tsPreparando;
  assert.equal(
    b.post({
      accion: "actualizarEstado",
      token,
      id,
      estado: "Recibido",
      estadoAnterior: "Preparando",
    }).ok,
    false,
  );
  assert.equal(
    b.post({
      accion: "actualizarEstado",
      token,
      id,
      estado: "Recibido",
      estadoAnterior: "Preparando",
      correccion: true,
      motivoCorreccion: "Pulsación accidental",
    }).ok,
    true,
  );
  assert.equal(
    b.post({
      accion: "actualizarEstado",
      token,
      id,
      estado: "Preparando",
      estadoAnterior: "Recibido",
    }).ok,
    true,
  );
  assert.equal(get(id).tsPreparando, first);
  assert.equal(M.tiempos(get(id)).corregido, true);
});
test("Salto autorizado deja marcas intermedias vacías", () => {
  const r = b.post(pedido());
  b.post({
    accion: "actualizarEstado",
    token,
    id: r.id,
    estado: "Entregado",
    estadoAnterior: "Recibido",
    correccion: true,
    motivoCorreccion: "El equipo omitió registrar pasos",
  });
  const p = get(r.id);
  assert.equal(p.tsPreparando, "");
  assert.equal(p.tsListo, "");
  assert.ok(p.tsEntregado);
});
test("Histórico no recibe tsRecibido al corregir hacia atrás", () => {
  set(id, "tsRecibido", "");
  b.post({
    accion: "actualizarEstado",
    token,
    id,
    estado: "Recibido",
    estadoAnterior: "Preparando",
    correccion: true,
    motivoCorreccion: "Revisión",
  });
  assert.equal(get(id).tsRecibido, "");
});
test("Motivo de demora con conflicto y sin sobrescribir marca de estado", () => {
  const p = get(id),
    r = {
      accion: "motivoDemora",
      token,
      id,
      estadoAnterior: p.estado,
      motivoAnterior: "",
      motivo: "alta demanda",
    };
  assert.equal(b.post(r).ok, true);
  assert.equal(get(id).tsUltimoCambio, p.tsUltimoCambio);
  assert.equal(b.post({ ...r, motivo: "otro" }).code, "CONFLICTO");
});
test("Seguimiento público con lista exacta de campos, nunca medición", () => {
  assert.deepEqual(
    Object.keys(b.get({ id }).pedidos[0]).sort(),
    ["id", "timestamp", "tipo", "items", "estado", "total"].sort(),
  );
});
const at = (n) => new Date(Date.UTC(2026, 8, 11, 17, n)).toISOString();
const timed = (minutes = 20, tipo = "domicilio") => ({
  id: crypto.randomUUID(),
  timestamp: at(0),
  tsRecibido: at(0),
  tsPreparando: at(2),
  tsListo: at(17),
  tsEnCamino: tipo === "domicilio" ? at(18) : "",
  tsEntregado: at(minutes),
  tipo,
  estado: "Entregado",
  canal: "web",
  items: "[]",
  historialEstados: JSON.stringify([
    { hora: at(0), de: null, a: "Recibido" },
    { hora: at(minutes), de: "En camino", a: "Entregado" },
  ]),
});
test("Fórmulas y diferencia entre cero real y ausencia", () => {
  let p = timed();
  assert.deepEqual(
    Object.fromEntries(M.etapas.map((e) => [e.key, M.tiempos(p)[e.key]])),
    { atencion: 2, preparacion: 15, empaque: 1, entrega: 2, total: 20 },
  );
  p.tsPreparando = p.tsRecibido;
  assert.equal(M.tiempos(p).atencion, 0);
  p.tsPreparando = "";
  assert.equal(M.tiempos(p).atencion, null);
  assert.equal(M.stats([null, 0, 2]).media, 1);
});
test("Mediana y P90 reproducibles sin recortar atípicos", () => {
  assert.deepEqual(M.stats([1, 2, 3, 4, 500, null]), {
    n: 5,
    media: 102,
    mediana: 3,
    p90: 500,
  });
  assert.equal(M.stats([1, 2, 3, 4]).mediana, 2.5);
});
test("Fechas incoherentes y etapas no aplicables", () => {
  const p = timed();
  p.tsListo = at(1);
  assert.equal(M.tiempos(p).invalido, true);
  assert.equal(M.tiempos(p).total, null);
  assert.equal(M.tiempos(timed(20, "local")).entrega, null);
});
test("Pendientes fuera del denominador; corregidos separados", () => {
  const p = timed(),
    pending = { ...timed(), estado: "Preparando", tsEntregado: "" },
    fixed = timed();
  fixed.historialEstados = JSON.stringify([
    { hora: at(0), de: null, a: "Recibido", correccion: true },
  ]);
  const a = M.analizar(
    [p, pending, fixed],
    "2026-09-11",
    "2026-09-11",
    20,
    false,
    Date.parse(at(60)),
  );
  assert.equal(a.resumen.total.n, 1);
  assert.equal(a.porcentaje, 100);
  assert.equal(a.pendientes, 1);
  assert.equal(a.corregidos, 1);
});
test("Lead time atraviesa medianoche y mantiene extremos", () => {
  const p = timed(600);
  const a = M.analizar([p], "2026-09-11", "2026-09-11");
  assert.equal(a.resumen.total.mediana, 600);
});
test("Apilado usa una muestra común por tipo", () => {
  const p = timed(),
    q = timed(30);
  q.tsPreparando = "";
  const a = M.analizar([p, q], "2026-09-11", "2026-09-11");
  assert.equal(a.resumen.total.n, 2);
  assert.equal(a.apiladas.find((r) => r.tipo === "domicilio").n, 1);
  assert.equal(
    a.apiladas[1].valores.reduce((s, v) => s + (v || 0), 0),
    20,
  );
});
test("Comparación canales, Pareto, grupos y CSV sin datos personales", () => {
  const p = {
      ...timed(30),
      motivoDemora: "alta demanda",
      cliente: "SECRETO",
      telefono: "SECRETO",
      items: '[{"id":"mega-frita"}]',
    },
    q = { ...timed(20), canal: "mostrador" };
  const a = M.analizar([p, q], "2026-09-11", "2026-09-11");
  assert.equal(a.diferencias.total.minutos, -10);
  assert.equal(a.pareto[0].n, 1);
  assert.equal(a.grupos[0].total.n, 1);
  assert.ok(!M.csv(a).includes("SECRETO"));
  assert.ok(M.csv(a).includes("total_min"));
});
test("WIP histórico integra duración y reaperturas", () => {
  const p = timed();
  p.historialEstados = JSON.stringify([
    { hora: at(0), de: null, a: "Recibido" },
    { hora: at(20), de: "Listo", a: "Entregado" },
    { hora: at(30), de: "Entregado", a: "Preparando", correccion: true },
    { hora: at(40), de: "Preparando", a: "Entregado" },
  ]);
  const a = M.analizar(
    [p],
    "2026-09-11",
    "2026-09-11",
    20,
    false,
    Date.parse(at(60)),
  );
  assert.equal(a.wipHistorico.find((h) => h.hora === at(0)).promedio, 0.5);
});
test("Paginación limitada devuelve rango completo sin datos personales", () => {
  for (let i = 0; i < 1200; i++)
    sheet.appendRow(
      headers.map(
        (k) =>
          ({
            id: "f" + i,
            timestamp: "2026-09-11T17:00:00Z",
            estado: "Recibido",
            tipo: "local",
            cliente: "SECRETO",
            telefono: "SECRETO",
            items: "[]",
          })[k] || "",
      ),
    );
  let cursor,
    tope,
    ids = new Set(),
    calls = 0;
  do {
    const r = b.post({
      accion: "listarRango",
      token,
      desde: "2026-09-11",
      hasta: "2026-09-11",
      ...(cursor ? { cursor, tope } : {}),
    });
    assert.equal(r.ok, true);
    assert.ok(r.leidas <= 500);
    r.pedidos.forEach((p) => {
      assert.ok(!("cliente" in p));
      ids.add(p.id);
    });
    cursor = r.cursor;
    tope = r.tope;
    calls++;
  } while (cursor);
  assert.ok(calls >= 3);
  assert.ok(ids.has("f0") && ids.has("f1199"));
});
console.log(count + " pruebas de medición correctas.");
