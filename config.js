// ============================================================
// LAS FRITAS — Configuración
// ============================================================
// 1) Pega aquí la URL de tu Apps Script (ver LEEME.md, paso 3).
// 2) Ajusta el menú, precios y descripciones a los reales.
// ============================================================

const API_URL = "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT";

const MARCA = {
  nombre: "Las Fritas",
  eslogan: "Con todo, si no pa' qué.",
  whatsapp: "573232374229",
};

// Cada estado tiene una clave interna (no cambiar), una etiqueta visible,
// un color y un ícono. El color es información, no decoración: el mismo
// estado siempre se ve igual en toda la app.
const ESTADOS = [
  { key: "Recibido", label: "Recibido", color: "#F5B921", icon: "📥" },
  { key: "Preparando", label: "Preparando", color: "#FF8A3D", icon: "🔥" },
  { key: "Listo para entregar", label: "Listo para entregar", color: "#3FAE59", icon: "✅" },
  { key: "En camino", label: "En camino", color: "#E6297B", icon: "🛵" },
];

// Estructura de cada producto: id único, categoría, nombre, descripción,
// precio en pesos colombianos (número entero, sin puntos) y si aplica,
// una nota corta (ej. "Para compartir").
const MENU = [
  {
    categoria: "Lo más pedido",
    items: [
      { id: "trifasica", nombre: "La Trifásica", precio: 32000,
        descripcion: "Salchipapa cargada con tres carnes, maíz tierno y todas las salsas de la casa.", nota: "Para compartir" },
      { id: "ropa-vieja", nombre: "Ropa Vieja", precio: 30000,
        descripcion: "Carne desmechada lenta, papa criolla crocante, guacamole y aderezo especial.", nota: "Para compartir" },
    ],
  },
  {
    categoria: "Hamburguesas",
    items: [
      { id: "suprema", nombre: "La Suprema", precio: 26000,
        descripcion: "Doble carne, tocineta, queso cheddar fundido y salsa Las Fritas." },
      { id: "puppy", nombre: "La Puppy", precio: 24000,
        descripcion: "Carne angus, queso, cebolla caramelizada y pepinillos en pan brioche." },
    ],
  },
  {
    categoria: "Salchipapas",
    items: [
      { id: "sencilla", nombre: "Salchipapa Sencilla", precio: 15000,
        descripcion: "Papa a la francesa, salchicha y las tres salsas clásicas." },
      { id: "especial", nombre: "Salchipapa Especial", precio: 19000,
        descripcion: "Con carne desmechada, queso fundido y maíz tierno." },
    ],
  },
  {
    categoria: "Perros calientes",
    items: [
      { id: "clasico", nombre: "Perro Clásico", precio: 13000,
        descripcion: "Salchicha, papa hilo, queso y salsas de la casa." },
      { id: "especial-perro", nombre: "Perro Especial Las Fritas", precio: 17000,
        descripcion: "Salchicha, tocineta, queso fundido y cebolla crispy." },
    ],
  },
  {
    categoria: "Bebidas",
    items: [
      { id: "gaseosa", nombre: "Gaseosa 400ml", precio: 5000, descripcion: "Elige tu sabor favorito." },
      { id: "limonada", nombre: "Limonada de coco", precio: 9000, descripcion: "Refrescante, hecha al momento." },
    ],
  },
];
