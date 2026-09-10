const { chromium } = require("playwright"),
  { default: AxeBuilder } = require("@axe-core/playwright"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path");
const { crearBackend } = require("./backend-fixture.cjs"),
  { server } = require("./serve.cjs");
const backend = crearBackend();
backend.preparar();
backend.properties.STAFF_KEY = "clave-local-solo-pruebas";
let browser;
let groups = 0;
const ok = (t) => {
  groups++;
  console.log("OK · " + t);
};
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  let offline = false;
  let savedBodies = [];
  await ctx.route("https://script.google.com/**", async (r) => {
    if (offline) {
      await r.abort();
      return;
    }
    const p =
      r.request().method() === "POST"
        ? JSON.parse(r.request().postData())
        : null;
    if (p) savedBodies.push(structuredClone(p));
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        p
          ? backend.post(p)
          : backend.get(
              Object.fromEntries(new URL(r.request().url()).searchParams),
            ),
      ),
    });
  });
  const legacy = {
    accion: "crear",
    cliente: "Recuperación anterior",
    telefono: "3001234567",
    tipo: "local",
    direccion: "",
    notas: "Original",
    items: [
      {
        id: "salchi-quesuda",
        nombre: "Salchi Quesuda",
        precio: 24000,
        cantidad: 1,
        nota: "Sin cebolla",
      },
    ],
    total: 24000,
    requestId: crypto.randomUUID(),
  };
  const created = backend.post(legacy);
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate(
    (p) => localStorage.setItem("lasfritas_envio_pendiente", JSON.stringify(p)),
    legacy,
  );
  await page.reload();
  await page.locator("#tray-bar").click();
  await page.locator("#send").click();
  await page.locator(".ticket").waitFor();
  assert.equal(await page.locator(".ticket-code").textContent(), created.id);
  assert.deepEqual(
    savedBodies.find((x) => x.accion === "crear"),
    legacy,
  );
  ok(
    "Recupera en navegador un envío de la versión anterior con el mismo código",
  );
  offline = true;
  await page.evaluate(() => consultTracking(trackingCode, trackingVersion));
  assert.ok(await page.locator(".ticket").isVisible());
  assert.match(
    await page.locator("#tracking-status").textContent(),
    /Conservamos el último estado/,
  );
  offline = false;
  ok("Seguimiento conserva el último estado durante una lectura fallida");
  await page.locator("#back-menu").click();
  await page.locator('[data-add="salchi-quesuda"]').click();
  await page.locator("#tray-bar").click();
  await page.locator("#name").fill("Cambio precio");
  await page.locator("#phone").fill("3001234567");
  backend.hojas.get("Catalogo").rows[1][2] = 25000;
  await page.locator("#send").click();
  await page.waitForFunction(() =>
    document.querySelector("#checkout-error").textContent.includes("cambió"),
  );
  assert.equal(await page.locator("#name").isDisabled(), false);
  assert.equal(await page.evaluate(() => Cart.blocks.length), 1);
  assert.equal(await page.evaluate(() => Cart.pending), null);
  backend.hojas.get("Catalogo").rows[1][2] = 24000;
  await page.locator('[aria-label="Cerrar pedido"]').click();
  ok("Precio rechazado: preserva carrito y libera edición sin crear pedido");
  await page.locator('[data-detail="salchi-quesuda"]').click();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("#detail-dialog").contains(document.activeElement),
    ),
    true,
  );
  await page.keyboard.press("Escape");
  await page.locator("#motion-toggle").click();
  assert.equal(await page.evaluate(() => LF.motionAllowed()), false);
  await page.reload();
  assert.equal(await page.evaluate(() => LF.motionAllowed()), false);
  ok("Foco atrapado y pausa de movimiento persistente");
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.events = [];
    new PerformanceObserver((list) =>
      list.getEntries().forEach((e) => window.events.push(e.duration)),
    ).observe({ type: "event", durationThreshold: 16, buffered: true });
  });
  for (const term of ["queso", "maduro", "burger", ""]) {
    await page.locator("#search").fill(term);
  }
  await page.locator('[data-add="salchi-quesuda"]').click();
  await page.locator("#tray-bar").click();
  await page.locator('[aria-label="Cerrar pedido"]').click();
  await page.waitForTimeout(500);
  const durations = await page.evaluate(() => window.events);
  const max = durations.length ? Math.max(...durations) : 0;
  assert.ok(max < 200, "Interacción de laboratorio menor de 200 ms: " + max);
  fs.writeFileSync(
    path.join(__dirname, "../pruebas-visuales/interacciones.json"),
    JSON.stringify(
      {
        cpuSlowdown: 4,
        maxObservedEventDurationMs: max,
        samples: durations,
        nota: "Muestra de laboratorio. No equivale al INP de campo.",
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  ok("Interacciones con CPU ralentizada: " + max + " ms máximo observado");
  for (let i = 0; i < 18; i++)
    backend.post({
      ...legacy,
      requestId: crypto.randomUUID(),
      cliente: "Prueba de cola " + (i + 1),
      tipo: i % 2 ? "domicilio" : "local",
      direccion: i % 2 ? "Dirección de prueba " + i : "",
      items: [
        {
          id: "salchi-quesuda",
          precio: 24000,
          cantidad: 1,
          nota: "[Plato A] Sin cebolla",
        },
      ],
    });
  const kitchen = await ctx.newPage();
  await kitchen.setViewportSize({ width: 1440, height: 1000 });
  await kitchen.goto(url + "/staff.html");
  await kitchen.locator("#staff-key").fill(backend.properties.STAFF_KEY);
  await kitchen.locator("#login-submit").click();
  await kitchen.locator(".queue-order").first().waitFor();
  assert.equal(await kitchen.locator(".queue-order").count(), 19);
  await kitchen.locator('[data-filter="Preparando"]').click();
  assert.ok(await kitchen.locator("#new-alert").isVisible());
  await kitchen.locator("#review-new").click();
  assert.equal(await kitchen.locator(".queue-order").count(), 19);
  await kitchen.locator(".queue-order").nth(4).click();
  const selection = await kitchen.evaluate(() => selected);
  const button = await kitchen.locator("#next-state").boundingBox();
  await kitchen.locator("#next-state").focus();
  backend.post({
    ...legacy,
    requestId: crypto.randomUUID(),
    cliente: "Nuevo durante operación",
  });
  await kitchen.evaluate(() => load());
  assert.equal(await kitchen.evaluate(() => selected), selection);
  assert.deepEqual(await kitchen.locator("#next-state").boundingBox(), button);
  assert.equal(
    await kitchen.evaluate(() => document.activeElement.id),
    "next-state",
  );
  await kitchen.screenshot({
    path: path.join(__dirname, "../pruebas-visuales/cocina-hora-pico.png"),
  });
  ok(
    "20 pedidos: alerta bajo filtros, selección y botón estables al actualizar",
  );
  const report = await new AxeBuilder({ page: kitchen })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  fs.writeFileSync(
    path.join(__dirname, "../pruebas-visuales/accesibilidad-cocina.json"),
    JSON.stringify(report.violations, null, 2),
  );
  assert.deepEqual(
    report.violations.map((v) => v.id),
    [],
  );
  for (const width of [320, 390, 768, 1440]) {
    await kitchen.setViewportSize({ width, height: 900 });
    assert.equal(
      await kitchen.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    if (width < 700) {
      if (await kitchen.locator("#back-queue").isVisible())
        await kitchen.locator("#back-queue").click();
      await kitchen.locator(".queue-order").first().click();
      assert.equal(await kitchen.locator("#order-detail").isVisible(), true);
      await kitchen.locator("#back-queue").click();
    }
  }
  ok("Cocina accesible y adaptable de 320 a 1440 px");
  await ctx.close();
  fs.writeFileSync(
    path.join(__dirname, "../pruebas-visuales/advanced-result.json"),
    JSON.stringify({ groups, at: new Date().toISOString() }, null, 2),
  );
  console.log(groups + " grupos avanzados correctos.");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.close();
  });
