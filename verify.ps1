$ErrorActionPreference='Stop'
node --check app.js
if($LASTEXITCODE -ne 0){throw 'app.js syntax check failed'}
node --check knowledge-extra.js
if($LASTEXITCODE -ne 0){throw 'knowledge-extra.js syntax check failed'}
node --check practice-v2.js
if($LASTEXITCODE -ne 0){throw 'practice-v2.js syntax check failed'}
node --check game-v2-data.js
if($LASTEXITCODE -ne 0){throw 'game-v2-data.js syntax check failed'}
node --check phaser-game.js
if($LASTEXITCODE -ne 0){throw 'phaser-game.js syntax check failed'}
node --check sw.js
if($LASTEXITCODE -ne 0){throw 'sw.js syntax check failed'}
node --check rpg-v6-game.js
if($LASTEXITCODE -ne 0){throw 'rpg-v6-game.js syntax check failed'}
node --check rpg-v4-data.js
if($LASTEXITCODE -ne 0){throw 'rpg-v4-data.js syntax check failed'}
node --check rpg-v4-game.js
if($LASTEXITCODE -ne 0){throw 'rpg-v4-game.js syntax check failed'}
node verify-game-v2.js
if($LASTEXITCODE -ne 0){throw 'game data verification failed'}
python -c "import json; d=json.load(open('schedule.json',encoding='utf-8')); s=json.load(open('syllabus.json',encoding='utf-8')); m=json.load(open('manifest.json',encoding='utf-8')); assert d['totalDays']==88 and d['learningDays']==60 and d['reviewDays']==28; assert len(s['chapters'])==9; assert m['display']=='standalone'; print('JSON checks passed')"
$required=@('index.html','styles.css','navigation.css','feedback.css','game.css','practice-v2.css','phaser-game.css','rpg-v4.css','app.js','knowledge-extra.js','practice-v2.js','game-v2-data.js','phaser-game.js','rpg-v6-game.js','verify-game-v2.js','assets/vendor/phaser.min.js','assets/vendor/PHASER-LICENSE.txt','assets/art/character-lineup.png','assets/art/hero-sprites-v2.png','assets/art/enemy-sprites-v2.png','assets/art/boss-sprites-v2.png','assets/art/chapter-backgrounds-v2.png','assets/art/rpg-items-v1.png','sw.js','manifest.json','schedule.json','syllabus.json')
$required+=@('rpg-v4-data.js','rpg-v4-game.js','rpg-v5-game.js','assets/art/enemy-souls-v4.png','assets/art/rpg-weapons-v2.png','assets/art/rpg-gear-consumables-v2.png','assets/art/rpg-set-plain-v1.png','assets/art/rpg-set-common-v1.png','assets/art/rpg-set-excellent-v1.png','assets/art/rpg-set-fine-v1.png','assets/art/rpg-set-mythic-v1.png','assets/art/rpg-set-legendary-v1.png','assets/art/rpg-hero-set-plain-v1.png','assets/art/rpg-hero-set-common-v1.png','assets/art/rpg-hero-set-excellent-v1.png','assets/art/rpg-hero-set-fine-v1.png','assets/art/rpg-hero-set-mythic-v1.png','assets/art/rpg-hero-set-legendary-v1.png')
foreach($file in $required){if(-not (Test-Path -LiteralPath $file)){throw "Missing $file"}}
$html=Get-Content -Raw index.html
$css=Get-Content -Raw styles.css
$navigation=Get-Content -Raw navigation.css
$js=Get-Content -Raw app.js
$game=Get-Content -Raw phaser-game.js
$practice=Get-Content -Raw practice-v2.js
$extra=Get-Content -Raw knowledge-extra.js
if($html -notmatch 'viewport'){throw 'Missing viewport meta'}
if($css -notmatch 'max-width:800px'){throw 'Missing mobile breakpoint'}
if($navigation -notmatch 'mobile-nav' -or $navigation -notmatch 'mobile-back'){throw 'Missing mobile navigation'}
if($js -notmatch 'localStorage'){throw 'Missing local persistence'}
if($js -notmatch "type:'choice'" -or $js -notmatch "type:'fill'" -or $js -notmatch "type:'memorize'"){throw 'Missing question types'}
if($js -notmatch 'examDate' -or $js -notmatch 'daysLeft'){throw 'Missing exam countdown engine'}
if($js -notmatch 'saveSyncKeyFromInput' -or $js -notmatch 'pullRemoteState' -or $js -notmatch 'pushRemoteState'){throw 'Missing cloud sync controls'}
if($game -notmatch 'PHASER_GAME_VERSION=5' -or $game -notmatch 'WORLD_WIDTH=5200' -or $game -notmatch 'BULLET_RANGE=850'){throw 'Missing Phaser museum v3 game'}
if($practice -notmatch 'sameAnswerMultiset' -or $practice -notmatch 'maskSelectionStatus'){throw 'Missing unordered answer grading'}
if($game -notmatch 'hero-sprites-v2' -or $game -notmatch 'enemy-sprites-v2' -or $game -notmatch 'boss-sprites-v2' -or $game -notmatch 'createChapterBackground'){throw 'Missing animated sprites or chapter backgrounds'}
if($game -notmatch 'isGameTestMode' -or $game -notmatch 'testPhaserState' -or $game -notmatch 'persistPhaserState'){throw 'Missing isolated direct game test mode'}
if($game -notmatch "has\('game-test'\)" -or $game -notmatch "state\.view!=='phaserGame'&&!isGameTestMode"){throw 'Missing direct game test URL bootstrap'}
if($game -notmatch "hearts:5" -or $game -notmatch 'i<10'){throw 'Missing five hearts or ten question blocks'}
if($game -notmatch 'gameV2InitialInventory' -or $game -notmatch 'slice\(0,10\)'){throw 'Initial fragment count is not ten'}
if($practice -notmatch 'PRACTICE_ROUNDS=3' -or $practice -notmatch 'DAILY_LESSON_SIZE=10' -or $practice -notmatch 'DAILY_CURRENT_COUNT=7'){throw 'Missing 7+3 three-round daily practice'}
if($practice -notmatch 'confusablePhrase' -or $practice -notmatch 'maskRanges'){throw 'Missing masks or confusable options'}
if($game -notmatch 'function dailyGameUnlocked'){throw 'Game is not gated by all practice rounds'}
if($game -notmatch 'retreatLocked' -or $game -notmatch 'hero-attack' -or $game -notmatch 'enemy-attack' -or $game -notmatch 'hintId'){throw 'Missing retreat lock, bilateral combat animation or hint pulse'}
if($game -notmatch 'makeOneWay' -or $game -notmatch 'SECOND_JUMP_SPEED' -or $game -notmatch 'createShieldEffect'){throw 'Missing one-way platforms, double jump or shield effect'}
if($game -notmatch 'createExplorationObjects' -or $game -notmatch 'activateCheckpoint' -or $game -notmatch 'collected'){throw 'Missing exploration objects or checkpoints'}
if($practice -notmatch 'materiallySameQuestion' -or $practice -notmatch 'validMaskFragment' -or $practice -notmatch "return'semantic'"){throw 'Missing v3 duplicate filtering or semantic grading'}
$rpgData=Get-Content -Raw rpg-v4-data.js
$rpgGame=Get-Content -Raw rpg-v4-game.js
$rpgV6=Get-Content -Raw rpg-v6-game.js
if($rpgData -notmatch "staff:\{name:'法杖'" -or $rpgData -notmatch 'maxMana' -or $rpgData -notmatch 'manaRegen'){throw 'Missing staff or mana data model'}
if(([regex]::Matches($rpgData,"id:'(gallery|blueprint|garden|cathedral|modern)'")).Count -lt 5 -or $rpgData -notmatch 'RPG_DROP_CHANCE' -or $rpgData -notmatch 'rpgRollBossChest'){throw 'Missing five maps or tiered loot tables'}
if($rpgGame -notmatch 'RPG_WEAPONS.staff' -or $rpgGame -notmatch 'magicBurst'){throw 'Missing staff combat implementation'}
if($rpgV6 -notmatch 'MUSEUM EXPEDITION · 88 STAGES' -or $rpgV6 -notmatch 'hud-mana' -or $rpgV6 -notmatch 'groundLootSnapshot'){throw 'Missing 88-stage route, mana HUD or checkpoint loot snapshots'}
if($rpgData -notmatch 'hp:1\+\.09\*' -or $rpgData -notmatch 'attack:1\+\.065\*'){throw 'RPG node difficulty does not use the required 9% HP and 6.5% attack growth'}
if($rpgV6 -notmatch "\['e17','guardian'" -or $rpgV6 -notmatch "\['boss','boss',4510\]" -or $rpgV6 -notmatch 'planVersion:7'){throw 'Missing the 17 non-boss plus one boss stage plan or run migration'}
if($rpgV6 -notmatch 'mapHazards' -or $rpgV6 -notmatch "type:'frame'" -or $rpgV6 -notmatch "type:'floor'" -or $rpgV6 -notmatch "type:'water'" -or $rpgV6 -notmatch "type:'pendulum'" -or $rpgV6 -notmatch "type:'gate'"){throw 'Five map-specific mechanics are incomplete'}
if($rpgGame -notmatch '20\*dt' -or $rpgGame -notmatch 'time\+2000' -or $rpgGame -notmatch 'target\.dataRef\.maxHp\*\.12' -or $rpgGame -notmatch 'silencedUntil=this\.time\.now\+5000'){throw 'Healer energy, channel, healing or silence rules are incomplete'}
if($rpgGame -notmatch 'chargeStartedAt' -or $rpgGame -notmatch 'attackReleased' -or $rpgGame -notmatch '/900'){throw 'Greatsword and bow charge controls are incomplete'}
if($rpgGame -notmatch 'ratio<=\.35\?3:ratio<=\.7\?2:1' -or $rpgGame -notmatch 'bossSkill\(e,ref\.phase\)'){throw 'Boss phase thresholds or map skill dispatch are incomplete'}
if($rpgGame -notmatch 'b\.attempts>=3' -or $rpgGame -notmatch 'stats\.maxHp\*\.3' -or $rpgGame -notmatch 'b\.enemy\.maxHp\*\.3'){throw 'Three-failure soul penalty and 30% monster revival are incomplete'}
if($rpgData -notmatch "small:\{normal:\.08,soul:\.18\}" -or $rpgData -notmatch "medium:\{normal:\.18,soul:\.32\}" -or $rpgData -notmatch "large:\{normal:\.30,soul:\.48\}" -or $rpgData -notmatch "healer:\{normal:\.22,soul:\.38\}"){throw 'Monster equipment drop probabilities differ from the design table'}
if($rpgData -notmatch 'count=rand\(\)<\.4\?2:3' -or $rpgData -notmatch 'chestRoll<\.2\?5:chestRoll<\.5\?4:3'){throw 'Boss 2/3-item count or 20/30/50 rarity chest rules are incomplete'}
if($rpgGame -notmatch 'slice\(0,4\)' -or $rpgGame -notmatch '\.filter\(x=>!seen\.has\(x\.id\)\)'){throw 'Old-stage replay does not prioritize up to four due mistakes without duplicates'}
if($rpgGame -notmatch '\*\.2' -or $rpgGame -notmatch 'enemySnapshot' -or $rpgV6 -notmatch 'groundLootSnapshot'){throw 'Checkpoint rollback and 20% coin loss are incomplete'}
if($rpgData -notmatch 'r\.inventory\.length<120' -or $rpgData -notmatch 'item\.upgrade>=10' -or $rpgData -notmatch '1\+\(item\.upgrade\|\|0\)\*\.05'){throw 'Inventory capacity or +10 enhancement rules are incomplete'}
if($rpgData -notmatch 'spentDust\*\.35' -or $rpgV6 -notmatch 'rpgV6ClaimPending' -or $rpgV6 -notmatch 'pendingLoot\.splice'){throw '35% enhancement refund or temporary loot chest recovery is incomplete'}
if($rpgV6 -notmatch 'runSeed=node\.layoutSeed' -or $rpgV6 -notmatch 'rpgV6EnemyPlan\(node,replay,seed\)'){throw 'Soul carriers are not randomized per run while remaining refresh-stable'}
if($practice -notmatch "item.orderPolicy==='free'" -or $practice -notmatch 'lesson.selections\[key\]'){throw 'Missing canonical placement after unordered grading'}
if(([regex]::Matches($extra,"id:'x\d\d'")).Count -lt 26){throw 'Extra chapter coverage is incomplete'}
foreach($chapter in @('art-core','architecture','residence','garden','religion','modern','creation','appreciation','exam')){
  if($js -notmatch ":'$chapter'"){throw "No question coverage for $chapter"}
}
Write-Host "All checks passed: $($required.Count) files, 9-chapter learning flow, daily game, dictation boss, responsive controls, cloud sync and local persistence."
