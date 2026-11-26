/* Caderneta de Campo: cache offline.
   Para publicar uma versão nova, troque o número em VERSAO e envie os arquivos de novo. */
var VERSAO='caderneta-v5';
var NUCLEO=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSAO).then(function(c){return c.addAll(NUCLEO)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==VERSAO}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;
  var u=new URL(r.url);
  var fonte=/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(u.origin!==self.location.origin&&!fonte)return;
  e.respondWith(caches.match(r).then(function(hit){
    var rede=fetch(r).then(function(res){
      if(res&&(res.status===200||res.type==='opaque')){var cp=res.clone();caches.open(VERSAO).then(function(c){c.put(r,cp)})}
      return res;
    }).catch(function(){return null});
    if(hit){e.waitUntil(rede);return hit}
    return rede.then(function(res){return res||(r.mode==='navigate'?caches.match('index.html'):Response.error())});
  }));
});
