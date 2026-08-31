const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),out=path.join(root,'public');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const files=['index.html','app.js','core.js','vault.js','content.js','styles.css','icon.svg','manifest.webmanifest','robots.txt'];
for(const f of files)fs.copyFileSync(path.join(__dirname,f),path.join(out,f));
const version=crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(path.join(out,f))).join('\n')).digest('hex').slice(0,16);
const sw=`const CACHE='steady-${version}',ASSETS=${JSON.stringify(files.map(f=>'/'+f))};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('steady-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(async c=>(await c.match('/index.html'))||fetch(e.request)));return;}if(!ASSETS.includes(u.pathname))return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});`;
fs.writeFileSync(path.join(out,'sw.js'),sw);
console.log('Steady static build '+version+' ready; no runtime packages.');
