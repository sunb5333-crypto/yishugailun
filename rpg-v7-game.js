/* RPG 第九版：冒险路线 B、武装仓库 C、稳定角色动作与完整清关判定。 */
const RPG_V9_BACKPACK_MAX=24;
const RPG_V9_STORAGE_MAX=200;

const rpgV9BaseEnsure=ensureRpgState;
ensureRpgState=function(){
  const r=rpgV9BaseEnsure();
  r.inventoryModelVersion=9;
  r.backpack=r.backpack&&Array.isArray(r.backpack.items)?r.backpack:{max:RPG_V9_BACKPACK_MAX,items:[]};
  r.storage=r.storage&&Array.isArray(r.storage.items)?r.storage:{max:RPG_V9_STORAGE_MAX,items:[]};
  r.backpack.max=RPG_V9_BACKPACK_MAX;r.storage.max=RPG_V9_STORAGE_MAX;
  const valid=new Set(r.inventory.map(x=>x.id)),equipped=new Set(Object.values(r.equipment).flat().filter(Boolean));
  r.backpack.items=r.backpack.items.filter((id,i,a)=>valid.has(id)&&a.indexOf(id)===i);
  r.storage.items=r.storage.items.filter((id,i,a)=>valid.has(id)&&!r.backpack.items.includes(id)&&a.indexOf(id)===i);
  for(const id of equipped)if(valid.has(id)&&!r.backpack.items.includes(id)){r.storage.items=r.storage.items.filter(x=>x!==id);r.backpack.items.unshift(id)}
  for(const item of r.inventory){
    if(r.backpack.items.includes(item.id)||r.storage.items.includes(item.id))continue;
    if(r.backpack.items.length<RPG_V9_BACKPACK_MAX)r.backpack.items.push(item.id);
    else if(r.storage.items.length<RPG_V9_STORAGE_MAX)r.storage.items.push(item.id);
    else if(!r.pendingLoot.some(x=>x.id===item.id))r.pendingLoot.push(item);
  }
  return r;
};

const rpgV9BaseAddLoot=rpgAddLoot;
rpgAddLoot=function(loot){
  const items=(loot.items||[]).map(rpgAttachGearVisual);
  rpgV9BaseAddLoot({...loot,items:[]});
  const r=ensureRpgState();
  for(const item of items){
    if(r.backpack.items.length>=RPG_V9_BACKPACK_MAX){r.pendingLoot.push(item);continue}
    r.inventory.push(item);r.backpack.items.push(item.id);
    if(!r.codex.items.includes(item.baseId))r.codex.items.push(item.baseId);
  }
};

const rpgV9BaseDismantle=rpgDismantleItem;
rpgDismantleItem=function(id){const result=rpgV9BaseDismantle(id),r=ensureRpgState();if(result.ok){r.backpack.items=r.backpack.items.filter(x=>x!==id);r.storage.items=r.storage.items.filter(x=>x!==id)}return result};

function rpgV9MoveItem(id,target){
  const r=ensureRpgState(),from=target==='storage'?r.backpack:r.storage,to=target==='storage'?r.storage:r.backpack;
  if(!from.items.includes(id))return;if(to.items.length>=to.max){notify(target==='storage'?'仓库已满':'背包已满');return}
  if(Object.values(r.equipment).flat().includes(id)&&target==='storage'){notify('正在装备的物品必须留在背包');return}
  from.items=from.items.filter(x=>x!==id);to.items.push(id);rpgPersist();render();
}
function rpgV9SelectItem(id){window.rpgV9SelectedItem=id;render()}
function rpgV9SetInventoryTab(tab){window.rpgV9InventoryTab=tab;render()}
function rpgV9SelectNode(id){window.rpgV9SelectedNode=Number(id);render()}
function rpgV9LeaveGame(view='rpgRoute'){if(rpgScene?.v9Paused)rpgScene.v9Paused=false;rpgDestroy();if(isRpgTest()&&rpgTestBackup){state.rpg=JSON.parse(rpgTestBackup);rpgTestBackup=null}state.view=view;rpgPersist();render()}

function rpgV9HeroPreview(){const appearance=rpgV6HeroAppearance();return`<div class="rpg-v9-hero-preview" style="--hero:url('assets/art/rpg-hero-set-${appearance.rarity}-v1.png');--hero-y:${appearance.row*25}%"><i></i><span></span></div>`}
function rpgV9RouteNode(n,i){const locked=n.id>ensureRpgState().route.unlocked,done=n.firstClear||n.status==='completed',selected=n.id===(window.rpgV9SelectedNode||ensureRpgState().route.current);return`<button class="rpg-v9-route-node ${locked?'is-locked':done?'is-done':'is-current'} ${selected?'is-selected':''}" style="--lane:${i%2?1:-1}" ${locked?'disabled':''} onclick="rpgV9SelectNode(${n.id})"><i>${locked?'◆':done?'★':n.id}</i><span>${escapeHtml(n.stageLabel||rpgStageLabel(n.id))}</span><small>${done?'可重复挑战':n.id===ensureRpgState().route.unlocked?'今日新关':'待解锁'}</small></button>`}

rpgRouteView=function(){
  const r=ensureRpgState();rpgEnsureNodes(r.route.unlocked);const stats=rpgComputedStats(),nodes=r.route.nodes.slice(0,Math.min(88,r.route.unlocked+7)),selected=rpgNode(Math.min(window.rpgV9SelectedNode||r.route.current||r.route.unlocked,r.route.unlocked)),map=rpgMap(selected),done=selected.firstClear||selected.status==='completed';
  return shell('冒险路线','MUSEUM EXPEDITION · ROUTE B',`<div class="rpg-v9-topbar"><b>Lv.${r.player.level}</b><span>生命 ${Math.ceil(r.player.hp)}/${stats.maxHp}</span><span>法力 ${Math.floor(r.player.mana)}/${stats.maxMana}</span><span>${rpgV6IconMarkup('coins','hud-icon')} ${r.player.coins}</span><span>艺术粉尘 ${r.player.dust}</span><span class="is-saved">● 已同步保存</span></div><main class="rpg-v9-route-layout"><aside class="rpg-v9-route-hero">${rpgV9HeroPreview()}<h2>蓝发策展骑士</h2><p>战力 <strong>${stats.power}</strong></p><div class="rpg-v9-mini-loadout">${r.equipment.weapons.map((id,i)=>`<button onclick="rpgActivateWeapon(${i})" class="${i===r.equipment.activeWeapon?'active':''}">${rpgV6IconMarkup(rpgItemById(id),'loadout-icon')}</button>`).join('')}</div><button onclick="showView('rpgInventory')">进入武装仓库</button></aside><section class="rpg-v9-route-map"><header><small>88天艺术博物馆远征</small><h2>选择关卡，旧关可重复刷取装备</h2></header><div class="rpg-v9-route-path">${nodes.map(rpgV9RouteNode).join('')}</div></section><aside class="rpg-v9-stage-card"><span>${escapeHtml(selected.stageLabel||rpgStageLabel(selected.id))}</span><h2>${escapeHtml(map.name)}</h2><div class="rpg-v9-stage-art map-${map.id}"></div><p>${escapeHtml(map.hazard)}。馆主：${escapeHtml(map.boss)}</p><dl><div><dt>推荐战力</dt><dd>${selected.recommendedPower}</dd></div><div><dt>最高评价</dt><dd>${done?`${'★'.repeat(selected.stars||1)}${'☆'.repeat(3-(selected.stars||1))}`:'未通关'}</dd></div><div><dt>主要掉落</dt><dd>${escapeHtml(selected.lootPreview)}</dd></div></dl><button class="primary-btn" onclick="rpgStartNode(${selected.id},${done})">${done?'重复挑战':'进入今日新关'}</button></aside></main>`);
};

function rpgV9ItemTile(item,selected){const rarity=rpgRarity(item);return`<button class="rpg-v9-item-tile ${selected?'selected':''}" style="--rarity:${rarity.color}" onclick="rpgV9SelectItem('${item.id}')">${rpgV6IconMarkup(item,'loadout-icon')}<small>+${item.upgrade||0}</small></button>`}
function rpgV9Slot(slot,label){const r=ensureRpgState(),id=slot.startsWith('weapon')?r.equipment.weapons[Number(slot.slice(-1))]:r.equipment[slot],item=rpgItemById(id);return`<div class="rpg-v9-equip-slot" style="--rarity:${item?rpgRarity(item).color:'#405767'}">${rpgV6IconMarkup(item||slot,'loadout-icon')}<span>${label}</span></div>`}

rpgInventoryView=function(){
  const r=ensureRpgState(),stats=rpgComputedStats(),tab=window.rpgV9InventoryTab||'backpack',ids=tab==='storage'?r.storage.items:r.backpack.items,items=ids.map(rpgItemById).filter(Boolean),selected=rpgItemById(window.rpgV9SelectedItem)||items[0]||r.inventory[0],rarity=selected?rpgRarity(selected):null,equipped=selected&&Object.values(r.equipment).flat().includes(selected.id),affixes=selected?.affixes||[];
  return shell('武装仓库','ARMORY STORAGE · LAYOUT C',`<div class="rpg-v9-topbar"><button onclick="showView('rpgRoute')">← 返回冒险路线</button><b>战力 ${stats.power}</b><span>金币 ${r.player.coins}</span><span>粉尘 ${r.player.dust}</span><span>背包 ${r.backpack.items.length}/${r.backpack.max}</span><span>仓库 ${r.storage.items.length}/${r.storage.max}</span></div><main class="rpg-v9-armory"><section class="rpg-v9-character-bay"><h2>当前武装</h2>${rpgV9HeroPreview()}<div class="rpg-v9-armor-slots">${rpgV9Slot('helmet','头盔')}${rpgV9Slot('chest','胸甲')}${rpgV9Slot('bracer','护腕')}${rpgV9Slot('boots','战靴')}</div><div class="rpg-v9-weapon-slots">${[0,1,2].map(i=>rpgV9Slot(`weapon${i}`,`武器 ${i+1}`)).join('')}</div><p>生命 ${stats.maxHp} · 法力 ${stats.maxMana}<br>攻击 ${stats.attack} · 防御 ${stats.defense}</p></section><section class="rpg-v9-storage-grid"><header><div><button class="${tab==='backpack'?'active':''}" onclick="rpgV9SetInventoryTab('backpack')">随身背包 24</button><button class="${tab==='storage'?'active':''}" onclick="rpgV9SetInventoryTab('storage')">永久仓库 200</button></div><small>装备图标可点击查看，不再使用纯文字列表</small></header><div class="rpg-v9-grid">${items.map(x=>rpgV9ItemTile(x,x.id===selected?.id)).join('')}${Array.from({length:Math.max(0,(tab==='backpack'?24:40)-items.length)},()=>'<i class="empty"></i>').join('')}</div><footer><span>最近战利品会先进入背包；背包已满时进入临时战利品箱。</span><button onclick="rpgV9SetInventoryTab('${tab==='backpack'?'storage':'backpack'}')">切换区域</button></footer></section><aside class="rpg-v9-item-detail" style="--rarity:${rarity?.color||'#405767'}">${selected?`${rpgV6IconMarkup(selected,'rpg-v9-detail-icon')}<small>${rarity.name} · Lv.${selected.itemLevel}</small><h2>${escapeHtml(selected.name)}</h2><p>${selected.slot==='weapon'?(RPG_WEAPONS[selected.baseId]?.name||'武器'):RPG_ARMOR[selected.slot]} · 主属性 ${selected.mainStat}</p><ul>${affixes.map(a=>`<li class="${a.positive?'positive':'negative'}">${escapeHtml(a.label)} ${a.value>0?'+':''}${a.value}%</li>`).join('')}<li>${escapeHtml(selected.drawback||'无额外代价')}</li>${selected.legendaryEffect?`<li class="legendary">${escapeHtml(selected.legendaryEffect)}</li>`:''}</ul><div class="rpg-v9-set-progress"><b>${escapeHtml(selected.setName||'散件装备')}</b><span>精品及以上集齐套装可激活隐藏技能</span></div><div class="rpg-v9-detail-actions">${selected.slot==='weapon'?`<button onclick="rpgEquipAndRender('${selected.id}',0)">装备至武器1</button>`:`<button onclick="rpgEquipAndRender('${selected.id}')">装备</button>`}<button onclick="rpgUpgradeAndRender('${selected.id}')">强化</button><button onclick="rpgV9MoveItem('${selected.id}','${tab==='backpack'?'storage':'backpack'}')">移至${tab==='backpack'?'仓库':'背包'}</button><button onclick="rpgLockAndRender('${selected.id}')">${selected.locked?'解锁':'锁定'}</button></div>`:'<h2>这里还没有物品</h2>'}</aside></main>`);
};

const rpgV9BaseGameView=rpgGameView;
rpgGameView=function(){const html=rpgV9BaseGameView(),run=ensureRpgState().run,total=run?.enemies?.filter(x=>x.mainRoute!==false).length||0,done=run?.enemies?.filter(x=>x.mainRoute!==false&&!x.alive&&(!x.hasSoul||x.soulResolved)).length||0;return html.replace('<div class="rpg-hud">',`<div class="rpg-hud"><span class="rpg-v9-objective">通关目标 <b id="rpgV9Goal">${done}/${total}</b></span><button class="rpg-v9-pack-button" onclick="rpgV9TogglePause()">背包</button>`)};
function rpgV9TogglePause(){const host=document.getElementById('rpgModal');if(!host||!rpgScene)return;if(rpgScene.v9Paused){rpgScene.v9Paused=false;rpgScene.physics.resume();host.innerHTML='';return}rpgScene.v9Paused=true;rpgScene.physics.pause();const r=ensureRpgState(),items=r.backpack.items.map(rpgItemById).filter(Boolean);host.innerHTML=`<div class="rpg-v9-pause"><section><header><h2>随身背包</h2><button onclick="rpgV9TogglePause()">继续游戏</button></header><div class="rpg-v9-grid">${items.map(x=>rpgV9ItemTile(x,false)).join('')}</div><footer><button onclick="rpgV9LeaveGame('rpgRoute')">保存并返回路线</button><button onclick="rpgV9LeaveGame('rpgInventory')">打开永久仓库</button></footer></section></div>`}

class RpgSceneV9 extends RpgSceneV6{
  create(){this.buildHealerTexture();super.create();this.actionLockedUntil=0;this.landUntil=0;this.wasGrounded=true;this.addTrapModels();this.time.delayedCall(0,()=>this.snapPlayerToSafeSurface());this.time.delayedCall(120,()=>this.snapPlayerToSafeSurface())}
  buildHealerTexture(){if(this.textures.exists('rpg-healer-v9'))return;const src=this.textures.get('rpg-enemy').getSourceImage(),canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);for(let i=0;i<6;i++)ctx.drawImage(src,i*256,3*256,256,256,i*256,0,256,256);this.textures.addSpriteSheet('rpg-healer-v9',canvas,{frameWidth:256,frameHeight:256})}
  compositeHeroKey(){
    const appearance=rpgV6HeroAppearance(),key=`rpg-v9-hero-${appearance.rarity}-${appearance.row}`;if(this.textures.exists(key))return key;
    const src=this.textures.get(appearance.atlas).getSourceImage(),cw=Math.floor(src.width/3),ch=Math.floor(src.height/5),cells=[];for(let col=0;col<3;col++){const tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;const c=tmp.getContext('2d');c.drawImage(src,col*cw,appearance.row*ch,cw,ch,0,0,cw,ch);const data=c.getImageData(0,0,cw,ch).data;let minX=cw,minY=ch,maxX=0,maxY=0;for(let y=0;y<ch;y+=2)for(let x=0;x<cw;x+=2)if(data[(y*cw+x)*4+3]>18){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}cells.push({tmp,minX,minY,maxX,maxY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1)})}
    const maxW=Math.max(...cells.map(x=>x.w)),maxH=Math.max(...cells.map(x=>x.h)),scale=Math.min(190/maxW,220/maxH),sheet=document.createElement('canvas');sheet.width=1536;sheet.height=1024;const ctx=sheet.getContext('2d'),draw=(frame,pose,dx=0,dy=0,angle=0)=>{const cell=cells[pose],x=(frame%6)*256,y=Math.floor(frame/6)*256;ctx.save();ctx.translate(x+128+dx,y+236+dy);ctx.rotate(angle);ctx.imageSmoothingEnabled=false;ctx.drawImage(cell.tmp,cell.minX,cell.minY,cell.w,cell.h,-cell.w*scale/2,-cell.h*scale,cell.w*scale,cell.h*scale);ctx.restore()};
    for(let i=0;i<6;i++)draw(i,0,0,i%3===1?-2:0);for(let i=6;i<12;i++)draw(i,1,(i%2?3:-3),i%2?-2:0);draw(12,1,0,-8,-.05);draw(13,1,0,2,.04);draw(14,0,0,3);for(let i=15;i<18;i++)draw(i,0);draw(18,2,-5,0,-.05);draw(19,2,5,-2,.04);draw(20,2,9,0,.08);draw(21,0);draw(22,0);draw(23,2,0,0);
    this.textures.addSpriteSheet(key,sheet,{frameWidth:256,frameHeight:256});return key;
  }
  createHeroAnimations(){const texture=this.compositeHeroKey();for(const key of ['rpg-idle','rpg-run','rpg-attack'])if(this.anims.exists(key))this.anims.remove(key);this.anims.create({key:'rpg-idle',frames:[0,1,2,3,4,5].map(frame=>({key:texture,frame})),frameRate:5,repeat:-1});this.anims.create({key:'rpg-run',frames:[6,7,8,9,10,11].map(frame=>({key:texture,frame})),frameRate:9,repeat:-1});this.anims.create({key:'rpg-attack',frames:[18,19,20,23].map(frame=>({key:texture,frame})),frameRate:7,repeat:0});if(this.player){this.player.setTexture(texture,0);this.player.play('rpg-idle',true)}}
  spawnEnemy(saved){const e=super.spawnEnemy(saved);if(saved.kind==='healer'){e.setTexture('rpg-healer-v9',0).setScale(.39);e.baseScale=.39;e.body.setSize(130,185).setOffset(63,60)}return e}
  attack(time){const before=this.lastAttack;super.attack(time);if(this.lastAttack!==before){const id=rpgComputedStats().weaponItem.baseId,duration={dual:340,greatsword:650,bow:520,staff:520,sword:440}[id]||440;this.actionLockedUntil=time+duration;this.player.play('rpg-attack',true);rpgBeep(id==='greatsword'?180:id==='staff'?760:420,.08)}}
  update(time,delta){if(this.v9Paused)return;super.update(time,delta);if(!this.player?.body||this.soulBattle)return;const grounded=this.player.body.blocked.down||this.player.body.touching.down;if(!this.wasGrounded&&grounded)this.landUntil=time+120;this.wasGrounded=grounded;if(time<this.actionLockedUntil){this.player.anims.stop();const phase=Math.min(3,Math.floor((this.actionLockedUntil-time)/110));this.player.setFrame([23,20,19,18][phase])}else if(!grounded){this.player.anims.stop();this.player.setFrame(this.player.body.velocity.y<0?12:13)}else if(time<this.landUntil){this.player.anims.stop();this.player.setFrame(14)}this.updateGoalHud();if(this.portal?.active&&Math.abs(this.player.x-this.portal.x)<260&&(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.F)||Phaser.Input.Keyboard.JustDown(this.keys.J)))this.tryPortalStrike('melee')}
  addTrapModels(){this.v9TrapFx=[];const color={gallery:0xffb13b,blueprint:0x62d8ff,garden:0x71e38f,cathedral:0xffd36a,modern:0xff5ccf}[this.node.mapId]||0xffb13b;for(const h of this.mapHazards||[]){const g=this.add.graphics().setDepth(8);g.fillStyle(0x25090c,.9).fillTriangle(-34,22,-17,-22,0,22).fillTriangle(0,22,17,-22,34,22);g.lineStyle(3,color,1).strokeTriangle(-34,22,-17,-22,0,22).strokeTriangle(0,22,17,-22,34,22);g.setPosition(h.x,h.type==='frame'?455:h.type==='pendulum'?420:438);const glow=this.add.ellipse(h.x,g.y+17,90,16,color,.2).setDepth(7);this.tweens.add({targets:[g,glow],alpha:{from:.48,to:1},duration:480,yoyo:true,repeat:-1});this.v9TrapFx.push({g,glow,h})}}
  portalRequirements(){const required=this.run.enemies.filter(x=>x.mainRoute!==false),cleared=required.filter(x=>!x.alive&&(!x.hasSoul||x.soulResolved)),boss=required.find(x=>x.id==='boss');return{required,cleared,boss,active:required.length>0&&cleared.length===required.length&&Boolean(boss&&!boss.alive&&boss.soulResolved)}}
  updatePortalState(){if(!this.portal)return;const req=this.portalRequirements();if(req.active&&!this.portal.active){this.portal.active=true;this.portal.halo.setFillStyle(0x39efff,.42).setStrokeStyle(8,0xe4ffff,1);this.portal.outer.setFillStyle(0x00bfff,.72).setStrokeStyle(12,0x8cffff,1);this.portal.inner.setFillStyle(0x006fff,1);this.portal.rune.setFillStyle(0xffffff,1);this.tweens.add({targets:[this.portal.outer,this.portal.inner],scale:{from:.95,to:1.1},alpha:{from:.76,to:1},duration:560,yoyo:true,repeat:-1});this.floatText(this.portal.x,255,'传送门已开启 · 靠近按 E 或攻击',0x9ffcff);rpgV5Sound('portal')}this.updateGoalHud()}
  updatePortalPrompt(){const host=this.portalPrompt;if(!host||!this.portal||!this.player)return;const near=Math.abs(this.player.x-this.portal.x)<360;if(!near){host.classList.remove('is-visible');host.textContent='';return}const req=this.portalRequirements();host.classList.add('is-visible');if(!req.active){host.classList.add('is-locked');host.textContent=`还需清除 ${req.required.length-req.cleared.length} 个主路线目标`;return}host.classList.remove('is-locked');host.textContent='传送门已开启 · 按 E / F / J 或攻击进入下一关'}
  finishEnemy(ref,soul){super.finishEnemy(ref,soul);this.updatePortalState()}
  completeV5Run(){const node=this.node;super.completeV5Run();const stars=this.run?.stars||node.stars||1,host=document.getElementById('rpgModal');if(host&&!host.innerHTML.trim())host.innerHTML=`<section class="rpg-result"><small>${escapeHtml(node.stageLabel||rpgStageLabel(node.id))} 完成并已存档</small><h2>${escapeHtml(node.mapName)}</h2><div>${'★'.repeat(stars)}${'☆'.repeat(Math.max(0,3-stars))}</div><p>传送门验证通过。下一小关已加入冒险路线，旧关仍可重复刷装备。</p><button onclick="rpgV9LeaveGame('rpgRoute')">返回冒险路线</button></section>`}
  updateGoalHud(){const el=document.getElementById('rpgV9Goal');if(!el)return;const req=this.portalRequirements();el.textContent=`${req.cleared.length}/${req.required.length}`}
}

rpgLaunch=function(){if(isRpgTest()&&!rpgTestBackup)rpgTestBackup=JSON.stringify(state.rpg);const node=rpgCurrentNode();rpgEnsureRun(node,node.firstClear);document.getElementById('rpgStart')?.remove();rpgDestroy();const config={type:Phaser.AUTO,parent:'rpgCanvas',width:RPG_VIEW_W,height:RPG_VIEW_H,backgroundColor:'#091522',pixelArt:true,physics:{default:'arcade',arcade:{gravity:{y:920},debug:false}},scene:[RpgSceneV9]};rpgInstance=new Phaser.Game(config)};

window.__RPG_V9__={version:9,storage:()=>{const r=ensureRpgState();return{backpack:r.backpack.items.length,storage:r.storage.items.length,pending:r.pendingLoot.length}},portal:()=>rpgScene?.portalRequirements?.(),pause:rpgV9TogglePause};
if(isRpgTest()){state.view='rpgGame';render()}else render()
