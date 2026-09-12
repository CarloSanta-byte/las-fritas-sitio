const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "..");
let count = 0;
function setup(seed = {}) {
  const storage = new Map(Object.entries(seed));
  const ctx = vm.createContext({
    console,
    structuredClone,
    Date,
    document: { dispatchEvent() {} },
    CustomEvent: class {},
    LF: {
      read: (k, d) => storage.get(k) ?? d,
      save: (k, v) => {
        v === null ? storage.delete(k) : storage.set(k, v);
        return true;
      },
      uuid: crypto.randomUUID,
      toast() {},
    },
  });
  for (const f of ["config.js", "js/presentation.js", "js/cart.js"])
    vm.runInContext(fs.readFileSync(path.join(root, "public", f), "utf8"), ctx);
  return { run: (s) => vm.runInContext(s, ctx), storage };
}
function test(name, fn) {
  fn();
  count++;
  console.log("OK · " + name);
}
test("Catálogo público y catálogo del backend conservados", () => {
  const original = path.join(root, "../revision-original");
  if (fs.existsSync(original)) {
    assert.equal(
      fs.readFileSync(path.join(root, "public/config.js"), "utf8"),
      fs.readFileSync(path.join(original, "config.js"), "utf8"),
    );
    assert.equal(
      vm.runInNewContext(fs.readFileSync(path.join(root, "apps-script/Code.gs"), "utf8") + "\nJSON.stringify(CATALOGO_INICIAL)"),
      vm.runInNewContext(fs.readFileSync(path.join(original, "apps-script/Code.gs"), "utf8") + "\nJSON.stringify(CATALOGO_INICIAL)"),
    );
  }
});
test("Dos platos iguales conservan sus notas y adicionales separados", () => {
  const c = setup();
  c.run(
    `Cart.add('burger-clasica',2,'Sin cebolla',[{id:'add-queso',perUnit:2,note:''}]);Cart.add('burger-clasica',1,'Sin salsa',[]);`,
  );
  assert.equal(c.run("Cart.lineItems().length"), 3);
  assert.equal(c.run("Cart.lineItems()[1].cantidad"), 4);
  assert.equal(c.run("Cart.total()"), 92000);
  assert.match(c.run("Cart.lineItems()[1].nota"), /Para Plato 1/);
  assert.match(c.run("Cart.lineItems()[2].nota"), /Plato 2/);
});
test("Adición atómica: límite de 50 incluye multiplicación de extras", () => {
  const c = setup();
  assert.throws(() =>
    c.run(`Cart.add('salchi-quesuda',26,'',[{id:'add-queso',perUnit:2}])`),
  );
  assert.equal(c.run("Cart.blocks.length"), 0);
});
test("Adición atómica: máximo 60 líneas", () => {
  const c = setup();
  c.run(`for(let i=0;i<60;i++)Cart.add('salchi-quesuda',1,String(i),[])`);
  assert.throws(() => c.run(`Cart.add('burger-clasica')`));
  assert.equal(c.run("Cart.blocks.length"), 60);
});
test("Notas cuentan referencia y no se truncan silenciosamente", () => {
  const c = setup();
  assert.throws(() => c.run(`Cart.add('salchi-quesuda',1,'x'.repeat(200),[])`));
  assert.equal(c.run("Cart.blocks.length"), 0);
});
test("Quitar y deshacer devuelve plato y complementos", () => {
  const c = setup();
  c.run(
    `Cart.add('burger-clasica',1,'',[{id:'combo-burger',perUnit:1,note:'Papa criolla + Limonada natural'}]);const undo=Cart.remove(Cart.blocks[0].key);undo();`,
  );
  assert.equal(c.run("Cart.total()"), 28000);
  assert.equal(c.run("Cart.lineItems().length"), 2);
});
test("Migra carrito v2 y conserva nota exacta", () => {
  const c = setup({
    lasfritas_carrito_v2: {
      fecha: Date.now(),
      tipo: "domicilio",
      lineas: [{ id: "salchi-quesuda", cantidad: 2, nota: "Sin cebolla Á" }],
    },
  });
  assert.equal(c.run("Cart.lineItems()[0].nota"), "Sin cebolla Á");
  assert.equal(c.run("Cart.type"), "domicilio");
});
test("Carrito expirado no vuelve", () => {
  const c = setup({
    lasfritas_carrito_v2: {
      fecha: Date.now() - 86400001,
      lineas: [{ id: "salchi-quesuda", cantidad: 1 }],
    },
  });
  assert.equal(c.run("Cart.blocks.length"), 0);
});
test("Envío antiguo se recupera sin alterar campos, precio ni notas", () => {
  const pending = {
    accion: "crear",
    cliente: "Prueba",
    telefono: "3001234567",
    tipo: "local",
    direccion: "",
    notas: "",
    items: [
      {
        id: "salchi-quesuda",
        nombre: "Salchi Quesuda",
        precio: 123,
        cantidad: 2,
        nota: "nota original",
      },
    ],
    total: 246,
    requestId: crypto.randomUUID(),
  };
  const c = setup({ lasfritas_envio_pendiente: pending });
  assert.equal(c.run("JSON.stringify(Cart.pending)"), JSON.stringify(pending));
  assert.equal(c.run("Cart.total()"), 246);
  assert.throws(() => c.run(`Cart.add('burger-clasica')`));
});
console.log(count + " pruebas de carrito correctas.");
