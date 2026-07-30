const CACHE='revision-route-v7';
const ASSETS=['./','./index.html','./styles.css','./navigation.css','./feedback.css','./game.css','./practice-v2.css','./app.js','./game.js','./practice-v2.js','./sw.js','./manifest.json','./schedule.json','./syllabus.json','./README.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});
