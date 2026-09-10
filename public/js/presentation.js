"use strict";
const PRESENTATION = (() => {
  const products = MENU.flatMap((g, i) =>
    g.items.map((p) => ({ ...p, category: g.categoria, categoryIndex: i })),
  );
  const index = Object.fromEntries(products.map((p) => [p.id, p]));
  const accents = {
    "salchi-quesuda": "Queso · ripio · salsa de la casa",
    "salchi-madurita": "Maduro · queso · salsa bbq",
    "salchi-bacon": "Tocineta · maíz · queso",
    chorifritas: "Chorizo · maíz · queso",
    "salchi-pollo": "Pollo desmechado · maduro · maíz",
    "salchi-atun": "Ensalada de atún · guacamole · pico e gallo",
    "salchi-nacho": "Nachos · carne desmechada · guacamole",
    "salchi-costi": "200 gr de costilla · guacamole · maduro",
    "salchi-carnivora": "Carne desmechada · maduro · maíz",
    chicharrona: "Chicharrón carnudo · guacamole · maduro",
    "la-power": "Pollo · bondiola · tocineta",
    "salchi-mixta": "Pollo · carne desmechada · guacamole",
    trifasica: "Pollo · carne desmechada · costilla bbq",
    "mega-frita": "Criolla y francesa · carnes · guacamole",
    "mega-frita-queso": "La Mega Frita completa + show de queso en la mesa",
    "burger-clasica": "Carne premium · cheddar · vegetales",
    "burger-bacon": "Tocineta ahumada · carne premium · cheddar",
    "burger-fritas": "Costillas bbq · carne premium · piña",
    "cheese-burger": "Doble carne · doble tocineta · cheddar",
    "burger-carnivora": "Maduro llanero · carne desmechada · mozzarella",
    "mata-hambre": "Dos pisos de carne · doble tocineta · doble cheddar",
    "burger-monster": "Carne premium · carne desmechada · mix de quesos",
  };
  function highlight(p) {
    return accents[p.id] || p.descripcion;
  }
  function art(p) {
    if (p.categoryIndex === 0) return p.id;
    return (
      [
        "fries",
        "burger",
        "fries",
        "dog",
        "plantain",
        "bowl",
        "bowl",
        "drink",
        "drink",
        "extra",
      ][p.categoryIndex] || "fries"
    );
  }
  function image(p, cls = "") {
    return `<img class="${cls}" src="assets/illustrations/${art(p)}.svg" width="240" height="180" alt="" decoding="async">`;
  }
  return { products, index, highlight, art, image };
})();
