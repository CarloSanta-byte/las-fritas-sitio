const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = path.resolve(
    root,
    "." +
      (url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname)),
  );
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    res.writeHead(404);
    res.end("No encontrado");
    return;
  }
  res.setHeader("Content-Type", types[path.extname(file)] || "text/plain");
  res.setHeader("Cache-Control", "no-store");
  res.end(fs.readFileSync(file));
});
if (require.main === module)
  server.listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173"));
module.exports = { server };
