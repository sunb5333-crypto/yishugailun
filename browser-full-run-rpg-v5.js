const CDP='http://127.0.0.1:9223';
const URL='http://127.0.0.1:4175/index.html?game-test=1&v=54&full-run-v6=1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.errors=[];this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)}}async ready(){await new Promise((r,j)=>{this.ws.onopen=r;this.ws.onerror=j})}send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}async eval(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}}
const assert=(value,message)=>{if(!value)throw new Error(message)};
async function until(c,expression,tries=120){for(let i=0;i<tries;i++){try{if(await c.eval(expression))return}catch{}await wait(120)}throw new Error(`timeout: ${expression}`)}
async function main(){
  const tabs=await(await fetch(`${CDP}/json/list`)).json(),c=new Client(tabs[0].webSocketDebuggerUrl);await c.ready();
  await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Page.navigate',{url:URL});
  await until(c,'typeof rpgLaunch==="function"&&window.__RPG_V5__?.version===6');
  const formalBefore=await c.eval('localStorage.getItem(STORAGE_KEY)');
  await c.eval(`(()=>{const r=ensureRpgState(),n=rpgNode(1),l=ensureDailyTask();n.questionSnapshot=l.items.slice(0,10).map(x=>({id:x.id,q:x.q,answerText:x.answerText,chapter:x.chapter,section:x.section,orderPolicy:answerOrderPolicy(x)}));n.questionIds=n.questionSnapshot.map(x=>x.id);r.route.current=1;r.run=rpgV5FreshRun(n,false);state.view='rpgGame';render();rpgLaunch()})()`);
  await until(c,'!!__RPG_TEST__.scene()?.player');
  const ids=await c.eval('__RPG_TEST__.snapshot().enemies.filter(x=>x.hasSoul).map(x=>x.id)');
  assert(ids.length===10&&ids.includes('boss'),'soul deck must contain ten unique enemies including boss');
  for(const id of ids){
    await c.eval(`(()=>{const s=__RPG_TEST__.scene(),e=s.enemies.find(x=>x.active&&x.dataRef.id==='${id}');if(!e)throw new Error('missing ${id}');e.dataRef.hp=0;s.updateEnemyBar(e);s.physicalDefeat(e)})()`);
    await until(c,'!!__RPG_TEST__.scene()?.soulBattle');
    await c.eval('__RPG_TEST__.soulCorrect()');await wait(1050);const grounded=await c.eval(`(()=>{const s=__RPG_TEST__.scene();return{bottom:s.player.body.bottom,frame:Number(s.player.frame.name),vy:s.player.body.velocity.y}})()`);assert(Math.abs(grounded.bottom-480)<4&&grounded.frame>=0&&grounded.frame<=5&&Math.abs(grounded.vy)<18,`player did not settle after soul ${id}: ${JSON.stringify(grounded)}`);
  }
  const prePortal=await c.eval(`(()=>{const s=__RPG_TEST__.scene();return{active:s.portal.active,runStatus:s.run.status,souls:s.run.soulsAnswered.length,boss:s.run.enemies.find(x=>x.id==='boss'),result:!!document.querySelector('.rpg-result')}})()`);
  assert(prePortal.active&&!prePortal.boss.alive&&prePortal.boss.soulResolved,'boss clear did not activate portal');
  assert(!prePortal.result,'result opened before portal interaction');
  await c.eval(`(()=>{const s=__RPG_TEST__.scene();s.player.setPosition(120,420);return s.tryPortalStrike('projectile')})()`);
  await until(c,'!!document.querySelector(".rpg-result")');
  const end=await c.eval(`(()=>{const r=ensureRpgState(),n=rpgNode(1),next=rpgNode(2);return{run:r.run,first:n.firstClear,stars:n.stars,stage:rpgV5Stage(n),unlocked:r.route.unlocked,nextStage:rpgV5Stage(next),nextStatus:next.status,level:r.player.level,coins:r.player.coins,items:r.inventory.length,result:!!document.querySelector('.rpg-result'),text:document.querySelector('.rpg-result')?.innerText||''}})()`);
  assert(end.run===null&&end.first&&end.stars>=2&&end.result,'portal did not complete and save stage');
  assert(end.stage==='1-1'&&end.nextStage==='1-2','stage labels are incorrect');
  assert(end.nextStatus==='available','next stage remained internally locked after portal save');
  assert(end.coins>0&&end.items>=1,'full clear gave no RPG rewards');
  const formalAfter=await c.eval('localStorage.getItem(STORAGE_KEY)');
  assert(formalAfter===formalBefore,'independent game test modified formal learning storage');
  assert(!c.errors.length,`runtime errors: ${c.errors.join(' | ')}`);
  console.log(JSON.stringify({soulIds:ids,prePortal,end,formalStorageUnchanged:true,errors:c.errors},null,2));c.ws.close();
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
