const fs=require('fs');
const CDP='http://127.0.0.1:9223';
const URL='http://127.0.0.1:4175/index.html?game-test=1&v=54&visual-v6=1';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Client{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}
  async ready(){await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject})}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
}
async function until(client,expression){for(let i=0;i<100;i++){try{if(await client.eval(expression))return}catch{}await wait(120)}throw new Error(`timeout: ${expression}`)}
async function shot(client,name){const r=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(name,Buffer.from(r.data,'base64'))}
async function main(){
  const tabs=await(await fetch(`${CDP}/json/list`)).json(),client=new Client(tabs[0].webSocketDebuggerUrl);await client.ready();await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:URL});await until(client,'window.__RPG_V5__?.version===6');await client.eval('rpgLaunch()');await until(client,'!!__RPG_TEST__.scene()?.player');await wait(600);await shot(client,'test-rpg-v6-start.png');
  await client.eval('rpgInput.jump=true');await wait(170);await client.eval('rpgInput.jump=true');await wait(180);await shot(client,'test-rpg-v6-double-jump.png');await wait(1500);await shot(client,'test-rpg-v6-landed.png');
  const state=await client.eval('(()=>{const s=__RPG_TEST__.scene();return{version:__RPG_V5__.version,frame:Number(s.player.frame.name),bottom:s.player.body.bottom,velocityY:s.player.body.velocity.y,texture:s.player.texture.key}})()');console.log(JSON.stringify(state,null,2));client.ws.close();
}
main().catch(error=>{console.error(error.stack||error);process.exit(1)});
