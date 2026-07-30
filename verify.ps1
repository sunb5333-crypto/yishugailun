$ErrorActionPreference='Stop'
node --check app.js
node --check game.js
node --check practice-v2.js
node --check sw.js
python -c "import json; d=json.load(open('schedule.json',encoding='utf-8')); s=json.load(open('syllabus.json',encoding='utf-8')); m=json.load(open('manifest.json',encoding='utf-8')); assert d['totalDays']==88 and d['learningDays']==60 and d['reviewDays']==28; assert len(s['chapters'])==9; assert m['display']=='standalone'; print('JSON checks passed')"
$required=@('index.html','styles.css','navigation.css','feedback.css','game.css','practice-v2.css','app.js','game.js','practice-v2.js','sw.js','manifest.json','schedule.json','syllabus.json')
foreach($file in $required){if(-not (Test-Path -LiteralPath $file)){throw "Missing $file"}}
$html=Get-Content -Raw index.html
$css=Get-Content -Raw styles.css
$navigation=Get-Content -Raw navigation.css
$js=Get-Content -Raw app.js
$game=Get-Content -Raw game.js
$practice=Get-Content -Raw practice-v2.js
if($html -notmatch 'viewport'){throw 'Missing viewport meta'}
if($css -notmatch 'max-width:800px'){throw 'Missing mobile breakpoint'}
if($navigation -notmatch 'mobile-nav' -or $navigation -notmatch 'mobile-back'){throw 'Missing mobile navigation'}
if($js -notmatch 'localStorage'){throw 'Missing local persistence'}
if($js -notmatch "type:'choice'" -or $js -notmatch "type:'fill'" -or $js -notmatch "type:'memorize'"){throw 'Missing question types'}
if($js -notmatch 'examDate' -or $js -notmatch 'daysLeft'){throw 'Missing exam countdown engine'}
if($js -notmatch 'saveSyncKeyFromInput' -or $js -notmatch 'pullRemoteState' -or $js -notmatch 'pushRemoteState'){throw 'Missing cloud sync controls'}
if($game -notmatch 'FINAL_BOSS_HP=5' -or $game -notmatch 'QUESTION_BLOCK_COUNT=12'){throw 'Missing daily game boss or question blocks'}
if($game -notmatch 'semanticDictationScore' -or $game -notmatch 'initialHints:3'){throw 'Missing dictation boss or hint cards'}
if($practice -notmatch 'PRACTICE_ROUNDS=3' -or $practice -notmatch 'DAILY_LESSON_SIZE=17'){throw 'Missing three-round daily practice'}
if($practice -notmatch 'confusablePhrase' -or $practice -notmatch 'maskRanges'){throw 'Missing masks or confusable options'}
if($practice -notmatch 'dailyGameUnlocked=function'){throw 'Game is not gated by all practice rounds'}
foreach($chapter in @('art-core','architecture','residence','garden','religion','modern','creation','appreciation','exam')){
  if($js -notmatch ":'$chapter'"){throw "No question coverage for $chapter"}
}
Write-Host "All checks passed: $($required.Count) files, 9-chapter learning flow, daily game, dictation boss, responsive controls, cloud sync and local persistence."
