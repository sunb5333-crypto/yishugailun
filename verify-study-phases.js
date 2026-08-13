const BASE='http://127.0.0.1:4175/index.html';
const CDP='http://127.0.0.1:9224';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Cdp{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.waiting=new Map();this.errors=[];this.ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const pending=this.waiting.get(message.id);if(pending){this.waiting.delete(message.id);message.error?pending.reject(message.error):pending.resolve(message.result)}}else if(message.method==='Runtime.exceptionThrown')this.errors.push(message.params.exceptionDetails.text||'runtime exception')}}
  async open(){if(this.ws.readyState===1)return;await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject})}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.waiting.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async run(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value}
}
const check=(value,message)=>{if(!value)throw new Error(message)};
async function ready(client,expression,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await client.run(expression))return;await pause(100)}throw new Error(`timeout: ${expression}`)}
async function main(){
  const tabs=await(await fetch(`${CDP}/json/list`)).json(),tab=tabs.find(item=>item.type==='page')||tabs[0],client=new Cdp(tab.webSocketDebuggerUrl);
  await client.open();await client.send('Runtime.enable');await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await client.send('Page.navigate',{url:`${BASE}?view=home&v=phase-dictation-2`});await ready(client,"typeof ensureDailyDictation==='function'");
  const result=await client.run(`(()=>{
    localStorage.removeItem(STORAGE_KEY);state={...initialState,mistakes:[],mastered:[],snapshots:[],view:'home'};ensureStudyPlan();
    state.dailyLesson=null;const a=ensureDailyTask();
    const aResult={mode:currentStudyMode(),size:a.size,rounds:a.rounds,items:a.items.length,unique:new Set(a.items.map(x=>x.sourceQuestionId)).size,backup:state.snapshots.some(x=>x.label==='A/B/C升级前自动存档')};
    const dictation=ensureDailyDictation();
    const dictationResult={count:dictation.taskIds.length,hasView:typeof dailyDictation==='function'};
    const pool=questionBank.slice(0,15);for(const q of pool)upsertMistake(q,'测试错答');state.dailyLesson=null;const ab=ensureDailyTask(),sprint=ensureMistakeSprint();
    const abResult={mode:currentStudyMode(),size:ab.size,rounds:ab.rounds,sprint:sprint.size,duplicate:sprint.taskIds.some(id=>ab.items.some(x=>x.sourceQuestionId===id))};
    const tracked=state.mistakes.find(x=>x.id===pool[0].id);markCorrect(pool[0]);markCorrect(pool[0]);const sameDay=(state.mistakes.find(x=>x.id===pool[0].id)?.correctDates||[]).length;
    const originalPhaseDate=phaseDate,day1=originalPhaseDate();phaseDate=()=>{const d=phaseDay(day1);d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};markCorrect(pool[0]);const masteredDifferentDays=state.mastered.some(x=>x.id===pool[0].id);phaseDate=originalPhaseDate;
    for(const q of questionBank.slice(15,45))if(!state.mistakes.some(x=>x.id===q.id))upsertMistake(q,'测试错答');state.dailyLesson=null;const heavy=ensureDailyTask(),chapter=chapterForDay(heavy.dayNumber);const heavyCurrent=heavy.items.filter(x=>questionChapter[x.sourceQuestionId]===chapter.id).length;
    const originalMode=currentStudyMode;currentStudyMode=()=> 'C';state.dailyLesson=null;const cram=ensureDailyTask(),subjective=ensureSubjectiveDay();state.view='subjectivePractice';render();
    const q=currentSubjectiveQuestion();subjective.drafts[q.id]=baseAnswer(q);submitSubjective();const saved=subjective.answers[q.id];
    const cResult={size:cram.size,rounds:cram.rounds,subjectiveCount:subjective.taskIds.length,originalSaved:saved.userAnswer===baseAnswer(q),score:saved.score,hasAssessmentButtons:document.querySelectorAll('.assessment-actions button').length===3};
    currentStudyMode=originalMode;
    return{a:aResult,dictation:dictationResult,ab:abResult,mastery:{sameDay,masteredDifferentDays},heavy:{pending:state.mistakes.length,currentChapterItems:heavyCurrent},c:cResult,html:document.body.innerText.includes('主观题输出')};
  })()`);
  check(result.a.mode==='A'&&result.a.size===10&&result.a.rounds===3&&result.a.unique===10&&result.a.backup,'A mode failed');
  check(result.dictation.count===2&&result.dictation.hasView,'A dictation failed');
  check(result.ab.mode==='A+B'&&result.ab.sprint===5&&!result.ab.duplicate,'B mode failed');
  check(result.mastery.sameDay===1&&result.mastery.masteredDifferentDays,'different-day mastery failed');
  check(result.heavy.currentChapterItems<=5,'40+ mistakes did not reduce current chapter questions');
  check(result.c.size===7&&result.c.rounds===3&&result.c.subjectiveCount>=3&&result.c.originalSaved&&result.c.hasAssessmentButtons,'C mode failed');
  await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await client.send('Page.reload');await ready(client,"typeof ensureDailyDictation==='function'");
  const mobile=await client.run(`({overflow:document.documentElement.scrollWidth-innerWidth,phase:!!document.querySelector('.phase-banner'),cards:document.querySelectorAll('.phase-card').length})`);
  check(mobile.overflow<=2&&mobile.phase&&mobile.cards>=1,'mobile phase layout failed');
  check(client.errors.length===0,`runtime errors: ${client.errors.join('|')}`);
  console.log(JSON.stringify({result,mobile,errors:client.errors},null,2));client.ws.close();
}
main().catch(error=>{console.error(error.stack||error);process.exit(1)});
