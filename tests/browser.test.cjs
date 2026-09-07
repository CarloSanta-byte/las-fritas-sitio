// Pruebas en Chrome con servidor y Apps Script simulados. No envía pedidos reales.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { crearBackend } = require('./backend-fixture.cjs');
const root = path.resolve(__dirname, '..');
const backend = crearBackend(); backend.preparar(); backend.properties.STAFF_KEY = 'clave-local-solo-pruebas';
const tipos = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server = http.createServer((req,res) => {
 const rel = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const archivo = path.resolve(root, '.'+(rel === '/' ? '/index.html' : rel));
 if (!archivo.startsWith(root+path.sep) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); res.end(); return; }
 res.setHeader('Content-Type',tipos[path.extname(archivo)] || 'text/plain'); res.end(fs.readFileSync(archivo));
});
let browser;
(async () => {
 await new Promise(r => server.listen(0,'127.0.0.1',r)); const url='http://127.0.0.1:'+server.address().port;
 browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const iconPage=await browser.newPage();
 await iconPage.goto(url+'/assets/icon.svg');
 for (const size of [192,512]) { await iconPage.setViewportSize({width:size,height:size}); await iconPage.evaluate(s => { document.documentElement.style.width=s+'px'; document.documentElement.style.height=s+'px'; },size); await iconPage.screenshot({path:path.join(root,'assets/icon-'+size+'.png')}); }
 await iconPage.close();
 const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block'});
 let perderRespuesta=false;
 await context.route('https://script.google.com/**', async route => {
   const req=route.request();
   const result=req.method()==='POST' ? backend.post(JSON.parse(req.postData())) : backend.get(Object.fromEntries(new URL(req.url()).searchParams));
   if (perderRespuesta && req.method()==='POST' && JSON.parse(req.postData()).accion==='crear') { perderRespuesta=false; await route.abort('failed'); return; }
   await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)});
 });
 const errors=[]; const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
 const screenshots=path.join(root,'pruebas-visuales'); fs.mkdirSync(screenshots,{recursive:true});
 await page.goto(url); await page.locator('.tarjeta-producto.visible').first().waitFor();
 assert.ok(await page.locator('.tarjeta-producto').count()>50);
 await page.waitForTimeout(1100); await page.screenshot({path:path.join(screenshots,'cliente-escritorio.png')});
 console.log('OK · Menú completo y escritorio');
 // Añadir desde teclado no abre accidentalmente el detalle.
 const add=page.locator('[data-accion="add-rapido"]').first(); await add.focus(); await page.keyboard.press('Enter');
 assert.equal(await page.locator('#overlay-detalle-producto').isVisible(),false);
 assert.equal(await page.locator('#total-carrito').textContent(),'$24.000');
 await page.reload(); assert.equal(await page.locator('#total-carrito').textContent(),'$24.000');
 console.log('OK · Teclado en contador y carrito recuperado');
 await page.locator('.detalle-abrir').first().click();
 const nota='sin cebolla " <img src=x onerror="window.falloXSS=1">';
 await page.locator('#detalle-nota').fill(nota); await page.locator('#btn-agregar-detalle').click();
 assert.equal(await page.locator('#lista-items-carrito img').count(),0);
 assert.equal(await page.evaluate(()=>window.falloXSS),undefined);
 assert.equal(await page.locator('#lista-items-carrito .fila-carrito').count(),2);
 await page.locator('#campo-nombre').fill('Prueba local'); await page.locator('#campo-telefono').fill('3001234567');
 await page.locator('#btn-enviar-pedido').click(); await page.locator('#overlay-confirmacion').waitFor({state:'visible'});
 const localId=await page.locator('#texto-id-confirmacion').textContent();
 assert.equal(backend.get({id:localId}).pedidos[0].total,48000);
 assert.ok((await page.locator('#btn-whatsapp-confirmacion').getAttribute('href')).startsWith('https://wa.me/573232374229?text='));
 await page.locator('#btn-ver-mi-pedido').click(); await page.locator('.stepper-estado').waitFor();
 assert.equal(await page.locator('#resultado-seguimiento img').count(),0);
 assert.equal(await page.locator('.paso-estado').count(),4);
 console.log('OK · Pedido local con notas seguras y seguimiento');
 const cocina=await context.newPage(); cocina.on('pageerror',e=>errors.push(e.message));
 await cocina.goto(url+'/staff.html'); await cocina.locator('#clave-staff').fill('incorrecta'); await cocina.locator('#btn-entrar').click(); await cocina.getByText('La clave de cocina no es correcta.').waitFor();
 await cocina.locator('#clave-staff').fill('clave-local-solo-pruebas'); await cocina.locator('#btn-entrar').click(); await cocina.locator('#staff-panel').waitFor({state:'visible'});
 await cocina.locator('#alerta-pedidos').waitFor({state:'visible'});
 assert.equal(await cocina.locator('.tarjeta-pedido').count(),1);
 await cocina.locator('#btn-sonido').click(); assert.equal(await cocina.locator('#btn-sonido').getAttribute('aria-pressed'),'true');
 await cocina.screenshot({path:path.join(screenshots,'cocina.png')});
 for (const estado of ['Preparando','Listo para entregar','Entregado']) {
   await cocina.locator('.btn-siguiente').click();
   await cocina.waitForFunction(()=>!cambiando.size && !cargando);
   assert.equal(backend.get({id:localId}).pedidos[0].estado,estado);
 }
 await page.locator('#btn-buscar-pedido').click(); await page.getByText('¡Entregado! Gracias por pedir en Las Fritas.').waitFor();
 console.log('OK · Clave, alarma y flujo de recoger completo cliente ↔ cocina');
 // Domicilio: respuesta perdida después de guardar, reintento tras recargar.
 await page.locator('#tab-pedir-desktop').click(); await page.locator('[data-accion="add-rapido"]').first().click();
 await page.locator('#btn-tipo-domicilio').click(); await page.locator('#campo-direccion').fill('Barrio Centro, calle 10 # 20-30');
 const filasAntes=backend.hojas.get('Pedidos').rows.length; perderRespuesta=true;
 await page.locator('#btn-enviar-pedido').click(); await page.getByRole('button',{name:'Reintentar el mismo pedido'}).waitFor();
 await page.reload(); assert.equal(await page.locator('#campo-direccion').inputValue(),'Barrio Centro, calle 10 # 20-30');
 await page.locator('#btn-enviar-pedido').click(); await page.locator('#overlay-confirmacion').waitFor({state:'visible'});
 const domicilioId=await page.locator('#texto-id-confirmacion').textContent();
 assert.equal(backend.hojas.get('Pedidos').rows.length,filasAntes+1);
 await cocina.locator('#btn-actualizar').click(); await cocina.waitForFunction(()=>!cargando);
 for (const estado of ['Preparando','Listo para entregar','En camino']) {
   await cocina.locator('.btn-siguiente').click(); await cocina.waitForFunction(()=>!cambiando.size && !cargando);
   assert.equal(backend.get({id:domicilioId}).pedidos[0].estado,estado);
 }
 await cocina.evaluate(()=>{window.print=()=>{};}); await cocina.locator('[data-imprimir]').click();
 assert.ok((await cocina.locator('#ticket-impresion').textContent()).includes('Barrio Centro'));
 await cocina.emulateMedia({media:'print'}); await cocina.screenshot({path:path.join(screenshots,'ticket.png')}); await cocina.emulateMedia({media:'screen'});
 await cocina.locator('.btn-siguiente').click(); await cocina.waitForFunction(()=>!cambiando.size && !cargando);
 console.log('OK · Domicilio completo, ticket y reintento sin duplicación');
 // Aislar perfil móvil, comprobar navegación y foco modal.
 await page.locator('#btn-seguir-pidiendo').click();
 await page.setViewportSize({width:390,height:844}); await page.locator('#btn-sorprendeme').click();
 await page.locator('#overlay-detalle-producto .hoja[aria-modal="true"]').waitFor();
 await page.locator('#btn-agregar-detalle').focus(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-cerrar-detalle');
 await page.keyboard.press('Escape'); assert.equal(await page.locator('#overlay-detalle-producto').isVisible(),false);
 for (const width of [320,390,768,1024,1440]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Sin desborde a '+width);
 }
 await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'})); await page.waitForTimeout(500); await page.screenshot({path:path.join(screenshots,'cliente-movil.png'),fullPage:false});
 await page.locator('#btn-movimiento').click(); assert.equal(await page.locator('html').getAttribute('class'),'movimiento-pausado');
 await page.emulateMedia({reducedMotion:'reduce'}); assert.equal(await page.evaluate(()=>movimientoPermitido()),false);
 console.log('OK · Móvil, foco, Escape, cinco anchos y movimiento reducido');
 await cocina.locator('#btn-salir').click(); assert.equal(await cocina.locator('.tarjeta-pedido').count(),0);
 assert.equal(await cocina.evaluate(()=>sessionStorage.getItem('lasfritas_staff')),'""');
 assert.deepEqual(errors,[]);
 console.log('OK · Cerrar sesión limpia datos; cero errores de JavaScript');
 // PWA real con otro contexto: instalación de caché y menú sin red.
 const pwaContext=await browser.newContext(); const pwa=await pwaContext.newPage(); pwa.on('pageerror', e=>errors.push(e.message));
 await pwa.goto(url); await pwa.evaluate(()=>navigator.serviceWorker.ready);
 await pwa.reload(); await pwa.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await pwaContext.setOffline(true);
 // Chrome puede conservar onLine=true cuando DevTools emula la red: simular también la señal del sistema.
 await pwaContext.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true}));
 await pwa.reload(); await pwa.locator('.tarjeta-producto').first().waitFor();
 await pwa.locator('#aviso-conexion').waitFor({state:'visible',timeout:5000});
 const cached=await pwa.evaluate(async()=>{ const keys=await caches.keys(); return (await Promise.all(keys.map(async k=>(await (await caches.open(k)).keys()).map(r=>r.url)))).flat(); });
 assert.ok(cached.every(u=>!u.includes('script.google.com')&&!u.includes('staff.html')));
 console.log('OK · PWA, menú sin red y caché sin pedidos privados');
 await pwaContext.close();
 console.log('TODAS LAS PRUEBAS DE NAVEGADOR PASARON');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser) await browser.close(); server.close();});
