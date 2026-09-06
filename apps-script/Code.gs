/**
 * LAS FRITAS — Backend de pedidos
 * ---------------------------------------------------
 * Este script convierte un Google Sheet en una mini base de datos
 * para el sistema de pedidos. No necesitas saber programar para
 * usarlo: solo pégalo en Apps Script y publícalo como se explica
 * en LEEME.md.
 *
 * Columnas esperadas en la hoja (fila 1, en este orden exacto):
 * id | timestamp | cliente | telefono | tipo | direccion | items | notas | estado | total
 */

const SHEET_NAME = "Pedidos";
const ESTADOS_VALIDOS = ["Recibido", "Preparando", "Listo para entregar", "En camino", "Entregado"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "id", "timestamp", "cliente", "telefono", "tipo",
      "direccion", "items", "notas", "estado", "total"
    ]);
  }
  return sheet;
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const idFiltro = e.parameter && e.parameter.id;

  const pedidos = rows
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    })
    .filter(function (p) { return p.id !== "" && p.id !== undefined; });

  let resultado = pedidos;
  if (idFiltro) {
    resultado = pedidos.filter(function (p) { return String(p.id) === String(idFiltro); });
  } else {
    // Más recientes primero
    resultado = resultado.reverse();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, pedidos: resultado }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonError_("No se pudo leer la solicitud.");
  }

  if (body.accion === "crear") {
    return crearPedido_(body);
  }
  if (body.accion === "actualizarEstado") {
    return actualizarEstado_(body);
  }
  return jsonError_("Acción desconocida.");
}

function crearPedido_(body) {
  const sheet = getSheet_();
  const id = Utilities.getUuid().split("-")[0]; // id corto y legible
  const timestamp = new Date().toISOString();

  sheet.appendRow([
    id,
    timestamp,
    body.cliente || "",
    body.telefono || "",
    body.tipo || "local",
    body.direccion || "",
    JSON.stringify(body.items || []),
    body.notas || "",
    "Recibido",
    body.total || 0
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, id: id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function actualizarEstado_(body) {
  if (!body.id || ESTADOS_VALIDOS.indexOf(body.estado) === -1) {
    return jsonError_("Id o estado inválido.");
  }
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("id");
  const estadoCol = headers.indexOf("estado");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(body.id)) {
      sheet.getRange(i + 1, estadoCol + 1).setValue(body.estado);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return jsonError_("Pedido no encontrado.");
}

function jsonError_(mensaje) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: mensaje }))
    .setMimeType(ContentService.MimeType.JSON);
}
