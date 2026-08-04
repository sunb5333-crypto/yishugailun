/* RPG第四版：路线、角色、装备、掉落、地图与兼容存档。 */
const RPG_VERSION=1;
const RPG_MAPS=[
  {id:'gallery',name:'古典油画长廊',panel:0,accent:'#e7b854',boss:'馆藏馆主',hazard:'移动画框'},
  {id:'blueprint',name:'建筑蓝图馆',panel:1,accent:'#7db6d4',boss:'蓝图巨像',hazard:'升降脚手架'},
  {id:'garden',name:'东方园林',panel:3,accent:'#7ec69c',boss:'园林石狮',hazard:'水面与假山'},
  {id:'cathedral',name:'圣像穹顶',panel:4,accent:'#d38a75',boss:'圣像主教',hazard:'彩窗与钟摆'},
  {id:'modern',name:'现代艺术实验室',panel:5,accent:'#7dd7e6',boss:'抽象核心',hazard:'旋转平台与光幕'}
];
const RPG_RARITIES=[
  {id:'plain',name:'一般',color:'#c7cbd1',rank:0},
  {id:'common',name:'普通',color:'#59d17d',rank:1},
  {id:'excellent',name:'卓越',color:'#55a9ff',rank:2},
  {id:'fine',name:'精品',color:'#b26cff',rank:3},
  {id:'mythic',name:'凤毛麟角',color:'#ff9e3d',rank:4},
  {id:'legendary',name:'传说',color:'#f04444',rank:5}
];
const RPG_WEAPONS={
  sword:{name:'单手剑',multiplier:1,rate:1,range:78,combo:3,tradeoff:'均衡，没有额外优势'},
  greatsword:{name:'重剑',multiplier:1.75,rate:.58,range:102,combo:1,tradeoff:'移动速度 -12%',movePenalty:.12,stagger:2},
  dual:{name:'双剑',multiplier:.66,rate:1.7,range:62,combo:5,tradeoff:'防御 -8%',defensePenalty:.08},
  bow:{name:'长弓',multiplier:.9,rate:.8,range:820,combo:1,tradeoff:'近距离伤害 -20%',closePenalty:.2,pierce:3}
};
const RPG_ARMOR={helmet:'头盔',chest:'胸甲',bracer:'护腕',boots:'战靴'};
const RPG_LEGENDARIES={
  sword:{name:'策展人誓剑',effect:'第三段攻击发射金色剑气',drawback:'攻速 -8%'},
  greatsword:{name:'断代重锋',effect:'蓄力攻击破甲并眩晕大型怪',drawback:'持有时移动 -12%'},
  dual:{name:'双生刻刀',effect:'成功躲避后3次攻击必定暴击',drawback:'防御 -12%'},
  bow:{name:'远景长弓',effect:'满蓄力箭贯穿3名敌人，远距伤害 +35%',drawback:'近距伤害 -20%'},
  helmet:{name:'真知之冠',effect:'每个灵魂题获得一次提示蓝光',drawback:'最大生命 -10%'},
  chest:{name:'馆藏守护甲',effect:'每个记录点后首次致命伤保留1生命并获得护盾',drawback:'移动 -8%'},
  bracer:{name:'铭文护腕',effect:'答对灵魂题后攻速 +8%，最多3层',drawback:'答错清除层数'},
  boots:{name:'回廊踏影靴',effect:'躲避后下一击伤害 +40%',drawback:'防御 -10%'}
};
const RPG_CONSUMABLES={
  potion:{name:'修复药剂',icon:'✚',description:'恢复35%最大生命'},
  shield:{name:'护盾晶体',icon:'◉',description:'抵挡下一次攻击'},
  speed:{name:'迅捷素描',icon:'»',description:'12秒移动+20%，躲避冷却-20%'},
  polish:{name:'武器上光剂',icon:'✦',description:'12秒攻击+25%'},
  lens:{name:'灵魂透镜',icon:'◌',description:'20秒标出灵魂怪'},
  silence:{name:'静默画框',icon:'▣',description:'打断治疗并沉默5秒'},
  hint:{name:'提示卡',icon:'?',description:'让一个正确碎片发出蓝光'}
};
const RPG_MONSTERS={
  agile:{name:'敏捷小怪',tier:'small',hp:30,attack:8,defense:2,skill:'dash'},
  ranged:{name:'远程小怪',tier:'small',hp:25,attack:7,defense:1,skill:'shot'},
  guardian:{name:'防御中怪',tier:'medium',hp:88,attack:10,defense:12,skill:'guard'},
  berserker:{name:'狂战中怪',tier:'medium',hp:58,attack:17,defense:4,skill:'charge'},
  large:{name:'大型展品怪',tier:'large',hp:175,attack:21,defense:10,skill:'stomp'},
  healer:{name:'修复师',tier:'healer',hp:52,attack:0,defense:5,skill:'heal'},
  boss:{name:'展厅Boss',tier:'boss',hp:330,attack:23,defense:14,skill:'boss'}
};
const RPG_DROP_CHANCE={small:{normal:.08,soul:.18},medium:{normal:.18,soul:.32},large:{normal:.30,soul:.48},healer:{normal:.22,soul:.38}};
const RPG_RARITY_WEIGHTS={
  small:[50,29,14,5,1,1],medium:[25,31,24,13,6,1],healer:[25,31,24,13,6,1],large:[10,20,30,25,14,1]
};
const RPG_POSITIVE_AFFIXES=[
  ['attack','攻击',3,12],['crit','暴击率',2,8],['attackSpeed','攻击速度',3,12],['range','射程',4,15],
  ['maxHp','最大生命',4,14],['defense','防御',3,12],['moveSpeed','移动速度',2,9],['dodgeCooldown','躲避冷却',-12,-3],
  ['knockback','击退',5,20],['coinBonus','金币加成',4,15],['xpBonus','经验加成',4,15]
];
const RPG_NEGATIVE_AFFIXES=[
  ['moveSpeed','移动速度',-15,-4],['attackSpeed','攻击速度',-15,-4],['maxHp','最大生命',-15,-5],
  ['defense','防御',-15,-5],['dodgeCooldown','躲避冷却',5,15],['closeDamage','近距伤害',-15,-6],['farDamage','远距伤害',-15,-6]
];

function rpgHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rpgRandom(seed){let x=(seed>>>0)||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function rpgShuffle(list,seed){const out=[...list],rand=rpgRandom(rpgHash(seed));for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function rpgUid(prefix,seed){return`${prefix}-${Date.now().toString(36)}-${rpgHash(seed+Math.random()).toString(36)}`}
function rpgToday(){return typeof gameDate==='function'?gameDate():new Date().toISOString().slice(0,10)}
function rpgDefaultPlayer(){return{level:1,xp:0,coins:0,dust:0,maxHp:100,hp:100,attack:10,defense:5,crit:.05,moveSpeed:245,dodgeCooldown:1200,shield:false,legendaryStacks:0}}
function rpgStarterSword(){return{id:'starter-sword',baseId:'sword',slot:'weapon',rarity:'plain',rarityRank:0,itemLevel:1,upgrade:0,name:'见习修复剑',mainStat:10,affixes:[],drawback:'均衡，没有额外优势',locked:true}}
function rpgDefault(){const sword=rpgStarterSword();return{version:RPG_VERSION,player:rpgDefaultPlayer(),equipment:{helmet:null,chest:null,bracer:null,boots:null,weapons:[sword.id,null,null],activeWeapon:0,quickItems:['potion','shield','hint']},inventory:[sword],consumables:{potion:2,shield:1,speed:0,polish:0,lens:0,silence:0,hint:3},route:{unlocked:1,current:1,nodes:[],lastPracticeDate:''},run:null,codex:{items:[],monsters:[],bosses:[]},pendingLoot:[],createdAt:new Date().toISOString()}}
function ensureRpgState(){
  if(!state.rpg||typeof state.rpg!=='object'){state.rpg=rpgDefault();const old=state.phaserGame;if(old&&typeof old==='object'){state.rpg.player.shield=Boolean(old.shield);state.rpg.consumables.hint=Math.max(state.rpg.consumables.hint,Number(old.hints)||0);state.rpg.consumables.potion+=Math.max(0,Number(old.hearts||0)-5)}}
  const base=rpgDefault(),r=state.rpg;r.version=RPG_VERSION;r.player={...base.player,...r.player};r.equipment={...base.equipment,...r.equipment,weapons:[...(r.equipment?.weapons||base.equipment.weapons)].slice(0,3),quickItems:[...(r.equipment?.quickItems||base.equipment.quickItems)].slice(0,3)};
  r.inventory=Array.isArray(r.inventory)?r.inventory:base.inventory;r.consumables={...base.consumables,...r.consumables};r.route={...base.route,...r.route,nodes:Array.isArray(r.route?.nodes)?r.route.nodes:[]};r.codex={...base.codex,...r.codex};r.pendingLoot=Array.isArray(r.pendingLoot)?r.pendingLoot:[];
  if(!r.inventory.some(x=>x.id==='starter-sword')){const sword=rpgStarterSword();r.inventory.unshift(sword);r.equipment.weapons[0]=sword.id}
  rpgEnsureNodes(Math.max(1,r.route.unlocked));return r;
}
function rpgMapForNode(index){
  const bag=Math.floor((index-1)/5),pos=(index-1)%5,ids=RPG_MAPS.map(x=>x.id),order=rpgShuffle(ids,`rpg-map-bag-${bag}`);
  if(bag>0){const prev=rpgMapForNode(bag*5).id;if(order[0]===prev)[order[0],order[1]]=[order[1],order[0]]}
  return RPG_MAPS.find(x=>x.id===order[pos])||RPG_MAPS[0];
}
function rpgNodeQuestions(index){
  const lesson=typeof ensureDailyTask==='function'?ensureDailyTask():null,items=lesson?.items||[];
  return{ids:items.map(x=>x.id).slice(0,10),snapshot:items.slice(0,10).map(x=>({id:x.id,q:x.q,answerText:x.answerText,chapter:x.chapter,section:x.section,orderPolicy:typeof answerOrderPolicy==='function'?answerOrderPolicy(x):'semantic'}))};
}
function rpgCreateNode(index){const map=rpgMapForNode(index);return{id:index,mapId:map.id,mapName:map.name,layoutSeed:rpgHash(`layout-${index}-${map.id}`),difficulty:index,recommendedPower:Math.round(55+index*13),status:'locked',stars:0,bestTime:0,firstClear:false,sourceDate:'',questionIds:[],questionSnapshot:[],lootPreview:index%5===0?'Boss奖励箱':'装备与艺术粉尘'}}
function rpgEnsureNodes(count=1){const r=state.rpg;if(!r?.route)return;for(let i=1;i<=Math.min(88,count+4);i++){if(!r.route.nodes.some(x=>x.id===i))r.route.nodes.push(rpgCreateNode(i));const n=r.route.nodes.find(x=>x.id===i);n.status=n.firstClear||i<r.route.unlocked?'completed':i===r.route.unlocked&&Boolean(n.sourceDate)?'available':'locked'}return r.route.nodes}
function rpgUnlockToday(){const r=ensureRpgState(),lesson=typeof ensureDailyTask==='function'?ensureDailyTask():null;let node=r.route.nodes.find(x=>x.id===r.route.unlocked);if(!lesson?.done)return node;const today=rpgToday();if(r.route.lastPracticeDate!==today&&!node.sourceDate){const q=rpgNodeQuestions(node.id);node.sourceDate=today;node.questionIds=q.ids;node.questionSnapshot=q.snapshot;r.route.lastPracticeDate=today;node.status='available'}return node}
function rpgLevelScale(level){return{hp:1+.09*Math.max(0,level-1),attack:1+.065*Math.max(0,level-1),reward:1+.045*Math.max(0,level-1)}}
function rpgRarityByRoll(tier,rand){const weights=RPG_RARITY_WEIGHTS[tier]||RPG_RARITY_WEIGHTS.small,total=weights.reduce((a,b)=>a+b,0);let roll=rand()*total;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return RPG_RARITIES[i]}return RPG_RARITIES[0]}
function rpgAffix(source,rank,positive,rand){const pool=positive?RPG_POSITIVE_AFFIXES:RPG_NEGATIVE_AFFIXES,[key,label,min,max]=pool[Math.floor(rand()*pool.length)],scale=1+rank*.18,value=Math.round((min+rand()*(max-min))*scale*10)/10;return{key,label,value,positive}}
function rpgGenerateGear({tier='small',level=1,seed='',rarityId=''}){
  const rand=rpgRandom(rpgHash(seed)),rarity=rarityId?RPG_RARITIES.find(x=>x.id===rarityId):rpgRarityByRoll(tier,rand),slots=['helmet','chest','bracer','boots','weapon'],slot=slots[Math.floor(rand()*slots.length)],weaponIds=Object.keys(RPG_WEAPONS),baseId=slot==='weapon'?weaponIds[Math.floor(rand()*weaponIds.length)]:slot,legend=rarity.id==='legendary'?RPG_LEGENDARIES[baseId]:null;
  const positiveCount=[0,1,2,3,3,3][rarity.rank],affixes=[];for(let i=0;i<positiveCount;i++)affixes.push(rpgAffix(baseId,rarity.rank,true,rand));if(rarity.rank>0)affixes.push(rpgAffix(baseId,rarity.rank,false,rand));
  const baseName=slot==='weapon'?RPG_WEAPONS[baseId].name:RPG_ARMOR[slot],prefix=['朴素','新制','精工','大师','馆藏',''][rarity.rank],name=legend?.name||`${prefix}${baseName}`;
  return{id:rpgUid('gear',seed),baseId,slot,rarity:rarity.id,rarityRank:rarity.rank,itemLevel:level,upgrade:0,name,mainStat:Math.round((slot==='weapon'?9:5)*(1+level*.08)*(1+rarity.rank*.22)*10)/10,affixes,drawback:legend?.drawback||(slot==='weapon'?RPG_WEAPONS[baseId].tradeoff:affixes.find(x=>!x.positive)?.label||'无'),legendaryEffect:legend?.effect||'',setId:rarity.id==='mythic'?RPG_MAPS[Math.floor(rand()*RPG_MAPS.length)].id:'',locked:false};
}
function rpgRollMonsterLoot(enemy,run){
  const r=ensureRpgState(),rand=rpgRandom(rpgHash(`${run.seed}-${enemy.id}-${enemy.killSerial||0}`)),tier=enemy.tier==='boss'?'boss':enemy.tier,scale=rpgLevelScale(run.nodeId).reward,replay=run.replay?.6:1,coins=Math.round((tier==='small'?6:tier==='medium'?16:tier==='healer'?20:tier==='large'?38:95)*scale*replay*(enemy.hasSoul?1.8:1)),xp=Math.round(coins*1.35),loot={coins,xp,items:[],consumables:[]};
  if(tier==='boss')return rpgRollBossChest(run,rand,loot);
  const chance=RPG_DROP_CHANCE[tier]?.[enemy.hasSoul?'soul':'normal']||0;if(rand()<chance)loot.items.push(rpgGenerateGear({tier,level:run.nodeId,seed:`${run.seed}-${enemy.id}-gear`}));
  if(rand()<.18)loot.consumables.push(Object.keys(RPG_CONSUMABLES)[Math.floor(rand()*Object.keys(RPG_CONSUMABLES).length)]);return loot;
}
function rpgRollBossChest(run,rand,base={coins:0,xp:0,items:[],consumables:[]}){
  const chestRoll=rand(),rank=chestRoll<.2?5:chestRoll<.5?4:3,count=rand()<.4?2:3;base.chestRank=rank;
  for(let i=0;i<count;i++){const itemRank=i===0?rank:(rand()<.7?rank:Math.max(2,rank-1));base.items.push(rpgGenerateGear({tier:'large',level:run.nodeId,seed:`${run.seed}-boss-${i}-${rand()}`,rarityId:RPG_RARITIES[itemRank].id}))}return base;
}
function rpgItemById(id){return ensureRpgState().inventory.find(x=>x.id===id)||null}
function rpgComputedStats(){
  const r=ensureRpgState(),p=r.player,level=Math.max(1,p.level),stats={maxHp:100+(level-1)*3,attack:10+(level-1)*.5,defense:5+(level-1)*.25,crit:.05,attackSpeed:1,moveSpeed:245,dodgeCooldown:1200,range:1,coinBonus:0,xpBonus:0};
  const ids=[r.equipment.helmet,r.equipment.chest,r.equipment.bracer,r.equipment.boots,r.equipment.weapons[r.equipment.activeWeapon]].filter(Boolean),equippedItems=ids.map(rpgItemById).filter(Boolean),setCounts={};for(const item of equippedItems){const upgrade=1+(item.upgrade||0)*.05;if(item.slot==='weapon')stats.attack+=item.mainStat*upgrade;else stats.defense+=item.mainStat*.55*upgrade;for(const a of item.affixes||[]){const v=a.value/100;if(a.key==='attack')stats.attack*=1+v;else if(a.key==='maxHp')stats.maxHp*=1+v;else if(a.key==='defense')stats.defense*=1+v;else if(a.key==='crit')stats.crit+=v;else if(a.key==='attackSpeed')stats.attackSpeed*=1+v;else if(a.key==='moveSpeed')stats.moveSpeed*=1+v;else if(a.key==='dodgeCooldown')stats.dodgeCooldown*=1+v;else if(a.key==='range')stats.range*=1+v;else if(a.key==='coinBonus'||a.key==='xpBonus')stats[a.key]+=v}if(item.setId)setCounts[item.setId]=(setCounts[item.setId]||0)+1}
  for(const [setId,count] of Object.entries(setCounts)){if(count>=2){if(setId==='gallery')stats.crit+=.05;if(setId==='blueprint')stats.defense*=1.15;if(setId==='garden')stats.maxHp*=1.12;if(setId==='cathedral')stats.dodgeCooldown*=.9;if(setId==='modern')stats.moveSpeed*=1.1}if(count>=4){if(setId==='gallery'||setId==='modern')stats.attack*=1.15;if(setId==='blueprint')stats.maxHp*=1.15;if(setId==='garden')stats.defense*=1.12;if(setId==='cathedral')stats.attackSpeed*=1.12}}
  const legendaryIds=equippedItems.filter(x=>x.rarity==='legendary').map(x=>x.baseId);if(legendaryIds.includes('bracer'))stats.attackSpeed*=1+(r.player.legendaryStacks||0)*.08;
  const active=rpgItemById(r.equipment.weapons[r.equipment.activeWeapon])||rpgStarterSword(),weapon=RPG_WEAPONS[active.baseId]||RPG_WEAPONS.sword;if(weapon.movePenalty)stats.moveSpeed*=1-weapon.movePenalty;if(weapon.defensePenalty)stats.defense*=1-weapon.defensePenalty;return{...stats,maxHp:Math.round(stats.maxHp),attack:Math.round(stats.attack*10)/10,defense:Math.round(stats.defense*10)/10,weapon,weaponItem:active,legendaryIds,setCounts,power:Math.round(stats.maxHp*.22+stats.attack*4+stats.defense*2+stats.crit*100+active.rarityRank*18+(active.upgrade||0)*8)};
}
function rpgAddLoot(loot){const r=ensureRpgState();r.player.coins+=loot.coins||0;r.player.xp+=loot.xp||0;while(r.player.xp>=100+35*(r.player.level-1)){r.player.xp-=100+35*(r.player.level-1);r.player.level++;r.player.hp=rpgComputedStats().maxHp}for(const item of loot.items||[]){if(r.inventory.length<120)r.inventory.push(item);else r.pendingLoot.push(item);if(!r.codex.items.includes(item.baseId))r.codex.items.push(item.baseId)}for(const id of loot.consumables||[])r.consumables[id]=(r.consumables[id]||0)+1;r.player.hp=Math.min(r.player.hp,rpgComputedStats().maxHp)}
function rpgUpgradeItem(id){const r=ensureRpgState(),item=rpgItemById(id);if(!item||item.upgrade>=10)return{ok:false,message:'已达到＋10'};const cost=80*(item.upgrade+1)*(item.rarityRank+1),dust=Math.max(1,item.rarityRank)*(item.upgrade+1);if(r.player.coins<cost||r.player.dust<dust)return{ok:false,message:`需要 ${cost} 金币和 ${dust} 粉尘`};r.player.coins-=cost;r.player.dust-=dust;item.upgrade++;return{ok:true,message:`${item.name} 已强化至＋${item.upgrade}`}}
function rpgDismantleItem(id){const r=ensureRpgState(),item=rpgItemById(id);if(!item||item.locked||Object.values(r.equipment).flat().includes(id))return{ok:false,message:'已锁定或正在装备'};r.inventory=r.inventory.filter(x=>x.id!==id);const dust=Math.max(1,(item.rarityRank+1)*3+Math.floor((item.upgrade||0)*1.75));r.player.dust+=dust;return{ok:true,message:`分解获得 ${dust} 艺术粉尘`}}
function rpgEquipItem(id,slotIndex=0){const r=ensureRpgState(),item=rpgItemById(id);if(!item)return false;if(item.slot==='weapon'){r.equipment.weapons[Math.max(0,Math.min(2,slotIndex))]=id;r.equipment.activeWeapon=Math.max(0,Math.min(2,slotIndex))}else r.equipment[item.slot]=id;return true}
function rpgToggleItemLock(id){const item=rpgItemById(id);if(!item||item.id==='starter-sword')return false;item.locked=!item.locked;return item.locked}
function rpgAddRunReward(loot){const r=ensureRpgState();rpgAddLoot(loot);if(r.run){r.run.earnedCoins=(r.run.earnedCoins||0)+(loot.coins||0);r.run.earnedXp=(r.run.earnedXp||0)+(loot.xp||0);r.run.loot=[...(r.run.loot||[]),...(loot.items||[]).map(x=>x.id)]}}
ensureRpgState();
