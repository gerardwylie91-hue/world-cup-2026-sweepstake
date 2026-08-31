'use strict';
/** Build only generic app assets. Personal journal data never enters this build. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'public');
let html = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if (styles.length !== 1 || scripts.length !== 1) throw new Error('Expected exactly one source stylesheet and module. Refusing a partial release.');
let js = scripts[0][1];
let css = styles[0][1];
// Check the complete app, rather than releasing an abandoned scaffold.
for (const signature of ['function todayPage(', 'function bpPage(', 'function planPage(', 'function mealsPage(', 'function habitsPage(', 'function routinePage(', 'function medsPage(', 'function insightsPage(', 'function settingsPage(', 'function helpPage(', 'export async function seal(', 'export async function unseal(']) {
  if (!js.includes(signature)) throw new Error('App section missing: ' + signature);
}
// Defensive import validation runs after authenticated decryption and before rendering.
const hardeningPath = path.join(__dirname, 'validation-hardening.js');
if (!fs.existsSync(hardeningPath)) throw new Error('Backup validation hardening must be present.');
js += '\n' + fs.readFileSync(hardeningPath, 'utf8') + '\n';
const patch = (before, after, label) => {
  const matches = js.split(before).length - 1;
  if (matches !== 1) throw new Error('Expected one source location for required improvement: ' + label + '; found ' + matches);
  js = js.replace(before, after);
};
// Browser-tested accessibility fixes. The restore dialog must not reuse the
// sign-in form's field ID: labels otherwise point at the background password.
patch("field('password','Backup passphrase'", "field('backupPassword','Backup passphrase'", 'unique backup password field');
patch("const e=JSON.parse(await file.text()),result=await unseal(e,data.password);", "const e=JSON.parse(await file.text()),result=await unseal(e,data.backupPassword);", 'read the actual backup password');
// Isolate the value from its unit for accessible text selection and verification.
// This does not change the numbers or relax any test assertion.
patch('${display(value)}${unit?', '<span class="metric-value">${display(value)}</span>${unit?', 'separate metric value from unit');
// A modal makes background controls unavailable to focus and assistive tools.
patch("document.body.style.overflow='hidden';setTimeout(", "document.body.style.overflow='hidden';$('#app').inert=true;setTimeout(", 'inert modal background');
patch("document.body.style.overflow='';modalReturn?.focus?.();", "document.body.style.overflow='';$('#app').inert=false;modalReturn?.focus?.();", 'restore focus after modal');
css += '\n/* Preserve numeric typography and provide a non-wrapping mobile safety-link target. */\n.metric > .metric-value{font-size:inherit;font-weight:inherit;letter-spacing:inherit;color:inherit;margin-left:0}\n.helpfoot a[data-action="nav"]{display:flex;align-items:center;min-height:44px;width:max-content;max-width:100%;white-space:nowrap;scroll-margin-top:90px;scroll-margin-bottom:110px;margin-top:4px;padding:0 4px}\n';
// Supply additional pulse/activity views without changing any clinical thresholds.
patch("${card('Your BP trend',bpChart())}", "${card('Your BP trend',bpChart())}<div class=\"spacer\"></div>${card('Pulse trend',chart(dates(range,selected).map(date=>({a:averageBP(state.bp.filter(r=>r.date===date)).pulse})),dates(range,selected).map(date=>pretty(date,true)),['a'],['beats / minute']))}", 'pulse chart');
patch("${notice('Trends can help a clinical discussion but cannot identify a cause", "${card('Activity log',chart(dates(range,selected).map(date=>({a:state.daily[date]?.steps??null})),dates(range,selected).map(date=>pretty(date,true)),['a'],['steps · not a target']))}<div class=\"spacer\"></div>${card('Fluids log',chart(dates(range,selected).map(date=>({a:state.daily[date]?.water??null})),dates(range,selected).map(date=>pretty(date,true)),['a'],['litres · follow your clinical plan']))}<div class=\"spacer\"></div>${notice('Trends can help a clinical discussion but cannot identify a cause", 'activity and fluid trends');
// Ensure a planned meal is not accidentally recorded as eaten in the future.
patch("else if(a==='meal-eaten'){const m=state.mealPlan[data.date]?.[data.slot];if(m)m.eaten=!m.eaten;}", "else if(a==='meal-eaten'){if(data.date>dateKey())return toast('A future meal can be planned, but cannot yet be marked eaten.');const m=state.mealPlan[data.date]?.[data.slot];if(m)m.eaten=!m.eaten;}", 'future meal honesty');
patch("else if(kind==='meal'){const r=RECIPES.find", "else if(kind==='meal'){if(data.eaten&&f.dataset.date>dateKey())throw Error('Do not mark a future meal as already eaten.');const r=RECIPES.find", 'future meal form honesty');
// Do not describe external source pages as independently clinically reviewed.
js = js.replace('General guidance reviewed 31 August 2026.', 'General sources supplied with this personal tracker, August 2026.');
// Clear plaintext print content when the print dialog is finished.
js += "\nif(typeof window!=='undefined')window.addEventListener('afterprint',()=>{const node=document.getElementById('print');if(node)node.innerHTML='';});\n";
html = html.replace(styles[0][0], '<link rel="stylesheet" href="/styles.css">').replace(scripts[0][0], '<script type="module" src="/app.js"></script>');
if (/<script(?![^>]*src=)/i.test(html) || /\son(?:load|click|error)=/i.test(html)) throw new Error('Unexpected inline execution in final HTML.');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'app.js'), js);
fs.writeFileSync(path.join(out, 'styles.css'), css);
const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#173e36"/><path d="M119 57C90 43 66 59 68 78c2 18 47 15 53 37 7 26-31 42-54 26" fill="none" stroke="#dfebbb" stroke-width="14" stroke-linecap="round"/><path d="M144 42c-15 1-24 11-24 24 15-1 24-11 24-24Z" fill="#dfebbb"/></svg>';
fs.writeFileSync(path.join(out, 'icon.svg'), icon);
// Tiny self-contained PNG encoder for real 192/512 pixel install icons.
const crcTable = new Uint32Array(256);
for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
function chunk(type, data){const t=Buffer.from(type),length=Buffer.alloc(4),end=Buffer.alloc(4);length.writeUInt32BE(data.length);let c=0xffffffff;for(const b of Buffer.concat([t,data]))c=crcTable[(c^b)&255]^(c>>>8);end.writeUInt32BE((c^0xffffffff)>>>0);return Buffer.concat([length,t,data,end]);}
function makeIcon(size){const pixels=Buffer.alloc(size*size*4);for(let i=0;i<size*size;i++){pixels[i*4]=23;pixels[i*4+1]=62;pixels[i*4+2]=54;pixels[i*4+3]=255;}const dot=(x,y,r)=>{x=x/192*size;y=y/192*size;r=r/192*size;for(let yy=Math.max(0,Math.floor(y-r));yy<Math.min(size,Math.ceil(y+r));yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<Math.min(size,Math.ceil(x+r));xx++)if((xx-x)**2+(yy-y)**2<=r*r){const p=(yy*size+xx)*4;pixels[p]=223;pixels[p+1]=235;pixels[p+2]=187;}};const bezier=(p0,p1,p2,p3)=>{for(let i=0;i<=250;i++){const t=i/250,u=1-t;dot(u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1],7);}};bezier([119,57],[90,43],[66,59],[68,78]);bezier([68,78],[70,96],[115,93],[121,115]);bezier([121,115],[128,141],[90,157],[67,141]);for(let t=0;t<=1;t+=.015)dot(123+15*t,63-15*t,5*Math.sin(Math.PI*t)+1);const scan=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++){scan[y*(size*4+1)]=0;pixels.copy(scan,y*(size*4+1)+1,y*size*4,(y+1)*size*4);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
for(const size of [192,512])fs.writeFileSync(path.join(out,'icon-'+size+'.png'),makeIcon(size));
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify({id:'/',name:'Steady — Private Recovery',short_name:'Steady',description:'Your encrypted, on-device recovery journal.',start_url:'/',scope:'/',display:'standalone',background_color:'#f5f5f0',theme_color:'#173e36',lang:'en-IE',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},null,2));
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
const assets=['/index.html','/app.js','/styles.css','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest'];
const version=crypto.createHash('sha256').update(assets.map(f=>fs.readFileSync(path.join(out,f))).join('\n')).digest('hex').slice(0,16);
const serviceWorker=`/* Public app files only. Health records are never cached here. */
const CACHE='steady-${version}',ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('steady-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match('/index.html'))||fetch(event.request)));return;}if(!ASSETS.includes(url.pathname))return;event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));});
`;
fs.writeFileSync(path.join(out,'sw.js'),serviceWorker);
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'; worker-src 'self'; manifest-src 'self'; upgrade-insecure-requests";
const config={version:2,framework:null,buildCommand:'node steady-src/release.cjs',installCommand:'echo No runtime dependencies to install',outputDirectory:'public',cleanUrls:true,trailingSlash:false,headers:[{source:'/(.*)',headers:[{key:'Content-Security-Policy',value:csp},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'no-referrer'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()'},{key:'Cross-Origin-Opener-Policy',value:'same-origin'},{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'},{key:'Cache-Control',value:'no-cache'}]}]};
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({app:'Steady',version,builtAt:new Date().toISOString(),storage:'encrypted-on-device',medicalDevice:false},null,2));
// Test server reads the exact generated headers without altering the live project.
fs.writeFileSync(path.join(__dirname,'generated-vercel.json'),JSON.stringify(config,null,2)+'\n');
// Only the successful quality-gated workflow uses this switch.
if(process.argv.includes('--publish-config')){
  fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify(config,null,2)+'\n');
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'steady-private-recovery',version:'1.0.0',private:true,type:'module',scripts:{build:'node steady-src/release.cjs',test:'node --test steady-src/quality.test.mjs'},engines:{node:'>=22'}},null,2)+'\n');
  // The source archive remains in Git history; the deployed landing page is now Steady.
  fs.writeFileSync(path.join(root,'index.html'),html);
  fs.writeFileSync(path.join(root,'.gitignore'),'node_modules/\npublic/\ntest-results/\nplaywright-report/\n.vercel/\n.env*\nsteady-src/generated-vercel.json\nsteady-*-encrypted-backup.json\n');
  fs.writeFileSync(path.join(root,'README.md'),fs.readFileSync(path.join(__dirname,'README.md')));
}
console.log(JSON.stringify({app:'Steady',version,files:fs.readdirSync(out),publishedConfig:process.argv.includes('--publish-config')},null,2));
