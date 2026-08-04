const CDP='http://127.0.0.1:9223';
const URL='http://127.0.0.1:4175/index.html?game-test=1&v=51&maps-v5=1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.errors=[];this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)}}
  async ready(){await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject})}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
}
const assert=(value,message)=>{if(!value)throw new Error(message)};
async function until(c,expression,tries=100){for(let i=0;i<tries;i++){try{if(await c.eval(expression))return}catch{}await wait(120)}throw new Error(`timeout: ${expression}`)}

async function main(){
  const tabs=await(await fetch(`${CDP}/json/list`)).json();
  const c=new Client(tabs[0].webSocketDebuggerUrl);await c.ready();
  await c.send('Page.enable');await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride',{width:1365,height:768,deviceScaleFactor:1,mobile:false});
  await c.send('Page.navigate',{url:URL});await until(c,'typeof rpgLaunch==="function"&&window.__RPG_V5__?.version===5');
  const results=[];
  for(let id=1;id<=5;id++){
    await c.eval(`(()=>{rpgDestroy();const r=ensureRpgState(),n=rpgNode(${id}),l=ensureDailyTask();n.questionSnapshot=l.items.slice(0,10).map(x=>({id:x.id,q:x.q,answerText:x.answerText,chapter:x.chapter,section:x.section,orderPolicy:answerOrderPolicy(x)}));n.questionIds=n.questionSnapshot.map(x=>x.id);r.route.current=${id};r.run=rpgV5FreshRun(n,false);state.view='rpgGame';render()})()`);
    await c.eval('rpgLaunch()');await until(c,'!!__RPG_TEST__.scene()?.player');
    const data=await c.eval(`(()=>{const s=__RPG_TEST__.scene(),map=rpgMap(s.node),souls=s.run.enemies.filter(x=>x.hasSoul),boss=s.run.enemies.find(x=>x.id==='boss');return{node:s.node.id,map:s.node.mapId,mapName:map.name,stage:rpgV5Stage(s.node),platforms:s.platforms.getChildren().length,solids:s.solids.getChildren().length,enemies:s.run.enemies.length,souls:souls.length,bossSoul:boss.hasSoul,blocks:s.blocks.filter(x=>x.active).length,flags:s.checkpoints.getChildren().length,portal:!!s.portal,portalActive:s.portal.active,rooms:(s.roomPortals||[]).length,oldLabels:[...document.querySelectorAll('canvas')].length&&['隐藏画室','奖励修复室','隐藏雕塑室'].some(t=>document.body.innerText.includes(t)),flagOffset:Math.round(s.checkpoints.getChildren()[0].x-s.checkpoints.getChildren()[0].flag.pole.x),bodyBottom:Math.round(s.player.body.bottom)}})()`);
    assert(data.enemies===12,`stage ${id}: enemy count ${data.enemies}`);
    assert(data.souls===10&&data.bossSoul,`stage ${id}: soul allocation invalid`);
    assert(data.platforms>=13&&data.solids>=4,`stage ${id}: level geometry incomplete`);
    assert(data.blocks===10&&data.flags===4&&data.portal,`stage ${id}: interactives incomplete`);
    assert(data.rooms===0&&!data.oldLabels,`stage ${id}: old text room still exists`);
    assert(data.flagOffset>=34,`stage ${id}: starting flag can cover player`);
    assert(Math.abs(data.bodyBottom-480)<=2,`stage ${id}: player is not grounded (${data.bodyBottom})`);
    results.push(data);
  }
  const maps=results.map(x=>x.map);
  assert(new Set(maps).size===5,'five-stage shuffle bag did not use all five maps');
  assert(maps.every((x,i)=>i===0||x!==maps[i-1]),'adjacent stages repeated a map');
  assert(!c.errors.length,`runtime errors: ${c.errors.join(' | ')}`);
  console.log(JSON.stringify({maps:results,errors:c.errors},null,2));c.ws.close();
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
