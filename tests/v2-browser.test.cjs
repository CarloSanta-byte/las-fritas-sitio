const { chromium } = require("playwright"),
  { default: AxeBuilder } = require("@axe-core/playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { crearBackend } = require("./backend-fixture.cjs"),
  { server } = require("./serve.cjs");
const b = crearBackend();
b.preparar();
b.properties.STAFF_KEY = "clave-simulada-v4";
const M = require("../public/js/metricas.js"),
  today = M.dia(Date.now());
const base = new Date(today + "T10:00:00-05:00").getTime(),
  iso = (n) => new Date(base + n * 60000).toISOString();
const payload = (i) => ({
  accion: "crear",
  requestId: crypto.randomUUID(),
  cliente: "Pedido simulado " + i,
  telefono: "3001234567",
  tipo: i % 2 ? "local" : "domicilio",
  direccion: "Dirección simulada",
  items: [
    { id: "salchi-quesuda", cantidad: 1, precio: 24000, nota: "Sin cebolla" },
  ],
  notas: "",
  total: 24000,
});
const sheet = b.hojas.get("Pedidos"),
  heads = sheet.rows[0];
const update = (id, data) => {
  const row = sheet.rows.find((r) => r[0] === id);
  Object.entries(data).forEach(([k, v]) => (row[heads.indexOf(k)] = v));
};
for (let i = 0; i < 40; i++) {
  const id = b.post(payload(i)).id;
  const delivered = i < 20;
  const type = i % 2 ? "local" : "domicilio",
    state = delivered
      ? "Entregado"
      : ["Recibido", "Preparando", "Listo para entregar", "En camino"][i % 4];
  const actual =
    type === "local" && state === "En camino" ? "Preparando" : state;
  update(id, {
    timestamp: iso(i),
    tsRecibido: iso(i),
    tsPreparando: actual === "Recibido" ? "" : iso(i + 2),
    tsListo: ["Recibido", "Preparando"].includes(actual) ? "" : iso(i + 15),
    tsEnCamino:
      type === "domicilio" && ["Entregado", "En camino"].includes(actual)
        ? iso(i + 17)
        : "",
    tsEntregado: delivered ? iso(i + 20 + (i % 5)) : "",
    tsUltimoCambio: iso(i + 2),
    estado: actual,
    canal: i % 3 ? "web" : "mostrador",
    motivoDemora: i % 3 ? "alta demanda" : "",
    historialEstados: JSON.stringify([
      { hora: iso(i), de: null, a: "Recibido" },
      ...(delivered
        ? [
            {
              hora: iso(i + 20 + (i % 5)),
              de: "Listo para entregar",
              a: "Entregado",
            },
          ]
        : []),
    ]),
  });
}
let browser,
  groups = 0;
const ok = (t) => {
  console.log("OK · " + t);
  groups++;
};
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const errors = [];
  let lose = false,
    posts = [];
  await ctx.route("https://script.google.com/**", async (r) => {
    const req = r.request(),
      p = req.method() === "POST" ? JSON.parse(req.postData()) : null;
    if (p) posts.push(p);
    const data = p
      ? b.post(p)
      : b.get(Object.fromEntries(new URL(req.url()).searchParams));
    if (lose && p?.accion === "crearMostrador") {
      lose = false;
      await r.abort();
      return;
    }
    await r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url + "/staff.html");
  await page.locator("#staff-key").fill(b.properties.STAFF_KEY);
  await page.locator("#login-submit").click();
  await page.locator(".queue-order").first().waitFor();
  await page.locator("#board-mode").click();
  assert.equal(await page.locator(".state-column").count(), 4);
  const boardAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    boardAxe.violations.map((v) => v.id + ":" + v.nodes.map((n) => n.target)),
    [],
  );
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Tablero " + width,
    );
  }
  await page.screenshot({
    path: path.join(__dirname, "../pruebas-visuales/v2-tablero.png"),
    fullPage: true,
  });
  const btn = page.locator("[data-advance]").first();
  const id = await btn.getAttribute("data-id");
  const next = await btn.getAttribute("data-advance");
  await btn.click();
  await page.waitForFunction(() => !changing);
  assert.equal(b.get({ id }).pedidos[0].estado, next);
  ok("Kanban de 20 pedidos, avance real confirmado y 7 tamaños sin desborde");
  await page.locator('[data-view="analisis"]').click();
  await page.locator(".vsm-stage").first().waitFor();
  assert.equal(await page.locator(".vsm-stage").count(), 5);
  assert.ok(
    await page
      .locator("#analysis-output")
      .innerText()
      .then((t) => t.includes("22 min")),
  );
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    report.violations.map((v) => v.id + ":" + v.nodes.map((n) => n.target)),
    [],
  );
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Análisis " + width,
    );
  }
  await page.screenshot({
    path: path.join(__dirname, "../pruebas-visuales/v2-analisis.png"),
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.locator("#export-analysis").click();
  const file = await download;
  await file.saveAs(
    path.join(__dirname, "../pruebas-visuales/ejemplo-simulado.csv"),
  );
  assert.ok(
    !fs
      .readFileSync(
        path.join(__dirname, "../pruebas-visuales/ejemplo-simulado.csv"),
        "utf8",
      )
      .includes("3001234567"),
  );
  ok("VSM, tablas accesibles, gráficas, filtros y CSV sin datos de contacto");
  await page.locator('[data-view="mostrador"]').click();
  await page.locator("#manual-search").waitFor();
  await page.locator("#manual-search").fill("burger clásica");
  await page.locator('[data-manual="burger-clasica"]').click();
  await page.locator("#manual-product-note").fill("Sin cebolla");
  await page.locator("#manual-add").click();
  await page.locator("#manual-search").fill("adicional");
  await page.locator('[data-manual="add-queso"]').click();
  await page.locator("#manual-parent").selectOption({ index: 1 });
  await page.locator("#manual-product-qty").fill("2");
  await page.locator("#manual-add").click();
  await page.locator("#manual-name").fill("Registro de prueba");
  await page.locator("#manual-phone").fill("3001234567");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Mostrador " + width,
    );
  }
  const report2 = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    report2.violations.map((v) => v.id + ":" + v.nodes.map((n) => n.target)),
    [],
  );
  await page.screenshot({
    path: path.join(__dirname, "../pruebas-visuales/v2-mostrador.png"),
    fullPage: true,
  });
  const n = sheet.rows.length;
  lose = true;
  await page.locator("#manual-submit").click();
  await page.locator("#manual-error").waitFor();
  assert.equal(sheet.rows.length, n + 1);
  await page.reload();
  await page.locator('[data-view="mostrador"]').click();
  await page.locator("#manual-submit").click();
  await page.locator("#manual-result").waitFor();
  assert.equal(sheet.rows.length, n + 1);
  assert.equal(sheet.rows.at(-1)[heads.indexOf("canal")], "mostrador");
  assert.equal(
    posts.filter((p) => p.accion === "crearMostrador").at(-1).requestId,
    posts.filter((p) => p.accion === "crearMostrador").at(-2).requestId,
  );
  ok(
    "Mostrador y adicionales: respuesta perdida, recarga y reintento sin duplicar",
  );
  await page.locator("#logout").click();
  assert.equal(await page.locator("#view-mostrador").textContent(), "");
  assert.equal(await page.locator("#view-analisis").textContent(), "");
  const client = await ctx.newPage();
  client.on("pageerror", (e) => errors.push(e.message));
  await client.setViewportSize({ width: 390, height: 844 });
  await client.goto(url);
  await client.locator("#surprise").click();
  assert.equal(await client.locator("#detail-dialog").isVisible(), true);
  assert.equal(await client.evaluate(() => Cart.count()), 0);
  await client.keyboard.press("Escape");
  await client.locator("#motion-toggle").click();
  await client.locator('[data-add="salchi-quesuda"]').click();
  assert.equal(
    await client.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
    0,
  );
  await client.reload();
  assert.equal(await client.evaluate(() => LF.motionAllowed()), false);
  await client.locator("#motion-toggle").click();
  await client.locator('[data-detail="salchi-quesuda"]').click();
  await client.keyboard.press("Escape");
  await client.screenshot({
    path: path.join(__dirname, "../pruebas-visuales/v2-cliente.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  ok(
    "Cliente: Sorpréndeme no compra, pausa integral persistente y sin errores de JavaScript",
  );
  fs.writeFileSync(
    path.join(__dirname, "../pruebas-visuales/v2-result.json"),
    JSON.stringify(
      { groups, errors, date: new Date().toISOString(), simulado: true },
      null,
      2,
    ),
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.close();
  });
