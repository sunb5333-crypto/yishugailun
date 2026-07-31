/* Phaser 3 横版博物馆关卡。游戏帧循环不触发DOM重绘。 */
const PHASER_GAME_VERSION=1;
const WORLD_WIDTH=5200;
const MODEL_CROPS={
  hero:{x:28,y:255,w:220,h:320},paint:{x:238,y:330,w:225,h:240},frame:{x:450,y:295,w:250,h:280},
  statue:{x:700,y:270,w:195,h:305},guard:{x:880,y:160,w:225,h:420},collector:{x:1080,y:195,w:285,h:385},
  curator:{x:1325,y:125,w:295,h:455},gate:{x:1580,y:135,w:340,h:445},final:{x:1890,y:145,w:280,h:440}
};
let phaserInstance=null,levelScene=null,museumMusicTimer=null,phaserInput={left:false,right:false,jump:false,shoot:false};
function gameDate(){return state.dailyDate||today()}
function dailyGameUnlocked(){return Boolean(ensureDailyTask().done)}
function answerChunks(item){
  const text=String(item.answerText||'').replace(/\s+/g,'');
  let chunks=text.split(/(?<=[，；。])/).map(x=>x.trim()).filter(x=>x.length>1);
  if(chunks.length<3){
    const clean=[...text],size=Math.max(3,Math.ceil(clean.length/4));chunks=[];
    for(let i=0;i<clean.length;i+=size)chunks.push(clean.slice(i,i+size).join(''));
  }
  return chunks.slice(0,6);
}
function dailyFragmentPool(){
  return ensureDailyTask().items.flatMap(item=>answerChunks(item).map((text,index)=>({id:`${item.id}-p${index}`,questionId:item.id,text,index})));
}
function freshPhaserState(){
  const pool=dailyFragmentPool(),rand=seeded(hashText(`${gameDate()}-phaser`));
  const shuffledPool=shuffled(pool,rand);
  const guaranteed=[];for(const item of ensureDailyTask().items){for(const fragment of pool.filter(x=>x.questionId===item.id)){if(guaranteed.length<10&&!guaranteed.includes(fragment.id))guaranteed.push(fragment.id)}if(guaranteed.length>=7)break}
  const initial=[...guaranteed,...shuffledPool.map(x=>x.id).filter(id=>!guaranteed.includes(id))].slice(0,10);
  return{version:PHASER_GAME_VERSION,date:gameDate(),status:'ready',hearts:5,maxHearts:5,hints:3,shield:false,
    inventory:initial,defeated:[],openedBlocks:[],enemyHp:{},
    checkpointX:120,score:0,shots:0,audio:true,battle:null,completedAt:null};
}
function normalizePhaserState(){
  if(!state.phaserGame||state.phaserGame.version!==PHASER_GAME_VERSION||state.phaserGame.date!==gameDate())state.phaserGame=freshPhaserState();
  return state.phaserGame;
}
function getDailyItem(id){return ensureDailyTask().items.find(x=>x.id===id)}
function getDailyFragment(id){return dailyFragmentPool().find(x=>x.id===id)}
function addGameFragments(count,questionId=''){
  const g=normalizePhaserState(),pool=dailyFragmentPool().filter(x=>!g.inventory.includes(x.id));
  const preferred=questionId?pool.filter(x=>x.questionId===questionId):[];
  const rest=pool.filter(x=>!preferred.includes(x));
  [...preferred,...shuffled(rest,seeded(hashText(`${g.score}-${g.inventory.length}`)))].slice(0,count).forEach(x=>g.inventory.push(x.id));
}
function gameStatusCard(){
  const g=normalizePhaserState(),unlocked=dailyGameUnlocked();
  return`<section class="game-home-card ${unlocked?'is-unlocked':'is-locked'}"><div class="game-home-art" aria-hidden="true" style="background:url('assets/art/character-lineup.png') 3% 58%/520% auto no-repeat"></div><div>
  <span class="game-kicker">${unlocked?'今日关卡已解锁':'完成三轮后解锁'}</span><h3>艺术博物馆冒险</h3>
  <p>全屏横版关卡：移动的原创怪物、平台跳跃、问号展柜、答案碎片战斗和5血默写Boss。</p>
  <div class="game-home-stats"><span>♥ 5颗心</span><span>碎片 10个</span><span>？ 10个展柜</span><span>Boss 3个</span></div>
  <button class="primary-btn" onclick="enterDailyGame()" ${unlocked?'':'disabled'}>${g.status==='completed'?'再次挑战':'进入全屏关卡'} →</button></div></section>`;
}
function enterDailyGame(){
  if(!dailyGameUnlocked()){notify('先完成今天10题的三轮练习');return}
  state.view='phaserGame';save();render();
}
function exitPhaserGame(){destroyPhaser();document.body.classList.remove('phaser-mode');state.view='home';save();render()}
function phaserGameView(){
  const g=normalizePhaserState();
  const testPanel=new URLSearchParams(location.search).has('test')?`<div class="museum-test-panel"><button onclick="testGameAction('reset')">测试重置</button><button onclick="testGameAction('move')">测试移动</button><button onclick="testGameAction('jump')">测试跳跃</button><button onclick="testGameAction('shoot')">测试射击</button><button onclick="testGameAction('small')">测试小怪</button><button onclick="testGameAction('block')">测试方块</button><button onclick="testGameAction('medium')">测试中怪</button><button onclick="testGameAction('boss')">测试大怪</button><button onclick="testGameAction('final')">测试终Boss</button></div>`:'';
  return`<div class="phaser-shell"><div id="phaserCanvas" class="phaser-canvas"></div>
  <div class="museum-hud"><span class="hearts" id="phaserHearts">${'♥'.repeat(g.hearts)}</span><span>碎片 <b id="phaserFragments">${g.inventory.length}</b></span><span>提示 <b id="phaserHints">${g.hints}</b></span><span>护盾 <b id="phaserShield">${g.shield?'有':'无'}</b></span><button onclick="toggleGameAudio()">音乐/音效 ${g.audio?'开':'关'}</button><button onclick="exitPhaserGame()">退出</button></div>
  <div class="museum-controls"><div><button data-game-control="left">←</button><button data-game-control="right">→</button></div><div><button class="wide" data-game-control="jump">跳跃</button><button class="wide" data-game-control="shoot">射击</button></div></div>
  <div class="rotate-note"><div><strong>请把手机横过来</strong><p>横屏后进入全屏，才能看清平台、怪物和战斗按钮。</p></div></div>
  <div class="game-start-card" id="gameStartCard"><div><span class="game-kicker">今日展厅 · ${escapeHtml(ensureDailyTask().chapterTitle)}</span><h2>艺术博物馆冒险</h2><p>初始10个答案碎片。方向键或A/D移动，空格跳跃，F射击。击败所有Boss即可通关。</p><div class="game-start-actions"><button class="start" onclick="startMuseumLevel()">进入展厅</button><button class="secondary" onclick="requestMuseumFullscreen()">全屏</button></div></div></div>
  ${testPanel}<div id="phaserBattleHost"></div></div>`;
}
function requestMuseumFullscreen(){const shell=document.querySelector('.phaser-shell');if(shell?.requestFullscreen)shell.requestFullscreen().catch(()=>notify('当前浏览器不允许自动全屏'))}
function toggleGameAudio(){const g=normalizePhaserState();g.audio=!g.audio;if(g.audio&&phaserInstance)startMuseumMusic();else stopMuseumMusic();save();const buttons=[...document.querySelectorAll('.museum-hud button')];const button=buttons.find(x=>x.textContent.startsWith('音乐'));if(button)button.textContent=`音乐/音效 ${g.audio?'开':'关'}`}
function destroyPhaser(){stopMuseumMusic();if(phaserInstance){phaserInstance.destroy(true);phaserInstance=null;levelScene=null}}
function createCroppedModel(scene,key,x,y,height){
  const crop=MODEL_CROPS[key],texture=scene.textures.get('lineup'),frameKey=`model-${key}`;
  if(!texture.has(frameKey))texture.add(frameKey,0,crop.x,crop.y,crop.w,crop.h);
  const image=scene.add.image(0,-height/2,'lineup',frameKey).setDisplaySize(height*crop.w/crop.h,height);
  const box=scene.add.container(x,y,[image]);scene.physics.add.existing(box);box.body.setSize(Math.max(28,height*.38),height*.82).setOffset(-Math.max(28,height*.38)/2,-height*.82);box.model=image;box.modelKey=key;box.modelHeight=height;return box;
}
function beep(freq=440,duration=.08){
  if(!normalizePhaserState().audio)return;try{const ctx=beep.ctx||(beep.ctx=new AudioContext()),o=ctx.createOscillator(),gain=ctx.createGain();o.frequency.value=freq;o.type='square';gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(gain).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)}catch(e){}
}
function startMuseumMusic(){
  stopMuseumMusic();if(!normalizePhaserState().audio)return;
  const notes=[196,247,294,392,330,294,247,220],play=()=>{const note=notes[(startMuseumMusic.step=(startMuseumMusic.step||0)+1)%notes.length];beep(note,.18)};
  play();museumMusicTimer=setInterval(play,520);
}
function stopMuseumMusic(){if(museumMusicTimer){clearInterval(museumMusicTimer);museumMusicTimer=null}}
class MuseumScene extends Phaser.Scene{
  constructor(){super('museum')}
  preload(){this.load.image('lineup','assets/art/character-lineup.png')}
  create(){
    levelScene=this;this.physics.world.setBounds(0,0,WORLD_WIDTH,540);this.cameras.main.setBounds(0,0,WORLD_WIDTH,540).setBackgroundColor('#0b1b2b');
    this.add.rectangle(WORLD_WIDTH/2,270,WORLD_WIDTH,540,0x0b1b2b);
    for(let x=0;x<WORLD_WIDTH;x+=320){this.add.rectangle(x+120,190,150,220,x%640?0x17384b:0x214d5c).setAlpha(.45);this.add.rectangle(x+120,180,92,128,0xc99d4d).setStrokeStyle(6,0x6e4d24).setAlpha(.5)}
    this.platforms=this.physics.add.staticGroup();this.makePlatform(0,510,WORLD_WIDTH,60);[[520,410,260],[980,350,240],[1450,420,300],[2020,330,240],[2520,400,280],[3170,350,250],[3820,410,300],[4400,340,260]].forEach(p=>this.makePlatform(...p,28));
    const game=normalizePhaserState();this.player=createCroppedModel(this,'hero',Math.max(120,game.checkpointX||120),470,78);this.player.body.setCollideWorldBounds(true);this.physics.add.collider(this.player,this.platforms);
    this.cameras.main.startFollow(this.player,true,.1,.1);this.cameras.main.setDeadzone(210,120);
    this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('A,D,F,J,SPACE');
    this.enemies=[];const specs=[
      ['s1','paint',480,460,250,'small'],['s2','frame',860,460,220,'small'],['m1','guard',1260,460,190,'medium'],
      ['s3','statue',1660,460,220,'small'],['s4','paint',2140,290,180,'small'],['b1','curator',2780,460,180,'boss'],
      ['s5','frame',3260,310,210,'small'],['m2','collector',3600,460,180,'medium'],['s6','statue',4050,460,220,'small'],
      ['b2','gate',4480,460,150,'boss'],['bf','final',4950,460,120,'final']
    ];specs.filter(s=>!game.defeated.includes(s[0])).forEach(s=>this.spawnEnemy(...s));
    this.physics.add.collider(this.enemies,this.enemies);
    this.blocks=[];for(let i=0;i<10;i++){const id=`q${i}`;if(!game.openedBlocks.includes(id))this.spawnBlock(650+i*430,260+(i%2)*70,id)}
    this.bullets=this.physics.add.group({allowGravity:false});this.lastShot=0;this.lastDamage=0;this.physics.add.collider(this.bullets,this.platforms,b=>b.destroy());
    if(game.battle)this.time.delayedCall(120,()=>{this.physics.pause();renderPhaserBattle()});
  }
  makePlatform(x,y,w,h=28){const r=this.add.rectangle(x+w/2,y,w,h,0x9b7440).setStrokeStyle(4,0xd5b56d);this.physics.add.existing(r,true);this.platforms.add(r);return r}
  spawnEnemy(id,key,x,y,patrol,type){
    const e=createCroppedModel(this,key,x,y,type==='small'?62:type==='medium'?84:118);e.id=id;e.enemyType=type;e.spawnX=x;e.patrol=patrol;e.hp=type==='medium'?1:type==='boss'?4:type==='final'?5:1;e.body.setVelocityX(-55);e.body.setCollideWorldBounds(true);this.physics.add.collider(e,this.platforms);this.physics.add.overlap(this.player,e,()=>this.touchEnemy(e));this.enemies.push(e)
  }
  spawnBlock(x,y,id){const block=this.add.rectangle(x,y,48,48,0xd5b56d).setStrokeStyle(4,0x6e4d24);const mark=this.add.text(x,y,'?',{font:'900 30px monospace',color:'#102331'}).setOrigin(.5);this.physics.add.existing(block,true);block.blockId=id;block.mark=mark;this.blocks.push(block)}
  update(time){
    if(!this.player?.body||normalizePhaserState().battle)return;
    const left=this.cursors.left.isDown||this.keys.A.isDown||phaserInput.left,right=this.cursors.right.isDown||this.keys.D.isDown||phaserInput.right;
    this.player.body.setVelocityX(left?-210:right?210:0);if(left)this.player.model.setFlipX(true);if(right)this.player.model.setFlipX(false);
    if((Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||phaserInput.jump)&&this.player.body.blocked.down){this.player.body.setVelocityY(-390);beep(620)}phaserInput.jump=false;
    if(Phaser.Input.Keyboard.JustDown(this.keys.F)||Phaser.Input.Keyboard.JustDown(this.keys.J)||phaserInput.shoot){this.shoot(time)}phaserInput.shoot=false;
    this.enemies.forEach(e=>{if(!e.active)return;if(Math.abs(e.x-e.spawnX)>e.patrol)e.body.setVelocityX(e.x>e.spawnX?-Math.abs(e.body.velocity.x||55):Math.abs(e.body.velocity.x||55));if(e.enemyType!=='small'&&Math.abs(this.player.x-e.x)<230)e.body.setVelocityX(this.player.x<e.x?-75:75);e.model.setFlipX(e.body.velocity.x>0);e.model.y=Math.sin(time/180+e.x)*2-e.modelHeight/2});
    const g=normalizePhaserState();if(this.player.x>g.checkpointX+480){g.checkpointX=Math.floor(this.player.x/480)*480;save()}
    this.blocks.forEach(b=>{if(!b.active)return;if(Math.abs(this.player.x-b.x)<36&&this.player.y>b.y&&this.player.y-b.y<100&&this.player.body.velocity.y<0)this.openBlock(b)});
  }
  shoot(time){if(time-this.lastShot<260)return;this.lastShot=time;const dir=this.player.model.flipX?-1:1,b=this.add.rectangle(this.player.x+dir*34,this.player.y-42,18,8,0x70e5ff);this.physics.add.existing(b);b.body.setAllowGravity(false).setVelocityX(dir*520);this.bullets.add(b);this.enemies.forEach(e=>this.physics.add.overlap(b,e,()=>this.hitEnemy(b,e)));beep(820)}
  hitEnemy(b,e){if(!b.active||!e.active)return;b.destroy();if(e.enemyType==='small'){this.defeatEnemy(e,1+((normalizePhaserState().score+e.x)%2|0));return}this.beginBattle(e)}
  touchEnemy(e){if(Date.now()-this.lastDamage<1800)return;if(e.enemyType!=='small'){this.beginBattle(e);return}this.damagePlayer('碰到怪物',e)}
  damagePlayer(reason,enemy){this.lastDamage=Date.now();const g=normalizePhaserState();if(g.shield){g.shield=false;beep(220);return}g.hearts--;beep(120,.18);this.player.setAlpha(.35);this.player.body.setVelocityX(enemy&&this.player.x<enemy.x?-260:260);this.player.body.setVelocityY(-210);this.time.delayedCall(900,()=>this.player?.setAlpha(1));if(g.hearts<=0){g.status='failed';showGameResult(false)}updateMuseumHud();save()}
  defeatEnemy(e,count){const g=normalizePhaserState();g.defeated.push(e.id);g.score+=10;addGameFragments(count);e.destroy();beep(980);updateMuseumHud();save()}
  openBlock(b){const g=normalizePhaserState();g.openedBlocks.push(b.blockId);const reward=(g.openedBlocks.length+hashText(gameDate()))%4;if(reward===0)g.hearts=Math.min(5,g.hearts+1);if(reward===1)g.shield=true;if(reward===2)g.hints++;if(reward===3)addGameFragments(3);b.mark.destroy();b.destroy();beep(700);updateMuseumHud();save()}
  beginBattle(e){const g=normalizePhaserState();if(g.battle)return;if(e.enemyType==='final'&&(!g.defeated.includes('b1')||!g.defeated.includes('b2'))){notify('先击败两位展厅守关者，终Boss才会接受挑战');this.player.body.setVelocityX(-280);beep(150,.18);return}this.physics.pause();openPhaserBattle(e)}
}
function updateMuseumHud(){const g=normalizePhaserState(),h=document.getElementById('phaserHearts'),f=document.getElementById('phaserFragments'),tips=document.getElementById('phaserHints'),shield=document.getElementById('phaserShield');if(h)h.textContent='♥'.repeat(g.hearts);if(f)f.textContent=g.inventory.length;if(tips)tips.textContent=g.hints;if(shield)shield.textContent=g.shield?'有':'无'}
function startMuseumLevel(){
  document.getElementById('gameStartCard')?.remove();if(phaserInstance)return;
  const g=normalizePhaserState();if(g.status==='failed')state.phaserGame=freshPhaserState();normalizePhaserState().status='playing';save();
  phaserInstance=new Phaser.Game({type:Phaser.AUTO,parent:'phaserCanvas',width:960,height:540,pixelArt:true,roundPixels:true,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:900},debug:false}},scene:[MuseumScene]});
  bindMuseumControls();startMuseumMusic();
}
function bindMuseumControls(){document.querySelectorAll('[data-game-control]').forEach(btn=>{const key=btn.dataset.gameControl;btn.onpointerdown=e=>{e.preventDefault();phaserInput[key]=true};btn.onpointerup=btn.onpointercancel=btn.onpointerleave=()=>{if(key==='left'||key==='right')phaserInput[key]=false}})}
function openPhaserBattle(enemy){
  const g=normalizePhaserState(),items=ensureDailyTask().items,seed=hashText(`${enemy.id}-${gameDate()}`),count=enemy.enemyType==='medium'?1:enemy.hp;
  const held=new Set(g.inventory.map(getDailyFragment).filter(Boolean).map(x=>x.text));
  const ranked=[...items].sort((a,b)=>answerChunks(b).filter(x=>held.has(x)).length-answerChunks(a).filter(x=>held.has(x)).length);
  const ids=Array.from({length:count},(_,i)=>(ranked[i%ranked.length]||items[(seed+i)%items.length]).id);
  g.battle={enemyId:enemy.id,type:enemy.enemyType,hp:enemy.hp,maxHp:enemy.hp,questionIds:ids,index:0,selected:[],feedback:null};save();updateMuseumHud();renderPhaserBattle()
}
function currentPhaserBattleItem(){const b=normalizePhaserState().battle;return b?getDailyItem(b.questionIds[b.index]):null}
function renderPhaserBattle(){
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem(),host=document.getElementById('phaserBattleHost');if(!host||!b||!item)return;
  const chunks=answerChunks(item),selected=b.selected||[],dictation=b.type==='final';
  const slots=chunks.map((_,i)=>`<button class="answer-slot" onclick="removePhaserFragment(${i})">${escapeHtml(selected[i]?.text||'第'+(i+1)+'部分')}</button>`).join('');
  const fragments=g.inventory.map(getDailyFragment).filter(Boolean).map(f=>`<button class="${selected.some(x=>x.id===f.id)?'used':''}" onclick="pickPhaserFragment('${f.id}')">${escapeHtml(f.text)}</button>`).join('');
  host.innerHTML=`<div class="phaser-battle"><div class="battle-window"><div class="battle-top"><div class="battle-portrait hero"></div><div class="battle-question"><small>${escapeHtml(item.chapter)} · ${item.orderPolicy==='free'?'顺序不限':'按语意顺序'}</small><h2>${escapeHtml(item.q)}</h2><div>敌人生命 ${'◆'.repeat(b.hp)}</div></div><div class="battle-portrait enemy"></div></div>
  ${dictation?`<textarea id="phaserDictation" class="dictation-box" placeholder="写出完整意思，不要求逐字相同。"></textarea>`:`<div class="answer-slots">${slots}</div><div class="answer-fragments">${fragments}</div>`}
  <div class="battle-feedback ${b.feedback?.correct?'good':'bad'}">${escapeHtml(b.feedback?.message||'')}</div><div class="battle-actions"><button onclick="retreatPhaserBattle()">暂时撤退</button><button onclick="usePhaserHint()">提示 ${g.hints}</button>${new URLSearchParams(location.search).has('test')?'<button onclick="testFillBattle()">测试填入正确答案</button>':''}<button class="attack" onclick="submitPhaserAttack()">提交攻击</button></div></div></div>`;
}
function pickPhaserFragment(id){const b=normalizePhaserState().battle,f=getDailyFragment(id),item=currentPhaserBattleItem();if(!b||!f||b.selected.some(x=>x.id===id)||b.selected.length>=answerChunks(item).length)return;b.selected.push(f);renderPhaserBattle()}
function removePhaserFragment(index){const b=normalizePhaserState().battle;if(!b)return;b.selected.splice(index,1);renderPhaserBattle()}
function normalizedMeaning(text){return String(text||'').replace(/[，。；、！？\s]/g,'').replace(/艺术/g,'').toLowerCase()}
function submitPhaserAttack(){
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem(),expected=answerChunks(item);if(!b||!item)return;
  let correct=false;
  if(b.type==='final'){const draft=document.getElementById('phaserDictation')?.value||'',normalizedDraft=normalizedMeaning(draft),normalizedAnswer=normalizedMeaning(item.answerText),tokens=String(item.keywords||'').split(/[｜|、，；]/).filter(x=>x.length>1);correct=normalizedDraft===normalizedAnswer||(normalizedDraft.length>=8&&(tokens.length?tokens.filter(x=>normalizedDraft.includes(normalizedMeaning(x))).length>=Math.min(2,tokens.length):normalizedDraft.length>=normalizedAnswer.length*.45))}
  else{const got=b.selected.map(x=>x.text);correct=got.length===expected.length&&(item.orderPolicy==='free'?[...got].sort().join('|')===[...expected].sort().join('|'):got.every((x,i)=>x===expected[i]))}
  if(correct){b.hp--;b.feedback={correct:true,message:'✓ 答案成立，攻击命中'};beep(1050);if(b.hp<=0){finishPhaserEnemy(b.enemyId,b.type);return}b.index=Math.min(b.index+1,b.questionIds.length-1);b.selected=[]}
  else{b.feedback={correct:false,message:'× 意思或结构不完整，敌人反击'};beep(130,.2);if(g.shield)g.shield=false;else g.hearts--;if(g.hearts<=0){g.battle=null;showGameResult(false);return}}
  save();renderPhaserBattle();updateMuseumHud()
}
function finishPhaserEnemy(id,type){const g=normalizePhaserState(),enemy=levelScene?.enemies.find(x=>x.id===id);g.defeated.push(id);g.score+=type==='final'?100:type==='boss'?50:20;addGameFragments(type==='medium'?3:5);g.battle=null;enemy?.destroy();document.getElementById('phaserBattleHost').innerHTML='';levelScene?.physics.resume();updateMuseumHud();save();if(type==='final')showGameResult(true)}
function retreatPhaserBattle(){normalizePhaserState().battle=null;document.getElementById('phaserBattleHost').innerHTML='';levelScene?.physics.resume();save()}
function usePhaserHint(){const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item||g.hints<=0)return;g.hints--;const needed=answerChunks(item).find(text=>!b.selected.some(x=>x.text===text)),f=dailyFragmentPool().find(x=>x.questionId===item.id&&x.text===needed);if(f&&!g.inventory.includes(f.id))g.inventory.push(f.id);b.feedback={correct:true,message:`提示：答案中包含“${needed}”`};save();renderPhaserBattle()}
function showGameResult(success){const g=normalizePhaserState();levelScene?.physics.pause();stopMuseumMusic();if(success){g.status='completed';g.completedAt=new Date().toISOString();state.xp+=120}else g.status='failed';save();const shell=document.querySelector('.phaser-shell');if(shell)shell.insertAdjacentHTML('beforeend',`<div class="game-result-card"><div><h2>${success?'展厅通关':'挑战失败'}</h2><p>${success?'三个Boss已经击败，今日学习与游戏进度已保存。':'学习记录不会清空，可以重新挑战，学习进度仍然保留。'}</p><div class="game-start-actions"><button class="start" onclick="${success?'exitPhaserGame()':'restartMuseumLevel()'}">${success?'返回航线':'重新挑战'}</button></div></div></div>`)}
function restartMuseumLevel(){destroyPhaser();state.phaserGame=freshPhaserState();save();render()}
function testGameAction(action){
  if(!new URLSearchParams(location.search).has('test'))return;
  if(action==='reset'){restartMuseumLevel();return}
  if(action==='move'){phaserInput.right=true;setTimeout(()=>phaserInput.right=false,900);return}
  if(action==='jump'||action==='shoot'){phaserInput[action]=true;return}
  if(action==='small'){const enemy=levelScene?.enemies.find(x=>x.active&&x.enemyType==='small');if(enemy&&levelScene?.player){levelScene.player.setPosition(enemy.x-86,enemy.y);levelScene.player.model.setFlipX(false);phaserInput.shoot=true}return}
  if(action==='block'){const block=levelScene?.blocks.find(x=>x.active);if(block)levelScene.openBlock(block);return}
  const type=action==='final'?'final':action==='boss'?'boss':'medium',enemy=levelScene?.enemies.find(x=>x.active&&x.enemyType===type);if(enemy)levelScene.beginBattle(enemy);
}
function testFillBattle(){
  if(!new URLSearchParams(location.search).has('test'))return;
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item)return;
  if(b.type==='final'){const box=document.getElementById('phaserDictation');if(box)box.value=item.answerText;return}
  b.selected=answerChunks(item).map(text=>{let fragment=dailyFragmentPool().find(x=>x.questionId===item.id&&x.text===text);if(fragment&&!g.inventory.includes(fragment.id))g.inventory.push(fragment.id);return fragment}).filter(Boolean);save();renderPhaserBattle();updateMuseumHud();
}
if(['127.0.0.1','localhost'].includes(location.hostname)){
  window.__REVISION_TEST__={
    snapshot:()=>({game:{...normalizePhaserState(),inventory:[...normalizePhaserState().inventory]},player:levelScene?.player?{x:levelScene.player.x,y:levelScene.player.y}:null,
      enemies:levelScene?.enemies?.filter(x=>x.active).map(x=>({id:x.id,type:x.enemyType,x:x.x,y:x.y}))||[],blocks:levelScene?.blocks?.filter(x=>x.active).length||0}),
    hold:(direction,ms=500)=>new Promise(resolve=>{phaserInput[direction]=true;setTimeout(()=>{phaserInput[direction]=false;resolve()},ms)}),
    action:(name)=>{phaserInput[name]=true},
    teleport:(x,y=450)=>{if(levelScene?.player){levelScene.player.setPosition(x,y);levelScene.player.body.setVelocity(0,0)}},
    battle:(id)=>{const enemy=levelScene?.enemies.find(x=>x.active&&x.id===id);if(enemy)levelScene.beginBattle(enemy)},
    reset:()=>restartMuseumLevel()
  };
}
const renderBeforePhaser=render;
render=function(){
  if(state.view!=='phaserGame'){document.body.classList.remove('phaser-mode');destroyPhaser();renderBeforePhaser();return}
  document.body.classList.add('phaser-mode');content.innerHTML=phaserGameView();requestAnimationFrame(()=>{if(normalizePhaserState().status==='playing')startMuseumLevel()})
};
ensureDailyTask();normalizePhaserState();render();
