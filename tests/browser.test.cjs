const { chromium } = require("playwright"),
  { default: AxeBuilder } = require("@axe-core/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { crearBackend } = require("./backend-fixture.cjs");
const { server } = require("./serve.cjs");
const root = path.resolve(__dirname, "..");
const shots = path.join(root, "pruebas-visuales");
fs.mkdirSync(shots, { recursive: true });
const backend = crearBackend();
backend.preparar();
backend.properties.STAFF_KEY = "clave-local-solo-pruebas";
let browser;
let groups = 0;
const ok = (s) => {
  groups++;
  console.log("OK · " + s);
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
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  let lose = false,
    offlineApi = false,
    loseState = false;
  let posts = [];
  await context.route("https://script.google.com/**", async (route) => {
    if (offlineApi) {
      await route.abort();
      return;
    }
    const req = route.request(),
      payload = req.method() === "POST" ? JSON.parse(req.postData()) : null;
    const result = payload
      ? backend.post(payload)
      : backend.get(Object.fromEntries(new URL(req.url()).searchParams));
    if (payload) posts.push(structuredClone(payload));
    if (payload?.accion === "crear" && lose) {
      lose = false;
      await route.abort();
      return;
    }
    if (payload?.accion === "actualizarEstado" && loseState) {
      loseState = false;
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".product").first().waitFor();
  assert.equal(await page.locator(".product").count(), 15);
  await page.screenshot({ path: path.join(shots, "cliente-movil.png") });
  const first = await page.locator("[data-add]").first().boundingBox();
  assert.ok(first.y + first.height < 844);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "Sin desborde " + width,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(shots, "cliente-escritorio.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  ok("Menú y controles visibles; 320–1440 sin desborde");
  await page.locator("#search").fill("burger");
  await page.locator('[data-detail="burger-clasica"]').click();
  await page
    .locator("#product-note")
    .fill('Sin cebolla " <img src=x onerror="window.xss=1">');
  await page.locator("#combo").check();
  await page.locator("#combo-potato").selectOption({ label: "Papa criolla" });
  await page
    .locator("#combo-drink")
    .selectOption({ label: "Limonada natural" });
  await page.locator(".extras details summary").click();
  await page.locator('[data-extra="add-queso"]').selectOption("2");
  await page.screenshot({ path: path.join(shots, "personalizar.png") });
  await page.locator("#detail-add").click();
  assert.equal(await page.locator("#tray-total").textContent(), "$44.000");
  await page.reload();
  assert.equal(await page.locator("#tray-total").textContent(), "$44.000");
  await page.locator("#tray-bar").click();
  assert.equal(await page.locator("#cart-body img").count(), 0);
  await page.locator("#name").fill("Prueba local");
  await page.locator("#phone").fill("3001234567");
  await page.locator("#remember").check();
  await page.screenshot({ path: path.join(shots, "pedido.png") });
  await page.locator("#send").click();
  await page.locator(".ticket").waitFor();
  const id = (await page.locator(".ticket-code").textContent()).trim();
  assert.match(id, /^[a-f0-9]{16}$/);
  assert.equal(backend.get({ id }).pedidos[0].total, 44000);
  assert.equal(await page.evaluate(() => window.xss), undefined);
  assert.equal(await page.locator(".steps li").count(), 4);
  await page.screenshot({ path: path.join(shots, "seguimiento.png") });
  ok(
    "Personalización, combo, total, recarga, notas seguras, envío y seguimiento local",
  );
  const kitchen = await context.newPage();
  kitchen.on("pageerror", (e) => errors.push(e.message));
  await kitchen.setViewportSize({ width: 1440, height: 1000 });
  await kitchen.goto(url + "/staff.html");
  await kitchen.locator("#staff-key").fill("incorrecta");
  await kitchen.locator("#login-submit").click();
  await kitchen.getByText("La clave de cocina no es correcta.").waitFor();
  await kitchen.locator("#staff-key").fill("clave-local-solo-pruebas");
  await kitchen.locator("#login-submit").click();
  await kitchen.locator("#kitchen-panel").waitFor();
  await kitchen.locator("#new-alert").waitFor();
  await kitchen.locator("#sound").click();
  await kitchen.screenshot({ path: path.join(shots, "cocina.png") });
  assert.match(
    await kitchen.locator("#order-detail").textContent(),
    /Para Plato 1/,
  );
  assert.equal(await kitchen.locator("#order-detail img").count(), 0);
  for (const state of ["Preparando", "Listo para entregar", "Entregado"]) {
    await kitchen.locator("#next-state").click();
    await kitchen.waitForFunction(
      (s) => document.querySelector(".state-badge")?.textContent.includes(s),
      state,
    );
    await kitchen.waitForFunction(
      () => !document.querySelector("#refresh").disabled,
    );
  }
  assert.equal(backend.get({ id }).pedidos[0].estado, "Entregado");
  ok("Cocina: login, alarma, adicionales y flujo local sin En camino");
  await page.locator("#back-menu").click();
  await page.locator('[data-add="salchi-quesuda"]').click();
  await page.locator("#tray-bar").click();
  assert.equal(await page.locator("#name").inputValue(), "Prueba local");
  await page.locator("[name=tipo][value=domicilio]").check();
  await page.locator("#address").fill("Dirección de prueba");
  lose = true;
  await page.locator("#send").click();
  await page
    .getByRole("button", { name: "Reintentar el mismo pedido" })
    .waitFor();
  const sent = posts.filter((x) => x.accion === "crear").at(-1);
  await page.reload();
  await page.locator("#tray-bar").click();
  assert.equal(await page.locator("#name").isDisabled(), true);
  await page.locator("#send").click();
  await page.locator(".ticket").waitFor();
  const domId = await page.locator(".ticket-code").textContent();
  const second = posts.filter((x) => x.accion === "crear").at(-1);
  assert.deepEqual(second, sent);
  assert.equal(backend.hojas.get("Pedidos").getLastRow(), 3);
  assert.equal(await page.locator(".steps li").count(), 5);
  ok("Respuesta perdida: recarga y reintento exacto sin duplicación");
  await kitchen.locator("#refresh").click();
  await kitchen.waitForFunction(
    (id) => !!document.querySelector('[data-select="' + id + '"]'),
    domId,
  );
  await kitchen.locator('[data-select="' + domId + '"]').click();
  backend.post({
    accion: "actualizarEstado",
    token: backend.properties.STAFF_KEY,
    id: domId,
    estado: "Preparando",
    estadoAnterior: "Recibido",
  });
  await kitchen.locator("#next-state").click();
  await kitchen.waitForFunction(() =>
    document.querySelector(".state-badge")?.textContent.includes("Preparando"),
  );
  await kitchen.waitForFunction(
    () => !document.querySelector("#refresh").disabled,
  );
  assert.equal(backend.get({ id: domId }).pedidos[0].estado, "Preparando");
  loseState = true;
  await kitchen.locator("#next-state").click();
  await kitchen.waitForFunction(() =>
    document
      .querySelector(".state-badge")
      ?.textContent.includes("Listo para entregar"),
  );
  await kitchen.waitForFunction(
    () => !document.querySelector("#refresh").disabled,
  );
  for (const state of ["En camino", "Entregado"]) {
    await kitchen.locator("#next-state").click();
    await kitchen.waitForFunction(
      (s) => document.querySelector(".state-badge")?.textContent.includes(s),
      state,
    );
    await kitchen.waitForFunction(
      () => !document.querySelector("#refresh").disabled,
    );
  }
  ok(
    "Conflicto entre operadores y respuesta perdida de estado; flujo domicilio",
  );
  offlineApi = true;
  await kitchen.locator("#refresh").click();
  await kitchen.locator("#connection.stale").waitFor();
  assert.ok(
    (await kitchen.locator("#order-detail").textContent()).includes(domId),
  );
  await page.locator("#tracking-form").evaluate((f) => f.requestSubmit());
  await page.waitForTimeout(400);
  offlineApi = false;
  ok("Cocina conserva datos tras fallo de red");
  await kitchen.evaluate(() => {
    window.print = () => {
      window.printRequested = true;
    };
  });
  await kitchen.locator("#print").click();
  assert.equal(await kitchen.evaluate(() => window.printRequested), true);
  assert.match(
    await kitchen.locator("#print-ticket").textContent(),
    /Dirección de prueba/,
  );
  await kitchen.emulateMedia({ media: "print" });
  await kitchen.screenshot({ path: path.join(shots, "ticket.png") });
  await kitchen.emulateMedia({ media: "screen" });
  await kitchen.locator("#logout").click();
  assert.equal(await kitchen.locator("#order-detail").textContent(), "");
  assert.equal(await kitchen.locator("#print-ticket").textContent(), "");
  assert.equal(
    await kitchen.evaluate(() => sessionStorage.getItem("lasfritas_staff")),
    null,
  );
  ok("Ticket imprimible y cierre de sesión sin datos visibles");
  await page.locator("#back-menu").click();
  await page.locator("#search").fill("salchi");
  await page.locator('[data-compare="salchi-quesuda"]').check();
  await page.locator('[data-compare="salchi-bacon"]').check();
  await page.locator("#compare-open").click();
  assert.equal(await page.locator(".compare-product").count(), 2);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#compare-dialog").isVisible(), false);
  await page.locator("#compare-clear").click();
  await page.locator("#clear-search").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-detail="salchi-quesuda"]').click();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("#detail-dialog").contains(document.activeElement),
    ),
    true,
  );
  assert.equal(await page.evaluate(() => LF.motionAllowed()), false);
  await page.keyboard.press("Escape");
  await page.locator("#search").fill("licor");
  await page.locator('[data-add="granizado-licor"]').click();
  await page.locator("#detail-add").click();
  assert.equal(await page.locator("#detail-dialog").isVisible(), true);
  await page.locator("#adult").check();
  await page.locator("#detail-add").click();
  ok(
    "Comparación, teclado, reducción de movimiento y confirmación de mayoría de edad",
  );
  const axeReports = [];
  await page.locator("#clear-search").click();
  for (const [name, target] of [
    ["menu", page],
    ["login-cocina", kitchen],
  ]) {
    const report = await new AxeBuilder({ page: target })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    axeReports.push({ name, violations: report.violations });
  }
  await page.locator("#tray-bar").click();
  axeReports.push({
    name: "checkout",
    violations: (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  });
  fs.writeFileSync(
    path.join(shots, "accesibilidad.json"),
    JSON.stringify(axeReports, null, 2),
  );
  const violations = axeReports.flatMap((r) =>
    r.violations.map(
      (v) =>
        r.name +
        ": " +
        v.id +
        " " +
        v.nodes.map((n) => n.target.join(" ")).join(", "),
    ),
  );
  assert.deepEqual(violations, []);
  ok("Accesibilidad automática: menú, checkout y login");
  assert.deepEqual(errors, []);
  await context.close();
  const pwa = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const offline = await pwa.newPage();
  await offline.goto(url);
  await offline.evaluate(() => navigator.serviceWorker.ready);
  await offline.reload();
  await offline.waitForFunction(() => !!navigator.serviceWorker.controller);
  await pwa.setOffline(true);
  await offline.reload();
  await offline.locator(".product").first().waitFor();
  await offline.locator('[data-add="salchi-quesuda"]').click();
  await offline.locator("#tray-bar").click();
  await offline.locator("#name").fill("Sin red");
  await offline.locator("#phone").fill("3001234567");
  await offline.locator("#send").click();
  await offline.waitForFunction(
    () => document.querySelector("#checkout-error").textContent.length > 0,
  );
  assert.match(
    await offline.locator("#checkout-error").textContent(),
    /conexión/,
  );
  const keys = await offline.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (n) =>
          (await (await caches.open(n)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
  });
  assert.ok(!keys.some((k) => /staff|cocina|script.google/.test(k)));
  await pwa.setOffline(false);
  await pwa.close();
  ok("PWA sin conexión y caché exclusiva de recursos públicos");
  console.log(groups + " grupos de pruebas de navegador correctos.");
  fs.writeFileSync(
    path.join(shots, "browser-result.json"),
    JSON.stringify({ groups, errors, at: new Date().toISOString() }, null, 2),
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
