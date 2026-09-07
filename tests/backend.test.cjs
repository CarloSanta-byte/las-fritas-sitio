const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { crearBackend } = require('./backend-fixture.cjs');
const backend = crearBackend(); backend.preparar();
let pruebas = 0;
function comprobar(nombre, fn) { fn(); pruebas++; console.log('OK · '+nombre); }
const clave = 'clave-local-solo-pruebas';
const pedido = () => ({accion:'crear', requestId:crypto.randomUUID(), cliente:'María', telefono:'3001234567', tipo:'local', direccion:'', items:[{id:'salchi-quesuda',nombre:'Salchi Quesuda',precio:24000,cantidad:2,nota:'sin cebolla'}], notas:'Cubiertos',total:48000});
comprobar('No lista sin código ni autenticación', () => assert.equal(backend.get({}).ok,false));
comprobar('Clave no configurada cierra el acceso', () => assert.equal(backend.post({accion:'listar'}).code,'CONFIGURACION'));
backend.properties.STAFF_KEY = clave;
comprobar('Clave errónea rechazada', () => assert.equal(backend.post({accion:'listar',token:'mala'}).code,'AUTH'));
const original = pedido(); const creado = backend.post(original);
comprobar('Crea pedido local con total oficial', () => { assert.equal(creado.ok,true); assert.equal(creado.total,48000); assert.match(creado.id,/^[a-f0-9]{16}$/); });
comprobar('Reintento no duplica filas', () => { const n = backend.hojas.get('Pedidos').rows.length; assert.equal(backend.post(original).id,creado.id); assert.equal(backend.hojas.get('Pedidos').rows.length,n); });
comprobar('No reutiliza identificador con otro contenido', () => assert.equal(backend.post({...original,cliente:'Otro'}).code,'CONFLICTO'));
comprobar('Seguimiento público sin nombre, teléfono, dirección ni clave', () => { const p = backend.get({id:creado.id}).pedidos[0]; for (const campo of ['cliente','telefono','direccion','notas','requestId','requestHash']) assert.equal(p[campo],undefined); });
comprobar('No cambia estados sin clave', () => assert.equal(backend.post({accion:'actualizarEstado',id:creado.id,estado:'Entregado'}).code,'AUTH'));
comprobar('No permite En camino para recoger', () => assert.equal(backend.post({accion:'actualizarEstado',token:clave,id:creado.id,estado:'En camino'}).ok,false));
comprobar('Flujo local completo', () => { let anterior='Recibido'; for (const estado of ['Preparando','Listo para entregar','Entregado']) { assert.equal(backend.post({accion:'actualizarEstado',token:clave,id:creado.id,estado,estadoAnterior:anterior}).ok,true); anterior=estado; } });
comprobar('Detecta cambio simultáneo de otro operador', () => assert.equal(backend.post({accion:'actualizarEstado',token:clave,id:creado.id,estado:'Preparando',estadoAnterior:'Recibido'}).code,'CONFLICTO'));
for (const [nombre, cambio] of [
 ['Precio manipulado', p => { p.items[0].precio = 1; p.total = 2; }],
 ['Total manipulado', p => p.total = 1], ['Cantidad negativa', p => p.items[0].cantidad=-1],
 ['Cantidad fraccionaria', p => p.items[0].cantidad=1.5], ['Cantidad excesiva', p => p.items[0].cantidad=51],
 ['Producto desconocido', p => p.items[0].id='inventado'], ['Carrito vacío', p => p.items=[]],
 ['Teléfono inválido', p => p.telefono='abc'], ['Nombre vacío', p => p.cliente=''],
 ['Domicilio sin dirección', p => p.tipo='domicilio'], ['Notas excesivas', p => p.notas='x'.repeat(501)]
]) comprobar(nombre+' rechazado', () => { const p=pedido(); cambio(p); assert.equal(backend.post(p).ok,false); });
comprobar('Bloqueo ocupado da respuesta recuperable', () => { backend.lock(true); assert.equal(backend.post(pedido()).code,'OCUPADO'); backend.lock(false); });
comprobar('Nombre de producto viene del catálogo', () => { const p=pedido(); p.items[0].nombre='Gratis'; const r=backend.post(p); assert.equal(JSON.parse(backend.get({id:r.id}).pedidos[0].items)[0].nombre,'Salchi Quesuda'); });
comprobar('Producto agotado rechazado', () => { const fila=backend.hojas.get('Catalogo').rows[1]; fila[3]=false; assert.equal(backend.post(pedido()).ok,false); fila[3]=true; });
comprobar('Fórmulas se escriben como texto', () => { const p=pedido(); p.cliente='=IMPORTXML("x")'; const r=backend.post(p); assert.equal(r.ok,true); assert.equal(backend.hojas.get('Pedidos').rows.at(-1)[2],p.cliente); });
comprobar('Flujo domicilio completo', () => { const p=pedido(); p.tipo='domicilio'; p.direccion='Barrio Centro'; const r=backend.post(p); assert.equal(r.ok,true); for (const estado of ['Preparando','Listo para entregar','En camino','Entregado']) assert.equal(backend.post({accion:'actualizarEstado',token:clave,id:r.id,estado}).ok,true); });
comprobar('Resumen calcula importes y excluye entregados antiguos del panel', () => {
 const s=backend.hojas.get('Pedidos'); s.rows[1][1]='2020-01-01T12:00:00Z';
 const data=backend.post({accion:'listar',token:clave}); assert.equal(data.ok,true);
 assert.ok(data.pedidos.every(p=>p.id!==creado.id)); assert.equal(data.resumen.valor, data.resumen.pedidos*48000);
 assert.ok(data.pedidos.every(p=>!('requestHash' in p)));
});
comprobar('Repetir preparación conserva pedidos y catálogo', () => { const n=backend.hojas.get('Pedidos').rows.length; backend.preparar(); assert.equal(backend.hojas.get('Pedidos').rows.length,n); });
comprobar('Migración de diez columnas conserva filas y códigos antiguos', () => {
 const b=crearBackend(); const s=b.ss.insertSheet('Pedidos');
 s.appendRow(['id','timestamp','cliente','telefono','tipo','direccion','items','notas','estado','total']);
 s.appendRow(['a1b2c3d4','2026-09-07T15:00:00Z','Cliente','3001234567','local','','[]','','Recibido',24000]);
 b.preparar(); assert.equal(s.rows.length,2); assert.equal(s.rows[0].length,12); assert.equal(b.get({id:'a1b2c3d4'}).pedidos[0].total,24000);
});
console.log(pruebas+' pruebas de backend correctas.');
