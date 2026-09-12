const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { server } = require("./serve.cjs");
let browser;
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    isMobile: true,
    hasTouch: true,
  });
  const p = await ctx.newPage();
  await ctx.route("https://script.google.com/**", (r) => r.abort());
  await p.goto(url);
  await p.evaluate(() => {
    localStorage.setItem("lasfritas_efectos_completos", "true");
    localStorage.setItem("lasfritas_pausa", "false");
  });
  await p.reload();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.evaluate(() => {
    window.durations = [];
    window.frames = [];
    let previous = performance.now();
    window.frameTest = true;
    new PerformanceObserver((list) =>
      list
        .getEntries()
        .filter((e) => e.interactionId)
        .forEach((e) => durations.push(e.duration)),
    ).observe({ type: "event", buffered: true, durationThreshold: 16 });
    const frame = (now) => {
      frames.push(now - previous);
      previous = now;
      if (frameTest) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await p.locator('[data-add="salchi-quesuda"]').tap();
  await p.locator('[data-detail="salchi-bacon"]').tap();
  await p.locator("#detail-plus").tap();
  await p.locator("#detail-add").tap();
  await p.locator("#tray-bar").tap();
  await p.locator('[data-action="remove"]').first().tap();
  await p.locator("#toast button").tap();
  await p.keyboard.press("Escape");
  await p.locator("#surprise").tap();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(700);
  const result = await p.evaluate(() => {
    frameTest = false;
    return {
      durationSamplesMs: durations,
      maxObservedInteractionMs: Math.max(0, ...durations),
      frameIntervalsMs: frames,
    };
  });
  result.cpuSlowdown = 4;
  result.effects = "completos";
  result.nota =
    "Laboratorio Chrome headless. No certifica INP de campo ni 60 fps en Android real.";
  result.frameIntervalsMs = result.frameIntervalsMs.filter((v) => v > 0);
  result.p95FrameIntervalMs =
    result.frameIntervalsMs.slice().sort((a, b) => a - b)[
      Math.floor(result.frameIntervalsMs.length * 0.95)
    ] || null;
  fs.writeFileSync(
    path.join(__dirname, "../pruebas-visuales/movimiento.json"),
    JSON.stringify(result, null, 2),
  );
  assert.ok(
    result.maxObservedInteractionMs < 200,
    "Interacciones con efectos completos bajo 200 ms",
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.locator("#motion-toggle").tap();
  assert.equal(
    await p.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
    0,
  );
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.locator("#motion-toggle").tap();
  assert.equal(await p.evaluate(() => LF.motionAllowed()), false);
  console.log(
    JSON.stringify({
      maxObservedInteractionMs: result.maxObservedInteractionMs,
      p95FrameIntervalMs: result.p95FrameIntervalMs,
      samples: result.durationSamplesMs.length,
      effects: result.effects,
    }),
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
