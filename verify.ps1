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
node verify-game-v2.js
if($LASTEXITCODE -ne 0){throw 'game data verification failed'}
python -c "import json; d=json.load(open('schedule.json',encoding='utf-8')); s=json.load(open('syllabus.json',encoding='utf-8')); m=json.load(open('manifest.json',encoding='utf-8')); assert d['totalDays']==88 and d['learningDays']==60 and d['reviewDays']==28; assert len(s['chapters'])==9; assert m['display']=='standalone'; print('JSON checks passed')"
$required=@('index.html','styles.css','navigation.css','feedback.css','game.css','practice-v2.css','phaser-game.css','rpg-v4.css','app.js','knowledge-extra.js','practice-v2.js','game-v2-data.js','phaser-game.js','rpg-v6-game.js','verify-game-v2.js','assets/vendor/phaser.min.js','assets/vendor/PHASER-LICENSE.txt','assets/art/character-lineup.png','assets/art/hero-sprites-v2.png','assets/art/enemy-sprites-v2.png','assets/art/boss-sprites-v2.png','assets/art/chapter-backgrounds-v2.png','assets/art/rpg-items-v1.png','sw.js','manifest.json','schedule.json','syllabus.json')
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
if(([regex]::Matches($extra,"id:'x\d\d'")).Count -lt 26){throw 'Extra chapter coverage is incomplete'}
foreach($chapter in @('art-core','architecture','residence','garden','religion','modern','creation','appreciation','exam')){
  if($js -notmatch ":'$chapter'"){throw "No question coverage for $chapter"}
}
Write-Host "All checks passed: $($required.Count) files, 9-chapter learning flow, daily game, dictation boss, responsive controls, cloud sync and local persistence."
