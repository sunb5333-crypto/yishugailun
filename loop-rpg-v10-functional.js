const BASE='http://127.0.0.1:4175/index.html';
const CDP='http://127.0.0.1:9224';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
class Cdp {
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.waiting=new Map();this.errors=[];this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.waiting.get(m.id);if(p){this.waiting.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.text||'runtime exception')}}
  async open(){if(this.ws.readyState===1)return;await new Promise((ok,no)=>{this.ws.onopen=ok;this.ws.onerror=no})}
  send(method,params={}){return new Promise((ok,no)=>{const id=++this.id;this.waiting.set(id,{resolve:ok,reject:no});this.ws.send(JSON.stringify({id,method,params}))})}
  async run(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
}
const check=(value,message)=>{if(!value)throw new Error(message)};
async function ready(c,expr,ms=15000){const start=Date.now();while(Date.now()-start<ms){if(await c.run(expr))return;await pause(100)}throw new Error('timeout: '+expr)}
async function main(){
  const tabs=await (await fetch(CDP+'/json/list')).json();
  const tab=tabs.find(x=>x.type==='page')||tabs[0];
  const c=new Cdp(tab.webSocketDebuggerUrl);await c.open();await c.send('Runtime.enable');await c.send('Page.enable');

  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await c.send('Page.navigate',{url:BASE+'?view=practice&v=104'});await ready(c,"location.search.includes('v=104')");await ready(c,"!!document.querySelector('.practice-v2-layout')");
  const policyAudit=await c.run(`questionBank.map(q=>{const item=dailyItemFromQuestion(q),parts=maskRanges(item.answerText,4,3,item.id).map(x=>x.text);return{id:q.id,policy:answerOrderPolicy(item),parts,q:q.q}})`);
  const malformedMasks=policyAudit.flatMap(x=>x.parts.filter(part=>part.length<2||/^[，。；、：,.]|[，。；、：,.]$/.test(part)).map(part=>({id:x.id,part}))).concat(policyAudit.filter(x=>x.parts.length<2).map(x=>({id:x.id,part:'TOO_FEW_SAFE_TERMS'})));
  check(malformedMasks.length===0,'mask audit found malformed fragments: '+JSON.stringify(malformedMasks));
  const learning=await c.run(`(()=>{state.dailyLesson=null;state.dailyDone=false;ensureDailyTask();const l=ensureDailyTask(),rounds=[],unique=new Set();for(let round=1;round<=3;round++){l.round=round;l.index=0;l.roundIntro=false;let right=0;for(let i=0;i<10;i++){const item=currentDailyItem(),plan=maskPlan(item,round),key=answerKey(item.id);unique.add(item.sourceQuestionId);l.selections[key]=plan.ranges.map(x=>x.text);submitMaskAnswer();if(l.answers[key]?.correct)right++;if(i<9)nextQuestion()}rounds.push(right);nextQuestion()}return{rounds,unique:unique.size,answered:Object.values(l.answers).filter(x=>x.answered).length,done:l.done,saved:Boolean(localStorage.getItem(STORAGE_KEY)),panel:!!document.querySelector('.practice-v2-layout')};})()`);
  if(!(learning.rounds.every(x=>x===10)&&learning.unique===10&&learning.answered===30&&learning.done&&learning.saved&&learning.panel)){console.error('LEARNING_FAILURE '+JSON.stringify(learning));throw new Error('three-round study flow failed')}
  const orderCase=await c.run(`(()=>{const item=dailyItemFromQuestion(getQuestion('a14'));const expected=maskPlan(item,1).ranges.map(x=>x.text),swapped=[...expected].reverse();return{policy:answerOrderPolicy(item),expected,swapped,swappedCorrect:maskAnswerCorrect(item,swapped,expected)};})()`);
  check(orderCase.policy==='strict'&&orderCase.swapped.length>1&&!orderCase.swappedCorrect,'relational answer order was accepted');
  const semanticCases=await c.run(`(()=>['a5','a13','m1'].map(id=>{const item=dailyItemFromQuestion(getQuestion(id)),expected=maskPlan(item,1).ranges.map(x=>x.text),swapped=[...expected].reverse();return{id,policy:answerOrderPolicy(item),parts:expected.length,swappedCorrect:maskAnswerCorrect(item,swapped,expected)};}))()`);
  check(semanticCases.every(x=>x.policy==='free'&&x.parts>1&&x.swappedCorrect),'verified interchangeable concept lists were marked strict');
  const strictAudit=await c.run(`questionBank.map(q=>{const item=dailyItemFromQuestion(q),expected=maskPlan(item,3).ranges.map(x=>x.text),swapped=[...expected].reverse(),changed=expected.some((x,i)=>x!==swapped[i]);return{id:q.id,policy:answerOrderPolicy(item),changed,correct:maskAnswerCorrect(item,swapped,expected),statuses:expected.map((_,i)=>maskSelectionStatus(item,swapped,expected,i))}}).filter(x=>x.policy!=='free'&&x.changed)`);
  const strictFailures=strictAudit.filter(x=>x.correct||x.statuses.filter(s=>s==='wrong').length<2);
  if(strictFailures.length){console.error('STRICT_SWAP_FAILURE '+JSON.stringify(strictFailures));throw new Error('ordered question did not mark a swapped pair wrong')}
  await c.send('Page.navigate',{url:BASE+'?view=practice&v=104'});await ready(c,"location.search.includes('v=104')");await ready(c,"!!document.querySelector('.practice-v2-layout')");
  const persisted=await c.run(`(()=>{const l=ensureDailyTask();return{done:l.done,answered:Object.values(l.answers).filter(x=>x.answered).length,index:l.index,round:l.round}})()`);
  check(persisted.done&&persisted.answered===30&&persisted.round===3,'practice progress did not restore after reload');

  await c.send('Page.navigate',{url:BASE+'?game-test=1&v=104'});await ready(c,"location.search.includes('v=104')");await ready(c,'window.__RPG_V10__?.version===10');await c.run('rpgLaunch()');await ready(c,'!!rpgScene?.player',20000);await pause(600);
  const game=await c.run(`(()=>{const s=rpgScene,r=ensureRpgState(),combos={};for(const id of ['sword','greatsword','dual','bow','staff']){const item=rpgStarterSword();item.id='loop-'+id;item.baseId=id;item.name=id;r.inventory.push(item);r.equipment.weapons[0]=item.id;r.equipment.activeWeapon=0;s.refreshWeapon();s.combo=0;s.comboAt=0;const count={sword:3,greatsword:3,dual:5,bow:4,staff:3}[id],keys=[];for(let n=0;n<count;n++){s.lastAttack=-Infinity;s.attack(s.time.now+6000+n*800);keys.push(s.currentAttackKey)}combos[id]=keys}r.player.shield=true;s.syncShieldEffect();const p=s.v9TrapFx.find(x=>x.h.type==='pendulum');for(const ref of s.run.enemies){ref.alive=false;ref.soulResolved=true}const boss=s.run.enemies.find(x=>x.id==='boss');if(boss){boss.alive=false;boss.soulResolved=true}s.updatePortalState();s.player.setPosition(s.portal.x-18,420);s.portal.lastTouch=s.time.now;const entered=s.tryPortalStrike('melee');return{hero:s.player.texture.key,weaponHidden:s.weaponFx.visible===false,healers:s.enemies.filter(e=>e.kind==='healer').length,shield:[s.shieldRing.width,s.shieldRing.height,s.shieldFx.list.length],pendulum:p?{origin:p.sprite.originY,w:Math.round(p.sprite.displayWidth),h:Math.round(p.sprite.displayHeight)}:null,combos,portal:{active:s.portal.active,entered,transitioning:s.portal.transitioning},sceneActive:s.sys.isActive()};})()`);
  check(game.hero.startsWith('rpg-v10-')&&game.weaponHidden,'hero or old weapon overlay incorrect');
  check(game.healers===1,'healer duplicated');
  check(game.shield[0]>game.shield[1]*3&&game.shield[2]===4,'shield scale incorrect');
  check(game.pendulum?.origin===0&&game.pendulum.h<180,'pendulum anchoring incorrect');
  check(Object.entries(game.combos).every(([id,keys])=>keys.length===new Set(keys).size),'attack segments do not advance');
  check(game.portal.active&&game.portal.entered&&game.portal.transitioning,'portal cannot be entered after objectives');
  check(game.sceneActive,'staff or action test stopped scene');

  await c.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await c.send('Page.navigate',{url:BASE+'?view=practice&v=104'});await ready(c,"location.search.includes('v=104')");await ready(c,"!!document.querySelector('.practice-v2-layout')");
  const mobile=await c.run(`({overflow:document.documentElement.scrollWidth-window.innerWidth,question:!!document.querySelector('.practice-question'),buttons:[...document.querySelectorAll('button')].filter(x=>getComputedStyle(x).display!=='none').length})`);
  check(mobile.overflow<=2&&mobile.question&&mobile.buttons>3,'mobile practice layout failed');
  await c.send('Page.navigate',{url:BASE+'?game-test=1&v=104'});await ready(c,"location.search.includes('v=104')");await ready(c,'window.__RPG_V10__?.version===10');await c.run('rpgLaunch()');await ready(c,'!!rpgScene?.player',20000);
  const mobileGame=await c.run(`(()=>{const canvas=document.querySelector('#rpgCanvas canvas'),controls=document.querySelectorAll('[data-rpg]');const box=canvas?.getBoundingClientRect();return{canvas:Boolean(canvas),fit:Boolean(box&&box.width<=innerWidth+1&&box.height<=innerHeight+1),controls:controls.length,overflow:document.documentElement.scrollWidth-innerWidth,scene:!!rpgScene?.player}})()`);
  if(!(mobileGame.canvas&&mobileGame.fit&&mobileGame.controls>=4&&mobileGame.overflow<=2&&mobileGame.scene))console.error('MOBILE_GAME_FAILURE '+JSON.stringify(mobileGame));
  check(mobileGame.canvas&&mobileGame.fit&&mobileGame.controls>=4&&mobileGame.overflow<=2&&mobileGame.scene,'mobile game layout or controls failed');
  check(c.errors.length===0,'runtime errors: '+c.errors.join('|'));
  console.log(JSON.stringify({policyAudit,learning,orderCase,semanticCases,persisted,game,mobile,mobileGame,errors:c.errors},null,2));c.ws.close();
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
