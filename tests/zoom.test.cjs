const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { server } = require("./serve.cjs");
let browser;
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const p = await browser.newPage({
    viewport: { width: 320, height: 900 },
    serviceWorkers: "block",
  });
  await p.goto(url);
  await p.locator(".product").first().waitFor();
  await p.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  const overflow = await p.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("body *")]
      .filter(
        (e) =>
          e.getBoundingClientRect().right > innerWidth + 1 &&
          getComputedStyle(e).position !== "fixed" &&
          !e.closest("nav"),
      )
      .slice(0, 10)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        text: e.textContent.slice(0, 35),
      })),
  }));
  console.log(JSON.stringify(overflow, null, 2));
  await p.screenshot({
    path: "pruebas-visuales/texto-ampliado.png",
    fullPage: false,
  });
  assert.ok(overflow.scroll <= overflow.width);
  await p.locator('[data-detail="salchi-quesuda"]').click();
  assert.equal(
    await p.evaluate(
      () =>
        document.querySelector("#detail-dialog").scrollWidth <=
        document.querySelector("#detail-dialog").clientWidth + 1,
    ),
    true,
  );
  console.log("OK · Texto al 200% en 320 px: menú y detalle sin desborde.");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.close();
  });
