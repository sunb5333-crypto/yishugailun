/* RPG V10: fixed-size weapon atlases, real jump frames, normalized warehouse icons. */
const RPG_V10_WEAPON_ASSETS={
  sword:'assets/art/rpg-weapon-sword-v7.png',
  greatsword:'assets/art/rpg-weapon-greatsword-v7.png',
  dual:'assets/art/rpg-weapon-dual-v7.png',
  bow:'assets/art/rpg-weapon-bow-v7.png',
  staff:'assets/art/rpg-weapon-staff-v7.png'
};
const RPG_V10_TRAP_ASSETS={gallery:'assets/art/rpg-trap-gallery-v1.png',blueprint:'assets/art/rpg-trap-blueprint-v1.png',garden:'assets/art/rpg-trap-garden-v1.png',cathedral:'assets/art/rpg-trap-cathedral-v1.png',modern:'assets/art/rpg-trap-modern-v1.png'};
const RPG_V10_SHIELD_ASSET='assets/art/rpg-shield-horizontal-v1.png';
const RPG_V10_PENDULUM_ASSET='assets/art/rpg-trap-pendulum-v2.png';
const RPG_V10_ATTACK_DURATION={sword:320,greatsword:560,dual:180,bow:410,staff:430};
const RPG_V10_FRAME_ALIAS={12:3,13:3,14:0,18:4,19:5,20:6,21:0,22:0,23:7};
if(!window.__rpgV10FrameAlias){window.__rpgV10FrameAlias=true;const baseSetFrame=Phaser.GameObjects.Sprite.prototype.setFrame;Phaser.GameObjects.Sprite.prototype.setFrame=function(frame,...args){if(this.texture?.key?.startsWith('rpg-v10-')&&Number(frame)>7)frame=RPG_V10_FRAME_ALIAS[frame]??0;return baseSetFrame.call(this,frame,...args)}}

class RpgSceneV10 extends RpgSceneV9{
  preload(){super.preload();Object.entries(RPG_V10_WEAPON_ASSETS).forEach(([id,path])=>this.load.image(`rpg-v10-source-${id}`,path));Object.entries(RPG_V10_TRAP_ASSETS).forEach(([id,path])=>this.load.spritesheet(`rpg-v10-trap-${id}`,path,{frameWidth:384,frameHeight:512}));this.load.image('rpg-v10-shield',RPG_V10_SHIELD_ASSET);this.load.image('rpg-v10-pendulum',RPG_V10_PENDULUM_ASSET)}
  buildV10Atlases(){
    this.weaponAtlases={};
    Object.keys(RPG_V10_WEAPON_ASSETS).forEach(id=>{
      const key=`rpg-v10-${id}`;if(this.textures.exists(key)){this.weaponAtlases[id]=key;return}
      const source=this.textures.get(`rpg-v10-source-${id}`).getSourceImage(),cellW=source.width/4,cellH=source.height/2;
      const sheet=document.createElement('canvas');sheet.width=1536;sheet.height=1024;const out=sheet.getContext('2d');out.imageSmoothingEnabled=false;
      const bounds=(index)=>{const sx=(index%4)*cellW,sy=Math.floor(index/4)*cellH,tmp=document.createElement('canvas');tmp.width=Math.ceil(cellW);tmp.height=Math.ceil(cellH);const c=tmp.getContext('2d');c.drawImage(source,sx,sy,cellW,cellH,0,0,cellW,cellH);const pixels=c.getImageData(0,0,tmp.width,tmp.height).data;let minX=tmp.width,minY=tmp.height,maxX=-1,maxY=-1;for(let y=0;y<tmp.height;y+=2)for(let x=0;x<tmp.width;x+=2)if(pixels[(y*tmp.width+x)*4+3]>18){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}return{minX,minY,maxX,maxY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1)}};
      const reference=bounds(0),scale=Math.min(196/reference.h,208/reference.w),baseline=228-reference.maxY*scale;
      const legacyFrames=[0,1,2,3,4,5,6,7,1,2,1,2,3,3,0,4,5,6,4,5,6,0,0,7];
      legacyFrames.forEach((sourceFrame,frame)=>{const sx=(sourceFrame%4)*cellW,sy=Math.floor(sourceFrame/4)*cellH,x=(frame%6)*256+128-cellW*scale/2,y=baseline+Math.floor(frame/6)*256;out.drawImage(source,sx,sy,cellW,cellH,x,y,cellW*scale,cellH*scale)});
      this.textures.addSpriteSheet(key,sheet,{frameWidth:256,frameHeight:256});const atlas=this.textures.get(key);legacyFrames.forEach((sourceFrame,frame)=>{if(frame<8||atlas.has(frame))return;const source=atlas.get(sourceFrame);atlas.add(frame,source.sourceIndex,source.cutX,source.cutY,source.cutWidth,source.cutHeight)});this.weaponAtlases[id]=key;
    });
  }
  createHeroAnimations(){
    const id=rpgComputedStats().weaponItem?.baseId||'sword',texture=this.weaponAtlases[id]||this.weaponAtlases.sword;
    ['rpg-idle','rpg-run','rpg-jump','rpg-attack'].forEach(k=>{if(this.anims.exists(k))this.anims.remove(k)});
    const frames=(list)=>list.map(frame=>({key:texture,frame}));
    this.anims.create({key:'rpg-idle',frames:frames([0,0,0,0]),frameRate:4,repeat:-1});
    this.anims.create({key:'rpg-run',frames:frames([1,2,1,2]),frameRate:8,repeat:-1});
    this.anims.create({key:'rpg-jump',frames:frames([3]),frameRate:1,repeat:0});
    this.anims.create({key:'rpg-attack',frames:frames([4,5,6]),frameRate:8,repeat:0});
    const combos={sword:[[4,5],[5,6],[6,5]],greatsword:[[4,5],[5,6],[6,5]],dual:[[4,5],[5,6],[6,5],[5,4],[4,5]],bow:[[4,5],[5,6],[6,7],[7,6]],staff:[[4,5],[5,6],[6,5]]}[id]||[[4,5]],duration=RPG_V10_ATTACK_DURATION[id]||320;
    combos.forEach((sequence,index)=>{const key=`rpg-v10-hit-${id}-${index+1}`;if(this.anims.exists(key))this.anims.remove(key);this.anims.create({key,frames:frames(sequence),frameRate:Math.max(3,Math.round(2000/duration)),repeat:0})});
    const airKey=`rpg-v10-air-${id}`;if(this.anims.exists(airKey))this.anims.remove(airKey);this.anims.create({key:airKey,frames:frames([3,4,5]),frameRate:Math.max(3,Math.round(2400/duration)),repeat:0});
    if(this.player){this.player.setTexture(texture,0);this.player.play('rpg-idle',true)}
  }
  applyV10Weapon(){if(!this.player||!this.weaponAtlases)return;const id=rpgComputedStats().weaponItem?.baseId||'sword',texture=this.weaponAtlases[id]||this.weaponAtlases.sword;this.weaponFx?.removeAll(true);this.weaponFx?.setVisible(false);this.player.setTexture(texture,0);this.createHeroAnimations();}
  buildHealerTexture(){
    if(this.textures.exists('rpg-healer-v10'))return;
    const src=this.textures.get('rpg-enemy').getSourceImage(),canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=320;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    // The healer cap crosses the source-sheet row boundary. Keep a taller, single image frame
    // instead of forcing it through the old 256px animation crop.
    ctx.drawImage(src,0,700,256,324,0,0,256,320);
    this.textures.addCanvas('rpg-healer-v10',canvas);
  }
  create(){this.buildV10Atlases();super.create();this.segmentFrame=0;this.applyV10Weapon()}
  refreshWeapon(){super.refreshWeapon();this.applyV10Weapon()}
  spawnEnemy(saved){const e=super.spawnEnemy(saved);if(saved.kind==='healer'){e.setTexture('rpg-healer-v10').setScale(.43).setOrigin(.5,.80);e.baseScale=.43;e.body.setSize(118,172).setOffset(69,112)}return e}
  addTrapModels(){
    this.v9TrapFx=[];const id=this.node.mapId,key=`rpg-v10-trap-${id}`;if(!this.textures.exists(key))return;
    const anim=`rpg-v10-trap-anim-${id}`,frameCount=Math.max(1,(this.textures.get(key).frameTotal||2)-1);if(!this.anims.exists(anim))this.anims.create({key:anim,frames:Array.from({length:frameCount},(_,i)=>({key,frame:i})),frameRate:8,repeat:-1});
    for(const h of this.mapHazards||[]){h.object?.setVisible(false);h.chain?.setVisible(false);h.bell?.setVisible(false);const isPendulum=h.type==='pendulum',sprite=isPendulum?this.add.image(h.x,42,'rpg-v10-pendulum').setOrigin(.5,0).setDisplaySize(62,164).setAngle(-16).setDepth(8):this.add.sprite(h.x,h.type==='frame'?432:422,key,0).setDisplaySize(112,112).setDepth(8);if(!isPendulum)sprite.play(anim);if(isPendulum)this.tweens.add({targets:sprite,angle:{from:-25,to:-5},duration:920,yoyo:true,repeat:-1});const warning=this.add.rectangle(h.x,isPendulum?192:476,44,5,0xed5555,.42).setDepth(7);this.tweens.add({targets:warning,scaleX:{from:.7,to:1.7},alpha:{from:.08,to:.75},duration:680,yoyo:true,repeat:-1});this.v9TrapFx.push({sprite,warning,h})}
  }
  syncShieldEffect(){const active=ensureRpgState().player.shield;if(active&&!this.shieldFx){const rear=this.add.ellipse(0,6,112,28,0x28dfff,.09).setStrokeStyle(3,0x61eaff,.9),front=this.add.ellipse(0,7,94,20,0x7fffff,.04).setStrokeStyle(2,0xd5ffff,.86),dot1=this.add.circle(-48,6,3,0xdfffff,1),dot2=this.add.circle(48,6,3,0x6eeaff,1);this.shieldFx=this.add.container(this.player.x,this.player.y,[rear,front,dot1,dot2]).setDepth(28);this.shieldRing=rear;this.shieldDots=[dot1,dot2];this.tweens.add({targets:[rear,front],alpha:{from:.45,to:.92},scaleX:{from:.94,to:1.06},scaleY:{from:.9,to:1.1},duration:760,yoyo:true,repeat:-1})}if(!active&&this.shieldFx){this.shieldFx.destroy(true);this.shieldFx=null;this.shieldDots=null}}
  magicBurst(x,y,multiplier,excludeId='',color=0x7b5cff){const flash=this.add.circle(x,y,10,color,.22).setStrokeStyle(3,0xe7fbff,.9).setDepth(23);for(const e of this.enemies.filter(e=>e.active&&e.dataRef.id!==excludeId))if(Phaser.Math.Distance.Between(x,y,e.x,e.y)<88)this.hitEnemy(e,multiplier,x);this.tweens.add({targets:flash,scale:2.4,alpha:0,duration:180,onComplete:()=>flash.destroy()})}
  attack(time){const airborne=!(this.player.body.blocked.down||this.player.body.touching.down),before=this.lastAttack;super.attack(time);if(this.lastAttack===before)return;const id=rpgComputedStats().weaponItem?.baseId||'sword',count={sword:3,greatsword:3,dual:5,bow:4,staff:3}[id]||3,segment=((this.combo-1)%count)+1;this.actionLockedUntil=time+(RPG_V10_ATTACK_DURATION[id]||320);this.currentAttackKey=airborne?`rpg-v10-air-${id}`:`rpg-v10-hit-${id}-${segment}`;this.player.play(this.currentAttackKey,true)}
  update(time,delta){super.update(time,delta);if(!this.player?.body)return;const grounded=this.player.body.blocked.down||this.player.body.touching.down;if(this.shieldFx){this.shieldFx.setPosition(this.player.x,this.player.y-1);const a=time*.005;this.shieldDots?.[0]?.setPosition(Math.cos(a)*49,Math.sin(a)*6+6);this.shieldDots?.[1]?.setPosition(Math.cos(a+Math.PI)*49,Math.sin(a+Math.PI)*6+6)}if(time<this.actionLockedUntil){if(this.currentAttackKey&&this.player.anims.currentAnim?.key!==this.currentAttackKey)this.player.play(this.currentAttackKey,true);return}if(!grounded){this.player.anims.stop();this.player.setFrame(3)} }
}

const rpgV10BaseGameView=rpgGameView;
rpgGameView=function(){return rpgV10BaseGameView()};
rpgLaunch=function(){if(isRpgTest()&&!rpgTestBackup)rpgTestBackup=JSON.stringify(state.rpg);const node=rpgCurrentNode();rpgEnsureRun(node,node.firstClear);document.getElementById('rpgStart')?.remove();rpgDestroy();const config={type:Phaser.AUTO,parent:'rpgCanvas',width:RPG_VIEW_W,height:RPG_VIEW_H,backgroundColor:'#091522',pixelArt:true,physics:{default:'arcade',arcade:{gravity:{y:920}},debug:false},scene:[RpgSceneV10]};rpgInstance=new Phaser.Game(config)};
window.__RPG_V10__={version:10,weaponAtlases:RPG_V10_WEAPON_ASSETS};
