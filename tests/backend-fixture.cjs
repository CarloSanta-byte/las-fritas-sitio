// Simulación local de Sheets y Apps Script. Nunca llama al restaurante real.
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
function crearBackend() {
  const hojas = new Map();
  class Sheet {
    constructor() { this.rows = []; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
    appendRow(row) { this.rows.push(row.map(v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v)); }
    setFrozenRows() {}
    getDataRange() { return { getValues: () => this.rows.map(r => Array.from({length:this.getLastColumn()}, (_, i) => r[i] ?? '')) }; }
    getRange(row, col, numRows = 1, numCols = 1) {
      return {
        getValues: () => Array.from({length:numRows}, (_, i) => Array.from({length:numCols}, (_, j) => this.rows[row-1+i]?.[col-1+j] ?? '')),
        setValue: value => { while (this.rows.length < row) this.rows.push([]); this.rows[row-1][col-1] = value; },
        setValues: values => { values.forEach((r,i) => { while (this.rows.length < row+i) this.rows.push([]); r.forEach((v,j) => { this.rows[row-1+i][col-1+j] = v; }); }); }
      };
    }
  }
  const ss = { getSheetByName: name => hojas.get(name), insertSheet: name => { const sheet = new Sheet(); hojas.set(name, sheet); return sheet; } };
  const properties = {};
  let ocupado = false;
  const contexto = vm.createContext({ console, SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} },
    ContentService: { MimeType: { JSON:'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !ocupado, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => properties[k] }) },
    Utilities: { getUuid: crypto.randomUUID, DigestAlgorithm: { SHA_256:'sha256' }, computeDigest: (alg, value) => crypto.createHash(alg).update(value).digest(), base64Encode: b => Buffer.from(b).toString('base64'), formatDate: date => {
      if (isNaN(date)) throw Error('Fecha inválida');
      return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8'), contexto);
  return { hojas, ss, properties, preparar: () => contexto.prepararSistema(), post: body => contexto.doPost({postData:{contents:JSON.stringify(body)}}), get: params => contexto.doGet({parameter:params}), lock: v => { ocupado = v; }, contexto };
}
module.exports = { crearBackend };
