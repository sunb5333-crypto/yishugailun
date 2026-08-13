/* A打底 + B纠错 + C主观输出。所有新增状态都保存在 state.studyPlan 中。 */
const STUDY_PHASE_VERSION=1;
const MISTAKE_B_START=15;
const MISTAKE_B_STOP=10;

function phaseDate(){return typeof localDateString==='function'?localDateString():today()}
function phaseDay(value=phaseDate()){return typeof parseLocalDate==='function'?parseLocalDate(value):new Date(`${value}T12:00:00`)}
function phaseClone(value){return JSON.parse(JSON.stringify(value))}
function phaseAddDays(value,days){const date=phaseDay(value);date.setDate(date.getDate()+days);return date.toISOString()}
function phasePendingCount(){return Array.isArray(state.mistakes)?state.mistakes.length:0}
function ensureStudyPlan(){
  if(!state.studyPlan||typeof state.studyPlan!=='object')state.studyPlan={};
  const plan=state.studyPlan;
  plan.version=STUDY_PHASE_VERSION;
  plan.bActive=Boolean(plan.bActive);
  plan.sprints=plan.sprints&&typeof plan.sprints==='object'?plan.sprints:{};
  plan.dictations=plan.dictations&&typeof plan.dictations==='object'?plan.dictations:{};
  plan.subjective=plan.subjective&&typeof plan.subjective==='object'?plan.subjective:{};
  plan.simulations=Array.isArray(plan.simulations)?plan.simulations:[];
  for(const item of state.mistakes||[]){
    item.status='pending';
    item.correctDates=Array.isArray(item.correctDates)?[...new Set(item.correctDates)]:[];
    item.nextReviewAt=item.nextReviewAt||phaseAddDays(phaseDate(),1);
  }
  for(const item of state.mastered||[]){
    item.status='mastered';
    item.correctDates=Array.isArray(item.correctDates)?[...new Set(item.correctDates)]:[];
    item.nextReviewAt=item.nextReviewAt||phaseAddDays(item.masteredAt?.slice(0,10)||phaseDate(),7);
  }
  if(!plan.migrationBackupCreated){
    const backup={...state,snapshots:[],studyPlan:undefined};
    state.snapshots=Array.isArray(state.snapshots)?state.snapshots:[];
    state.snapshots.unshift({createdAt:new Date().toLocaleString('zh-CN'),label:'A/B/C升级前自动存档',completed:state.completed||0,mistakes:phasePendingCount(),streak:state.streak||0,data:phaseClone(backup)});
    state.snapshots=state.snapshots.slice(0,10);
    plan.migrationBackupCreated=true;
    plan.migratedAt=new Date().toISOString();
  }
  return plan;
}
function updateBActivation(){
  const plan=ensureStudyPlan(),count=phasePendingCount();
  if(count>=MISTAKE_B_START)plan.bActive=true;
  else if(count<MISTAKE_B_STOP)plan.bActive=false;
  return plan.bActive;
}
function currentStudyMode(){
  const plan=ensureStudyPlan();
  if(daysLeft()<=28){plan.lastMode='C';return'C'}
  plan.lastMode=updateBActivation()?'A+B':'A';
  return plan.lastMode;
}
function phaseLabel(mode=currentStudyMode()){return mode==='C'?'方案C · 主观输出':mode==='A+B'?'方案A+B · 打底纠错':'方案A · 稳定写出'}
function phaseEstimate(mode=currentStudyMode()){
  if(mode==='C')return'约45～60分钟';
  if(mode==='A+B')return phasePendingCount()>=40?'约45分钟':'约35～40分钟';
  return'约25～30分钟';
}
function phaseSourceIds(){return new Set((ensureDailyTask().items||[]).map(item=>item.sourceQuestionId))}
function phaseQuestion(id){return getQuestion(id)}
function phaseKeywords(q){
  const explicit=String(q?.keywords||'').split(/[｜|、，；]/).map(x=>x.trim()).filter(x=>x.length>=2);
  if(explicit.length)return[...new Set(explicit)].slice(0,5);
  return maskRanges(baseAnswer(q),4,3,`${q.id}-phase`).map(x=>x.text);
}
function phaseDue(item,date=phaseDate()){return!item.nextReviewAt||new Date(item.nextReviewAt).getTime()<=phaseDay(date).getTime()}
function phaseDateOffset(date,days){const value=phaseDay(date);value.setDate(value.getDate()+days);return value.toISOString().slice(0,10)}

const phaseBaseBuildDailyItems=buildDailyItems;
buildDailyItems=function(chapter,date){
  if(currentStudyMode()!=='A+B')return phaseBaseBuildDailyItems(chapter,date);
  const plan=ensureStudyPlan(),yesterday=phaseDateOffset(date,-1),used=new Set(),picked=[];
  const take=(pool,count)=>{
    for(const q of pool){if(picked.length>=10||count<=0)break;if(!q||used.has(q.id))continue;used.add(q.id);picked.push(q);count--}
  };
  const current=uniqueLearningQuestions(seededShuffle(questionBank.filter(q=>questionChapter[q.id]===chapter.id),`${date}-b-current`));
  const yesterdayWeakIds=[...(plan.dictations[yesterday]?.taskIds||[]),...(state.mistakes||[]).filter(x=>String(x.lastWrongAt||'').slice(0,10)===yesterday).map(x=>x.id)];
  const yesterdayWeak=seededShuffle(questionBank.filter(q=>yesterdayWeakIds.includes(q.id)),`${date}-b-yesterday`);
  const due=seededShuffle(questionBank.filter(q=>(state.mistakes||[]).some(x=>x.id===q.id&&phaseDue(x,date))),`${date}-b-due`);
  const focus=seededShuffle(questionBank.filter(q=>baseAnswer(q).length>=24&&answerOrderPolicy(q)!=='free'),`${date}-b-focus`);
  const fallback=seededShuffle(questionBank.filter(q=>questionChapter[q.id]!==chapter.id),`${date}-b-fallback`);
  take(current,5);take(yesterdayWeak,2);take(due,2);take(focus,1);take(fallback,10-picked.length);
  return picked.slice(0,10).map(q=>dailyItemFromQuestion(q,chapter.title));
};

const originalPhaseUpsertMistake=upsertMistake;
upsertMistake=function(q,userAnswer){
  const todayValue=phaseDate();
  let item=(state.mistakes||[]).find(x=>x.id===q.id);
  const mastered=(state.mastered||[]).find(x=>x.id===q.id);
  if(!item&&mastered){state.mastered=state.mastered.filter(x=>x.id!==q.id);item={...mastered};state.mistakes.unshift(item)}
  if(!item){
    originalPhaseUpsertMistake(q,userAnswer);
    item=state.mistakes.find(x=>x.id===q.id);
  }else{
    item.wrongCount=(item.wrongCount||0)+1;
    item.userAnswer=userAnswer;item.lastWrongAt=new Date().toISOString();
  }
  if(item){item.status='pending';item.correctDates=[];item.correctStreak=0;item.nextReviewAt=phaseAddDays(todayValue,1)}
  updateBActivation();
};
markCorrect=function(q){
  const date=phaseDate();
  const pending=(state.mistakes||[]).find(x=>x.id===q.id);
  if(pending){
    pending.correctDates=Array.isArray(pending.correctDates)?pending.correctDates:[];
    if(!pending.correctDates.includes(date))pending.correctDates.push(date);
    pending.correctDates=pending.correctDates.slice(-2);pending.correctStreak=pending.correctDates.length;
    if(pending.correctDates.length>=2){
      state.mistakes=state.mistakes.filter(x=>x.id!==q.id);
      state.mastered=state.mastered.filter(x=>x.id!==q.id);
      state.mastered.unshift({...pending,status:'mastered',masteredAt:new Date().toISOString(),nextReviewAt:phaseAddDays(date,7)});
    }
  }else{
    const mastered=(state.mastered||[]).find(x=>x.id===q.id);
    if(mastered&&phaseDue(mastered,date))mastered.nextReviewAt=phaseAddDays(date,14);
  }
  updateBActivation();
};

function sprintSize(){
  if(currentStudyMode()==='C')return Math.min(3,phasePendingCount());
  const count=phasePendingCount();
  if(!updateBActivation())return 0;
  return count>=40?10:count>=25?7:5;
}
function ensureMistakeSprint(){
  const plan=ensureStudyPlan(),date=phaseDate(),size=sprintSize(),excluded=phaseSourceIds();
  let sprint=plan.sprints[date];
  if(sprint)return sprint;
  const ranked=[...(state.mistakes||[])].filter(x=>!excluded.has(x.id)).sort((a,b)=>{
    const dueDiff=Number(phaseDue(b))-Number(phaseDue(a));
    return dueDiff||(b.wrongCount||1)-(a.wrongCount||1)||new Date(b.lastWrongAt||0)-new Date(a.lastWrongAt||0)||new Date(a.nextReviewAt||0)-new Date(b.nextReviewAt||0);
  });
  const taskIds=ranked.slice(0,size).map(x=>x.id);
  sprint={date,size:taskIds.length,taskIds,index:0,answers:{},selections:{},drafts:{},done:taskIds.length===0,completedAt:null};
  plan.sprints[date]=sprint;return sprint;
}
function currentSprintQuestion(){const sprint=ensureMistakeSprint();return phaseQuestion(sprint.taskIds[sprint.index])}
function sprintAnswer(){const sprint=ensureMistakeSprint(),q=currentSprintQuestion();return q?sprint.answers[q.id]:null}
function sprintOptions(q){
  const correct=phaseKeywords(q),nearby=questionBank.filter(x=>x.id!==q.id).flatMap(phaseKeywords);
  const distractors=seededShuffle([...new Set(nearby.filter(x=>!correct.includes(x)))],`${phaseDate()}-${q.id}-sprint`).slice(0,Math.max(3,correct.length));
  return seededShuffle([...correct,...distractors],`${q.id}-${phaseDate()}-sprint-options`);
}
function toggleSprintKeyword(encoded){
  const sprint=ensureMistakeSprint(),q=currentSprintQuestion();if(!q||sprint.answers[q.id])return;
  const value=decodeURIComponent(encoded),selected=sprint.selections[q.id]||(sprint.selections[q.id]=[]);
  const at=selected.indexOf(value);if(at>=0)selected.splice(at,1);else selected.push(value);save();render();
}
function saveSprintDraft(value){const sprint=ensureMistakeSprint(),q=currentSprintQuestion();if(q){sprint.drafts[q.id]=value;save()}}
function submitSprint(){
  const sprint=ensureMistakeSprint(),q=currentSprintQuestion();if(!q)return;
  const mistake=state.mistakes.find(x=>x.id===q.id),mode=(mistake?.wrongCount||1)>1?'short':'keyword';
  const expected=phaseKeywords(q);let userAnswer='',correct=false;
  if(mode==='keyword'){
    const selected=sprint.selections[q.id]||[];if(!selected.length){notify('请先选择关键词');return}
    userAnswer=selected.join('、');correct=sameAnswerMultiset(selected,expected);
  }else{
    userAnswer=String(sprint.drafts[q.id]||'').trim();if(!userAnswer){notify('请先写出答案');return}
    const normalized=normalizedLearningText(userAnswer),hits=expected.filter(x=>normalized.includes(normalizedLearningText(x))).length;
    correct=hits>=Math.max(1,Math.ceil(expected.length*.6));
  }
  sprint.answers[q.id]={answered:true,correct,userAnswer,expected,mode,submittedAt:new Date().toISOString()};
  if(correct){state.xp+=20;markCorrect(q)}else upsertMistake(q,userAnswer);save();render();notify(correct?'✓ 错题复习正确':'× 已保留原答案，请对照解析');
}
function nextSprint(){
  const sprint=ensureMistakeSprint(),q=currentSprintQuestion();if(q&&!sprint.answers[q.id]){notify('请先完成当前错题');return}
  if(sprint.index<sprint.taskIds.length-1)sprint.index++;
  else{sprint.done=true;sprint.completedAt=new Date().toISOString();state.xp+=30;state.view='home';notify('今日错题冲刺完成')}
  save();render();
}
function mistakeSprint(){
  const sprint=ensureMistakeSprint(),q=currentSprintQuestion();
  if(!sprint.size||!q)return shell('错题冲刺','PLAN B · NO TASKS',`<div class="panel phase-empty"><h2>今天没有额外错题</h2><p>方案A中的到期复习仍会正常进行。</p><button class="primary-btn" onclick="showView('home')">返回今日航线</button></div>`);
  const mistake=state.mistakes.find(x=>x.id===q.id),mode=(mistake?.wrongCount||1)>1?'short':'keyword',result=sprint.answers[q.id];
  const selected=sprint.selections[q.id]||[],draft=sprint.drafts[q.id]||'';
  const input=mode==='keyword'
    ?`<p class="phase-hint">第一次强化：选出构成答案的全部关键词，顺序不限。</p><div class="mask-options">${sprintOptions(q).map(value=>{const encoded=encodeURIComponent(value).replaceAll("'","%27");return`<button class="mask-option ${selected.includes(value)?'phase-selected':''}" onclick="toggleSprintKeyword('${encoded}')" ${result?'disabled':''}>${escapeHtml(value)}</button>`}).join('')}</div>`
    :`<p class="phase-hint">这道题重复答错过，请用自己的话写出完整短句。</p><textarea class="subjective-editor" oninput="saveSprintDraft(this.value)" ${result?'disabled':''} placeholder="凭记忆写答案，不需要与标准答案逐字相同。">${escapeHtml(draft)}</textarea>`;
  return shell('方案B · 错题冲刺',`MISTAKE SPRINT · ${sprint.index+1} / ${sprint.size}`,`<div class="phase-topline"><span>错过 ${mistake?.wrongCount||1} 次</span><span>连续不同学习日答对2次后掌握</span></div><div class="practice-v2-layout"><section class="practice-question"><div class="question-number"><span>${String(sprint.index+1).padStart(2,'0')}</span><small>${mode==='keyword'?'关键词填空':'短句回忆'}</small></div><h2>${escapeHtml(q.q)}</h2>${input}<div class="practice-v2-actions">${result?'':`<button class="primary-btn" onclick="submitSprint()">提交答案</button>`}<button class="primary-btn" onclick="nextSprint()" ${result?'':'disabled'}>${sprint.index===sprint.size-1?'完成冲刺':'下一题'} →</button></div></section>${phaseAnswerPanel(q,result)}</div>`);
}
function phaseAnswerPanel(q,result){
  if(!result)return`<aside class="practice-answer is-empty"><div class="empty-answer-art">?</div><span>提交后显示</span><h3>原答案与标准答案对照</h3></aside>`;
  return`<aside class="practice-answer ${result.correct?'is-correct':'is-wrong'}"><div class="answer-result"><b>${result.correct?'✓':'×'}</b><div><strong>${result.correct?'回答正确':'需要再复习'}</strong><span>你的答案不会被修改</span></div></div><section><span>你的原答案</span><p>${escapeHtml(result.userAnswer)}</p></section><section><span>标准答案</span><p>${escapeHtml(baseAnswer(q))}</p></section><section class="example-card"><span>用例子理解</span><p>${escapeHtml(exampleForQuestion(q))}</p></section></aside>`;
}

function subjectiveCandidateQuestions(){return uniqueLearningQuestions(questionBank.filter(q=>baseAnswer(q).length>=18))}
function ensureSubjectiveDay(){
  const plan=ensureStudyPlan(),date=phaseDate();let day=plan.subjective[date];if(day)return day;
  const excluded=new Set([...(ensureDailyTask().items||[]).map(x=>x.sourceQuestionId),...(ensureMistakeSprint().taskIds||[])]);
  const pool=seededShuffle(subjectiveCandidateQuestions().filter(q=>!excluded.has(q.id)),`${date}-subjective`);
  const essays=pool.filter(q=>answerOrderPolicy(q)!=='free'&&baseAnswer(q).length>=35);
  const shorts=pool.filter(q=>!essays.some(e=>e.id===q.id));
  const ids=[...shorts.slice(0,2).map(x=>x.id),...(essays[0]?[essays[0].id]:pool.slice(2,3).map(x=>x.id))];
  day={date,taskIds:ids,index:0,drafts:{},answers:{},assessments:{},done:false,completedAt:null};plan.subjective[date]=day;return day;
}
function currentSubjectiveQuestion(){const day=ensureSubjectiveDay();return phaseQuestion(day.taskIds[day.index])}
function saveSubjectiveDraft(value){const day=ensureSubjectiveDay(),q=currentSubjectiveQuestion();if(q){day.drafts[q.id]=value;save()}}
function subjectiveScore(q,text,isEssay){
  const normalized=normalizedLearningText(text),keywords=phaseKeywords(q),hits=keywords.filter(x=>normalized.includes(normalizedLearningText(x)));
  const positions=keywords.map(x=>normalized.indexOf(normalizedLearningText(x))).filter(x=>x>=0),ordered=answerOrderPolicy(q)==='free'||positions.every((value,index)=>index===0||value>=positions[index-1]);
  const relation=ordered&&/(因为|因此|同时|基础|关系|作用|使|通过|而|并)/.test(text),complete=text.trim().length>=(isEssay?90:35),example=/(例如|比如|如《|作品|建筑|绘画|电影|音乐)/.test(text),conclusion=/(因此|所以|由此|总之|可见)/.test(text);
  const coverage=keywords.length?hits.length/keywords.length:0;
  const score=isEssay?Math.round(coverage*30+(relation?30:0)+(example?25:0)+(conclusion?15:0)):Math.round(coverage*60+(relation?25:0)+(complete?15:0));
  return{score,keywords,hits,coverage,ordered,relation,complete,example,conclusion};
}
function submitSubjective(){
  const day=ensureSubjectiveDay(),q=currentSubjectiveQuestion(),text=String(day.drafts[q.id]||'').trim();if(!text){notify('请先完成默写');return}
  const isEssay=day.index>=2,result=subjectiveScore(q,text,isEssay);
  day.answers[q.id]={answered:true,userAnswer:text,isEssay,...result,submittedAt:new Date().toISOString()};save();render();notify('原文已保存，请对照评分点完成自评');
}
function assessSubjective(level){
  const day=ensureSubjectiveDay(),q=currentSubjectiveQuestion(),answer=day.answers[q.id];if(!answer)return;
  day.assessments[q.id]={level,date:phaseDate(),at:new Date().toISOString()};
  if(level==='mastered')markCorrect(q);else upsertMistake(q,answer.userAnswer);
  if(day.index<day.taskIds.length-1)day.index++;else{day.done=true;day.completedAt=new Date().toISOString();state.xp+=80;state.view='home';notify('今日主观输出完成')}
  save();render();
}
function subjectivePractice(){
  if(currentStudyMode()!=='C')return shell('主观题输出','PLAN C · LOCKED',`<div class="panel phase-empty"><h2>考前28天自动开启</h2><p>现在先完成方案A；错题达到15道后会叠加方案B。</p></div>`);
  const day=ensureSubjectiveDay(),q=currentSubjectiveQuestion(),answer=day.answers[q.id],draft=day.drafts[q.id]||'',isEssay=day.index>=2;
  const level=day.index===0?'关键词默写':day.index===1?'完整句默写':'简答骨架';
  const writingGuide=day.index===0?'写出3～4个核心概念':day.index===1?'用一句完整的话写清定义或关系':'按“观点 → 解释 → 例子或结论”写出三层骨架';
  const panel=answer?`<aside class="practice-answer subjective-result"><div class="score-ring">${answer.score}<small>参考分</small></div><section><span>你的原答案</span><p>${escapeHtml(answer.userAnswer)}</p></section><section><span>标准答案</span><p>${escapeHtml(baseAnswer(q))}</p></section><section><span>评分点</span><p>${answer.keywords.map(x=>`${answer.hits.includes(x)?'✓':'○'} ${escapeHtml(x)}`).join('　')}</p></section><section class="example-card"><span>例子参考</span><p>${escapeHtml(exampleForQuestion(q))}</p></section><div class="assessment-actions"><button onclick="assessSubjective('mastered')">掌握</button><button onclick="assessSubjective('partial')">不完整</button><button onclick="assessSubjective('unknown')">不会</button></div></aside>`:`<aside class="practice-answer is-empty"><div class="empty-answer-art">写</div><span>提交前不显示关键词</span><h3>请先独立组织答案</h3></aside>`;
  return shell('方案C · 考场微默写',`SUBJECTIVE OUTPUT · ${day.index+1} / ${day.taskIds.length}`,`<div class="practice-v2-layout"><section class="practice-question"><div class="question-number"><span>${level}</span><small>${writingGuide}</small></div><h2>${escapeHtml(q.q.replace(/^背诵[：:]\s*/,''))}</h2><p class="dictation-frame">${writingGuide}。系统检查核心意思；因果、转折或关键关系写反会判错。</p><textarea class="subjective-editor" oninput="saveSubjectiveDraft(this.value)" ${answer?'disabled':''} placeholder="先凭记忆独立写出，提交前不显示关键词。">${escapeHtml(draft)}</textarea><p class="draft-status">输入内容实时自动保存</p><div class="practice-v2-actions">${answer?'':'<button class="primary-btn" onclick="submitSubjective()">提交并对照 →</button>'}</div></section>${panel}</div>`);
}

function dictationQuestionIdsFor(date=phaseDate()){
  const lesson=ensureDailyTask();
  if(lesson.date!==date)return[];
  const ranked=[...(lesson.items||[])].sort((a,b)=>{
    const wrongCount=item=>Object.entries(lesson.answers||{}).filter(([key,value])=>key.endsWith(`:${item.id}`)&&value?.correct===false).length;
    const aWrong=wrongCount(a),bWrong=wrongCount(b);
    return bWrong-aWrong||baseAnswer(phaseQuestion(b.sourceQuestionId)).length-baseAnswer(phaseQuestion(a.sourceQuestionId)).length;
  });
  const count=currentStudyMode()==='A+B'?1:2;
  return ranked.slice(0,count).map(x=>x.sourceQuestionId);
}
function ensureDailyDictation(date=phaseDate()){
  const plan=ensureStudyPlan();
  if(plan.dictations[date])return plan.dictations[date];
  const taskIds=date===phaseDate()?dictationQuestionIdsFor(date):[];
  plan.dictations[date]={date,taskIds,index:0,drafts:{},answers:{},done:taskIds.length===0,completedAt:null,recall:{taskIds:[],index:0,drafts:{},answers:{},done:true}};
  return plan.dictations[date];
}
function ensureYesterdayRecall(){
  const todayRecord=ensureDailyDictation(),yesterday=phaseDateOffset(phaseDate(),-1),previous=ensureStudyPlan().dictations[yesterday];
  if(!todayRecord.recall||!Array.isArray(todayRecord.recall.taskIds))todayRecord.recall={taskIds:[],index:0,drafts:{},answers:{},done:true};
  if(previous?.taskIds?.length&&!todayRecord.recall.seeded){
    todayRecord.recall={taskIds:previous.taskIds.slice(0,2),index:0,drafts:{},answers:{},done:false,seeded:true};
  }
  return todayRecord.recall;
}
function activeDictation(){const plan=ensureStudyPlan();return plan.activeDictationKind==='recall'?ensureYesterdayRecall():ensureDailyDictation()}
function openDailyDictation(kind='today'){
  const plan=ensureStudyPlan();plan.activeDictationKind=kind;
  const session=kind==='recall'?ensureYesterdayRecall():ensureDailyDictation();
  if(!session.startedAt)session.startedAt=new Date().toISOString();
  state.view='dailyDictation';save();render();window.scrollTo({top:0});
}
function currentDictationQuestion(){const session=activeDictation();return phaseQuestion(session.taskIds[session.index])}
function saveDictationDraft(value){const session=activeDictation(),q=currentDictationQuestion();if(q){session.drafts[q.id]=value;save()}}
function dictationEvaluation(q,text){
  const keywords=phaseKeywords(q),normalized=normalizedLearningText(text),hits=keywords.filter(x=>normalized.includes(normalizedLearningText(x))),missing=keywords.filter(x=>!hits.includes(x));
  return{keywords,hits,missing,coverage:keywords.length?hits.length/keywords.length:0};
}
function submitDictation(){
  const session=activeDictation(),q=currentDictationQuestion(),text=String(session.drafts[q.id]||'').trim();if(!text){notify('请先凭记忆写出答案');return}
  const result=dictationEvaluation(q,text);session.answers[q.id]={answered:true,userAnswer:text,...result,submittedAt:new Date().toISOString()};
  if(result.coverage>=.75)markCorrect(q);else upsertMistake(q,text);
  save();render();notify(result.coverage>=.75?'✓ 核心意思基本完整':'已保留原文，请查看遗漏的关键点');
}
function nextDictation(){
  const session=activeDictation(),q=currentDictationQuestion();if(q&&!session.answers[q.id]){notify('请先提交当前默写');return}
  if(session.index<session.taskIds.length-1)session.index++;
  else{session.done=true;session.completedAt=new Date().toISOString();state.xp+=30;state.view='home';notify(ensureStudyPlan().activeDictationKind==='recall'?'昨日默写回收完成':'今日默写完成，游戏关卡已解锁')}
  save();render();window.scrollTo({top:0});
}
function dailyDictation(){
  const plan=ensureStudyPlan(),kind=plan.activeDictationKind==='recall'?'recall':'today',session=activeDictation(),q=currentDictationQuestion();
  if(!q)return shell('每日默写','DICTATION · COMPLETE',`<div class="panel phase-empty"><h2>当前没有待默写内容</h2><button class="primary-btn" onclick="showView('home')">返回今日航线</button></div>`);
  const answer=session.answers[q.id],draft=session.drafts[q.id]||'',label=kind==='recall'?'昨日2题回收':'3分钟默写';
  const panel=answer?`<aside class="practice-answer ${answer.coverage>=.75?'is-correct':'is-wrong'}"><div class="answer-result"><b>${answer.coverage>=.75?'✓':'×'}</b><div><strong>${answer.coverage>=.75?'核心意思基本完整':'还有关键点遗漏'}</strong><span>原文不会被替换</span></div></div><section><span>你的原答案</span><p>${escapeHtml(answer.userAnswer)}</p></section><section><span>你写到的核心点</span><p>${answer.hits.length?answer.hits.map(escapeHtml).join('、'):'暂未覆盖核心点'}</p></section><section><span>还缺少</span><p>${answer.missing.length?answer.missing.map(escapeHtml).join('、'):'没有明显遗漏'}</p></section><section class="${answer.missing.length?'answer-correction-glow':''}"><span>标准答案</span><p>${escapeHtml(baseAnswer(q))}</p></section><section class="example-card"><span>一句话理解</span><p>${escapeHtml(exampleForQuestion(q))}</p></section></aside>`:`<aside class="practice-answer is-empty"><div class="empty-answer-art">写</div><span>提交前不显示关键词</span><h3>先独立写，再对照缺漏</h3></aside>`;
  return shell(label,`DICTATION · ${session.index+1} / ${session.taskIds.length}`,`<div class="dictation-strip"><span>${kind==='recall'?'先回收昨天，再开始今天':'建议限时3分钟'}</span><b>只检查核心意思，不要求逐字一致</b></div><div class="practice-v2-layout"><section class="practice-question"><div class="question-number"><span>${String(session.index+1).padStart(2,'0')}</span><small>${label}</small></div><h2>${escapeHtml(q.q.replace(/^背诵[：:]\s*/,''))}</h2><p class="dictation-frame">请独立写出定义、关系或结论。提交前不提供关键词。</p><textarea class="subjective-editor dictation-editor" oninput="saveDictationDraft(this.value)" ${answer?'disabled':''} placeholder="在这里默写……">${escapeHtml(draft)}</textarea><p class="draft-status">输入内容会实时自动保存</p><div class="practice-v2-actions">${answer?'':`<button class="primary-btn" onclick="submitDictation()">提交并检查遗漏</button>`}<button class="primary-btn" onclick="nextDictation()" ${answer?'':'disabled'}>${session.index===session.taskIds.length-1?'完成默写':'下一题'} →</button></div></section>${panel}</div>`);
}

const phaseOriginalHome=home;
home=function(){
  const mode=currentStudyMode(),lesson=ensureDailyTask(),baseDone=totalPracticeDone(),baseTarget=lesson.size*lesson.rounds,sprint=ensureMistakeSprint(),subjective=mode==='C'?ensureSubjectiveDay():null,todayDictation=mode==='C'?null:ensureDailyDictation(),recall=mode==='C'?null:ensureYesterdayRecall();
  const bGap=Math.max(0,MISTAKE_B_START-phasePendingCount()),stageText=mode==='C'?'已进入考前28天主观输出':mode==='A+B'?`错题强化 ${sprint.size} 题`:`再积累 ${bGap} 道待掌握错题开启B`;
  const tasks=[];
  if(recall?.taskIds?.length)tasks.push(`<article class="task phase-card ${recall.done?'done':'active'}"><div class="task-top"><div class="task-icon mint">昨</div><span class="task-tag">${recall.taskIds.length}题</span></div><h4>昨日默写回收</h4><p>开场先重新写昨天抽出的题，确认记忆没有只停留一天。</p><button onclick="openDailyDictation('recall')">${recall.done?'已完成回收':'先完成昨日回收'} →</button></article>`);
  tasks.push(`<article class="task phase-card ${recall&&!recall.done?'locked':'active'}"><div class="task-top"><div class="task-icon coral">${mode==='A+B'?'B':'A'}</div><span class="task-tag">${lesson.size}题 × ${lesson.rounds}轮</span></div><h4>${mode==='A+B'?'5新＋2昨日＋2到期＋1重点':'三轮渐进训练'}</h4><p>${mode==='A+B'?'题目不再只按章节整齐推进，而是针对薄弱处重新组合。':'遮2、3、4个完整概念，逐轮提高提取难度。'}</p><button onclick="showView('practice')" ${recall&&!recall.done?'disabled':''}>${recall&&!recall.done?'先完成昨日回收':lesson.done?'查看基础训练':'继续基础训练'} →</button></article>`);
  if(mode!=='C')tasks.push(`<article class="task phase-card ${todayDictation.done?'done':lesson.done?'active':'locked'}"><div class="task-top"><div class="task-icon yellow">写</div><span class="task-tag">${todayDictation.taskIds.length}题 · 3分钟</span></div><h4>今日重点默写</h4><p>只显示题目和答题框，提交后检查写到与遗漏的核心点。</p><button onclick="openDailyDictation('today')" ${lesson.done?'':'disabled'}>${todayDictation.done?'今日已完成':lesson.done?'开始默写':'完成三轮后开启'} →</button></article>`);
  if(mode==='A+B')tasks.push(`<article class="task phase-card ${sprint.done?'done':'active'}"><div class="task-top"><div class="task-icon mint">错</div><span class="task-tag">${sprint.size}道</span></div><h4>错题追击</h4><p>对高频错误继续做关键词或短句回忆，连续两天完整才算掌握。</p><button onclick="showView('mistakeSprint')">${sprint.done?'今日已完成':'开始错题追击'} →</button></article>`);
  if(mode==='C')tasks.push(`<article class="task phase-card ${subjective.done?'done':'active'}"><div class="task-top"><div class="task-icon yellow">C</div><span class="task-tag">3道微默写</span></div><h4>考场式微默写</h4><p>依次完成关键词、完整句和简答骨架，不提前显示提示。</p><button onclick="showView('subjectivePractice')">${subjective.done?'今日已完成':'开始考场输出'} →</button></article>`);
  return shell('今天，把答案真正写出来。',`DAY ${String(lesson.dayNumber).padStart(2,'0')} · ${phaseLabel(mode)}`,`<p class="lede">先回收昨天，再学习今天，最后通过默写确认自己真的能写出来。</p><div class="phase-banner mode-${mode.replace('+','b').toLowerCase()}"><div><span>今日模式</span><h2>${phaseLabel(mode)}</h2><p>${stageText} · 预计 ${phaseEstimate(mode)}</p></div><div class="phase-days"><strong>${daysLeft()}</strong><span>天后考试</span></div></div><div class="stats"><div class="stat"><span>基础训练</span><strong>${baseDone}<small> / ${baseTarget}次</small></strong><small>${lesson.done?'已完成':'继续提取练习'}</small></div><div class="stat"><span>待掌握错题</span><strong>${phasePendingCount()}<small> 题</small></strong><small>${mode==='A'?'达到15题开启B':'正在按优先级复习'}</small></div><div class="stat"><span>今日输出</span><strong>${mode==='C'?(subjective?.done?'完成':'3题'):(todayDictation?.done?'完成':`${todayDictation?.taskIds.length||0}题`)}</strong><small>默写后才算真正学会</small></div></div><div class="section-head"><div><h3>今日学习路线</h3><p>昨日回收 → 基础训练 → 今日默写 → 游戏关卡</p></div><button class="text-btn" onclick="showView('mistakes')">查看全部错题 →</button></div><div class="task-grid phase-task-grid">${tasks.join('')}</div>${typeof gameStatusCard==='function'?gameStatusCard():''}`);
};
review=function(){const sprint=ensureMistakeSprint();return shell('复习，不是重来',`SPACED REVIEW · ${phasePendingCount()} PENDING`,`<p class="lede">连续两个不同学习日答对，才会移入已掌握；已掌握题7天后抽查。</p><div class="panel phase-review-summary"><div><strong>${phasePendingCount()}</strong><span>待掌握</span></div><div><strong>${(state.mastered||[]).filter(item=>phaseDue(item)).length}</strong><span>到期抽查</span></div><div><strong>${sprint.size}</strong><span>今日冲刺</span></div></div>${sprint.size?'<button class="primary-btn phase-start" onclick="showView(\'mistakeSprint\')">进入今日错题冲刺 →</button>':'<div class="panel phase-empty"><h3>今天没有额外冲刺</h3><p>到期题仍会进入方案A的每日复习部分。</p></div>'}`)};
mistakes=function(){
  const pending=(state.mistakes||[]).map(x=>({...x,mastered:false})),mastered=(state.mastered||[]).map(x=>({...x,mastered:true})),all=[...pending,...mastered];
  const rows=all.length?all.map(x=>`<div class="review-card"><div class="review-badge">${x.mastered?'✓':'!'}</div><div><h4>${escapeHtml(x.question)}</h4><p>${escapeHtml(x.chapter||'艺术概论')} · ${x.mastered?'已掌握，等待抽查':`错过 ${x.wrongCount||1} 次 · 不同日答对 ${(x.correctDates||[]).length}/2`}</p><p class="count-detail">你的原答案：${escapeHtml(x.userAnswer||'未记录')}<br>标准答案：${escapeHtml(x.answer||baseAnswer(phaseQuestion(x.id))||'见解析')}</p></div>${x.mastered?'':`<button class="primary-btn" onclick="retryMistake('${x.id}')">再练一次</button>`}</div>`).join(''):'<div class="empty-state"><h3>还没有错题</h3><p>答错的题会自动保存，并在后续阶段继续出现。</p></div>';
  return shell('错题仓库',`MISTAKE VAULT · ${pending.length} PENDING`,`<p class="lede">错误不会重复建档；提交后的原答案始终保留。</p><div class="mistake-summary"><span>待掌握 ${pending.length}</span><span>已掌握 ${mastered.length}</span><span>B模式阈值 15题</span></div><div class="panel" style="margin-top:20px">${rows}</div>`);
};

const phaseBaseRpgGameUnlocked=typeof rpgGameUnlocked==='function'?rpgGameUnlocked:null;
if(phaseBaseRpgGameUnlocked)rpgGameUnlocked=function(){
  if(!phaseBaseRpgGameUnlocked())return false;
  return currentStudyMode()==='C'?Boolean(ensureSubjectiveDay().done):Boolean(ensureDailyDictation().done);
};
const phaseBaseGameStatusCard=typeof gameStatusCard==='function'?gameStatusCard:null;
if(phaseBaseGameStatusCard)gameStatusCard=function(){
  return phaseBaseGameStatusCard().replaceAll('完成每日10题三轮训练后开放','完成基础训练与今日默写后开放').replaceAll('完成三轮后解锁','完成三轮与默写后解锁');
};

const phaseOriginalRender=render;
render=function(){
  ensureStudyPlan();ensureDailyTask();
  const phaseViews={mistakeSprint,subjectivePractice,dailyDictation};
  if(!phaseViews[state.view]){
    phaseOriginalRender();
    return;
  }
  content.innerHTML=phaseViews[state.view]();
  document.querySelectorAll('.nav-item,.mobile-nav-item').forEach(button=>button.classList.toggle('active',button.dataset.view===state.view));
  const streak=document.getElementById('streakSide');if(streak)streak.textContent=state.streak+' 天';
  const back=document.getElementById('mobileBack');if(back)back.classList.toggle('is-hidden',state.view==='home');
};

ensureStudyPlan();
currentStudyMode();
save();
render();
