const BASE='http://127.0.0.1:4175/index.html';
const CDP='http://127.0.0.1:9224';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Client{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.errors=[];this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)}}
  async ready(){if(this.ws.readyState===1)return;await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject})}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
}
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
async function until(client,expression,timeout=12000){const started=Date.now();while(Date.now()-started<timeout){try{if(await client.eval(expression))return}catch{}await wait(100)}throw new Error('timeout: '+expression)}
async function main(){
  const tabs=await (await fetch(CDP+'/json/list')).json();
  const tab=tabs.find(x=>x.type==='page')||tabs[0],client=new Client(tab.webSocketDebuggerUrl);await client.ready();await client.send('Page.enable');await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await client.send('Page.navigate',{url:BASE+'?view=practice&v=90'});await until(client,"document.body.innerText.includes('今天的10题')");
  const learning=await client.eval(`({title:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent).find(x=>x.includes('今天的10题')),question:[...document.querySelectorAll('h2,h3')].map(x=>x.textContent).find(x=>x.includes('？')),hasTestTools:!!document.querySelector('.rpg-test-tools'),next:!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('下一题'))})`);
  assert(learning.title&&learning.question&&learning.next&&!learning.hasTestTools,'正式答题页面没有正确加载');
  await client.send('Page.navigate',{url:BASE+'?game-test=1&v=90'});await until(client,'window.__RPG_V10__?.version===10');await client.eval('rpgLaunch()');await until(client,'!!rpgScene?.player',18000);await wait(500);
  const game=await client.eval(`(()=>{const s=rpgScene,r=ensureRpgState();const results={version:window.__RPG_V10__?.version,hero:s.player.texture.key,legacyWeaponVisible:s.weaponFx.visible,healerCount:s.enemies.filter(e=>e.kind==='healer').length,healerWidth:s.textures.get('rpg-healer-v10').getSourceImage().width,shield:null,pendulum:null,actions:{}};r.player.shield=true;s.syncShieldEffect();results.shield={parts:s.shieldFx.list.length,width:s.shieldRing.width,height:s.shieldRing.height};const pendulum=s.v9TrapFx.find(x=>x.h.type==='pendulum');results.pendulum=pendulum?{originY:pendulum.sprite.originY,width:Math.round(pendulum.sprite.displayWidth),height:Math.round(pendulum.sprite.displayHeight),angle:Math.round(pendulum.sprite.angle)}:null;for(const id of ['sword','greatsword','dual','bow','staff']){const item=rpgStarterSword();item.id='loop-'+id;item.baseId=id;item.name=id;r.inventory.push(item);r.equipment.weapons[0]=item.id;r.equipment.activeWeapon=0;s.refreshWeapon();s.lastAttack=-Infinity;s.attack(s.time.now+5000);results.actions[id]={key:s.currentAttackKey,exists:s.anims.exists(s.currentAttackKey),air:s.anims.exists('rpg-v10-air-'+id)}}return results})()`);
  assert(game.version===10&&game.hero.startsWith('rpg-v10-'),'V10 角色图集未启用');
  assert(game.legacyWeaponVisible===false,'旧武器贴图仍叠加在角色上');
  assert(game.healerCount===1&&game.healerWidth===256,'修复师仍以多帧大图显示');
  assert(game.shield.parts===4&&game.shield.width>game.shield.height*3,'护盾比例不正确');
  assert(game.pendulum&&game.pendulum.originY===0&&game.pendulum.height<180,'吊刃锚点或比例不正确');
  assert(Object.values(game.actions).every(x=>x.exists&&x.air),'至少一类武器缺少地面或空中分段攻击动画');
  assert(client.errors.length===0,'运行时错误：'+client.errors.join(' | '));
  console.log(JSON.stringify({learning,game,errors:client.errors},null,2));client.ws.close();
}
main().catch(error=>{console.error(error.stack||error);process.exit(1)});
