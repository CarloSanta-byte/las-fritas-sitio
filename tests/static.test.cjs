const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root=path.resolve(__dirname,'../public');
for(const file of ['index.html','staff.html','offline.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
    if(/^(https?:|data:)/.test(match[1]))continue;
    assert.ok(fs.existsSync(path.resolve(root,match[1].split('?')[0])),file+': '+match[1]);
  }
}
for(const file of fs.readdirSync(path.join(root,'js')))execFileSync(process.execPath,['--check',path.join(root,'js',file)]);
const context=vm.createContext({URL,self:{registration:{scope:'https://example.test/'},addEventListener(){}},location:{origin:'https://example.test'}});
vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
const resources=vm.runInContext('FILES',context);
for(const resource of resources)assert.ok(fs.existsSync(path.resolve(root,resource==='./'?'index.html':resource)),resource);
assert.equal(resources.filter(r=>/staff|cocina|Code.gs/.test(r)).length,0);
const config=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'config.js'),'utf8'),config);assert.equal(vm.runInContext('MENU.reduce((n,g)=>n+g.items.length,0)',config),64);
console.log('OK · Entradas, referencias locales, JavaScript, 64 productos y lista de caché pública.');
