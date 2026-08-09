const CACHE='revision-route-v40-armory-v9';
const ASSETS=['./','./index.html','./styles.css','./navigation.css','./feedback.css','./game.css','./practice-v2.css','./phaser-game.css','./rpg-v4.css','./app.js','./knowledge-extra.js','./practice-v2.js','./game-v2-data.js','./rpg-v4-data.js','./rpg-v4-game.js','./rpg-v5-game.js','./rpg-v6-game.js','./assets/vendor/phaser.min.js','./assets/art/character-lineup.png','./assets/art/hero-sword-v6.png','./assets/art/hero-greatsword-v6.png','./assets/art/hero-dual-v6.png','./assets/art/hero-bow-v6.png','./assets/art/enemy-sprites-v2.png','./assets/art/boss-sprites-v2.png','./assets/art/enemy-souls-v4.png','./assets/art/chapter-backgrounds-v2.png','./assets/art/rpg-items-v1.png','./assets/art/rpg-weapons-v2.png','./assets/art/rpg-gear-consumables-v2.png','./assets/art/rpg-set-plain-v1.png','./assets/art/rpg-set-common-v1.png','./assets/art/rpg-set-excellent-v1.png','./assets/art/rpg-set-fine-v1.png','./assets/art/rpg-set-mythic-v1.png','./assets/art/rpg-set-legendary-v1.png','./assets/art/rpg-hero-set-plain-v1.png','./assets/art/rpg-hero-set-common-v1.png','./assets/art/rpg-hero-set-excellent-v1.png','./assets/art/rpg-hero-set-fine-v1.png','./assets/art/rpg-hero-set-mythic-v1.png','./assets/art/rpg-hero-set-legendary-v1.png','./sw.js','./manifest.json','./schedule.json','./syllabus.json','./README.md'];
ASSETS.push('./rpg-v7-game.js');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});
