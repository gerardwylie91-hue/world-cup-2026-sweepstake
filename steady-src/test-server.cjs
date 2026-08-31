'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public');
const headers=JSON.parse(fs.readFileSync(path.join(__dirname,'generated-vercel.json'),'utf8')).headers[0].headers;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1:4397');
  const pathname=decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  for(const h of headers)res.setHeader(h.key,h.value.replace('; upgrade-insecure-requests',''));
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
 } catch {res.writeHead(400);res.end('Bad request');}
});
server.listen(4397,'127.0.0.1',()=>console.log('Steady verification server: http://127.0.0.1:4397'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
