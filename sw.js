const CACHE='revision-route-v12';
const ASSETS=['./','./index.html','./styles.css','./navigation.css','./feedback.css','./game.css','./practice-v2.css','./phaser-game.css','./app.js','./knowledge-extra.js','./practice-v2.js','./phaser-game.js','./assets/vendor/phaser.min.js','./assets/art/character-lineup.png','./sw.js','./manifest.json','./schedule.json','./syllabus.json','./README.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});
