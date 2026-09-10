const fs = require("node:fs"),
  path = require("node:path");
const out = path.join(__dirname, "../public/assets/illustrations");
const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180"><g stroke="#21180f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const tray =
  '<path d="M27 115 Q120 142 214 113 L198 153 Q119 179 44 152Z" fill="#f5f1e8"/><path d="M40 130 Q120 155 201 129" fill="none"/><path d="M58 151l7 5m30 1 8 3m34-1 8-1m29-4 8-3" fill="none"/>';
const fries = Array.from(
  { length: 13 },
  (_, i) =>
    `<rect x="${39 + i * 11}" y="${58 + (i % 4) * 9}" width="13" height="64" rx="4" transform="rotate(${((i % 5) - 2) * 12} ${45 + i * 11} 116)" fill="${i % 3 ? "#f5b921" : "#ffcf58"}"/>`,
).join("");
const sausage =
  '<g fill="#b6492d"><ellipse cx="60" cy="105" rx="14" ry="9" transform="rotate(-25 60 105)"/><ellipse cx="115" cy="111" rx="14" ry="9"/><ellipse cx="174" cy="99" rx="14" ry="9" transform="rotate(15 174 99)"/></g>';
const cheese =
  '<path d="M48 100q20 30 39 0t36 9 34-1 35-3" stroke="#fff3ba" stroke-width="7" fill="none"/>';
const arts = {
  tray,
  fries: fries + sausage + cheese + tray,
  burger:
    '<path d="M44 77Q49 26 118 26Q191 27 198 77Z" fill="#e9a04a"/><path d="m48 79 23 12 25-8 24 11 28-12 21 11 25-10" fill="none" stroke="#4d8434" stroke-width="13"/><path d="M47 98q70-11 147 0v21H46Z" fill="#643420"/><path d="m50 93 36 22 41-20 40 22 25-24" fill="#f5b921"/><path d="M43 122h153q3 30-33 31H76q-36-1-33-31Z" fill="#e9a04a"/><path d="m80 51 5-3m29-9 6 1m26 9 5 3m-56 8 5 1m27 4 5-3m29-3 5 3" stroke="#fff2c9" stroke-width="4"/>',
  dog: '<path d="M43 112 158 46Q184 33 199 58Q210 77 191 91L72 159Q47 170 33 150Q19 126 43 112Z" fill="#dfa054"/><path d="m48 128 125-73q13-7 21 7t-3 21L67 155q-16 7-23-8t4-19Z" fill="#b6492d"/><path d="m58 130 9 9 5-25 18 7 4-22 20 8 6-23 18 7 6-21 18 6 6-19" stroke="#f5d54e" fill="none" stroke-width="6"/><path d="m51 118 21-3m71-62 11 1m-54 70 15 2m32-42 14 3" stroke="#58904c" stroke-width="5"/>',
  plantain:
    '<path d="M31 117q50 6 83-35t86-40q-17 83-92 103-48 15-77-28Z" fill="#e1a13d"/><path d="M52 118q76-13 130-60" stroke="#8d5324" stroke-width="12" fill="none"/><path d="m73 114 8-11 19 4 7-18 22 0 9-16 21-2" fill="none" stroke="#fff1b0" stroke-width="10"/><path d="m76 120 9-2m29-24 9-5m25-12 9-5" stroke="#a12d40" stroke-width="8"/>',
  bowl: '<ellipse cx="120" cy="91" rx="87" ry="40" fill="#deb75c"/><g fill="#975734"><path d="m57 76 29-13 15 20-31 14Z"/><path d="m102 84 22-24 29 18-19 22Z"/><path d="m150 100 24-24 19 17-18 20Z"/></g><g fill="#f5cf48"><circle cx="70" cy="103" r="7"/><circle cx="93" cy="96" r="7"/><circle cx="131" cy="108" r="7"/></g><path d="m90 67 10 9m57-9 11 11m-39 11 9 3" stroke="#5d9946" stroke-width="9"/><path d="M31 94q87 65 177 0-8 68-86 72-74-1-91-72Z" fill="#f5f1e8"/><path d="M49 121q70 39 140 0" fill="none"/>',
  drink:
    '<path d="M70 45h102l-16 116H86Z" fill="#e6297b"/><ellipse cx="121" cy="46" rx="51" ry="13" fill="#ffcadb"/><path d="m120 102 18-77 29-10" stroke="#21180f" stroke-width="7" fill="none"/><path d="m94 61 9 5m43-4-9 8m-32 23 8-4m26 29-9 4m-15 16 8 2" stroke="#fff1e8" stroke-width="5"/><circle cx="68" cy="46" r="23" fill="#a9bf54"/><path d="M52 46h31M68 30v32m-11-27 22 22m0-22-22 22" stroke="#f5f1e8" stroke-width="2"/>',
  extra:
    '<path d="M52 99q70 35 136 0-7 59-67 61-61 0-69-61Z" fill="#f5f1e8"/><ellipse cx="120" cy="96" rx="68" ry="29" fill="#f5b921"/><path d="M120 54v57m-29-29h58" stroke="#21180f" stroke-width="13" fill="none"/>',
};
for (const [name, body] of Object.entries(arts))
  fs.writeFileSync(path.join(out, name + ".svg"), wrap(body));
const vm = require("node:vm");
const ctx = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../public/config.js"), "utf8"),
  ctx,
);
const salchis = vm.runInContext("MENU[0].items", ctx);
for (const p of salchis) {
  let toppings = "";
  const d = p.descripcion.toLowerCase();
  if (/maduro/.test(d))
    toppings +=
      '<g fill="#da8936"><ellipse cx="77" cy="88" rx="17" ry="9" transform="rotate(-25 77 88)"/><ellipse cx="156" cy="114" rx="17" ry="9" transform="rotate(15 156 114)"/></g>';
  if (/tocineta/.test(d))
    toppings +=
      '<path d="m77 63 7 18 25-4 7 23m21-21 7 17 23-2 6 17" fill="none" stroke="#af4137" stroke-width="8"/><path d="m78 63 8 17 23-4" fill="none" stroke="#efbb98" stroke-width="2"/>';
  if (/pollo/.test(d))
    toppings +=
      '<path d="m71 95 20-13 11 13m23-30 9 15 18-5m-41 32 17-11 13 12" fill="none" stroke="#dbb486" stroke-width="10"/>';
  if (/carne|bondiola/.test(d))
    toppings +=
      '<path d="m80 105 20-15 21 12m18-17 17-13 17 17" fill="none" stroke="#874424" stroke-width="11"/>';
  if (/costilla/.test(d))
    toppings +=
      '<path d="m105 74 14-12 25 25-15 12Z" fill="#a85530"/><path d="m118 73 11 11m-18-4 11 11m4-23 11 11" stroke="#eac99b" stroke-width="4"/>';
  if (/chicharrón/.test(d))
    toppings +=
      '<path d="m62 85 21-22 26 11-20 24Zm61 9 21-22 26 11-20 24Z" fill="#bc6d28"/><path d="m75 78 10 4m51 6 10 4" stroke="#f4cb72" stroke-width="5"/>';
  if (/guacamole/.test(d))
    toppings +=
      '<path d="M53 110q-3-21 15-21 9-16 24-2 12 0 12 20Z" fill="#679443"/>';
  if (/atún/.test(d))
    toppings +=
      '<path d="m113 70 22 3 13 15-7 22-35-10-5-16Z" fill="#d2a993"/>';
  if (/nachos/.test(d))
    toppings +=
      '<path d="m125 70 23-23 8 31Zm21 24 22-20 6 30Z" fill="#f0be4e"/>';
  if (/maíz/.test(d))
    toppings +=
      '<g fill="#ffe05a" stroke-width="1"><circle cx="57" cy="82" r="5"/><circle cx="120" cy="105" r="5"/><circle cx="168" cy="69" r="5"/><circle cx="97" cy="116" r="5"/></g>';
  if (/chorizo/.test(d))
    toppings +=
      '<g fill="#a14426"><ellipse cx="75" cy="112" rx="13" ry="9"/><ellipse cx="166" cy="88" rx="13" ry="9"/></g>';
  if (p.id === "mega-frita-queso")
    toppings +=
      '<path d="M56 93q20-20 36 3t38-2 40 4 20-4" stroke="#fff0ae" stroke-width="14" fill="none"/>';
  fs.writeFileSync(
    path.join(out, p.id + ".svg"),
    wrap(fries + sausage + toppings + cheese + tray),
  );
}
