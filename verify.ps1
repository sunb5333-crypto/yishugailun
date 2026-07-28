$ErrorActionPreference='Stop'
node --check app.js
node --check sw.js
python -c "import json; d=json.load(open('schedule.json',encoding='utf-8')); s=json.load(open('syllabus.json',encoding='utf-8')); m=json.load(open('manifest.json',encoding='utf-8')); assert d['totalDays']==88 and d['learningDays']==60 and d['reviewDays']==28; assert len(s['chapters'])==9; assert m['display']=='standalone'; print('JSON checks passed')"
$required=@('index.html','styles.css','feedback.css','app.js','sw.js','manifest.json','schedule.json','syllabus.json')
foreach($file in $required){if(-not (Test-Path -LiteralPath $file)){throw "Missing $file"}}
$html=Get-Content -Raw index.html
$css=Get-Content -Raw styles.css
$js=Get-Content -Raw app.js
if($html -notmatch 'viewport'){throw 'Missing viewport meta'}
if($css -notmatch 'max-width:800px'){throw 'Missing mobile breakpoint'}
if($js -notmatch 'localStorage'){throw 'Missing local persistence'}
if($js -notmatch "type:'choice'" -or $js -notmatch "type:'fill'" -or $js -notmatch "type:'memorize'"){throw 'Missing question types'}
if($js -notmatch 'examDate' -or $js -notmatch 'daysLeft'){throw 'Missing exam countdown engine'}
Write-Host "All checks passed: $($required.Count) files, daily practice flow, responsive layout, local persistence."
