const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module"),
  { pathToFileURL } = require("node:url"),
  zlib = require("node:zlib");
const {server}=require("./serve.cjs");
(async () => {
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const previewUrl="http://127.0.0.1:"+server.address().port;
  const { default: lighthouse } = await import("lighthouse");
  const requireLH = createRequire(require.resolve("lighthouse"));
  const launcher = await import(
    pathToFileURL(requireLH.resolve("chrome-launcher")).href
  );
  const profile = path.join(__dirname, "../.test-runtime/lighthouse");
  fs.mkdirSync(profile, { recursive: true });
  const chrome = await launcher.launch({
    userDataDir: profile,
    chromePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const result = await lighthouse(previewUrl, {
      port: chrome.port,
      output: ["html", "json"],
      onlyCategories: ["performance", "accessibility", "best-practices"],
      logLevel: "error",
    });
    if(result.lhr.runtimeError)throw Error(result.lhr.runtimeError.message);
    const out = path.join(__dirname, "../pruebas-visuales");
    fs.writeFileSync(path.join(out, "lighthouse.html"), result.report[0]);
    fs.writeFileSync(path.join(out, "lighthouse.json"), result.report[1]);
    const r = result.lhr;
    console.log(
      JSON.stringify(
        {
          performance: r.categories.performance.score * 100,
          accessibility: r.categories.accessibility.score * 100,
          lcp: r.audits["largest-contentful-paint"].numericValue,
          cls: r.audits["cumulative-layout-shift"].numericValue,
          tbt: r.audits["total-blocking-time"].numericValue,
          failures: Object.values(r.audits)
            .filter((a) => a.score !== null && a.score < 0.9)
            .map((a) => ({ id: a.id, title: a.title, value: a.displayValue })),
        },
        null,
        2,
      ),
    );
    const publicDir = path.join(__dirname, "../public");
    let rows = [];
    function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else {
          const b = fs.readFileSync(f);
          rows.push({
            file: path.relative(publicDir, f),
            bytes: b.length,
            gzip: zlib.gzipSync(b).length,
          });
        }
      }
    }
    walk(publicDir);
    fs.writeFileSync(
      path.join(out, "peso-archivos.json"),
      JSON.stringify(rows, null, 2),
    );
  } finally {
    await chrome.kill();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});

