/* 艺术博物馆关卡第二版：动画角色、语义碎片、可恢复战斗与双向受击反馈。 */
const PHASER_GAME_VERSION=4;
const WORLD_WIDTH=5200;
const GAME_VIEW_WIDTH=960;
const GAME_VIEW_HEIGHT=540;
const BULLET_RANGE=480;
let phaserInstance=null,levelScene=null,museumMusicTimer=null,testPhaserState=null;
let phaserInput={left:false,right:false,jump:false,shoot:false};

function isGameTestMode(){return new URLSearchParams(location.search).has('game-test')}
function persistPhaserState(){if(!isGameTestMode())save()}
function gameDate(){return state.dailyDate||today()}
function dailyGameUnlocked(){return isGameTestMode()||Boolean(ensureDailyTask().done)}
function dailyItems(){return ensureDailyTask().items.slice(0,10)}
function dailyFragmentPool(){return gameV2FragmentPool(dailyItems())}
function answerChunks(item){return gameV2SemanticSegments(item)}
function getDailyItem(id){return dailyItems().find(x=>x.id===id)}
function getDailyFragment(id){return dailyFragmentPool().find(x=>x.id===id)}

function freshPhaserState(){
  const items=dailyItems(),plan=gameV2BuildPlan(items,gameDate(),gameV2WeakQuestionIds());
  return{version:PHASER_GAME_VERSION,date:gameDate(),status:'ready',hearts:5,maxHearts:5,hints:3,shield:false,
    inventory:gameV2InitialInventory(items,plan),defeated:[],openedBlocks:[],enemyBattles:{},plan,
    checkpointX:120,score:0,shots:0,battleSerial:0,audio:true,battle:null,completedAt:null};
}

function migratePhaserState(previous){
  const fresh=freshPhaserState(),valid=new Set(dailyFragmentPool().map(x=>x.id));
  const kept=(previous?.inventory||[]).filter(id=>valid.has(id));
  return{...fresh,...previous,version:PHASER_GAME_VERSION,date:gameDate(),plan:fresh.plan,
    inventory:[...new Set([...kept,...fresh.inventory])].slice(0,Math.max(10,kept.length)),
    enemyBattles:previous?.enemyBattles||{},battle:null};
}

function normalizePhaserState(){
  if(isGameTestMode()){
    if(!testPhaserState||testPhaserState.date!==gameDate())testPhaserState=freshPhaserState();
    else if(testPhaserState.version!==PHASER_GAME_VERSION)testPhaserState=migratePhaserState(testPhaserState);
    return testPhaserState;
  }
  if(!state.phaserGame||state.phaserGame.date!==gameDate())state.phaserGame=freshPhaserState();
  else if(state.phaserGame.version!==PHASER_GAME_VERSION)state.phaserGame=migratePhaserState(state.phaserGame);
  return state.phaserGame;
}

function addGameFragments(count,questionId=''){
  const g=normalizePhaserState(),pool=dailyFragmentPool().filter(x=>!g.inventory.includes(x.id));
  const preferred=questionId?pool.filter(x=>x.questionId===questionId):[];
  const rest=pool.filter(x=>!preferred.includes(x));
  [...preferred,...shuffled(rest,seeded(hashText(`${gameDate()}-${g.score}-${g.inventory.length}`)))]
    .slice(0,count).forEach(x=>g.inventory.push(x.id));
}

function gameStatusCard(){
  const g=normalizePhaserState(),unlocked=dailyGameUnlocked();
  return`<section class="game-home-card ${unlocked?'is-unlocked':'is-locked'}"><div class="game-home-art museum-v2-cover" aria-hidden="true"></div><div>
  <span class="game-kicker">${unlocked?'今日关卡已解锁':'完成三轮后解锁'}</span><h3>艺术博物馆 · 第二版</h3>
  <p>每日10题组成当天唯一关卡。奔跑、跳跃和射击收集语义答案碎片，再击败两名中怪、两名馆主和5血默写Boss。</p>
  <div class="game-home-stats"><span>♥ 5颗心</span><span>碎片 10个</span><span>？ 10个展柜</span><span>每日10题</span></div>
  <button class="primary-btn" onclick="enterDailyGame()" ${unlocked?'':'disabled'}>${g.status==='completed'?'再次挑战':'进入全屏关卡'} →</button></div></section>`;
}

function enterDailyGame(){if(!dailyGameUnlocked()){notify('先完成今天10题的三轮练习');return}state.view='phaserGame';save();render()}
function exitPhaserGame(){destroyPhaser();document.body.classList.remove('phaser-mode');if(isGameTestMode()){location.assign(`${location.pathname}?v=13`);return}state.view='home';save();render()}

function phaserGameView(){
  const g=normalizePhaserState(),testing=isGameTestMode(),lesson=ensureDailyTask(),theme=gameV2ThemeForLesson(lesson);
  const testPanel=testing?`<div class="museum-test-panel"><span>测试工具</span><button onclick="testGameAction('reset')">重置</button><button onclick="testGameAction('move')">移动</button><button onclick="testGameAction('jump')">跳跃</button><button onclick="testGameAction('shoot')">射击</button><button onclick="testGameAction('small')">小怪</button><button onclick="testGameAction('block')">方块</button><button onclick="testGameAction('medium')">中怪</button><button onclick="testGameAction('boss')">大怪</button><button onclick="testGameAction('final')">终Boss</button></div>`:'';
  return`<div class="phaser-shell"><div id="phaserCanvas" class="phaser-canvas"></div>
  <div class="museum-hud">${testing?'<span class="test-mode-badge">独立测试 · 不保存正式进度</span>':''}<span class="hearts" id="phaserHearts">${'♥'.repeat(g.hearts)} <b>${g.hearts}/${g.maxHearts}</b></span><span>碎片 <b id="phaserFragments">${g.inventory.length}</b></span><span>提示 <b id="phaserHints">${g.hints}</b></span><span>护盾 <b id="phaserShield">${g.shield?'有':'无'}</b></span><button onclick="toggleGameAudio()">音乐/音效 ${g.audio?'开':'关'}</button><button onclick="exitPhaserGame()">${testing?'返回学习':'退出'}</button></div>
  <div class="museum-controls"><div><button data-game-control="left" aria-label="向左">←</button><button data-game-control="right" aria-label="向右">→</button></div><div><button class="wide" data-game-control="jump">跳跃</button><button class="wide" data-game-control="shoot">射击</button></div></div>
  <div class="rotate-note"><div><strong>请把手机横过来</strong><p>横屏后进入全屏，才能看清平台、怪物和战斗按钮。</p></div></div>
  <div class="game-start-card" id="gameStartCard"><div><span class="game-kicker">${testing?'独立测试关卡':`今日展厅 · ${escapeHtml(theme.name)}`}</span><h2>艺术博物馆 · 第二版</h2><p>${testing?'测试生命、碎片、战斗和通关结果，不会写入正式学习进度。':'今天10题已经编入本关。'} A/D或方向键移动，空格跳跃，F射击；手机使用屏幕按钮。只有子弹击中中怪和Boss才会开始答题。</p><div class="game-start-actions"><button class="start" onclick="startMuseumLevel()">${testing?'开始测试':'进入展厅'}</button><button class="secondary" onclick="requestMuseumFullscreen()">全屏</button></div></div></div>
  ${testPanel}<div id="phaserBattleHost"></div></div>`;
}

function requestMuseumFullscreen(){const shell=document.querySelector('.phaser-shell');if(shell?.requestFullscreen)shell.requestFullscreen().catch(()=>notify('当前浏览器不允许自动全屏'))}
function toggleGameAudio(){const g=normalizePhaserState();g.audio=!g.audio;if(g.audio&&phaserInstance)startMuseumMusic();else stopMuseumMusic();persistPhaserState();renderMuseumHud()}
function destroyPhaser(){stopMuseumMusic();if(phaserInstance){phaserInstance.destroy(true);phaserInstance=null;levelScene=null}}
function beep(freq=440,duration=.08){if(!normalizePhaserState().audio)return;try{const ctx=beep.ctx||(beep.ctx=new AudioContext()),o=ctx.createOscillator(),gain=ctx.createGain();o.frequency.value=freq;o.type='square';gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(gain).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)}catch(e){}}
function startMuseumMusic(){stopMuseumMusic();if(!normalizePhaserState().audio)return;const notes=[196,247,294,392,330,294,247,220],play=()=>beep(notes[(startMuseumMusic.step=(startMuseumMusic.step||0)+1)%notes.length],.18);play();museumMusicTimer=setInterval(play,560)}
function stopMuseumMusic(){if(museumMusicTimer){clearInterval(museumMusicTimer);museumMusicTimer=null}}

function ensureAnimations(scene){
  const create=(key,texture,frames,rate=8,repeat=-1)=>{if(!scene.anims.exists(key))scene.anims.create({key,frames:frames.map(frame=>({key:texture,frame})),frameRate:rate,repeat})};
  create('hero-idle','hero-v2',[0,1,2,3,4,5],5);create('hero-run','hero-v2',[6,7,8,9,10,11],11);create('hero-shoot','hero-v2',[15,16,17],12,0);
  for(const row of [0,1,2,3])for(const texture of ['enemy-v2','boss-v2']){const p=`${texture}-${row}`,b=row*6;create(`${p}-idle`,texture,[b,b+1],4);create(`${p}-walk`,texture,[b+2,b+3],7);}
}

function createChapterBackground(scene){
  const theme=gameV2ThemeForLesson(ensureDailyTask()),panel=theme.panel,key=`chapter-panel-${panel}`;
  if(!scene.textures.exists(key)){
    const source=scene.textures.get('chapter-backgrounds').getSourceImage(),w=512,h=panel>=6?342:341,x=(panel%3)*512,y=Math.floor(panel/3)*341;
    const tex=scene.textures.createCanvas(key,w,h),ctx=tex.context;ctx.drawImage(source,x,y,w,h,0,0,w,h);tex.refresh();
  }
  scene.add.image(480,270,key).setDisplaySize(960,540).setScrollFactor(0).setDepth(-20);
  scene.add.rectangle(480,270,960,540,0x06101b,.25).setScrollFactor(0).setDepth(-19);
  for(let i=0;i<18;i++){
    const mote=scene.add.circle((i*83)%960,70+(i*47)%390,1+(i%3),theme.accent,.24).setScrollFactor(0).setDepth(-18);
    scene.tweens.add({targets:mote,y:mote.y-35-(i%4)*8,alpha:{from:.1,to:.55},duration:2400+(i%5)*400,yoyo:true,repeat:-1,delay:i*120});
  }
}

class MuseumScene extends Phaser.Scene{
  constructor(){super('museum')}
  preload(){
    this.load.spritesheet('hero-v2','assets/art/hero-sprites-v2.png',{frameWidth:256,frameHeight:256});
    this.load.spritesheet('enemy-v2','assets/art/enemy-sprites-v2.png',{frameWidth:256,frameHeight:256});
    this.load.spritesheet('boss-v2','assets/art/boss-sprites-v2.png',{frameWidth:256,frameHeight:256});
    this.load.image('chapter-backgrounds','assets/art/chapter-backgrounds-v2.png');
  }
  create(){
    levelScene=this;ensureAnimations(this);createChapterBackground(this);
    this.physics.world.setBounds(0,0,WORLD_WIDTH,GAME_VIEW_HEIGHT);this.cameras.main.setBounds(0,0,WORLD_WIDTH,GAME_VIEW_HEIGHT).setBackgroundColor('#0b1b2b');
    this.platforms=this.physics.add.staticGroup();this.makePlatform(0,510,WORLD_WIDTH,60);
    [[430,422,230],[760,338,230],[1110,414,260],[1510,326,240],[1890,406,250],[2290,318,230],[2680,406,280],[3140,322,250],[3540,410,280],[3980,326,240],[4360,406,260],[4750,326,230]].forEach(p=>this.makePlatform(...p,24));
    const g=normalizePhaserState();
    this.player=this.physics.add.sprite(Math.max(120,g.checkpointX||120),450,'hero-v2',0).setScale(.42).setDepth(12);
    this.player.body.setSize(82,154).setOffset(87,78).setCollideWorldBounds(true);this.player.play('hero-idle');
    this.physics.add.collider(this.player,this.platforms);this.cameras.main.startFollow(this.player,true,.1,.1).setDeadzone(210,110);
    this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('A,D,F,J,SPACE');this.lastShot=0;this.lastDamage=0;this.lastGrounded=0;this.jumpBuffered=0;
    this.enemyGroup=this.physics.add.group();this.enemies=[];
    const specs=[['s1',0,470,450,170,'small'],['s2',1,850,450,160,'small'],['m1',0,1260,450,150,'medium'],['s3',1,1660,450,170,'small'],['s4',0,2110,270,120,'small'],['b1',0,2720,440,150,'boss'],['s5',1,3240,275,120,'small'],['m2',1,3630,450,160,'medium'],['s6',0,4090,450,160,'small'],['b2',1,4510,440,130,'boss'],['bf',2,5000,435,90,'final']];
    specs.filter(s=>!g.defeated.includes(s[0])).forEach(s=>this.spawnEnemy(...s));this.physics.add.collider(this.enemyGroup,this.platforms);this.physics.add.collider(this.enemyGroup,this.enemyGroup);
    this.blocks=[];for(let i=0;i<10;i++){const id=`q${i}`;if(!g.openedBlocks.includes(id))this.spawnBlock(610+i*440,245+(i%2)*78,id)}
    this.bullets=this.physics.add.group({allowGravity:false});this.physics.add.collider(this.bullets,this.platforms,b=>b.destroy());
    if(g.battle)this.time.delayedCall(120,()=>{this.physics.pause();renderPhaserBattle()});
  }
  makePlatform(x,y,w,h=24){const r=this.add.rectangle(x+w/2,y,w,h,0x9a7241).setStrokeStyle(3,0xe1ba68).setDepth(2);this.physics.add.existing(r,true);this.platforms.add(r);return r}
  spawnEnemy(id,row,x,y,patrol,type){
    const texture=type==='boss'||type==='final'?'boss-v2':'enemy-v2',scale=type==='small'?.3:type==='medium'?.38:.48,e=this.physics.add.sprite(x,y,texture,row*6).setScale(scale).setDepth(10);
    e.id=id;e.row=row;e.animPrefix=`${texture}-${row}`;e.enemyType=type;e.spawnX=x;e.patrol=patrol;e.retreatLocked=false;e.lockUntil=0;
    e.body.setSize(type==='small'?100:112,type==='small'?135:165).setOffset(72,65).setCollideWorldBounds(true).setVelocityX(-55);e.play(`${e.animPrefix}-walk`);
    this.enemyGroup.add(e);this.enemies.push(e);this.physics.add.overlap(this.player,e,()=>this.touchEnemy(e));return e;
  }
  spawnBlock(x,y,id){const block=this.add.rectangle(x,y,46,46,0xd8b763).setStrokeStyle(4,0x68491f).setDepth(6);const mark=this.add.text(x,y,'?',{font:'900 28px monospace',color:'#102331'}).setOrigin(.5).setDepth(7);this.physics.add.existing(block,true);block.blockId=id;block.mark=mark;this.blocks.push(block)}
  update(time){
    const g=normalizePhaserState();if(!this.player?.body||g.battle)return;
    const grounded=this.player.body.blocked.down||this.player.body.touching.down;if(grounded)this.lastGrounded=time;
    const left=this.cursors.left.isDown||this.keys.A.isDown||phaserInput.left,right=this.cursors.right.isDown||this.keys.D.isDown||phaserInput.right;
    const speed=225;this.player.setVelocityX(left?-speed:right?speed:0);if(left)this.player.setFlipX(true);if(right)this.player.setFlipX(false);
    if(Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||phaserInput.jump)this.jumpBuffered=time;
    phaserInput.jump=false;if(time-this.jumpBuffered<=120&&time-this.lastGrounded<=120){this.player.setVelocityY(-470);this.jumpBuffered=0;this.player.setFrame(12);beep(620)}
    if(!grounded)this.player.setFrame(this.player.body.velocity.y<0?12:13);else if(left||right){if(this.player.anims.currentAnim?.key!=='hero-run')this.player.play('hero-run')}else if(this.player.anims.currentAnim?.key!=='hero-idle')this.player.play('hero-idle');
    if(Phaser.Input.Keyboard.JustDown(this.keys.F)||Phaser.Input.Keyboard.JustDown(this.keys.J)||phaserInput.shoot)this.shoot(time);phaserInput.shoot=false;
    for(const e of this.enemies){if(!e.active)continue;if(e.retreatLocked&&time>e.lockUntil&&Math.abs(this.player.x-e.x)>150)e.retreatLocked=false;const chase=e.enemyType!=='small'&&Math.abs(this.player.x-e.x)<250;let vx=e.body.velocity.x||55;if(chase)vx=this.player.x<e.x?-74:74;else if(Math.abs(e.x-e.spawnX)>e.patrol)vx=e.x>e.spawnX?-Math.abs(vx):Math.abs(vx);e.setVelocityX(vx);e.setFlipX(vx>0);if(e.anims.currentAnim?.key!==`${e.animPrefix}-walk`)e.play(`${e.animPrefix}-walk`)}
    for(const b of [...this.bullets.getChildren()])if(b.active&&Math.abs(b.x-b.originX)>BULLET_RANGE)b.destroy();
    if(this.player.x>g.checkpointX+480){g.checkpointX=Math.floor(this.player.x/480)*480;persistPhaserState()}
    for(const b of this.blocks)if(b.active&&Math.abs(this.player.x-b.x)<38&&this.player.y>b.y&&this.player.y-b.y<105&&this.player.body.velocity.y<0)this.openBlock(b);
  }
  shoot(time){
    if(time-this.lastShot<280)return;this.lastShot=time;this.player.play('hero-shoot',true);const dir=this.player.flipX?-1:1,b=this.add.rectangle(this.player.x+dir*36,this.player.y-28,20,8,0x72e6ff).setDepth(11);this.physics.add.existing(b);b.body.setAllowGravity(false).setVelocityX(dir*570);b.originX=b.x;this.bullets.add(b);for(const e of this.enemies)this.physics.add.overlap(b,e,()=>this.hitEnemy(b,e));normalizePhaserState().shots++;beep(820)
  }
  hitEnemy(b,e){if(!b.active||!e.active)return;b.destroy();if(e.retreatLocked){beep(180);return}if(e.enemyType==='small'){this.defeatEnemy(e,1+(Math.abs(hashText(`${e.id}-${gameDate()}`))%2));return}this.beginBattle(e)}
  touchEnemy(e){if(Date.now()-this.lastDamage<1500)return;this.damagePlayer('碰到怪物',e)}
  damagePlayer(reason,enemy){
    this.lastDamage=Date.now();const g=normalizePhaserState();if(g.shield){g.shield=false;this.player.setFrame(21);beep(260,.18)}else{g.hearts--;this.player.setFrame(19);this.player.setTint(0xff5757);beep(120,.2)}
    this.player.setVelocityX(enemy&&this.player.x<enemy.x?-285:285).setVelocityY(-230);this.time.delayedCall(560,()=>this.player?.clearTint());if(g.hearts<=0){g.status='failed';showGameResult(false)}renderMuseumHud();persistPhaserState();
  }
  defeatEnemy(e,count){const g=normalizePhaserState();if(!g.defeated.includes(e.id))g.defeated.push(e.id);g.score+=10;const nextId=gameV2NextQuestionId(g);addGameFragments(count,nextId);e.setVelocity(0,0).setTint(0xffffff).setAlpha(.9);e.setFrame(e.row*6+5);this.tweens.add({targets:e,alpha:0,scale:e.scale*.65,y:e.y-28,duration:300,onComplete:()=>e.destroy()});beep(980);renderMuseumHud();persistPhaserState()}
  openBlock(b){const g=normalizePhaserState();g.openedBlocks.push(b.blockId);const reward=(g.openedBlocks.length+Math.abs(hashText(gameDate())))%5;if(reward===0)g.hearts=Math.min(g.maxHearts,g.hearts+1);if(reward===1)g.shield=true;if(reward===2)g.hints++;if(reward===3)addGameFragments(5,gameV2NextQuestionId(g));if(reward===4){const guard=this.enemies.find(e=>e.active&&e.enemyType==='medium'&&!g.defeated.includes(e.id));if(guard){guard.setPosition(b.x+80,Math.min(440,b.y+120)).setVelocityY(0);guard.spawnX=guard.x;notify('问号展柜刷出了一名展厅守卫')}}b.mark.destroy();b.destroy();beep(700);renderMuseumHud();persistPhaserState()}
  beginBattle(e){
    const g=normalizePhaserState();if(g.battle||e.retreatLocked)return;if(e.enemyType==='final'&&(!g.defeated.includes('b1')||!g.defeated.includes('b2'))){notify('先击败两位展厅馆主，终极Boss才会接受挑战');this.player.setVelocityX(-280);beep(150,.18);return}this.physics.pause();openPhaserBattle(e)
  }
  resumeAfterRetreat(enemyId){const e=this.enemies.find(x=>x.active&&x.id===enemyId);if(e){const dir=this.player.x<e.x?-1:1;this.player.setX(Phaser.Math.Clamp(e.x+dir*180,60,WORLD_WIDTH-60));this.player.setVelocity(0,0).setAlpha(.58);e.retreatLocked=true;e.lockUntil=this.time.now+2000;this.time.delayedCall(2000,()=>this.player?.setAlpha(1))}this.physics.resume()}
  finishEnemyAnimation(id){const e=this.enemies.find(x=>x.active&&x.id===id);if(!e)return;e.setVelocity(0,0).setFrame(e.row*6+5).setTint(0xffffff);this.tweens.add({targets:e,alpha:0,y:e.y-38,angle:8,duration:420,onComplete:()=>e.destroy()})}
}

function gameV2NextQuestionId(g){for(const id of ['m1','m2','b1','b2'])if(!g.defeated.includes(id)){const battle=g.enemyBattles[id],ids=g.plan.encounters[id]||[];return ids[Math.min(battle?.index||0,ids.length-1)]||''}return g.plan.final[0]||''}

function renderMuseumHud(){
  const g=normalizePhaserState(),h=document.getElementById('phaserHearts'),f=document.getElementById('phaserFragments'),tips=document.getElementById('phaserHints'),shield=document.getElementById('phaserShield');
  if(h)h.innerHTML=`${'♥'.repeat(g.hearts)} <b>${g.hearts}/${g.maxHearts}</b>`;if(f)f.textContent=g.inventory.length;if(tips)tips.textContent=g.hints;if(shield)shield.textContent=g.shield?'有':'无';
}

function startMuseumLevel(){
  document.getElementById('gameStartCard')?.remove();if(phaserInstance)return;let g=normalizePhaserState();if(g.status==='failed'){if(isGameTestMode())testPhaserState=freshPhaserState();else state.phaserGame=freshPhaserState();g=normalizePhaserState()}g.status='playing';persistPhaserState();
  phaserInstance=new Phaser.Game({type:Phaser.AUTO,parent:'phaserCanvas',width:GAME_VIEW_WIDTH,height:GAME_VIEW_HEIGHT,pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:850},debug:false}},scene:[MuseumScene]});bindMuseumControls();startMuseumMusic();
}
function bindMuseumControls(){document.querySelectorAll('[data-game-control]').forEach(btn=>{const key=btn.dataset.gameControl;btn.onpointerdown=e=>{e.preventDefault();phaserInput[key]=true};btn.onpointerup=btn.onpointercancel=btn.onpointerleave=()=>{if(key==='left'||key==='right')phaserInput[key]=false}})}

function enemyQuestionIds(enemy){const g=normalizePhaserState();if(enemy.enemyType==='final')return g.plan.final;return g.plan.encounters[enemy.id]||[g.plan.deck[0]]}
function ensureCurrentBattleFragments(){const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item||b.type==='final')return;for(const fragment of dailyFragmentPool().filter(x=>x.questionId===item.id))if(!g.inventory.includes(fragment.id))g.inventory.push(fragment.id)}
function refreshBattleChoiceOrder(){const g=normalizePhaserState(),b=g.battle;if(!b)return;const rand=seeded(hashText(`${gameDate()}-${b.enemyId}-${b.index}-${g.battleSerial}`));b.choiceOrder=shuffled([...g.inventory],rand)}
function openPhaserBattle(enemy){
  const g=normalizePhaserState(),saved=g.enemyBattles[enemy.id],ids=enemyQuestionIds(enemy),maxHp=enemy.enemyType==='medium'?1:enemy.enemyType==='final'?5:ids.length;
  g.battle={enemyId:enemy.id,type:enemy.enemyType,row:enemy.row,hp:saved?.hp??maxHp,maxHp,index:saved?.index||0,questionIds:ids,selected:[],feedback:null,hintId:null,animating:false,visual:''};
  g.battleSerial=(g.battleSerial||0)+1;ensureCurrentBattleFragments();refreshBattleChoiceOrder();persistPhaserState();renderMuseumHud();renderPhaserBattle();
}
function currentPhaserBattleItem(){const b=normalizePhaserState().battle;return b?getDailyItem(b.questionIds[Math.min(b.index,b.questionIds.length-1)]):null}
function combatFrameStyle(texture,row,col){return`--combat-sheet:url('${texture}');--combat-x:${col*20}%;--combat-y:${row*33.333}%`}

function renderPhaserBattle(){
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem(),host=document.getElementById('phaserBattleHost');if(!host||!b||!item)return;
  const chunks=answerChunks(item),selected=b.selected||[],dictation=b.type==='final',policy=gameV2OrderPolicy(item);
  const slots=chunks.map((_,i)=>`<button class="answer-slot" onclick="removePhaserFragment(${i})" ${b.animating?'disabled':''}><span>${i+1}</span>${escapeHtml(selected[i]?.text||'选择一段完整短语')}</button>`).join('');
  const ordered=[...(b.choiceOrder||[]),...g.inventory.filter(id=>!(b.choiceOrder||[]).includes(id))];const fragments=ordered.map(getDailyFragment).filter(Boolean).map(f=>`<button class="${selected.some(x=>x.id===f.id)?'used':''} ${b.hintId===f.id?'hint-pulse':''}" onclick="pickPhaserFragment('${f.id}')" ${b.animating?'disabled':''}>${escapeHtml(f.text)}</button>`).join('');
  const segments=Array.from({length:b.maxHp},(_,i)=>`<i class="${i<b.hp?'active':''}"></i>`).join('');
  const enemyTexture=b.type==='medium'?'assets/art/enemy-sprites-v2.png':'assets/art/boss-sprites-v2.png';
  const heroClass=b.visual==='hero-attack'?'attack':b.visual==='hero-hurt'?'hurt':b.visual==='shield'?'shield':'';
  const enemyClass=b.visual==='enemy-attack'?'attack enemy-attack':b.visual==='enemy-hurt'?'hurt':'';
  host.innerHTML=`<div class="phaser-battle"><div class="battle-window"><div class="battle-top">
    <div class="battle-actor-wrap"><div class="battle-actor hero ${heroClass}" style="${combatFrameStyle('assets/art/hero-sprites-v2.png',heroClass==='hurt'?3:heroClass==='attack'?3:0,heroClass==='hurt'?1:heroClass==='attack'?0:0)}"></div><strong>你</strong><div class="player-life">${'♥'.repeat(g.hearts)} <b>${g.hearts}/${g.maxHearts}</b>${g.shield?' · 护盾':' '}</div></div>
    <div class="battle-question"><small>${escapeHtml(item.chapter||ensureDailyTask().chapterTitle)} · ${policy==='free'?'并列要点，顺序不限':'按语意顺序'}</small><h2>${escapeHtml(item.q)}</h2><div class="enemy-health"><span>敌人生命 ${b.hp}/${b.maxHp}</span><div>${segments}</div></div></div>
    <div class="battle-actor-wrap"><div class="battle-actor enemy ${enemyClass}" style="${combatFrameStyle(enemyTexture,b.row,enemyClass.includes('hurt')?5:enemyClass.includes('attack')?4:0)}"></div><strong>${b.type==='medium'?'展厅守卫':b.type==='final'?'终极馆长':'博物馆馆主'}</strong></div><div class="battle-projectile ${b.visual||''}"></div></div>
    ${dictation?`<textarea id="phaserDictation" class="dictation-box" placeholder="默写完整意思；允许措辞不同，但核心含义必须齐全。" ${b.animating?'disabled':''}></textarea>`:`<div class="answer-slots">${slots}</div><div class="answer-fragments">${fragments}</div>`}
    <div class="battle-feedback ${b.feedback?.correct===true?'good':b.feedback?.correct===false?'bad':''}">${escapeHtml(b.feedback?.message||'用完整短语组成答案；提交后才会结算伤害。')}</div>
    <div class="battle-actions"><button onclick="retreatPhaserBattle()" ${b.animating?'disabled':''}>暂时撤退</button><button onclick="usePhaserHint()" ${b.animating||g.hints<=0?'disabled':''}>提示 ${g.hints}</button>${isGameTestMode()?'<button onclick="testFillBattle()">填入正确答案</button>':''}<button class="attack" onclick="submitPhaserAttack()" ${b.animating?'disabled':''}>${b.animating?'交战中…':'提交攻击'}</button></div>
  </div></div>`;
}

function pickPhaserFragment(id){const b=normalizePhaserState().battle,f=getDailyFragment(id),item=currentPhaserBattleItem();if(!b||b.animating||!f||b.selected.some(x=>x.id===id)||b.selected.length>=answerChunks(item).length)return;b.selected.push(f);renderPhaserBattle()}
function removePhaserFragment(index){const b=normalizePhaserState().battle;if(!b||b.animating)return;b.selected.splice(index,1);renderPhaserBattle()}
function normalizedMeaning(text){return String(text||'').replace(/[，。；、！？,.!?\s]/g,'').replace(/艺术/g,'').toLowerCase()}
function waitBattle(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function submitPhaserAttack(){
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item||b.animating)return;const expected=answerChunks(item);let correct=false;
  if(b.type==='final'){
    const draft=document.getElementById('phaserDictation')?.value||'',nd=normalizedMeaning(draft),na=normalizedMeaning(item.answerText),tokens=gameV2Keywords(item).map(normalizedMeaning);
    correct=nd===na||(nd.length>=10&&tokens.filter(x=>nd.includes(x)).length>=Math.max(2,Math.ceil(tokens.length*.6)));
  }else{
    const got=b.selected.map(x=>x.text);correct=maskAnswerCorrect(item,got,expected);
  }
  b.animating=true;b.feedback=null;b.visual=correct?'hero-attack':'enemy-attack';renderPhaserBattle();beep(correct?900:190,.14);await waitBattle(430);
  if(!normalizePhaserState().battle)return;
  if(correct){
    b.visual='enemy-hurt';b.hp--;b.feedback={correct:true,message:'✓ 回答正确：攻击命中，敌人失去1格生命。'};beep(1080,.18);
    g.enemyBattles[b.enemyId]={hp:b.hp,index:b.index,questionIds:b.questionIds};renderPhaserBattle();await waitBattle(620);
    if(b.hp<=0){finishPhaserEnemy(b.enemyId,b.type);return}
    b.index=Math.min(b.index+1,b.questionIds.length-1);g.enemyBattles[b.enemyId]={hp:b.hp,index:b.index,questionIds:b.questionIds};b.selected=[];b.hintId=null;ensureCurrentBattleFragments();refreshBattleChoiceOrder();
  }else{
    if(g.shield){g.shield=false;b.visual='shield';b.feedback={correct:false,message:'× 回答错误：护盾挡下本次攻击，没有扣除生命。'}}
    else{g.hearts--;b.visual='hero-hurt';b.feedback={correct:false,message:'× 回答错误：怪物反击，你失去1颗心。'}}
    beep(120,.24);renderPhaserBattle();renderMuseumHud();await waitBattle(620);
    if(g.hearts<=0){g.battle=null;persistPhaserState();showGameResult(false);return}
  }
  b.animating=false;b.visual='';persistPhaserState();renderMuseumHud();renderPhaserBattle();
}

function finishPhaserEnemy(id,type){
  const g=normalizePhaserState();if(!g.defeated.includes(id))g.defeated.push(id);g.score+=type==='final'?100:type==='boss'?50:20;addGameFragments(type==='medium'?3:5,gameV2NextQuestionId(g));delete g.enemyBattles[id];g.battle=null;
  document.getElementById('phaserBattleHost').innerHTML='';levelScene?.finishEnemyAnimation(id);levelScene?.physics.resume();renderMuseumHud();persistPhaserState();if(type==='final')setTimeout(()=>showGameResult(true),520);
}

function retreatPhaserBattle(){
  const g=normalizePhaserState(),b=g.battle;if(!b||b.animating)return;g.enemyBattles[b.enemyId]={hp:b.hp,index:b.index,questionIds:b.questionIds};const enemyId=b.enemyId;g.battle=null;document.getElementById('phaserBattleHost').innerHTML='';levelScene?.resumeAfterRetreat(enemyId);persistPhaserState();notify('已撤退：敌人血量保留，2秒保护后需重新靠近并射击')
}

function usePhaserHint(){
  const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item||b.animating||g.hints<=0)return;
  const correctIds=dailyFragmentPool().filter(x=>x.questionId===item.id).map(x=>x.id),eligible=correctIds.find(id=>g.inventory.includes(id)&&!b.selected.some(x=>x.id===id));
  if(!eligible){b.feedback={correct:false,message:'当前没有可提示的未选正确碎片，提示卡未消耗。'};renderPhaserBattle();return}
  g.hints--;b.hintId=eligible;b.feedback={correct:true,message:'提示已启动：观察带蓝色呼吸光的碎片。'};persistPhaserState();renderPhaserBattle();
  setTimeout(()=>{const now=normalizePhaserState().battle;if(now&&now.hintId===eligible){now.hintId=null;renderPhaserBattle()}},3000);
}

function showGameResult(success){
  const g=normalizePhaserState(),testing=isGameTestMode();levelScene?.physics.pause();stopMuseumMusic();if(success){g.status='completed';g.completedAt=new Date().toISOString();if(!testing)state.xp+=120}else g.status='failed';persistPhaserState();
  const shell=document.querySelector('.phaser-shell');if(shell)shell.insertAdjacentHTML('beforeend',`<div class="game-result-card"><div><h2>${success?'展厅通关':'挑战失败'}</h2><p>${testing?'本次是独立测试，正式学习进度没有变化。':success?'全部题目和Boss均已完成，今日游戏进度已保存。':'学习记录不会清空，可以重新挑战。'}</p><div class="game-start-actions"><button class="start" onclick="${success?'exitPhaserGame()':'restartMuseumLevel()'}">${success?'返回航线':'重新挑战'}</button></div></div></div>`)
}
function restartMuseumLevel(){destroyPhaser();if(isGameTestMode())testPhaserState=freshPhaserState();else state.phaserGame=freshPhaserState();persistPhaserState();render()}

function testGameAction(action){
  if(!isGameTestMode())return;if(action==='reset'){restartMuseumLevel();return}if(action==='move'){phaserInput.right=true;setTimeout(()=>phaserInput.right=false,900);return}if(action==='jump'||action==='shoot'){phaserInput[action]=true;return}
  if(action==='small'){const e=levelScene?.enemies.find(x=>x.active&&x.enemyType==='small');if(e&&levelScene?.player){levelScene.player.setPosition(e.x-100,e.y);levelScene.player.setFlipX(false);phaserInput.shoot=true}return}
  if(action==='block'){const b=levelScene?.blocks.find(x=>x.active);if(b)levelScene.openBlock(b);return}
  const type=action==='final'?'final':action==='boss'?'boss':'medium',e=levelScene?.enemies.find(x=>x.active&&x.enemyType===type);if(e)levelScene.beginBattle(e);
}
function testFillBattle(){
  if(!isGameTestMode())return;const g=normalizePhaserState(),b=g.battle,item=currentPhaserBattleItem();if(!b||!item)return;
  if(b.type==='final'){const box=document.getElementById('phaserDictation');if(box)box.value=item.answerText;return}
  b.selected=answerChunks(item).map(text=>dailyFragmentPool().find(x=>x.questionId===item.id&&x.text===text)).filter(Boolean);for(const f of b.selected)if(!g.inventory.includes(f.id))g.inventory.push(f.id);persistPhaserState();renderPhaserBattle();renderMuseumHud();
}

if(['127.0.0.1','localhost'].includes(location.hostname))window.__REVISION_TEST__={
  snapshot:()=>({game:{...normalizePhaserState(),inventory:[...normalizePhaserState().inventory]},player:levelScene?.player?{x:levelScene.player.x,y:levelScene.player.y,frame:levelScene.player.frame.name}:null,enemies:levelScene?.enemies?.filter(x=>x.active).map(x=>({id:x.id,type:x.enemyType,x:x.x,y:x.y,frame:x.frame.name}))||[],blocks:levelScene?.blocks?.filter(x=>x.active).length||0}),
  hold:(direction,ms=500)=>new Promise(resolve=>{phaserInput[direction]=true;setTimeout(()=>{phaserInput[direction]=false;resolve()},ms)}),action:name=>{phaserInput[name]=true},teleport:(x,y=450)=>{if(levelScene?.player){levelScene.player.setPosition(x,y);levelScene.player.body.setVelocity(0,0)}},battle:id=>{const e=levelScene?.enemies.find(x=>x.active&&x.id===id);if(e)levelScene.beginBattle(e)},reset:()=>restartMuseumLevel()
};

const renderBeforePhaser=render;
render=function(){
  if(state.view!=='phaserGame'&&!isGameTestMode()){document.body.classList.remove('phaser-mode');destroyPhaser();renderBeforePhaser();return}
  document.body.classList.add('phaser-mode');content.innerHTML=phaserGameView();requestAnimationFrame(()=>{if(normalizePhaserState().status==='playing')startMuseumLevel()});
};
ensureDailyTask();if(isGameTestMode())testPhaserState=freshPhaserState();normalizePhaserState();render();
