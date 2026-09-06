# Las Fritas — Sitio de pedidos

Este paquete trae todo lo necesario: la página del cliente, el panel de
cocina/recepción, y el código para conectar ambos a través de un Google
Sheet (que funciona como base de datos, gratis).

**Ya lo probé de punta a punta** (crear pedido → verlo en el panel →
cambiar estado → ver la actualización del lado del cliente) con un
backend de prueba. Funciona. Ahora te toca conectarlo a tu propio Google
Sheet siguiendo estos pasos.

---

## Paso 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja
   nueva. Ponle el nombre que quieras, por ejemplo "Las Fritas — Pedidos".
2. No necesitas crear columnas a mano: el sistema las crea solo la
   primera vez que llegue un pedido.

## Paso 2 — Pegar el código del backend

1. En el Sheet, ve a **Extensiones → Apps Script**.
2. Borra todo el código de ejemplo que aparece y pega el contenido
   completo del archivo `apps-script/Code.gs` de este paquete.
3. Guarda (ícono de disquete o `Ctrl+S`).

## Paso 3 — Publicar el backend como aplicación web

1. Arriba a la derecha, haz clic en **Implementar → Nueva implementación**.
2. En "Selecciona el tipo", elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
4. Haz clic en **Implementar**. Google te pedirá autorizar permisos la
   primera vez — es tu propio script, es seguro aceptarlo.
5. Copia la **URL de la aplicación web** que te da (termina en `/exec`).

## Paso 4 — Conectar el sitio con esa URL

1. Abre el archivo `config.js` de este paquete.
2. Busca la línea:
   ```js
   const API_URL = "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT";
   ```
3. Reemplaza el texto entre comillas por la URL que copiaste. Guarda.

## Paso 5 — Ajustar el menú (opcional pero recomendado)

En el mismo `config.js` está el arreglo `MENU`, organizado por
categorías. Edita nombres, descripciones y precios para que coincidan
con el menú real de Las Fritas. También puedes agregar o quitar
productos y categorías completas siguiendo el mismo formato.

## Paso 6 — Publicar el sitio en Netlify

1. Ve a **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Arrastra **todos los archivos** de este paquete (menos la carpeta
   `apps-script` y este `LEEME.md`, que no hacen falta ahí) directamente
   a la página. No necesitas cuenta para probarlo, aunque te recomiendo
   crear una gratis para poder editarlo después.
3. En segundos te da un link tipo `nombre-al-azar.netlify.app`.
   Ese link ya es tu sitio, funcionando de verdad.

## Paso 7 — Usarlo

- **Clientes** (en el local o desde su casa): entran a
  `tulink.netlify.app/index.html` (o solo `tulink.netlify.app` si lo
  configuras como página principal en Netlify), arman su pedido y
  reciben un código para seguir el estado.
- **Cocina y recepción**: abren `tulink.netlify.app/staff.html` en una
  tablet, computador o celular del local, y lo dejan abierto — se
  actualiza solo cada pocos segundos.

---

## Cosas importantes que debes saber

- **No hay login todavía.** Cualquiera con el link de `staff.html`
  puede ver y modificar los pedidos. Por ahora, simplemente no compartas
  ese link fuera del personal. Si más adelante quieres una clave de
  acceso, es un cambio pequeño que podemos hacer después.
- **Límite gratis de Google Apps Script:** unas 20.000 solicitudes al
  día en la cuenta gratuita — de sobra para un local como este.
- **No incluye pasarela de pago ni rastreo GPS**, tal como pediste. El
  estado "En camino" es solo una etiqueta que activa el personal
  manualmente, no un mapa en vivo.
- **Los pedidos quedan guardados en tu Google Sheet** para siempre (a
  menos que borres filas), así que también te sirve como historial.
- Si algo no carga en el panel de personal, revisa primero que la
  `API_URL` en `config.js` esté bien pegada — es la causa más común de
  errores.

## Archivos de este paquete

```
index.html          → Página del cliente (pedir + seguir pedido)
staff.html           → Panel de cocina/recepción
style.css            → Estilos (paleta, tipografía, animaciones)
config.js            → Menú, marca y la URL del backend (edítalo)
utils.js             → Funciones compartidas
cliente.js           → Lógica de la página del cliente
staff.js             → Lógica del panel de personal
apps-script/Code.gs  → Backend a pegar en Google Apps Script
```
