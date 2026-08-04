const CACHE='revision-route-v18-rpg-v5';
const ASSETS=['./','./index.html','./styles.css','./navigation.css','./feedback.css','./game.css','./practice-v2.css','./phaser-game.css','./rpg-v4.css','./app.js','./knowledge-extra.js','./practice-v2.js','./game-v2-data.js','./rpg-v4-data.js','./rpg-v4-game.js','./rpg-v5-game.js','./assets/vendor/phaser.min.js','./assets/art/character-lineup.png','./assets/art/hero-sword-v5.png','./assets/art/hero-greatsword-v5.png','./assets/art/hero-dual-v5.png','./assets/art/hero-bow-v5.png','./assets/art/enemy-sprites-v2.png','./assets/art/boss-sprites-v2.png','./assets/art/enemy-souls-v4.png','./assets/art/chapter-backgrounds-v2.png','./sw.js','./manifest.json','./schedule.json','./syllabus.json','./README.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});
