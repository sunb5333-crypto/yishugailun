/* 艺术博物馆关卡第三版：单向平台、二段跳、展厅探索、动态护盾与一致碰撞。 */
const PHASER_GAME_VERSION=5;
const WORLD_WIDTH=5200;
const GAME_VIEW_WIDTH=960;
const GAME_VIEW_HEIGHT=540;
const BULLET_RANGE=850;
const PLAYER_SPEED=245;
const PLAYER_ACCEL=1450;
const PLAYER_DRAG=1200;
const FIRST_JUMP_SPEED=365;
const SECOND_JUMP_SPEED=325;
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
    checkpointX:120,playerX:120,playerY:420,checkpoints:['cp0'],openedCrates:[],collected:[],stage:1,stars:0,
    checkpointHearts:5,score:0,shots:0,battleSerial:0,audio:true,battle:null,completedAt:null};
}

function migratePhaserState(previous){
  const fresh=freshPhaserState(),valid=new Set(dailyFragmentPool().map(x=>x.id));
  const kept=(previous?.inventory||[]).filter(id=>valid.has(id));
  return{...fresh,...previous,version:PHASER_GAME_VERSION,date:gameDate(),plan:fresh.plan,
    inventory:[...new Set([...kept,...fresh.inventory])].slice(0,Math.max(10,kept.length)),
    checkpoints:[...new Set(previous?.checkpoints||fresh.checkpoints)],
    openedCrates:[...new Set(previous?.openedCrates||[])],collected:[...new Set(previous?.collected||[])],
    checkpointX:Math.max(120,Math.min(WORLD_WIDTH-220,Number(previous?.checkpointX)||120)),
    playerX:Math.max(120,Math.min(WORLD_WIDTH-220,Number(previous?.playerX)||Number(previous?.checkpointX)||120)),playerY:Math.max(150,Math.min(440,Number(previous?.playerY)||420)),
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
  <div class="museum-hud">${testing?'<span class="test-mode-badge">独立测试 · 不保存正式进度</span>':''}<span class="hearts" id="phaserHearts">${'♥'.repeat(g.hearts)} <b>${g.hearts}/${g.maxHearts}</b></span><span>碎片 <b id="phaserFragments">${g.inventory.length}</b></span><span>藏品 <b id="phaserCollected">${g.collected.length}/18</b></span><span>提示 <b id="phaserHints">${g.hints}</b></span><span>护盾 <b id="phaserShield">${g.shield?'有':'无'}</b></span><button onclick="toggleGameAudio()">音乐/音效 ${g.audio?'开':'关'}</button><button onclick="exitPhaserGame()">${testing?'返回学习':'退出'}</button></div>
  <div class="museum-controls"><div><button data-game-control="left" aria-label="向左">←</button><button data-game-control="right" aria-label="向右">→</button></div><div><button class="wide" data-game-control="jump">跳跃</button><button class="wide" data-game-control="shoot">射击</button></div></div>
  <div class="rotate-note"><div><strong>请把手机横过来</strong><p>横屏后进入全屏，才能看清平台、怪物和战斗按钮。</p></div></div>
  <div class="game-start-card" id="gameStartCard"><div><span class="game-kicker">${testing?'独立测试关卡':`今日展厅 · ${escapeHtml(theme.name)}`}</span><h2>艺术博物馆 · 第三版</h2><p>${testing?'测试生命、碎片、战斗和通关结果，不会写入正式学习进度。':'今天10题已经编入本关。'} A/D或方向键移动，空格跳跃，F射击；手机使用屏幕按钮。只有子弹击中中怪和Boss才会开始答题。</p><div class="game-start-actions"><button class="start" onclick="startMuseumLevel()">${testing?'开始测试':'进入展厅'}</button><button class="secondary" onclick="requestMuseumFullscreen()">全屏</button></div></div></div>
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
    this.solidTerrain=this.physics.add.staticGroup();this.oneWays=this.physics.add.staticGroup();this.movingPlatforms=[];
    this.makeSolid(0,510,WORLD_WIDTH,60);
    [[390,378,250],[735,286,230],[1085,374,270],[1480,276,240],[1860,370,260],[2245,280,240],[2650,372,285],[3100,278,255],[3525,374,280],[3950,280,245],[4340,370,270],[4720,278,240]].forEach(p=>this.makeOneWay(...p,22));
    this.makeMovingPlatform(1320,398,150,22,1600,2800);this.makeMovingPlatform(3320,300,150,22,3560,2500);
    this.addMuseumDecor();this.addSpecialRooms();
    const g=normalizePhaserState();
    this.player=this.physics.add.sprite(Math.max(120,g.playerX||g.checkpointX||120),Math.max(150,Math.min(440,g.playerY||420)),'hero-v2',0).setScale(.42).setDepth(12);
    this.player.body.setSize(78,132).setOffset(89,124).setCollideWorldBounds(true);this.player.setDragX(PLAYER_DRAG).setMaxVelocity(PLAYER_SPEED,680);this.player.play('hero-idle');
    for(const terrain of this.solidTerrain.getChildren())this.physics.add.collider(this.player,terrain);
    for(const platform of this.oneWays.getChildren())this.physics.add.collider(this.player,platform,null,this.canLandOnOneWay,this);
    this.cameras.main.startFollow(this.player,true,.1,.1).setDeadzone(210,110);
    this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('A,D,F,J,SPACE');this.lastShot=0;this.lastDamage=0;this.lastGrounded=0;this.jumpBuffered=0;this.jumpCount=0;this.wasGrounded=false;this.lastPositionSave=0;
    this.enemyGroup=this.physics.add.group();this.enemies=[];
    const specs=[['s1',0,500,435,150,'small','patrol'],['s2',1,840,435,145,'small','jumper'],['m1',0,1250,415,140,'medium','guard'],['s3',1,1680,430,160,'small','ranged'],['s4',0,2070,300,120,'small','patrol'],['b1',0,2710,405,145,'boss','guard'],['s5',1,3220,310,120,'small','fly'],['m2',1,3610,415,150,'medium','guard'],['s6',0,4070,435,160,'small','jumper'],['b2',1,4530,405,130,'boss','guard'],['bf',2,5000,405,80,'final','guard']];
    specs.filter(s=>!g.defeated.includes(s[0])).forEach(s=>this.spawnEnemy(...s));
    for(const enemy of this.enemies){for(const terrain of this.solidTerrain.getChildren())this.physics.add.collider(enemy,terrain);for(const platform of this.oneWays.getChildren())this.physics.add.collider(enemy,platform,null,this.canEnemyLandOnOneWay,this)}
    this.blocks=[];for(let i=0;i<10;i++){const id=`q${i}`;if(!g.openedBlocks.includes(id))this.spawnBlock(610+i*440,245+(i%2)*78,id)}
    this.bullets=this.physics.add.group({allowGravity:false});this.physics.add.collider(this.bullets,this.solidTerrain,b=>this.bulletImpact(b));
    this.enemyProjectiles=this.physics.add.group({allowGravity:false});this.physics.add.overlap(this.player,this.enemyProjectiles,(player,shot)=>{shot.destroy();this.damagePlayer('远程攻击')});
    this.createExplorationObjects();this.createShieldEffect();
    if(g.battle)this.time.delayedCall(120,()=>{this.physics.pause();renderPhaserBattle()});
  }
  makeSolid(x,y,w,h=24){const r=this.add.rectangle(x+w/2,y,w,h,0x8b6237).setStrokeStyle(3,0xe1ba68).setDepth(2);this.physics.add.existing(r,true);this.solidTerrain.add(r);return r}
  makeOneWay(x,y,w,h=22){const r=this.add.rectangle(x+w/2,y,w,h,0xa57a43).setStrokeStyle(3,0xf0c86e).setDepth(3);this.physics.add.existing(r,true);r.body.checkCollision.down=false;r.body.checkCollision.left=false;r.body.checkCollision.right=false;this.oneWays.add(r);return r}
  makeMovingPlatform(x,y,w,h,toX,duration){const r=this.makeOneWay(x,y,w,h);this.movingPlatforms.push(r);this.tweens.add({targets:r,x:toX+w/2,duration,yoyo:true,repeat:-1,ease:'Sine.inOut',onUpdate:()=>r.body?.updateFromGameObject()});return r}
  canLandOnOneWay(player,platform){return player.body.velocity.y>=-5&&player.body.bottom<=platform.body.top+18}
  canEnemyLandOnOneWay(enemy,platform){return enemy.behavior!=='fly'&&enemy.body.velocity.y>=-5&&enemy.body.bottom<=platform.body.top+18}
  spawnEnemy(id,row,x,y,patrol,type,behavior='patrol'){
    const texture=type==='boss'||type==='final'?'boss-v2':'enemy-v2',scale=type==='small'?.3:type==='medium'?.38:.48,e=this.physics.add.sprite(x,y,texture,row*6).setScale(scale).setDepth(10);
    e.id=id;e.row=row;e.animPrefix=`${texture}-${row}`;e.enemyType=type;e.behavior=behavior;e.spawnX=x;e.spawnY=y;e.patrol=patrol;e.retreatLocked=false;e.lockUntil=0;e.nextAction=0;
    const bodyW=type==='small'?116:126,bodyH=type==='small'?142:172;e.body.setSize(bodyW,bodyH).setOffset((256-bodyW)/2,256-bodyH).setCollideWorldBounds(true).setVelocityX(behavior==='fly'?0:-55);if(behavior==='fly')e.body.setAllowGravity(false);e.play(`${e.animPrefix}-walk`);
    this.enemyGroup.add(e);this.enemies.push(e);this.physics.add.overlap(this.player,e,()=>this.touchEnemy(e));return e;
  }
  addMuseumDecor(){
    const zones=[['热身展廊',120,0x5aa7b6],['探索藏品室',1080,0xd2a65a],['守卫长廊',2140,0x8b76b9],['馆主展厅',3200,0xc56c55],['终极档案室',4350,0xe05252]];
    for(const [label,x,color] of zones){
      this.add.rectangle(x+350,118,620,150,color,.07).setDepth(-5);this.add.text(x+42,72,label,{font:'700 24px "Microsoft YaHei"',color:'#f5d486'}).setDepth(-3);
      for(let i=0;i<3;i++){const lamp=this.add.circle(x+130+i*175,160,7,0xf6cd70,.55).setDepth(-2);this.tweens.add({targets:lamp,alpha:{from:.25,to:.85},scale:{from:.85,to:1.2},duration:1300+i*260,yoyo:true,repeat:-1})}
    }
    for(const x of [980,2020,3060,4100])this.add.rectangle(x,270,8,420,0xe1ba68,.32).setDepth(-4);
  }
  addSpecialRooms(){
    const rooms=[['隐藏画室',2050,188,0x6ca6a8],['奖励修复室',3000,184,0xd1a24b],['隐藏雕塑室',4010,188,0x8d76ad]];
    for(const [label,x,y,color] of rooms){this.add.rectangle(x+150,y-55,300,120,color,.16).setStrokeStyle(2,color,.55).setDepth(-1);this.makeOneWay(x,y,300,22);this.add.text(x+25,y-105,label,{font:'700 17px "Microsoft YaHei"',color:'#f7dfa0'}).setDepth(4)}
  }
  createExplorationObjects(){
    const g=normalizePhaserState();
    this.collectibles=this.physics.add.staticGroup();
    for(let i=0;i<18;i++){
      const id=`art${i}`;if(g.collected.includes(id))continue;
      const x=250+i*270,y=i%4===0?330:i%3===0?235:450;
      const gem=this.add.star(x,y,5,5,11,0xf4c85d).setStrokeStyle(2,0xfff0a8).setDepth(8);this.physics.add.existing(gem,true);gem.collectId=id;this.collectibles.add(gem);
      this.tweens.add({targets:gem,angle:360,y:gem.y-8,duration:1700+(i%4)*180,yoyo:true,repeat:-1});
    }
    this.physics.add.overlap(this.player,this.collectibles,(player,item)=>this.collectItem(item));
    this.crates=this.physics.add.staticGroup();
    for(let i=0;i<6;i++){
      const id=`crate${i}`;if(g.openedCrates.includes(id))continue;
      const x=1020+i*710,y=475,crate=this.add.rectangle(x,y,42,42,0x6f472b).setStrokeStyle(4,0xd4a457).setDepth(7);this.physics.add.existing(crate,true);crate.crateId=id;this.crates.add(crate);
    }
    this.physics.add.collider(this.player,this.crates);this.physics.add.collider(this.enemyGroup,this.crates);
    this.physics.add.overlap(this.bullets,this.crates,(bullet,crate)=>this.hitCrate(bullet,crate));
    this.checkpointSensors=this.physics.add.staticGroup();
    [[0,120,1],[1,1650,2],[2,3250,4],[3,4550,5]].forEach(([n,x,stage])=>{
      const id=`cp${n}`;const post=this.add.rectangle(x,430,10,100,g.checkpoints.includes(id)?0x76e1bf:0xe3b55f,.8).setDepth(6);const flag=this.add.triangle(x+22,390,0,0,48,13,0,26,g.checkpoints.includes(id)?0x76e1bf:0xe3b55f,.9).setDepth(6);this.physics.add.existing(post,true);post.checkpointId=id;post.stage=stage;post.flag=flag;this.checkpointSensors.add(post);
    });
    this.physics.add.overlap(this.player,this.checkpointSensors,(player,post)=>this.activateCheckpoint(post));
  }
  collectItem(item){
    if(!item?.active)return;const g=normalizePhaserState();if(!g.collected.includes(item.collectId))g.collected.push(item.collectId);g.score+=5;
    this.tweens.add({targets:item,alpha:0,scale:1.8,y:item.y-30,duration:260,onComplete:()=>item.destroy()});beep(1120,.1);persistPhaserState();renderMuseumHud();
  }
  hitCrate(bullet,crate){
    if(!bullet?.active||!crate?.active)return;this.bulletImpact(bullet);const g=normalizePhaserState();g.openedCrates.push(crate.crateId);
    if(g.shield)g.hints++;else if(Math.abs(hashText(crate.crateId+gameDate()))%2===0)g.hearts=Math.min(g.maxHearts,g.hearts+1);else g.shield=true;
    this.tweens.add({targets:crate,alpha:0,scale:.2,angle:25,duration:240,onComplete:()=>crate.destroy()});this.syncShieldEffect();renderMuseumHud();persistPhaserState();
  }
  activateCheckpoint(post){
    const g=normalizePhaserState();if(g.checkpoints.includes(post.checkpointId))return;g.checkpoints.push(post.checkpointId);g.checkpointX=post.x;g.playerX=post.x;g.playerY=420;g.checkpointHearts=g.hearts;g.stage=Math.max(g.stage,post.stage);post.setFillStyle(0x76e1bf,.9);post.flag?.setFillStyle(0x76e1bf,.9);beep(760,.18);persistPhaserState();notify('检查点已保存');
  }
  createShieldEffect(){
    const ring=this.add.ellipse(0,0,82,116,0x4fdfff,.09).setStrokeStyle(3,0x79ecff,.85),inner=this.add.ellipse(0,0,68,102,0x4fdfff,0).setStrokeStyle(1,0xffffff,.45),a=this.add.circle(0,-58,5,0xa8f4ff),b=this.add.circle(0,58,4,0x56d8ff);
    this.shieldFx=this.add.container(this.player.x,this.player.y,[ring,inner,a,b]).setDepth(13);this.shieldNodes=[a,b];this.tweens.add({targets:[ring,inner],alpha:{from:.42,to:.95},scale:{from:.96,to:1.05},duration:1100,yoyo:true,repeat:-1});this.syncShieldEffect();
  }
  syncShieldEffect(){if(this.shieldFx)this.shieldFx.setVisible(Boolean(normalizePhaserState().shield))}
  breakShieldEffect(){
    if(!this.shieldFx)return;const x=this.player.x,y=this.player.y,wave=this.add.ellipse(x,y,86,118,0x6ee8ff,.12).setStrokeStyle(5,0xb9f7ff,1).setDepth(15);
    this.shieldFx.setVisible(false);this.tweens.add({targets:wave,scale:2.1,alpha:0,duration:420,onComplete:()=>wave.destroy()});beep(330,.22);
  }
  bulletImpact(bullet){if(!bullet?.active)return;const flash=this.add.circle(bullet.x,bullet.y,8,0xffd75f,.9).setDepth(14);bullet.trail?.destroy();bullet.destroy();this.tweens.add({targets:flash,scale:2.2,alpha:0,duration:180,onComplete:()=>flash.destroy()})}
  spawnBlock(x,y,id){const block=this.add.rectangle(x,y,46,46,0xd8b763).setStrokeStyle(4,0x68491f).setDepth(6);const mark=this.add.text(x,y,'?',{font:'900 28px monospace',color:'#102331'}).setOrigin(.5).setDepth(7);this.physics.add.existing(block,true);block.blockId=id;block.mark=mark;this.blocks.push(block)}
  update(time){
    const g=normalizePhaserState();if(!this.player?.body||g.battle)return;
    const grounded=this.player.body.blocked.down||this.player.body.touching.down;
    if(grounded){this.lastGrounded=time;if(!this.wasGrounded&&this.player.body.velocity.y>120){this.player.setFrame(14);beep(210,.035)}this.jumpCount=0}
    else if(this.wasGrounded&&this.jumpCount===0)this.jumpCount=1;this.wasGrounded=grounded;
    const left=this.cursors.left.isDown||this.keys.A.isDown||phaserInput.left,right=this.cursors.right.isDown||this.keys.D.isDown||phaserInput.right;
    this.player.setAccelerationX(left?-PLAYER_ACCEL:right?PLAYER_ACCEL:0);if(left)this.player.setFlipX(true);if(right)this.player.setFlipX(false);
    if(Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||phaserInput.jump)this.jumpBuffered=time;
    phaserInput.jump=false;
    if(time-this.jumpBuffered<=140){
      const first=(grounded||time-this.lastGrounded<=110)&&this.jumpCount===0,second=!grounded&&this.jumpCount===1;
      if(first||second){this.jumpCount=first?1:2;this.player.setVelocityY(first?-FIRST_JUMP_SPEED:-SECOND_JUMP_SPEED);this.jumpBuffered=0;this.player.setFrame(12);beep(first?620:760,.07)}
    }
    if(!grounded)this.player.setFrame(this.player.body.velocity.y<0?12:13);else if(left||right){if(this.player.anims.currentAnim?.key!=='hero-run')this.player.play('hero-run')}else if(this.player.anims.currentAnim?.key!=='hero-idle')this.player.play('hero-idle');
    if(Phaser.Input.Keyboard.JustDown(this.keys.F)||Phaser.Input.Keyboard.JustDown(this.keys.J)||phaserInput.shoot)this.shoot(time);phaserInput.shoot=false;
    for(const e of this.enemies){
      if(!e.active)continue;if(e.retreatLocked&&time>e.lockUntil&&Math.abs(this.player.x-e.x)>150)e.retreatLocked=false;
      if(e.behavior==='fly'){e.y=e.spawnY+Math.sin((time+e.spawnX)/520)*44;e.body.updateFromGameObject();e.setFlipX(this.player.x>e.x);continue}
      if(e.y>520){e.setPosition(e.spawnX,e.spawnY).setVelocity(0,0)}
      const chase=e.enemyType!=='small'&&Math.abs(this.player.x-e.x)<260;let vx=e.body.velocity.x||55;
      if(chase)vx=this.player.x<e.x?-76:76;else if(Math.abs(e.x-e.spawnX)>e.patrol)vx=e.x>e.spawnX?-Math.abs(vx):Math.abs(vx);
      const crowded=this.enemies.find(other=>other!==e&&other.active&&Math.abs(other.y-e.y)<55&&Math.abs(other.x-e.x)<68);if(crowded)vx=e.x<crowded.x?-Math.abs(vx):Math.abs(vx);
      e.setVelocityX(vx);e.setFlipX(vx>0);
      if(e.behavior==='jumper'&&time>e.nextAction&&e.body.blocked.down){e.setVelocityY(-285);e.nextAction=time+1800}
      if(e.behavior==='ranged'&&time>e.nextAction&&Math.abs(this.player.x-e.x)<470){this.fireEnemyProjectile(e);e.nextAction=time+2200}
      if(e.anims.currentAnim?.key!==`${e.animPrefix}-walk`)e.play(`${e.animPrefix}-walk`);
    }
    for(const b of [...this.bullets.getChildren()])if(b.active){if(b.trail)b.trail.setPosition(b.x-b.body.velocity.x*.018,b.y);if(Math.abs(b.x-b.originX)>BULLET_RANGE)this.bulletImpact(b)}
    for(const shot of [...this.enemyProjectiles.getChildren()])if(shot.active&&Math.abs(shot.x-shot.originX)>520)shot.destroy();
    if(this.shieldFx){this.shieldFx.setPosition(this.player.x,this.player.y-2);const angle=time*.0047;this.shieldNodes[0].setPosition(Math.cos(angle)*43,Math.sin(angle)*58);this.shieldNodes[1].setPosition(Math.cos(angle+Math.PI)*43,Math.sin(angle+Math.PI)*58);this.syncShieldEffect()}
    if(time-this.lastPositionSave>1800&&grounded){g.playerX=Math.round(this.player.x);g.playerY=Math.round(this.player.y);this.lastPositionSave=time;persistPhaserState()}
    for(const b of this.blocks)if(b.active&&Math.abs(this.player.x-b.x)<38&&this.player.y>b.y&&this.player.y-b.y<105&&this.player.body.velocity.y<0)this.openBlock(b);
  }
  fireEnemyProjectile(enemy){
    const dir=this.player.x<enemy.x?-1:1,shot=this.add.circle(enemy.x+dir*28,enemy.y-8,7,0xef5d52).setStrokeStyle(2,0xffb2a9).setDepth(11);this.physics.add.existing(shot);this.enemyProjectiles.add(shot);shot.body.setAllowGravity(false).setVelocityX(dir*210);shot.originX=shot.x;beep(170,.08)
  }
  shoot(time){
    if(time-this.lastShot<300)return;this.lastShot=time;this.player.play('hero-shoot',true);const dir=this.player.flipX?-1:1,muzzleX=this.player.x+dir*34,muzzleY=this.player.y-3;
    const flash=this.add.circle(muzzleX,muzzleY,8,0xffdc68,.9).setDepth(14),b=this.add.ellipse(muzzleX+dir*8,muzzleY,22,11,0xf6b93b).setStrokeStyle(2,0xfff2a6).setDepth(12);this.physics.add.existing(b);this.bullets.add(b);b.body.setSize(32,20).setAllowGravity(false).setVelocityX(dir*610);b.originX=b.x;b.trail=this.add.ellipse(b.x-dir*12,b.y,25,7,0xffc84d,.4).setDepth(11);this.tweens.add({targets:flash,scale:2,alpha:0,duration:120,onComplete:()=>flash.destroy()});
    for(const e of this.enemies)this.physics.add.overlap(b,e,()=>this.hitEnemy(b,e));normalizePhaserState().shots++;beep(840,.06)
  }
  hitEnemy(b,e){if(!b.active||!e.active)return;this.bulletImpact(b);if(e.retreatLocked){beep(180);return}if(e.enemyType==='small'){this.defeatEnemy(e,1+(Math.abs(hashText(`${e.id}-${gameDate()}`))%2));return}this.beginBattle(e)}
  touchEnemy(e){if(Date.now()-this.lastDamage<1500)return;this.damagePlayer('碰到怪物',e)}
  damagePlayer(reason,enemy){
    this.lastDamage=Date.now();const g=normalizePhaserState();if(g.shield){g.shield=false;this.player.setFrame(21);this.breakShieldEffect()}else{g.hearts--;this.player.setFrame(19);this.player.setTint(0xff5757);beep(120,.2)}
    this.player.setVelocityX(enemy&&this.player.x<enemy.x?-285:285).setVelocityY(-230);this.time.delayedCall(560,()=>this.player?.clearTint());if(g.hearts<=0){g.status='failed';showGameResult(false)}renderMuseumHud();persistPhaserState();
  }
  defeatEnemy(e,count){const g=normalizePhaserState();if(!g.defeated.includes(e.id))g.defeated.push(e.id);g.score+=10;const nextId=gameV2NextQuestionId(g);addGameFragments(count,nextId);e.setVelocity(0,0).setTint(0xffffff).setAlpha(.9);e.setFrame(e.row*6+5);this.tweens.add({targets:e,alpha:0,scale:e.scale*.65,y:e.y-28,duration:300,onComplete:()=>e.destroy()});beep(980);renderMuseumHud();persistPhaserState()}
  openBlock(b){const g=normalizePhaserState();g.openedBlocks.push(b.blockId);const reward=(g.openedBlocks.length+Math.abs(hashText(gameDate())))%5;if(reward===0)g.hearts=Math.min(g.maxHearts,g.hearts+1);if(reward===1){if(g.shield)g.hints++;else g.shield=true}if(reward===2)g.hints++;if(reward===3)addGameFragments(5,gameV2NextQuestionId(g));if(reward===4){const guard=this.enemies.find(e=>e.active&&e.enemyType==='medium'&&!g.defeated.includes(e.id));if(guard){guard.setPosition(b.x+80,Math.min(440,b.y+120)).setVelocityY(0);guard.spawnX=guard.x;notify('问号展柜刷出了一名展厅守卫')}}b.mark.destroy();b.destroy();this.syncShieldEffect();beep(700);renderMuseumHud();persistPhaserState()}
  beginBattle(e){
    const g=normalizePhaserState();if(g.battle||e.retreatLocked)return;if(e.enemyType==='final'&&(!g.defeated.includes('b1')||!g.defeated.includes('b2'))){notify('先击败两位展厅馆主，终极Boss才会接受挑战');this.player.setVelocityX(-280);beep(150,.18);return}this.physics.pause();openPhaserBattle(e)
  }
  resumeAfterRetreat(enemyId){const e=this.enemies.find(x=>x.active&&x.id===enemyId);if(e){const dir=this.player.x<e.x?-1:1;this.player.setX(Phaser.Math.Clamp(e.x+dir*180,60,WORLD_WIDTH-60));this.player.setVelocity(0,0).setAlpha(.58);e.retreatLocked=true;e.lockUntil=this.time.now+2000;this.time.delayedCall(2000,()=>this.player?.setAlpha(1))}this.physics.resume()}
  finishEnemyAnimation(id){const e=this.enemies.find(x=>x.active&&x.id===id);if(!e)return;e.setVelocity(0,0).setFrame(e.row*6+5).setTint(0xffffff);this.tweens.add({targets:e,alpha:0,y:e.y-38,angle:8,duration:420,onComplete:()=>e.destroy()})}
}

function gameV2NextQuestionId(g){for(const id of ['m1','m2','b1','b2'])if(!g.defeated.includes(id)){const battle=g.enemyBattles[id],ids=g.plan.encounters[id]||[];return ids[Math.min(battle?.index||0,ids.length-1)]||''}return g.plan.final[0]||''}

function renderMuseumHud(){
  const g=normalizePhaserState(),h=document.getElementById('phaserHearts'),f=document.getElementById('phaserFragments'),c=document.getElementById('phaserCollected'),tips=document.getElementById('phaserHints'),shield=document.getElementById('phaserShield');
  if(h)h.innerHTML=`${'♥'.repeat(g.hearts)} <b>${g.hearts}/${g.maxHearts}</b>`;if(f)f.textContent=g.inventory.length;if(c)c.textContent=`${g.collected.length}/18`;if(tips)tips.textContent=g.hints;if(shield)shield.textContent=g.shield?'有':'无';
}

function startMuseumLevel(){
  document.getElementById('gameStartCard')?.remove();if(phaserInstance)return;let g=normalizePhaserState();if(g.status==='failed'){if(isGameTestMode())testPhaserState=freshPhaserState();else state.phaserGame=freshPhaserState();g=normalizePhaserState()}g.status='playing';persistPhaserState();
  phaserInstance=new Phaser.Game({type:Phaser.AUTO,parent:'phaserCanvas',width:GAME_VIEW_WIDTH,height:GAME_VIEW_HEIGHT,pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:920},debug:false}},scene:[MuseumScene]});bindMuseumControls();startMuseumMusic();
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
    <div class="battle-question"><small>${escapeHtml(item.chapter||ensureDailyTask().chapterTitle)} · ${policy==='free'?'并列要点，顺序不限':policy==='semantic'?'意思完整，位置可换':'按语意顺序'}</small><h2>${escapeHtml(item.q)}</h2><div class="enemy-health"><span>敌人生命 ${b.hp}/${b.maxHp}</span><div>${segments}</div></div></div>
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
    if(g.shield){g.shield=false;levelScene?.breakShieldEffect();b.visual='shield';b.feedback={correct:false,message:'× 回答错误：护盾挡下本次攻击，没有扣除生命。'}}
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
  const g=normalizePhaserState(),testing=isGameTestMode();levelScene?.physics.pause();stopMuseumMusic();if(success){g.status='completed';g.completedAt=new Date().toISOString();g.stars=1+(g.hearts>=3?1:0)+(g.collected.length>=12?1:0);if(!testing)state.xp+=120}else g.status='failed';persistPhaserState();
  const shell=document.querySelector('.phaser-shell'),summary=success?`生命 ${g.hearts}/${g.maxHearts} · 藏品 ${g.collected.length}/18 · ${'★'.repeat(g.stars)}${'☆'.repeat(3-g.stars)}`:'';if(shell)shell.insertAdjacentHTML('beforeend',`<div class="game-result-card"><div><h2>${success?'展厅通关':'挑战失败'}</h2><p>${testing?'本次是独立测试，正式学习进度没有变化。':success?'全部题目和Boss均已完成，今日游戏进度已保存。':'学习记录不会清空，可以重新挑战。'}</p>${summary?`<strong class="game-result-summary">${summary}</strong>`:''}<div class="game-start-actions"><button class="start" onclick="${success?'exitPhaserGame()':'restartMuseumLevel()'}">${success?'返回航线':'重新挑战'}</button></div></div></div>`)
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

if(isGameTestMode()||['127.0.0.1','localhost'].includes(location.hostname))window.__REVISION_TEST__={
  snapshot:()=>({game:{...normalizePhaserState(),inventory:[...normalizePhaserState().inventory]},player:levelScene?.player?{x:levelScene.player.x,y:levelScene.player.y,frame:levelScene.player.frame.name,jumps:levelScene.jumpCount,bodyBottom:levelScene.player.body.bottom}:null,enemies:levelScene?.enemies?.filter(x=>x.active).map(x=>({id:x.id,type:x.enemyType,behavior:x.behavior,x:x.x,y:x.y,frame:x.frame.name}))||[],blocks:levelScene?.blocks?.filter(x=>x.active).length||0,collectibles:levelScene?.collectibles?.countActive(true)||0,oneWays:levelScene?.oneWays?.getLength()||0,terrain:levelScene?.solidTerrain?.getChildren().map(x=>({x:x.x,y:x.y,body:x.body?{x:x.body.x,y:x.body.y,width:x.body.width,height:x.body.height,enable:x.body.enable}:null}))||[],shieldVisible:Boolean(levelScene?.shieldFx?.visible),bulletRange:BULLET_RANGE}),
  hold:(direction,ms=500)=>new Promise(resolve=>{phaserInput[direction]=true;setTimeout(()=>{phaserInput[direction]=false;resolve()},ms)}),action:name=>{phaserInput[name]=true},teleport:(x,y=420)=>{if(levelScene?.player){levelScene.player.setPosition(x,y);levelScene.player.body.setVelocity(0,0)}},battle:id=>{const e=levelScene?.enemies.find(x=>x.active&&x.id===id);if(e)levelScene.beginBattle(e)},reset:()=>restartMuseumLevel()
};

const renderBeforePhaser=render;
render=function(){
  if(state.view!=='phaserGame'&&!isGameTestMode()){document.body.classList.remove('phaser-mode');destroyPhaser();renderBeforePhaser();return}
  document.body.classList.add('phaser-mode');content.innerHTML=phaserGameView();requestAnimationFrame(()=>{if(normalizePhaserState().status==='playing')startMuseumLevel()});
};
ensureDailyTask();if(isGameTestMode())testPhaserState=freshPhaserState();normalizePhaserState();render();
