/* 每日答题闯关：完成17题后解锁。使用原创DOM/CSS角色，不依赖第三方游戏素材。 */
const GAME_VERSION=3;
const GAME_WORLD_WIDTH=3600;
const QUESTION_BLOCK_COUNT=12;
const FINAL_BOSS_HP=5;
const GAME_THEMES=[
  {id:'gallery',name:'夜航美术馆',sky:'gallery',place:'画框回廊'},
  {id:'garden',name:'月门园林',sky:'garden',place:'借景长廊'},
  {id:'palace',name:'礼制宫殿',sky:'palace',place:'中轴庭院'},
  {id:'city',name:'现代艺术城',sky:'city',place:'构成街区'},
  {id:'cloud',name:'云上书库',sky:'cloud',place:'概念天台'},
  {id:'temple',name:'光影教堂',sky:'temple',place:'彩窗甬道'}
];
const originalHomeForGame=home;
const originalRenderForGame=render;
initialState.dailyGame=null;

function hashText(text){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function seeded(seed){
  let value=seed>>>0;
  return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
}
function gameDate(){return state.dailyDate||today()}
function dailyGameUnlocked(){
  return state.dailyDone||Object.values(state.dailyAnswers||{}).filter(x=>x?.answered).length>=17;
}
function fragmentSegments(q){
  let parts=String(q.keywords||'').split(/[｜|、，；]/).map(x=>x.trim()).filter(Boolean);
  if(parts.length<3){
    const clauses=String(q.answerText||'').split(/[，。；、]/).map(x=>x.trim()).filter(x=>x.length>1);
    parts=[...parts,...clauses.filter(x=>!parts.includes(x))];
  }
  if(parts.length<3){
    const clean=String(q.answerText||q.q).replace(/[，。；、！？\s]/g,'');
    const size=Math.max(2,Math.ceil(clean.length/3));
    for(let i=0;i<clean.length&&parts.length<3;i+=size)parts.push(clean.slice(i,i+size));
  }
  return [...new Set(parts)].slice(0,Math.min(4,Math.max(3,parts.length)));
}
function makeFragmentPool(){
  const ids=(state.dailyTask||[]).length?state.dailyTask:questionBank.slice(0,17).map(q=>q.id);
  return ids.flatMap(qid=>{
    const q=getQuestion(qid);if(!q)return[];
    return fragmentSegments(q).map((text,index)=>({id:`${qid}-g${index}`,questionId:qid,text,order:index}));
  });
}
function shuffled(items,rand){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
  return copy;
}
function newDailyGame(date=gameDate()){
  const seed=hashText(`00504-${date}-game-${GAME_VERSION}`);
  const rand=seeded(seed);
  const pool=makeFragmentPool();
  const taskIds=shuffled([...(state.dailyTask||[])],rand);
  const guaranteedIds=[];
  for(const qid of taskIds){
    const group=pool.filter(x=>x.questionId===qid).map(x=>x.id);
    if(group.length&&guaranteedIds.length+group.length<=20)guaranteedIds.push(...group);
    if(new Set(guaranteedIds.map(id=>getFragment(id)?.questionId)).size>=5)break;
  }
  const filler=shuffled(pool.filter(x=>!guaranteedIds.includes(x.id)),rand).slice(0,Math.max(0,20-guaranteedIds.length)).map(x=>x.id);
  const initial=[...guaranteedIds,...filler];
  return{
    version:GAME_VERSION,date,seed,status:dailyGameUnlocked()?'ready':'locked',
    hearts:5,maxHearts:5,initialHints:3,hints:3,shield:false,
    inventory:[...new Set(initial)],playerX:80,invincibleUntil:0,defeatedEnemies:[],collectedBlocks:[],
    extraEnemies:[],enemyHp:{},currentBattle:null,attempts:0,replays:0,
    shots:0,smallDefeated:0,mediumDefeated:0,bossDefeated:0,
    rewardClaimed:false,completedAt:null,lastEvent:'完成17题，关卡就会开启。'
  };
}
function normalizeDailyGame(){
  const date=gameDate();
  if(!state.dailyGame||state.dailyGame.date!==date||state.dailyGame.version!==GAME_VERSION){
    state.dailyGame=newDailyGame(date);
  }
  const g=state.dailyGame;
  if(dailyGameUnlocked()&&g.status==='locked')g.status='ready';
  if(!Array.isArray(g.inventory))g.inventory=[];
  if(!Array.isArray(g.defeatedEnemies))g.defeatedEnemies=[];
  if(!Array.isArray(g.collectedBlocks))g.collectedBlocks=[];
  if(!Array.isArray(g.extraEnemies))g.extraEnemies=[];
  if(!g.enemyHp||typeof g.enemyHp!=='object')g.enemyHp={};
  if(typeof g.hints!=='number')g.hints=3;
  return g;
}
function stageData(){
  const g=normalizeDailyGame(),rand=seeded(g.seed);
  const theme=GAME_THEMES[g.seed%GAME_THEMES.length];
  const blocks=Array.from({length:QUESTION_BLOCK_COUNT},(_,i)=>({
    id:`block-${i}`,x:330+i*250+Math.floor(rand()*90),reward:['hint','heart','medium','fragments','shield'][Math.floor(rand()*5)]
  }));
  const enemies=[];
  for(let i=0;i<10;i++)enemies.push({id:`small-${i}`,type:'small',x:260+i*270+Math.floor(rand()*100),name:'墨点怪'});
  for(let i=0;i<4;i++)enemies.push({id:`medium-${i}`,type:'medium',x:690+i*650+Math.floor(rand()*120),name:'概念巡卫',maxHp:1});
  enemies.push({id:'boss-a',type:'boss',x:1780,name:'构图巨像',maxHp:3+(g.seed%2)});
  enemies.push({id:'boss-b',type:'boss',x:2680,name:'错题守门人',maxHp:4+(g.seed%2)});
  enemies.push({id:'boss-final',type:'dictation',x:3380,name:'默写终审官',maxHp:FINAL_BOSS_HP});
  g.extraEnemies.forEach((e,i)=>enemies.push({id:e.id,type:'medium',x:e.x||900+i*160,name:'方块伏兵',maxHp:1}));
  return{theme,blocks,enemies};
}
function getEnemy(id){return stageData().enemies.find(x=>x.id===id)}
function isEnemyAlive(id){return !normalizeDailyGame().defeatedEnemies.includes(id)}
function getFragment(id){return makeFragmentPool().find(x=>x.id===id)}
function addFragments(count,questionId=''){
  const g=normalizeDailyGame(),pool=makeFragmentPool();
  let candidates=pool.filter(x=>!g.inventory.includes(x.id));
  const rand=seeded(g.seed+g.smallDefeated*97+g.mediumDefeated*193+g.inventory.length);
  if(questionId){
    const needed=pool.filter(x=>x.questionId===questionId&&!g.inventory.includes(x.id));
    const others=candidates.filter(x=>x.questionId!==questionId);
    candidates=[...shuffled(needed,rand),...shuffled(others,rand)];
  }else{
    candidates=shuffled(candidates,rand);
  }
  candidates.slice(0,count).forEach(x=>g.inventory.push(x.id));
  g.inventory=[...new Set(g.inventory)];
}
function gameStatusCard(){
  const g=normalizeDailyGame(),unlocked=dailyGameUnlocked();
  const action=unlocked
    ?`<button class="primary-btn game-launch" onclick="enterDailyGame()">${g.status==='completed'?'再次挑战':'进入今日关卡'} →</button>`
    :`<button class="primary-btn game-launch" disabled>完成17题后解锁</button>`;
  return`<section class="game-home-card ${unlocked?'is-unlocked':'is-locked'}">
    <div class="game-home-art" aria-hidden="true"><span class="pixel-hero">艺</span><i></i><b>?</b><em></em></div>
    <div><span class="game-kicker">${unlocked?'今日关卡已解锁':'今日关卡未解锁'}</span>
      <h3>${stageData().theme.name}</h3>
      <p>击败小怪收集答案碎片，通过中怪与Boss的答题战斗。终点的默写终审官有5滴血，只接受你亲手写出的答案。</p>
      <div class="game-home-stats"><span>♥ 5颗心</span><span>卡 3张提示</span><span>？ ${QUESTION_BLOCK_COUNT}个方块</span><span>Boss 3个</span></div>${action}
    </div>
  </section>`;
}
home=function(){
  const markup=originalHomeForGame();
  return markup.replace(/<\/div>$/,`${gameStatusCard()}</div>`);
};
function enterDailyGame(){
  const g=normalizeDailyGame();
  if(!dailyGameUnlocked()){notify('先完成今天的17道题');return}
  if(g.status==='ready')g.status='playing';
  state.view='game';save();render();
}
function gameHud(g){
  return`<div class="game-hud">
    <div class="hud-hearts" aria-label="剩余生命">${Array.from({length:g.maxHearts},(_,i)=>`<span class="${i<g.hearts?'full':''}">♥</span>`).join('')}</div>
    <div class="hud-pill">答案碎片 <strong>${g.inventory.length}</strong></div>
    <div class="hud-pill">提示卡 <strong>${g.hints}</strong></div>
    <div class="hud-pill ${g.shield?'shield-on':''}">护盾 <strong>${g.shield?'已装备':'无'}</strong></div>
  </div>`;
}
function gameView(){
  const g=normalizeDailyGame(),data=stageData();
  if(!dailyGameUnlocked())return shell('关卡还没有解锁','DAILY GAME · LOCKED',`<div class="panel game-locked"><div class="lock-orbit">17</div><h2>先完成今天的17道题</h2><p>答题完成后，答案会变成关卡里的战斗资源。</p><button class="primary-btn" onclick="showView('practice')">继续刷题 →</button></div>`);
  if(g.status==='failed')return shell('今日挑战失败','DAILY GAME · TRY AGAIN',`<div class="game-result failed"><div class="result-mark">×</div><h2>5颗心已经用完</h2><p>今天的17题和学习记录都保留。重新挑战会恢复5颗心、3张提示卡和20个基础碎片。</p><button class="primary-btn" onclick="restartDailyGame(false)">重新挑战</button></div>`);
  if(g.status==='completed')return shell('今日关卡完成','DAILY GAME · CLEARED',`<div class="game-result cleared"><div class="result-mark">✓</div><span class="game-kicker">${data.theme.name}</span><h2>三个Boss全部击败</h2><p>小怪 ${g.smallDefeated} · 中怪 ${g.mediumDefeated} · Boss ${g.bossDefeated} · 尝试 ${g.attempts+1} 次</p><div class="reward-ribbon">首次通关奖励已经保存，重复挑战奖励降低。</div><button class="primary-btn" onclick="restartDailyGame(true)">再次挑战</button><button class="text-btn" onclick="showView('home')">返回今日航线</button></div>`);
  const entities=data.enemies.map(enemy=>{
    if(!isEnemyAlive(enemy.id))return'';
    const hp=g.enemyHp[enemy.id]??enemy.maxHp??1;
    return`<button class="game-enemy ${enemy.type}" data-enemy="${enemy.id}" style="left:${enemy.x}px" onclick="focusEnemy('${enemy.id}')" aria-label="${enemy.name}">
      ${enemy.type==='small'?'<i>●</i>':enemy.type==='medium'?'<i>概</i>':enemy.type==='dictation'?'<i>默</i>':'<i>答</i>'}
      <span>${enemy.name}</span>${enemy.type!=='small'?`<b>${'▰'.repeat(hp)}</b>`:''}
    </button>`;
  }).join('');
  const blocks=data.blocks.map(block=>g.collectedBlocks.includes(block.id)?'':`<button class="question-block" data-block="${block.id}" style="left:${block.x}px" onclick="jumpAtBlock('${block.id}')" aria-label="问号方块">?</button>`).join('');
  return shell(data.theme.name,`DAILY GAME · ${gameDate().replaceAll('-','.')}`,`${gameHud(g)}
    <div class="game-brief"><strong>任务</strong><span>击败2个碎片Boss和1个默写Boss</span><span class="game-event">${escapeHtml(g.lastEvent)}</span></div>
    <div class="game-viewport theme-${data.theme.sky}" id="gameViewport">
      <div class="game-world" style="width:${GAME_WORLD_WIDTH}px">
        <div class="world-sky"><i></i><i></i><i></i></div>
        <div class="art-columns">${Array.from({length:12},(_,i)=>`<span style="left:${180+i*300}px"></span>`).join('')}</div>
        ${blocks}${entities}
        <div class="game-player ${Date.now()<(g.invincibleUntil||0)?'is-invincible':''}" id="gamePlayer" style="left:${g.playerX}px"><i>艺</i><span></span></div>
        <div class="game-finish" style="left:3500px"><i>终</i><span>终点</span></div>
        <div class="game-ground"></div>
      </div>
    </div>
    <div class="game-controls" aria-label="关卡控制">
      <div><button data-hold="-36">←</button><button data-hold="36">→</button></div>
      <div><button onclick="jumpGame()">跳跃</button><button class="shoot" onclick="shootGame()">发射</button></div>
    </div>
    <p class="game-help">电脑：方向键移动，空格跳跃，F发射。手机：使用下方按钮。靠近问号方块后跳跃顶开。</p>`);
}
function updateGameCamera(){
  const g=normalizeDailyGame(),player=document.getElementById('gamePlayer'),viewport=document.getElementById('gameViewport');
  if(player)player.style.left=`${g.playerX}px`;
  if(viewport)viewport.scrollLeft=Math.max(0,g.playerX-viewport.clientWidth*.38);
}
let gameSaveTimer=null;
function saveGameSoon(){
  clearTimeout(gameSaveTimer);gameSaveTimer=setTimeout(()=>save(),250);
}
function moveGame(delta){
  if(state.view!=='game')return;
  const g=normalizeDailyGame();g.playerX=Math.max(40,Math.min(GAME_WORLD_WIDTH-100,g.playerX+delta));
  const player=document.getElementById('gamePlayer');if(player)player.classList.toggle('face-left',delta<0);
  const touching=stageData().enemies.find(e=>e.type==='small'&&isEnemyAlive(e.id)&&Math.abs(e.x-g.playerX)<46);
  if(touching)takeGameDamage('碰到小怪',delta);
  updateGameCamera();saveGameSoon();
}
function jumpGame(){
  if(state.view!=='game')return;
  const g=normalizeDailyGame(),player=document.getElementById('gamePlayer');
  player?.classList.remove('jumping');void player?.offsetWidth;player?.classList.add('jumping');
  const block=stageData().blocks.find(b=>!g.collectedBlocks.includes(b.id)&&Math.abs(b.x-g.playerX)<105);
  if(block)setTimeout(()=>collectQuestionBlock(block.id),220);
}
function jumpAtBlock(id){
  const block=stageData().blocks.find(x=>x.id===id);if(!block)return;
  const g=normalizeDailyGame();
  if(Math.abs(block.x-g.playerX)>130){g.lastEvent='先移动到问号方块下方，再跳跃顶开。';save();render();return}
  jumpGame();
}
function collectQuestionBlock(id){
  const g=normalizeDailyGame(),block=stageData().blocks.find(x=>x.id===id);
  if(!block||g.collectedBlocks.includes(id))return;
  g.collectedBlocks.push(id);
  if(block.reward==='hint'){g.hints++;g.lastEvent='问号方块掉出1张提示卡。'}
  if(block.reward==='heart'){const before=g.hearts;g.hearts=Math.min(g.maxHearts,g.hearts+1);g.lastEvent=before===g.hearts?'生命已满，蘑菇转化为5 XP。':'吃到蘑菇，恢复1颗心。';if(before===g.hearts)state.xp+=5}
  if(block.reward==='medium'){g.extraEnemies.push({id:`extra-${id}`,x:Math.min(GAME_WORLD_WIDTH-300,block.x+130)});g.lastEvent='方块里藏着一只中怪！'}
  if(block.reward==='fragments'){addFragments(5);g.lastEvent='获得5个答案碎片。'}
  if(block.reward==='shield'){g.shield=true;g.lastEvent='获得保护罩，可以抵挡一次伤害。'}
  save();render();
}
function bulletAnimation(targetX){
  const g=normalizeDailyGame(),world=document.querySelector('.game-world');
  if(!world)return;
  const bullet=document.createElement('i');bullet.className='game-bullet';bullet.style.left=`${g.playerX+44}px`;world.appendChild(bullet);
  requestAnimationFrame(()=>bullet.style.transform=`translateX(${Math.max(120,targetX-g.playerX)}px)`);
  setTimeout(()=>bullet.remove(),360);
}
function shootGame(){
  if(state.view!=='game')return;
  const g=normalizeDailyGame();g.shots++;
  const enemy=stageData().enemies.filter(e=>isEnemyAlive(e.id)&&e.x>=g.playerX-20).sort((a,b)=>a.x-b.x)[0];
  if(!enemy||enemy.x-g.playerX>390){bulletAnimation(g.playerX+360);g.lastEvent='子弹飞过了长廊，没有命中目标。';saveGameSoon();return}
  bulletAnimation(enemy.x);
  setTimeout(()=>{
    if(enemy.type==='small')defeatSmall(enemy);
    else startBattle(enemy.id);
  },280);
}
function focusEnemy(id){
  const enemy=getEnemy(id),g=normalizeDailyGame();if(!enemy)return;
  if(Math.abs(enemy.x-g.playerX)>410){g.lastEvent='距离太远，先靠近再发射。';save();render();return}
  shootGame();
}
function defeatSmall(enemy){
  const g=normalizeDailyGame();if(!isEnemyAlive(enemy.id))return;
  g.defeatedEnemies.push(enemy.id);g.smallDefeated++;const count=1+((g.seed+g.smallDefeated)%2);
  addFragments(count);state.xp+=2;g.lastEvent=`击败${enemy.name}，掉落${count}个答案碎片。`;save();render();
}
function takeGameDamage(reason,direction=0){
  const g=normalizeDailyGame();
  if(Date.now()<(g.invincibleUntil||0))return false;
  if(g.shield){g.shield=false;g.lastEvent=`保护罩抵挡了${reason}。`;save();render();return false}
  g.hearts=Math.max(0,g.hearts-1);g.invincibleUntil=Date.now()+1200;
  if(direction)g.playerX=Math.max(40,Math.min(GAME_WORLD_WIDTH-100,g.playerX-(direction>0?82:-82)));
  g.lastEvent=`${reason}，失去1颗心，短暂无敌。`;
  if(g.hearts<=0){g.status='failed';g.currentBattle=null;state.view='game'}
  save();render();return true;
}
function battleQuestionIds(enemy){
  const tasks=(state.dailyTask||[]).map(getQuestion).filter(Boolean);
  const ranked=[...tasks].sort((a,b)=>(b.answerText?.length||0)-(a.answerText?.length||0));
  const rand=seeded(hashText(`${normalizeDailyGame().seed}-${enemy.id}`));
  const count=enemy.type==='medium'?1:enemy.maxHp;
  const heldTexts=normalizeDailyGame().inventory.map(getFragment).filter(Boolean).map(x=>x.text);
  const answerable=shuffled(tasks.filter(q=>fragmentSegments(q).every(text=>heldTexts.includes(text))),rand);
  const source=enemy.type==='dictation'
    ?ranked.filter(q=>(q.answerText||'').length>=10)
    :answerable.length?answerable:shuffled(tasks,rand);
  return Array.from({length:count},(_,i)=>(source[i%source.length]||tasks[i%tasks.length]).id);
}
function startBattle(enemyId){
  const g=normalizeDailyGame(),enemy=getEnemy(enemyId);if(!enemy||!isEnemyAlive(enemyId))return;
  if(g.enemyHp[enemyId]==null)g.enemyHp[enemyId]=enemy.maxHp||1;
  g.currentBattle={enemyId,type:enemy.type,questionIds:battleQuestionIds(enemy),questionIndex:0,selected:[],draft:'',feedback:null,hinted:[]};
  state.view='battle';save();render();
}
function currentBattleQuestion(){
  const b=normalizeDailyGame().currentBattle;return b?getQuestion(b.questionIds[b.questionIndex]):null;
}
function battleInventory(){
  const g=normalizeDailyGame(),q=currentBattleQuestion(),selected=g.currentBattle?.selected||[];
  return g.inventory.map(getFragment).filter(Boolean).map(f=>`<button class="battle-fragment ${selected.includes(f.id)?'selected':''} ${g.currentBattle.hinted.includes(f.id)?'hinted':''}" onclick="toggleBattleFragment('${f.id}')">${escapeHtml(f.text)}</button>`).join('');
}
function battleView(){
  const g=normalizeDailyGame(),b=g.currentBattle,enemy=b&&getEnemy(b.enemyId),q=currentBattleQuestion();
  if(!b||!enemy||!q){state.view='game';return gameView()}
  const hp=g.enemyHp[enemy.id]??enemy.maxHp;
  const isDictation=enemy.type==='dictation';
  const selected=(b.selected||[]).map(getFragment).filter(Boolean);
  const hintWords=(b.revealedKeywords||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join('');
  const answerArea=isDictation
    ?`<label class="dictation-label" for="bossDraft">只凭记忆写出答案</label>
      <textarea id="bossDraft" class="boss-draft" placeholder="不要求逐字相同，只要核心意思一致即可。" oninput="saveBossDraft(this.value)">${escapeHtml(b.draft||'')}</textarea>
      ${hintWords?`<div class="revealed-hints">已提示：${hintWords}</div>`:''}`
    :`<div class="assembled-answer">${selected.length?selected.map((f,i)=>`<button onclick="removeBattleFragment(${i})"><small>${i+1}</small>${escapeHtml(f.text)}</button>`).join(''):'点击下方碎片，按顺序组成答案'}</div>
      <div class="battle-fragments">${battleInventory()}</div>`;
  const feedback=b.feedback?`<div class="battle-feedback ${b.feedback.correct?'correct':'wrong'}"><strong>${b.feedback.correct?'✓ 攻击命中':'× 敌人反击'}</strong><p>${escapeHtml(b.feedback.message)}</p></div>`:'';
  return shell(enemy.name,`${isDictation?'DICTATION BOSS':'ANSWER BATTLE'} · ${b.questionIndex+1}/${b.questionIds.length}`,`
    <div class="battle-stage ${isDictation?'dictation-stage':''}">
      <div class="fighter player-fighter"><div class="fighter-avatar">艺</div><strong>记忆航行员</strong><div class="mini-hearts">${'♥'.repeat(g.hearts)}</div></div>
      <div class="battle-center"><div class="versus">VS</div><div class="attack-lane"><i></i></div></div>
      <div class="fighter enemy-fighter ${b.feedback&&!b.feedback.correct?'attacking':''}"><div class="fighter-avatar">${isDictation?'默':enemy.type==='boss'?'答':'概'}</div><strong>${enemy.name}</strong><div class="enemy-health">${Array.from({length:enemy.maxHp},(_,i)=>`<span class="${i<hp?'full':''}"></span>`).join('')}</div></div>
    </div>
    ${gameHud(g)}
    <div class="panel battle-panel">
      <div class="battle-question-meta"><span>${q.chapter}</span><span>${isDictation?'默写题：允许同义表达':'用答案碎片发动攻击'}</span></div>
      <h2>${escapeHtml(q.q)}</h2>${answerArea}${feedback}
      <div class="battle-actions"><button class="text-btn" onclick="retreatBattle()">暂时撤退</button><button class="hint-btn" onclick="useBattleHint()" ${g.hints<=0?'disabled':''}>提示卡 ${g.hints}</button><button class="primary-btn" onclick="submitBattleAnswer()">提交攻击 →</button></div>
    </div>`);
}
function toggleBattleFragment(id){
  const b=normalizeDailyGame().currentBattle;if(!b||b.type==='dictation')return;
  const index=b.selected.indexOf(id);if(index>=0)b.selected.splice(index,1);else b.selected.push(id);
  save();render();
}
function removeBattleFragment(index){
  const b=normalizeDailyGame().currentBattle;if(!b)return;b.selected.splice(index,1);save();render();
}
function saveBossDraft(value){
  const b=normalizeDailyGame().currentBattle;if(!b)return;b.draft=value;saveGameSoon();
}
const GAME_SYNONYMS={
  '审美创造':['审美活动','创造美','艺术创造'],'精神生产':['精神活动','精神产品'],'社会实践':['社会活动','实践活动'],
  '生活源泉':['来源于生活','以生活为基础','社会生活'],'反作用':['影响生活','作用于生活'],
  '继承传统':['传承传统','传统继承','继续传承','传承优秀传统','传承有价值内容'],
  '文化连续性':['延续文化','文化传承','文化延续','文化才能延续','保持文化脉络'],
  '面向时代':['结合时代','当下时代','时代生活','面向当代','回应时代'],
  '创新发展':['进行创新','新的创造','创新创造','发展创新','适应新的生活'],
  '当代表达':['现代转化','现代创新'],
  '结构安全':['安全结构','保证安全'],'使用功能':['实用功能','满足使用'],
  '具体可感':['形象具体','可感性'],'情感性':['表达情感','情感表达']
};
function normalizeText(text){return String(text||'').toLowerCase().replace(/[\s，。；、！？：,.!?;:'"“”‘’（）()]/g,'')}
function bigrams(text){
  const clean=normalizeText(text),set=new Set();
  for(let i=0;i<clean.length-1;i++)set.add(clean.slice(i,i+2));
  return set;
}
function semanticDictationScore(user,q){
  const clean=normalizeText(user),answer=normalizeText(q.answerText);
  const keys=String(q.keywords||'').split(/[｜|、，；]/).map(x=>x.trim()).filter(Boolean);
  const hits=keys.filter(key=>{
    const forms=[key,...(GAME_SYNONYMS[key]||[])];return forms.some(form=>clean.includes(normalizeText(form)));
  });
  const userPairs=bigrams(clean),answerPairs=bigrams(answer);
  const overlap=[...userPairs].filter(x=>answerPairs.has(x)).length;
  const similarity=overlap/Math.max(1,Math.min(userPairs.size,answerPairs.size));
  const coverage=hits.length/Math.max(1,keys.length);
  const lengthRatio=clean.length/Math.max(1,answer.length);
  const correct=clean.length>=6&&(coverage>=.75||(coverage>=.5&&lengthRatio>=.35&&(similarity>=.16||clean.length>=18))||similarity>=.58);
  return{correct,coverage,similarity,missing:keys.filter(x=>!hits.includes(x))};
}
function useBattleHint(){
  const g=normalizeDailyGame(),b=g.currentBattle,q=currentBattleQuestion();if(!b||!q||g.hints<=0)return;
  g.hints--;
  if(b.type==='dictation'){
    const keys=String(q.keywords||'').split(/[｜|、，；]/).filter(Boolean);
    b.revealedKeywords=b.revealedKeywords||[];
    const next=keys.find(x=>!b.revealedKeywords.includes(x));if(next)b.revealedKeywords.push(next);
    b.feedback={correct:true,message:next?`提示一个核心意思：${next}`:'核心意思已经全部提示。'};
  }else{
    const required=fragmentSegments(q);
    const held=g.inventory.map(getFragment).filter(Boolean);
    const next=held.find(f=>required.includes(f.text)&&!b.hinted.includes(f.id)&&!b.selected.includes(f.id));
    if(next){b.hinted.push(next.id);b.feedback={correct:true,message:'蓝色呼吸光标出了一个正确碎片。'}}
    else{addFragments(1,q.id);b.feedback={correct:true,message:'补给了一枚当前题目所需的碎片。'}}
  }
  save();render();
}
function submitBattleAnswer(){
  const g=normalizeDailyGame(),b=g.currentBattle,enemy=getEnemy(b.enemyId),q=currentBattleQuestion();if(!b||!enemy||!q)return;
  let correct=false,message='';
  if(b.type==='dictation'){
    const draft=(document.getElementById('bossDraft')?.value??b.draft??'').trim();b.draft=draft;
    const score=semanticDictationScore(draft,q);correct=score.correct;
    message=correct
      ?`核心意思一致，语义攻击命中。关键词覆盖 ${Math.round(score.coverage*100)}%。`
      :`意思还不够完整${score.missing.length?'，建议补上：'+score.missing.slice(0,2).join('、'):''}。不要求逐字一致，可以换一种说法。`;
  }else{
    const picked=b.selected.map(getFragment).filter(Boolean).map(x=>x.text);
    const required=fragmentSegments(q);correct=picked.length===required.length&&picked.every((x,i)=>x===required[i]);
    const missing=required.filter(x=>!picked.includes(x));
    message=correct?'答案顺序和核心要点正确。':missing.length?`还缺少或放错了核心片段：${missing.slice(0,2).join('、')}`:'片段顺序需要调整。';
  }
  if(correct){
    g.enemyHp[enemy.id]=Math.max(0,(g.enemyHp[enemy.id]??enemy.maxHp)-1);
    b.feedback={correct:true,message};b.selected=[];b.draft='';
    if(g.enemyHp[enemy.id]<=0){
      setTimeout(()=>finishEnemyBattle(enemy),420);save();render();return;
    }
    b.questionIndex=Math.min(b.questionIndex+1,b.questionIds.length-1);b.hinted=[];b.revealedKeywords=[];save();render();
  }else{
    b.feedback={correct:false,message};b.selected=[];
    if(g.shield){g.shield=false;b.feedback.message+=' 保护罩抵挡了这次反击。';save();render()}
    else{g.hearts=Math.max(0,g.hearts-1);if(g.hearts<=0){g.status='failed';g.currentBattle=null;state.view='game'}save();render()}
  }
}
function finishEnemyBattle(enemy){
  const g=normalizeDailyGame();if(!g.defeatedEnemies.includes(enemy.id))g.defeatedEnemies.push(enemy.id);
  if(enemy.type==='medium'){g.mediumDefeated++;addFragments(3+((g.seed+g.mediumDefeated)%3));state.xp+=10;g.lastEvent=`击败${enemy.name}，获得答案碎片补给。`}
  else{g.bossDefeated++;state.xp+=enemy.type==='dictation'?50:30;g.lastEvent=`击败${enemy.name}！`}
  g.currentBattle=null;
  const bosses=['boss-a','boss-b','boss-final'];
  if(bosses.every(id=>g.defeatedEnemies.includes(id))){
    g.status='completed';g.completedAt=new Date().toISOString();
    if(!g.rewardClaimed){state.xp+=100;g.rewardClaimed=true}
  }
  state.view='game';save();render();
}
function retreatBattle(){const g=normalizeDailyGame();g.currentBattle=null;state.view='game';g.lastEvent='已退出战斗，可以继续收集答案碎片。';save();render()}
function restartDailyGame(replay){
  const old=normalizeDailyGame(),next=newDailyGame(old.date);
  next.status='playing';next.attempts=(old.attempts||0)+(replay?0:1);next.replays=(old.replays||0)+(replay?1:0);
  next.rewardClaimed=Boolean(old.rewardClaimed);next.lastEvent=replay?'重复挑战奖励降低，学习记录继续累计。':'重新挑战：生命、提示卡和基础碎片已恢复。';
  state.dailyGame=next;state.view='game';save();render();
}
function bindGameControls(){
  document.querySelectorAll('[data-hold]').forEach(button=>{
    if(button.dataset.bound)return;button.dataset.bound='1';let timer;
    const start=event=>{event.preventDefault();moveGame(Number(button.dataset.hold));timer=setInterval(()=>moveGame(Number(button.dataset.hold)),90)};
    const stop=()=>clearInterval(timer);
    button.addEventListener('pointerdown',start);button.addEventListener('pointerup',stop);button.addEventListener('pointerleave',stop);button.addEventListener('pointercancel',stop);
  });
  updateGameCamera();
}
render=function(){
  normalizeDailyGame();
  if(state.view==='game')content.innerHTML=gameView();
  else if(state.view==='battle')content.innerHTML=battleView();
  else originalRenderForGame();
  document.querySelectorAll('.nav-item,.mobile-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  const back=document.getElementById('mobileBack');if(back)back.classList.toggle('is-hidden',state.view==='home');
  if(state.view==='game')requestAnimationFrame(bindGameControls);
};
document.addEventListener('keydown',event=>{
  if(state.view!=='game'||/input|textarea|select/i.test(document.activeElement?.tagName||''))return;
  if(['ArrowLeft','a','A'].includes(event.key)){event.preventDefault();moveGame(-36)}
  if(['ArrowRight','d','D'].includes(event.key)){event.preventDefault();moveGame(36)}
  if([' ','ArrowUp','w','W'].includes(event.key)){event.preventDefault();jumpGame()}
  if(['f','F','j','J'].includes(event.key)){event.preventDefault();shootGame()}
});
normalizeDailyGame();
render();
