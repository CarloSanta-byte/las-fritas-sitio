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
    categoria: "Salchi Papas",
    items: [
      { id: "salchi-quesuda", nombre: "Salchi Quesuda", precio: 24000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, queso, ripio, salsa de la casa y salsa bbq." },
      { id: "salchi-madurita", nombre: "Salchi Madurita", precio: 26000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, queso, maduro, salsa de la casa y bbq." },
      { id: "salchi-bacon", nombre: "Salchi Bacon", precio: 27000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, queso, tocineta, maíz, salsa de la casa y salsa bbq." },
      { id: "chorifritas", nombre: "Chorifritas", precio: 29000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, chorizo, queso, maíz, salsa de la casa y salsa bbq." },
      { id: "salchi-pollo", nombre: "Salchi Pollo", precio: 33000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, pollo desmechado en salsa de la casa, maíz, queso, maduro y salsa bbq." },
      { id: "salchi-atun", nombre: "Salchi Atún", precio: 36000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, maíz, guacamole, pico e gallo, ensalada de atún de la casa, maduro y queso." },
      { id: "salchi-nacho", nombre: "Salchi Nacho", precio: 38000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, carne desmechada, queso, maíz, tocineta, nachos, guacamole y salsa bbq." },
      { id: "salchi-costi", nombre: "Salchi Costi", precio: 39000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, guacamole, maduro, 200 gr de costilla, queso y salsa bbq." },
      { id: "salchi-carnivora", nombre: "Salchi Carnívora", precio: 40000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, maíz, queso, maduro, carne desmechada y salsa de la casa." },
      { id: "chicharrona", nombre: "Chicharrona", precio: 45000, nota: "Nuevo",
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, chicharrón carnudo, guacamole, pico e gallo, maduro, queso y salsas de la casa." },
      { id: "la-power", nombre: "La Power", precio: 47000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, pollo desmechado en salsa de la casa, bondiola, maduro, tocineta, queso y salsas de la casa." },
      { id: "salchi-mixta", nombre: "Salchi Mixta", precio: 48000,
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, queso, pollo desmechado, carne desmechada, guacamole, pico e gallo y salsa bbq." },
      { id: "trifasica", nombre: "Trifásica", precio: 60000, nota: "Nuevo",
        descripcion: "Papa criolla, salchicha americana, salchicha ranchera, pollo desmechado en salsa de la casa, carne desmechada, costilla bbq, maduro, queso y salsas de la casa." },
      { id: "mega-frita", nombre: "Mega Frita", precio: 110000, nota: "Para compartir",
        descripcion: "Papa criolla, francesa, salchicha americana, salchicha ranchera, queso, carne desmechada, pollo desmechado bañado en salsa de la casa, costilla bbq, maduro, maíz, tocineta, chorizo, guacamole y pico e gallo." },
      { id: "mega-frita-queso", nombre: "Mega Frita Show Queso", precio: 128500, nota: "Para compartir",
        descripcion: "La Mega Frita completa, con el show de queso derretido en la mesa." },
    ],
  },
  {
    categoria: "Burger Fritas",
    items: [
      { id: "burger-clasica", nombre: "Burger Clásica", precio: 20000,
        descripcion: "Pan brioche sellado en mantequilla, jugosa carne premium, queso cheddar, salsas de la house y vegetales frescos." },
      { id: "burger-bacon", nombre: "Burger Bacon", precio: 23000,
        descripcion: "Pan brioche sellado en mantequilla, jugosa carne premium, tocineta ahumada, queso cheddar, salsas de la house y vegetales frescos." },
      { id: "burger-fritas", nombre: "Burger Fritas", precio: 23000,
        descripcion: "Jugosa carne premium, queso cheddar, costillas bañadas en salsa bbq, piña para la niña, pan brioche sellado en mantequilla y salsa de la house." },
      { id: "cheese-burger", nombre: "Cheese Burger", precio: 23000,
        descripcion: "Pan brioche sellado en mantequilla, doble carne premium, doble tocineta ahumada, exceso de quesos cheddar, pepinillos y nuestra salsa secreta." },
      { id: "burger-carnivora", nombre: "Burger Carnívora", precio: 27000,
        descripcion: "Pan brioche sellado en mantequilla, jugosa carne premium, maduro de las fincas llaneras, carne desmechada, queso mozzarella y salsas de la house." },
      { id: "mata-hambre", nombre: "Mata Hambre", precio: 29000,
        descripcion: "Dos pisos de carne premium, doble tocineta ahumada, doble queso cheddar, pan brioche sellado en mantequilla, salsa de la house y vegetales frescos." },
      { id: "burger-monster", nombre: "Burger Monster", precio: 29000, nota: "Nuevo",
        descripcion: "Pan brioche, jugosa carne premium, carne desmechada bañada en salsa de la house, mix de quesos, tocineta ahumada y vegetales frescos." },
      { id: "combo-burger", nombre: "Agrega combo a tu burger", precio: 8000,
        descripcion: "Papa francesa o criolla + gaseosa personal o limonada natural." },
    ],
  },
  {
    categoria: "Papas Locas",
    items: [
      { id: "paparchar", nombre: "Paparchar", precio: 15000, nota: "Nuevo",
        descripcion: "Papitas francesas con queso costeño traído de la costa, el toque dulce de nuestra mermelada de piña y el power de la salsa de la house." },
      { id: "cheese-bacon-papas", nombre: "Cheese Bacon", precio: 18000, nota: "Nuevo",
        descripcion: "Papitas francesas acompañadas de salsa cheddar con el toque perfecto de tocineta crispy." },
      { id: "papaburger", nombre: "Papaburger", precio: 20000, nota: "Nuevo",
        descripcion: "Papitas francesas con trozos de nuestra jugosa carne de burger, queso al gratín, salsas de la house y el toque melo de BBQ." },
    ],
  },
  {
    categoria: "Dog Fritas",
    items: [
      { id: "callejero", nombre: "Callejero", precio: 15000,
        descripcion: "Pan brioche, salchicha americana, cebolla, piña para la niña, papa ripio, queso al gratín y salsas de la casa." },
      { id: "salvaje", nombre: "Salvaje", precio: 20000,
        descripcion: "Pan brioche, salchicha americana, carne desmechada en salsa de la house, queso al gratín, tocineta crispy, cebolla y piña para la niña." },
      { id: "ropa-vieja-dog", nombre: "Ropa Vieja", precio: 22000,
        descripcion: "Pan brioche, salchicha americana, carne desmechada, tocineta ahumada, piña para la niña, cebolla y queso al gratín." },
      { id: "monster-dog", nombre: "Monster", precio: 24000,
        descripcion: "Pan brioche, salchicha americana, carne desmechada en salsa de la house, cebolla, piña para la niña y queso al gratín." },
    ],
  },
  {
    categoria: "Maduritos",
    items: [
      { id: "madurito-clasico", nombre: "Clásico", precio: 17000, nota: "Nuevo",
        descripcion: "Plátano maduro asado, suero costeño, queso de la casa y trocitos de bocadillo de guayaba." },
      { id: "madurito-mixto", nombre: "Mixto", precio: 32000, nota: "Nuevo",
        descripcion: "Plátano maduro asado, queso de la casa, pollo desmechado, carne desmechada, maíz y guacamole." },
      { id: "madurito-crocante", nombre: "Crocante", precio: 27000, nota: "Nuevo",
        descripcion: "Plátano maduro asado, chicharrón carnudo, queso de la casa y guacamole." },
      { id: "madurito-costeno", nombre: "Costeño", precio: 18000, nota: "Nuevo",
        descripcion: "Plátano maduro asado y queso costeño, acompañado de suero costeño." },
    ],
  },
  {
    categoria: "Desgranadas",
    items: [
      { id: "desgranada-criolla", nombre: "Criolla", precio: 24000,
        descripcion: "Carne desmechada, maíz tierno, guacamole, maduro, pico e gallo, ripio, queso fundido y salsas de la casa." },
      { id: "desgranada-mixta-res", nombre: "Mixta Res", precio: 23000,
        descripcion: "Combinación de pollo y carne desmechada, chorizo, queso fundido, ripio, maíz tierno y salsas de la casa." },
      { id: "desgranada-fritas", nombre: "Fritas", precio: 22000,
        descripcion: "Carne desmechada, costilla de cerdo, queso fundido, ripio, maíz tierno y salsas de la casa." },
      { id: "desgranada-pollo-champinon", nombre: "Pollo Champiñón", precio: 20000,
        descripcion: "Pollo desmechado en salsa de la casa, champiñón, queso fundido, ripio, maíz tierno y salsas de la casa." },
      { id: "desgranada-madurita", nombre: "Madurita", precio: 20000,
        descripcion: "Carne desmechada, maíz tierno, maduro, queso fundido, ripio y salsas de la casa." },
    ],
  },
  {
    categoria: "Chicharrón Show",
    items: [
      { id: "chicharron-450", nombre: "Chicharrón Show 450 gr", precio: 29000,
        descripcion: "Chicharrón carnudo servido en show, con guacamole." },
      { id: "chicharron-150", nombre: "Chicharrón Show 150 gr", precio: 13000,
        descripcion: "Porción individual de chicharrón carnudo, con guacamole." },
    ],
  },
  {
    categoria: "Bebidas",
    items: [
      { id: "limonada-natural", nombre: "Limonada Natural", precio: 7000, descripcion: "Limonada clásica, hecha al momento." },
      { id: "limonada-mango-biche", nombre: "Limonada de Mango Biche", precio: 9000, descripcion: "Refrescante y con un toque agridulce." },
      { id: "limonada-coco", nombre: "Limonada de Coco", precio: 9000, descripcion: "Cremosa y tropical." },
      { id: "pina-colada", nombre: "Piña Colada", precio: 9000, descripcion: "Sin alcohol, dulce y refrescante." },
    ],
  },
  {
    categoria: "Granizados y Jugos",
    items: [
      { id: "granizado-mango", nombre: "Mango", precio: 9000, descripcion: "Granizado natural de mango." },
      { id: "granizado-maracuya", nombre: "Maracuyá", precio: 9000, descripcion: "Granizado natural de maracuyá." },
      { id: "granizado-mora", nombre: "Mora", precio: 9000, descripcion: "Granizado natural de mora." },
      { id: "granizado-licor", nombre: "Granizado con Licor", precio: 12000, nota: "Nuevo", descripcion: "Nuestro granizado, versión con licor. Solo para mayores de edad." },
    ],
  },
  {
    categoria: "Adicionales",
    items: [
      { id: "add-carne-desmechada", nombre: "Carne desmechada", precio: 12000, descripcion: "Adicional para tu pedido." },
      { id: "add-pollo-desmechado", nombre: "Pollo desmechado", precio: 12000, descripcion: "Adicional para tu pedido." },
      { id: "add-salchicha-americana", nombre: "Salchicha americana", precio: 12000, descripcion: "Adicional para tu pedido." },
      { id: "add-salchicha-ranchera", nombre: "Salchicha ranchera", precio: 10000, descripcion: "Adicional para tu pedido." },
      { id: "add-tocineta", nombre: "Tocineta", precio: 8000, descripcion: "Adicional para tu pedido." },
      { id: "add-chorizo", nombre: "Chorizo", precio: 8000, descripcion: "Adicional para tu pedido." },
      { id: "add-queso", nombre: "Queso", precio: 8000, descripcion: "Adicional para tu pedido." },
      { id: "add-pico-e-gallo", nombre: "Pico e gallo", precio: 3000, descripcion: "Adicional para tu pedido." },
      { id: "add-guacamole", nombre: "Guacamole", precio: 5000, descripcion: "Adicional para tu pedido." },
      { id: "add-atun", nombre: "Atún", precio: 8000, descripcion: "Adicional para tu pedido." },
      { id: "add-maduro", nombre: "Maduro", precio: 5000, descripcion: "Adicional para tu pedido." },
      { id: "add-carne-hamburguesa", nombre: "Carne hamburguesa", precio: 12000, descripcion: "Adicional para tu pedido." },
      { id: "add-pina", nombre: "Piña", precio: 3000, descripcion: "Adicional para tu pedido." },
      { id: "add-maiz", nombre: "Maíz", precio: 3000, descripcion: "Adicional para tu pedido." },
      { id: "add-costilla", nombre: "Costilla", precio: 12000, descripcion: "Adicional para tu pedido." },
    ],
  },
];
