/** Las Fritas · Backend v2. Lee LEEME.md antes de publicar.
 * Ejecuta prepararSistema una vez. STAFF_KEY vive en Propiedades del script.
 * Conserva las diez columnas originales y añade requestId/requestHash.
 */
const SHEET_NAME = "Pedidos";
const COLUMNAS = ["id","timestamp","cliente","telefono","tipo","direccion","items","notas","estado","total","requestId","requestHash"];
const ESTADOS_VALIDOS = ["Recibido","Preparando","Listo para entregar","En camino","Entregado"];
function json_(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
function error_(mensaje, code) { const err = new Error(mensaje); err.code = code || "VALIDACION"; throw err; }
function respuestaError_(err) {
  if (!err.code) console.error(err);
  return json_({ok:false,error:err.code ? err.message : "No se pudo completar la operación. Intenta de nuevo.",code:err.code || "SERVIDOR"});
}
function bajoLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) error_("Hay varios pedidos entrando. Reintenta en unos segundos.","OCUPADO");
  try { const result = fn(); SpreadsheetApp.flush(); return result; } finally { lock.releaseLock(); }
}
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNAS);
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  COLUMNAS.slice(0,10).forEach((h,i) => { if (headers[i] !== h) error_("Las columnas de Pedidos no coinciden. Revisa LEEME.md; no borres los pedidos.","CONFIGURACION"); });
  COLUMNAS.slice(10).forEach(h => {
    if (headers.indexOf(h) < 0) { sheet.getRange(1,headers.length+1).setValue(h); headers.push(h); }
  });
  return sheet;
}
function leerPedidos_() {
  const data = getSheet_().getDataRange().getValues();
  const headers = data.shift();
  return data.map((r,i) => {
    const p = {fila:i+2}; headers.forEach((h,j) => { p[h] = r[j]; }); return p;
  }).filter(p => p.id);
}
function prepararSistema() {
  bajoLock_(() => {
    getSheet_();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss.getSheetByName("Catalogo")) {
      const s = ss.insertSheet("Catalogo");
      s.getRange(1,1,CATALOGO_INICIAL.length+1,4).setValues([["id","nombre","precio","disponible"]].concat(CATALOGO_INICIAL.map(p => [p.id,p.nombre,p.precio,true])));
      s.setFrozenRows(1);
    }
  });
}
function autorizar_(body) {
  const clave = PropertiesService.getScriptProperties().getProperty("STAFF_KEY");
  if (!clave || clave.length < 12) error_("Configura STAFF_KEY de al menos 12 caracteres en Propiedades del script.","CONFIGURACION");
  if (typeof body.token !== "string" || body.token !== clave) error_("La clave de cocina no es correcta.","AUTH");
}
function doGet(e) {
  try {
    const id = String((e && e.parameter && e.parameter.id) || "").trim().toLowerCase();
    if (!/^[a-f0-9]{8,32}$/.test(id)) error_("Introduce un código de pedido válido.");
    const p = leerPedidos_().find(p => String(p.id) === id);
    return json_({ok:true,pedidos:p ? [{id:p.id,timestamp:p.timestamp,tipo:p.tipo,items:p.items,estado:p.estado,total:p.total}] : []});
  } catch (err) { return respuestaError_(err); }
}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 60000) error_("Solicitud vacía o demasiado grande.");
    let body; try { body = JSON.parse(raw); } catch (_) { error_("No se pudo leer la solicitud."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) error_("Solicitud inválida.");
    if (body.accion === "crear") return bajoLock_(() => crearPedido_(body));
    autorizar_(body);
    if (body.accion === "listar") return listarPedidos_();
    if (body.accion === "actualizarEstado") return bajoLock_(() => actualizarEstado_(body));
    error_("Acción desconocida.");
  } catch (err) { return respuestaError_(err); }
}
function texto_(valor,nombre,max,requerido) {
  if (valor == null && !requerido) return "";
  if (typeof valor !== "string") error_("Revisa "+nombre+".");
  const t = valor.trim();
  if ((requerido && !t) || t.length > max) error_("Revisa "+nombre+" (máximo "+max+" caracteres).");
  return t;
}
function celdaTexto_(t) { return /^[=+@\-\t\r\n]/.test(t) ? "'"+t : t; }
function crearPedido_(body) {
  const requestId = texto_(body.requestId,"identificador del envío",80,false);
  if (requestId && !/^[a-f0-9-]{32,36}$/.test(requestId)) error_("Identificador de envío inválido.");
  const firma = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify({cliente:body.cliente,telefono:body.telefono,tipo:body.tipo,direccion:body.direccion,items:body.items,notas:body.notas,total:body.total})));
  const pedidos = leerPedidos_();
  const previo = requestId && pedidos.find(p => p.requestId === requestId);
  if (previo) {
    if (previo.requestHash !== firma) error_("El envío original tiene datos diferentes. Consulta su código antes de continuar.","CONFLICTO");
    return json_({ok:true,id:previo.id,total:previo.total,repetido:true});
  }
  const cliente = texto_(body.cliente,"el nombre",80,true);
  const telefono = texto_(body.telefono,"el teléfono",24,true);
  if (!/^[+\d\s()-]+$/.test(telefono) || !/^\d{7,15}$/.test(telefono.replace(/\D/g,""))) error_("Escribe un teléfono válido (7 a 15 dígitos).");
  if (!["local","domicilio"].includes(body.tipo)) error_("Selecciona el tipo de entrega.");
  const direccion = body.tipo === "domicilio" ? texto_(body.direccion,"la dirección",250,true) : "";
  const notas = texto_(body.notas,"las notas",500,false);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 60) error_("Agrega entre 1 y 60 líneas de productos.");
  const catalogoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Catalogo");
  if (!catalogoSheet) error_("El restaurante debe ejecutar prepararSistema en Apps Script.","CONFIGURACION");
  const catalogo = Object.create(null);
  catalogoSheet.getDataRange().getValues().slice(1).forEach(r => { catalogo[r[0]] = {nombre:r[1],precio:r[2],disponible:r[3] === true || String(r[3]).toLowerCase() === "true"}; });
  const items = body.items.map(it => {
    if (!it || typeof it.id !== "string") error_("Producto inválido.");
    const p = catalogo[it.id];
    if (!p || !p.disponible) error_("Hay un producto no disponible. Revisa el menú o contacta al local.");
    if (!Number.isSafeInteger(p.precio) || p.precio < 0 || p.precio > 2000000) error_("El restaurante debe revisar un precio del catálogo.","CONFIGURACION");
    if (!Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > 50) error_("La cantidad debe estar entre 1 y 50 por producto.");
    if (it.precio !== p.precio) error_("El precio de "+p.nombre+" cambió. Recarga el menú antes de enviar.","PRECIO");
    return {id:it.id,nombre:String(p.nombre),precio:p.precio,cantidad:it.cantidad,nota:texto_(it.nota,"las notas del producto",200,false)};
  });
  const total = items.reduce((s,it) => s+it.precio*it.cantidad,0);
  if (total !== body.total) error_("El total cambió. Revisa tu carrito.");
  let id;
  do { id = Utilities.getUuid().replace(/-/g,"").slice(0,16); } while (pedidos.some(p => String(p.id) === id));
  const pedido = {id,timestamp:new Date().toISOString(),cliente:celdaTexto_(cliente),telefono:celdaTexto_(telefono),tipo:body.tipo,direccion:celdaTexto_(direccion),items:JSON.stringify(items),notas:celdaTexto_(notas),estado:"Recibido",total,requestId,requestHash:firma};
  const sheet = getSheet_();
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(h => pedido[h] == null ? "" : pedido[h]));
  return json_({ok:true,id,total});
}
function actualizarEstado_(body) {
  if (typeof body.id !== "string" || !ESTADOS_VALIDOS.includes(body.estado)) error_("Código o estado inválido.");
  const pedido = leerPedidos_().find(p => String(p.id) === body.id);
  if (!pedido) error_("Pedido no encontrado.");
  if (pedido.tipo !== "domicilio" && body.estado === "En camino") error_("Un pedido para recoger no pasa a En camino.");
  if (body.estadoAnterior && pedido.estado !== body.estadoAnterior) error_("Otra persona ya cambió este pedido. Actualiza el panel.","CONFLICTO");
  getSheet_().getRange(pedido.fila,9).setValue(body.estado);
  return json_({ok:true});
}
function dia_(fecha) { return Utilities.formatDate(new Date(fecha),"America/Bogota","yyyy-MM-dd"); }
function listarPedidos_() {
  const pedidos = leerPedidos_();
  const hoy = dia_(new Date());
  const delDia = pedidos.filter(p => { try { return dia_(p.timestamp) === hoy; } catch (_) { return false; } });
  const entregados = delDia.filter(p => p.estado === "Entregado");
  const resumen = {fecha:hoy,pedidos:delDia.length,valor:delDia.reduce((s,p) => s+(Number(p.total)||0),0),entregados:entregados.length,valorEntregado:entregados.reduce((s,p) => s+(Number(p.total)||0),0)};
  const visibles = pedidos.filter(p => p.estado !== "Entregado" || delDia.includes(p)).reverse().map(p => {
    const limpio = {}; COLUMNAS.slice(0,10).forEach(k => { limpio[k] = p[k]; }); return limpio;
  });
  return json_({ok:true,pedidos:visibles,resumen});
}


const CATALOGO_INICIAL = [
  {
    "id": "salchi-quesuda",
    "nombre": "Salchi Quesuda",
    "precio": 24000
  },
  {
    "id": "salchi-madurita",
    "nombre": "Salchi Madurita",
    "precio": 26000
  },
  {
    "id": "salchi-bacon",
    "nombre": "Salchi Bacon",
    "precio": 27000
  },
  {
    "id": "chorifritas",
    "nombre": "Chorifritas",
    "precio": 29000
  },
  {
    "id": "salchi-pollo",
    "nombre": "Salchi Pollo",
    "precio": 33000
  },
  {
    "id": "salchi-atun",
    "nombre": "Salchi Atún",
    "precio": 36000
  },
  {
    "id": "salchi-nacho",
    "nombre": "Salchi Nacho",
    "precio": 38000
  },
  {
    "id": "salchi-costi",
    "nombre": "Salchi Costi",
    "precio": 39000
  },
  {
    "id": "salchi-carnivora",
    "nombre": "Salchi Carnívora",
    "precio": 40000
  },
  {
    "id": "chicharrona",
    "nombre": "Chicharrona",
    "precio": 45000
  },
  {
    "id": "la-power",
    "nombre": "La Power",
    "precio": 47000
  },
  {
    "id": "salchi-mixta",
    "nombre": "Salchi Mixta",
    "precio": 48000
  },
  {
    "id": "trifasica",
    "nombre": "Trifásica",
    "precio": 60000
  },
  {
    "id": "mega-frita",
    "nombre": "Mega Frita",
    "precio": 110000
  },
  {
    "id": "mega-frita-queso",
    "nombre": "Mega Frita Show Queso",
    "precio": 128500
  },
  {
    "id": "burger-clasica",
    "nombre": "Burger Clásica",
    "precio": 20000
  },
  {
    "id": "burger-bacon",
    "nombre": "Burger Bacon",
    "precio": 23000
  },
  {
    "id": "burger-fritas",
    "nombre": "Burger Fritas",
    "precio": 23000
  },
  {
    "id": "cheese-burger",
    "nombre": "Cheese Burger",
    "precio": 23000
  },
  {
    "id": "burger-carnivora",
    "nombre": "Burger Carnívora",
    "precio": 27000
  },
  {
    "id": "mata-hambre",
    "nombre": "Mata Hambre",
    "precio": 29000
  },
  {
    "id": "burger-monster",
    "nombre": "Burger Monster",
    "precio": 29000
  },
  {
    "id": "combo-burger",
    "nombre": "Agrega combo a tu burger",
    "precio": 8000
  },
  {
    "id": "paparchar",
    "nombre": "Paparchar",
    "precio": 15000
  },
  {
    "id": "cheese-bacon-papas",
    "nombre": "Cheese Bacon",
    "precio": 18000
  },
  {
    "id": "papaburger",
    "nombre": "Papaburger",
    "precio": 20000
  },
  {
    "id": "callejero",
    "nombre": "Callejero",
    "precio": 15000
  },
  {
    "id": "salvaje",
    "nombre": "Salvaje",
    "precio": 20000
  },
  {
    "id": "ropa-vieja-dog",
    "nombre": "Ropa Vieja",
    "precio": 22000
  },
  {
    "id": "monster-dog",
    "nombre": "Monster",
    "precio": 24000
  },
  {
    "id": "madurito-clasico",
    "nombre": "Clásico",
    "precio": 17000
  },
  {
    "id": "madurito-mixto",
    "nombre": "Mixto",
    "precio": 32000
  },
  {
    "id": "madurito-crocante",
    "nombre": "Crocante",
    "precio": 27000
  },
  {
    "id": "madurito-costeno",
    "nombre": "Costeño",
    "precio": 18000
  },
  {
    "id": "desgranada-criolla",
    "nombre": "Criolla",
    "precio": 24000
  },
  {
    "id": "desgranada-mixta-res",
    "nombre": "Mixta Res",
    "precio": 23000
  },
  {
    "id": "desgranada-fritas",
    "nombre": "Fritas",
    "precio": 22000
  },
  {
    "id": "desgranada-pollo-champinon",
    "nombre": "Pollo Champiñón",
    "precio": 20000
  },
  {
    "id": "desgranada-madurita",
    "nombre": "Madurita",
    "precio": 20000
  },
  {
    "id": "chicharron-450",
    "nombre": "Chicharrón Show 450 gr",
    "precio": 29000
  },
  {
    "id": "chicharron-150",
    "nombre": "Chicharrón Show 150 gr",
    "precio": 13000
  },
  {
    "id": "limonada-natural",
    "nombre": "Limonada Natural",
    "precio": 7000
  },
  {
    "id": "limonada-mango-biche",
    "nombre": "Limonada de Mango Biche",
    "precio": 9000
  },
  {
    "id": "limonada-coco",
    "nombre": "Limonada de Coco",
    "precio": 9000
  },
  {
    "id": "pina-colada",
    "nombre": "Piña Colada",
    "precio": 9000
  },
  {
    "id": "granizado-mango",
    "nombre": "Mango",
    "precio": 9000
  },
  {
    "id": "granizado-maracuya",
    "nombre": "Maracuyá",
    "precio": 9000
  },
  {
    "id": "granizado-mora",
    "nombre": "Mora",
    "precio": 9000
  },
  {
    "id": "granizado-licor",
    "nombre": "Granizado con Licor",
    "precio": 12000
  },
  {
    "id": "add-carne-desmechada",
    "nombre": "Carne desmechada",
    "precio": 12000
  },
  {
    "id": "add-pollo-desmechado",
    "nombre": "Pollo desmechado",
    "precio": 12000
  },
  {
    "id": "add-salchicha-americana",
    "nombre": "Salchicha americana",
    "precio": 12000
  },
  {
    "id": "add-salchicha-ranchera",
    "nombre": "Salchicha ranchera",
    "precio": 10000
  },
  {
    "id": "add-tocineta",
    "nombre": "Tocineta",
    "precio": 8000
  },
  {
    "id": "add-chorizo",
    "nombre": "Chorizo",
    "precio": 8000
  },
  {
    "id": "add-queso",
    "nombre": "Queso",
    "precio": 8000
  },
  {
    "id": "add-pico-e-gallo",
    "nombre": "Pico e gallo",
    "precio": 3000
  },
  {
    "id": "add-guacamole",
    "nombre": "Guacamole",
    "precio": 5000
  },
  {
    "id": "add-atun",
    "nombre": "Atún",
    "precio": 8000
  },
  {
    "id": "add-maduro",
    "nombre": "Maduro",
    "precio": 5000
  },
  {
    "id": "add-carne-hamburguesa",
    "nombre": "Carne hamburguesa",
    "precio": 12000
  },
  {
    "id": "add-pina",
    "nombre": "Piña",
    "precio": 3000
  },
  {
    "id": "add-maiz",
    "nombre": "Maíz",
    "precio": 3000
  },
  {
    "id": "add-costilla",
    "nombre": "Costilla",
    "precio": 12000
  }
];
