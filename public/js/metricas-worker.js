"use strict";
importScripts("metricas.js");
self.onmessage = (e) => {
  try {
    self.postMessage({ ok: true, result: Metricas.analizar(...e.data) });
  } catch (error) {
    self.postMessage({ ok: false, error: error.message });
  }
};
