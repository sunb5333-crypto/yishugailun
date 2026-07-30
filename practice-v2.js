/* 三轮掩码练习：每天只学习当前计划章节，同一组17个结论逐轮加深。 */
const PRACTICE_VERSION=2;
const COURSE_START_DATE='2026-07-27';
const DAILY_LESSON_SIZE=17;
const PRACTICE_ROUNDS=3;

const PRACTICE_EXAMPLES={
  a1:'例如齐白石画虾，不是把真实的虾机械照搬到纸上，而是提炼虾的形态、动作和神态，形成具有审美意味的艺术形象。这说明艺术既来自现实，又包含人的审美创造。',
  a2:'例如一部表现抗战生活的电影，既能让观众认识一段历史，也能引起爱国情感并带来审美体验，因此同时具有认识、教育和审美功能。',
  a3:'例如一幅画可以在同一空间中整体观看，而一首乐曲必须随着时间从开头听到结尾。前者偏向空间艺术，后者属于时间艺术。',
  a9:'例如《清明上河图》的题材、人物和市井活动来自宋代社会生活；今天的人又能通过作品认识当时的城市面貌，这就是生活产生艺术、艺术反映生活。',
  a10:'例如现代水墨画可以保留笔墨精神，同时采用现代构图并表现城市生活。它不是照抄古画，也不是抛弃传统，而是在继承基础上创新。',
  a11:'例如中国水墨画有鲜明的民族笔墨特点，但作品中表达的亲情、乡愁等情感也能被不同文化的观众理解，体现民族性与世界性的统一。',
  a12:'例如一座剧院既要保证结构安全、视线和声学功能，也要通过空间、比例和造型形成审美感受。前一部分体现科学性，后一部分体现艺术性。',
  a18:'例如北京四合院通过院落改善采光通风，福建土楼用厚墙保持稳定温度。不同构造都是民居适应当地气候与生活方式的结果。',
  a21:'例如苏州园林通过漏窗、曲廊和借景，让游人在转弯后看到不同景色，用有限空间产生丰富层次和自然意趣。',
  a24:'例如哥特式教堂利用高耸空间和彩色玻璃营造神圣感。建筑不只容纳礼拜活动，也用光线、尺度和象征表达信仰。',
  a27:'例如现代建筑可以借鉴传统院落的空间关系和适应气候的智慧，但采用现代材料与功能，而不是简单贴上仿古屋顶。',
  a4:'例如作曲家先从生活中获得感受，再构思旋律与结构，最后通过乐器和演奏完成作品，依次对应体验、构思和表现。',
  a6:'例如电影的主题属于内容，镜头、声音和剪辑属于形式。只有二者相互配合，主题才能成为具体可感的作品。',
  a8:'例如欣赏《千里江山图》时，先看到色彩与构图，再产生壮阔的情感体验，最后结合时代背景理解作品意义。',
  a17:'例如美术馆保存作品、举办展览、开展研究并组织讲解活动，四项工作共同构成它的公共文化功能。'
};

const CONFUSABLE_REPLACEMENTS=[
  ['审美创造','机械复制'],['精神生产','物质生产'],['社会实践','个人消遣'],
  ['认识功能','裁判功能'],['教育功能','强制功能'],['时间艺术','空间艺术'],
  ['继承传统','割断传统'],['面向时代','脱离时代'],['文化连续性','文化中断'],
  ['反作用于','被动服从于'],['实用功能','商业价格'],['审美价值','使用价值'],
  ['民族性','世界性'],['艺术个性','艺术共性'],['跨文化交流','民族内部表达'],
  ['社会生活','个人想象'],['源泉和基础','结果和终点'],['反映生活','脱离生活'],
  ['时间艺术','空间艺术'],['时空艺术','实用艺术'],['传统精华','传统糟粕'],
  ['具体可感','抽象空洞'],['相互依存','彼此分离'],['自然意趣','绝对对称'],
  ['礼制秩序','随意布局'],['神圣氛围','日常氛围'],['当代表达','机械复古'],
  ['审美感知','市场判断'],['审美体验','技术测量'],['审美理解','价格估计']
];
const SEMANTIC_TERMS=[
  '感性形象','审美创造','精神生产','社会实践','审美功能','认识功能','教育功能','娱乐功能',
  '时间艺术','空间艺术','时空艺术','社会生活','艺术创作','源泉和基础','反映生活','反作用于生活',
  '艺术创新','传统精华','面向时代','文化连续性','审美需要','民族性','世界性','艺术个性','跨文化交流',
  '结构安全','使用功能','造型空间','文化表达','实用功能','审美价值','生活经验','联想改造','内容与形式',
  '相互依存','具体可感','个性与共性','审美感知','审美体验','审美理解','中心院落','家庭秩序',
  '地域气候','通风采光','保温防雨','就地取材','地域特色','借景','对景','曲折空间','自然意趣',
  '中轴对称','主次分明','礼制秩序','宗教仪式','神圣空间','高耸空间','彩色玻璃','佛舍利',
  '当代表达','现代材料','艺术体验','艺术构思','艺术表现','情感共鸣','精神净化','思想领悟'
];

function localDateString(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return`${y}-${m}-${d}`;
}
function parseLocalDate(value){
  const [y,m,d]=String(value).split('-').map(Number);
  return new Date(y,m-1,d,12,0,0);
}
function courseDayNumber(date=localDateString()){
  return Math.max(1,Math.min(88,Math.floor((parseLocalDate(date)-parseLocalDate(COURSE_START_DATE))/86400000)+1));
}
function chapterForDay(day){
  let remaining=Math.max(1,Math.min(60,day));
  for(const chapter of syllabusChapters){
    if(remaining<=chapter.days)return chapter;
    remaining-=chapter.days;
  }
  return syllabusChapters[syllabusChapters.length-1];
}
function seededShuffle(items,seedText){
  const rand=seeded(hashText(seedText)),copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
  return copy;
}
function baseAnswer(q){
  return String(q.answerText||q.memorize||(q.type==='choice'?q.options?.[q.answer]:'')||q.explain||'').trim();
}
function exampleForQuestion(q){
  if(PRACTICE_EXAMPLES[q.id])return PRACTICE_EXAMPLES[q.id];
  const chapterId=questionChapter[q.id];
  const generic={
    architecture:'例如分析一座建筑时，可以分别看它是否安全好用、空间如何组织、外形表达什么文化意义，再把这些方面联系起来理解。',
    residence:'例如比较南北方民居时，要把屋顶、墙体、院落和开口放回当地气候、材料与生活方式中理解。',
    garden:'例如游览园林时，曲折路径、门窗框景和水面倒影会让有限空间产生不断变化的景色。',
    religion:'例如宗教建筑常用特殊的尺度、光线、方向和象征物，把普通空间转化为适合仪式与信仰表达的神圣空间。',
    modern:'例如优秀的现代设计会理解传统的空间智慧和文化精神，再用现代材料、技术与生活功能重新表达。',
    creation:'例如创作者先从生活获得体验，再加工构思，最后用具体媒介完成作品；内容与形式在成品中不能分开。',
    appreciation:'例如面对一件作品，可以先观察形式，再体会情感，最后联系背景与经验理解它的意义。',
    exam:'例如主观题作答时，先写清概念，再分点说明关系，最后用一个作品或生活实例证明观点。'
  };
  return generic[chapterId]||`例如理解“${q.section}”时，可以把这条结论放进一件熟悉的作品中，观察作品如何用具体形象表达思想和情感。`;
}
function lessonVariants(q){
  const core=baseAnswer(q),explain=String(q.explain||'').trim();
  const variants=[
    {kind:'核心结论',prompt:`补全“${q.section}”的核心结论`,answerText:core},
    {kind:'理解说明',prompt:`补全“${q.section}”的理解说明`,answerText:explain||core},
    {kind:'答题表达',prompt:`把“${q.section}”补成可用于考试的完整表述`,answerText:`${core}${explain&&explain!==core?' '+explain:''}`}
  ];
  return variants.filter(v=>v.answerText.length>=8);
}
function buildDailyItems(chapter,date){
  let sources=questionBank.filter(q=>questionChapter[q.id]===chapter.id);
  if(!sources.length)sources=questionBank.slice(0,8);
  const variants=sources.flatMap(q=>lessonVariants(q).map((v,index)=>({
    id:`${q.id}-l${index+1}`,sourceQuestionId:q.id,type:'mask',chapter:chapter.title,
    section:q.section,q:v.prompt,answerText:v.answerText,explain:q.explain||baseAnswer(q),
    keywords:q.keywords||'',example:exampleForQuestion(q),variant:v.kind
  })));
  const items=[],ordered=seededShuffle(variants,`${date}-${chapter.id}-lesson`);
  for(let i=0;i<DAILY_LESSON_SIZE;i++){
    const source=ordered[i%ordered.length];
    items.push({...source,id:`${source.id}-${i+1}`});
  }
  return items;
}
function archivePreviousLesson(){
  if(!state.dailyLesson)return;
  state.practiceHistory=Array.isArray(state.practiceHistory)?state.practiceHistory:[];
  if(!state.practiceHistory.some(x=>x.date===state.dailyLesson.date)){
    state.practiceHistory.unshift({
      date:state.dailyLesson.date,chapterId:state.dailyLesson.chapterId,
      round:state.dailyLesson.round,index:state.dailyLesson.index,done:state.dailyLesson.done,
      correct:Object.values(state.dailyLesson.answers||{}).filter(x=>x.correct).length
    });
    state.practiceHistory=state.practiceHistory.slice(0,30);
  }
}
function createDailyLesson(date){
  const dayNumber=courseDayNumber(date),chapter=chapterForDay(dayNumber);
  const items=buildDailyItems(chapter,date);
  const ids=items.map(x=>x.id);
  return{
    version:PRACTICE_VERSION,date,dayNumber,chapterId:chapter.id,chapterTitle:chapter.title,
    items,orders:{
      1:ids,
      2:seededShuffle(ids,`${date}-round-2`),
      3:seededShuffle(ids,`${date}-round-3`)
    },
    round:1,index:0,answers:{},selections:{},done:false,completedAt:null,completionOpen:false
  };
}
function ensureDailyTask(){
  const date=localDateString();
  const current=state.dailyLesson;
  if(!current||current.version!==PRACTICE_VERSION||current.date!==date){
    const legacyDone=state.dailyDate===date&&state.dailyDone;
    archivePreviousLesson();
    state.dailyLesson=createDailyLesson(date);
    state.dailyGame=null;
    if(legacyDone){
      state.dailyLesson.done=true;
      state.dailyLesson.round=3;
      state.dailyLesson.index=16;
      state.dailyLesson.completedAt=new Date().toISOString();
    }
  }
  const lesson=state.dailyLesson;
  state.dailyDate=lesson.date;
  state.dailyTask=lesson.items.map(x=>x.id);
  state.dailyIndex=lesson.index;
  state.dailyAnswers=lesson.answers;
  state.dailyDone=Boolean(lesson.done);
  return lesson;
}
function getDailyLessonItem(id){
  return ensureDailyTask().items.find(x=>x.id===id)||null;
}
function currentDailyItem(){
  const lesson=ensureDailyTask(),order=lesson.orders[lesson.round]||lesson.orders[1];
  return getDailyLessonItem(order[lesson.index])||lesson.items[0];
}
function currentQuestion(){return currentDailyItem()}
function answerKey(itemId,round=ensureDailyTask().round){return`${round}:${itemId}`}
function answerFor(id){return ensureDailyTask().answers[answerKey(id)]||null}

function maskRanges(text,count,round,itemId){
  const chars=[...text],usable=[];
  chars.forEach((char,index)=>{if(/[\u4e00-\u9fffA-Za-z0-9]/.test(char))usable.push(index)});
  const target=Math.max(2,round===1?3:round===2?5:7),ranges=[];
  const semantic=[...new Set([
    ...SEMANTIC_TERMS,
    ...questionBank.flatMap(q=>String(q.keywords||'').split(/[｜|、，；]/))
  ].map(x=>x.trim()).filter(x=>x.length>=2&&text.includes(x)))]
    .map(term=>({start:text.indexOf(term),end:text.indexOf(term)+[...term].length,text:term}))
    .sort((a,b)=>b.text.length-a.text.length);
  for(const candidate of seededShuffle(semantic,`${itemId}-${round}-semantic`)){
    if(ranges.some(existing=>candidate.start<existing.end&&candidate.end>existing.start))continue;
    ranges.push(candidate);
    if(ranges.length>=count)break;
  }
  ranges.sort((a,b)=>a.start-b.start);
  if(ranges.length>=count)return ranges.slice(0,count).map((range,index)=>({...range,index}));
  for(let n=0;n<count;n++){
    if(ranges.length>=count)break;
    const center=usable[Math.floor((n+1)*usable.length/(count+1))]??Math.floor(chars.length*(n+1)/(count+1));
    let start=Math.max(0,center-Math.floor(target/2)),end=Math.min(chars.length,start+target);
    while(start<end&&!/[\u4e00-\u9fffA-Za-z0-9]/.test(chars[start]))start++;
    while(end>start&&!/[\u4e00-\u9fffA-Za-z0-9]/.test(chars[end-1]))end--;
    for(const existing of ranges){
      if(start<existing.end+1&&end>existing.start-1){
        start=existing.end+1;end=Math.min(chars.length,start+target);
      }
    }
    if(end-start<2){
      start=Math.max(0,(usable[n]||0));end=Math.min(chars.length,start+Math.max(2,target-1));
    }
    if(!ranges.some(existing=>start<existing.end&&end>existing.start))ranges.push({start,end,text:chars.slice(start,end).join('')});
  }
  return ranges.sort((a,b)=>a.start-b.start).map((range,index)=>({...range,index}));
}
function confusablePhrase(phrase,round){
  let changed=phrase;
  for(const [from,to] of CONFUSABLE_REPLACEMENTS){
    if(changed.includes(from)){changed=changed.replace(from,to);break}
    if(changed.includes(to)){changed=changed.replace(to,from);break}
  }
  if(changed===phrase&&phrase.length>2){
    const endings=round===3?['相互统一','彼此独立','共同作用','完全相同']:['主要作用','基本关系','审美特点','社会功能'];
    changed=endings[hashText(phrase+round)%endings.length];
  }
  return changed;
}
function maskPlan(item,round){
  const count=round+1,ranges=maskRanges(item.answerText,count,round,item.id);
  const lesson=ensureDailyTask();
  const nearby=lesson.items.filter(x=>x.id!==item.id).flatMap(x=>maskRanges(x.answerText,count,round,x.id).map(r=>r.text));
  let distractors=ranges.map(r=>confusablePhrase(r.text,round)).filter((x,i,a)=>x&&!ranges.some(r=>r.text===x)&&a.indexOf(x)===i);
  for(const candidate of seededShuffle(nearby,`${item.id}-${round}-nearby`)){
    const min=Math.max(2,ranges[0]?.text.length-2),max=(ranges[0]?.text.length||4)+3;
    if(candidate.length>=min&&candidate.length<=max&&!ranges.some(r=>r.text===candidate)&&!distractors.includes(candidate))distractors.push(candidate);
    if(distractors.length>=count+2)break;
  }
  const options=seededShuffle([...ranges.map(r=>r.text),...distractors.slice(0,count+2)],`${item.id}-${round}-options`);
  return{ranges,options};
}
function selectedForCurrent(){
  const lesson=ensureDailyTask(),item=currentDailyItem(),key=answerKey(item.id);
  lesson.selections=lesson.selections||{};
  return lesson.selections[key]||(lesson.selections[key]=[]);
}
function chooseMaskOption(encoded){
  const item=currentDailyItem(),result=answerFor(item.id);if(result)return;
  const value=decodeURIComponent(encoded),selected=selectedForCurrent(),needed=maskPlan(item,ensureDailyTask().round).ranges.length;
  if(selected.length<needed&&!selected.includes(value))selected.push(value);
  save();render();
}
function clearMaskSlot(index){
  const item=currentDailyItem();if(answerFor(item.id))return;
  selectedForCurrent().splice(index,1);save();render();
}
function submitMaskAnswer(){
  const lesson=ensureDailyTask(),item=currentDailyItem(),key=answerKey(item.id),plan=maskPlan(item,lesson.round),selected=selectedForCurrent();
  if(selected.length!==plan.ranges.length){notify(`请先填满${plan.ranges.length}个空`);return}
  const expected=plan.ranges.map(x=>x.text),correct=selected.every((value,index)=>value===expected[index]);
  lesson.answers[key]={answered:true,correct,userAnswer:[...selected],expected,submittedAt:new Date().toISOString()};
  if(correct){state.xp+=10+lesson.round*5;markCorrect(getQuestion(item.sourceQuestionId)||item)}
  else upsertMistake(getQuestion(item.sourceQuestionId)||item,selected.join('、'));
  save();render();notify(correct?'✓ 回答正确，右侧查看完整理解':'× 回答错误，右侧查看正确答案');
}
function retryCurrent(){
  const lesson=ensureDailyTask(),item=currentDailyItem(),key=answerKey(item.id);
  delete lesson.answers[key];delete lesson.selections[key];save();render();
}
function previousQuestion(){
  const lesson=ensureDailyTask();
  if(lesson.index>0){lesson.index--;state.dailyIndex=lesson.index;save();render()}
}
function nextQuestion(){
  const lesson=ensureDailyTask(),item=currentDailyItem();
  if(!answerFor(item.id)){notify('请先完成当前题目');return}
  if(lesson.index<DAILY_LESSON_SIZE-1){
    lesson.index++;state.dailyIndex=lesson.index;save();render();return;
  }
  if(lesson.round<PRACTICE_ROUNDS){
    lesson.round++;lesson.index=0;state.dailyIndex=0;lesson.roundIntro=true;save();render();return;
  }
  lesson.done=true;lesson.completedAt=new Date().toISOString();lesson.completionOpen=true;
  state.dailyDone=true;state.xp+=50;state.streak=Math.max(1,state.streak);
  state.dailyGame=null;normalizeDailyGame();save();render();notify('三轮完成，今日游戏关卡已解锁');
}
function closeRoundIntro(){ensureDailyTask().roundIntro=false;save();render()}
function chooseAfterPractice(choice){
  const lesson=ensureDailyTask();lesson.completionOpen=false;
  if(choice==='game')enterDailyGame();else{state.view='home';save();render();window.scrollTo({top:0})}
}
function completedCountForRound(round){
  const lesson=ensureDailyTask();
  return lesson.items.filter(item=>lesson.answers[answerKey(item.id,round)]?.answered).length;
}
function totalPracticeDone(){
  let total=0;for(let round=1;round<=PRACTICE_ROUNDS;round++)total+=completedCountForRound(round);
  return total;
}
function maskedSentence(item,plan,selected,result){
  const chars=[...item.answerText],parts=[];let cursor=0;
  plan.ranges.forEach((range,index)=>{
    parts.push(escapeHtml(chars.slice(cursor,range.start).join('')));
    const value=selected[index]||'';
    const status=result?(value===range.text?'correct':'wrong'):(value?'filled':'');
    parts.push(`<button class="mask-slot ${status}" onclick="clearMaskSlot(${index})" ${result?'disabled':''}><small>${index+1}</small>${value?escapeHtml(value):'选择内容'}</button>`);
    cursor=range.end;
  });
  parts.push(escapeHtml(chars.slice(cursor).join('')));
  return parts.join('');
}
function roundIntroMarkup(lesson){
  const descriptions={
    1:'第一轮每题遮住2个词或短语，先建立完整句子的骨架。',
    2:'第二轮题序已经打乱，每题遮住3个更长的部分。',
    3:'第三轮再次打乱题序，每题遮住4个词、短语或句段。完成后解锁今日关卡。'
  };
  return`<div class="practice-overlay"><div class="practice-dialog"><span>ROUND ${lesson.round} / 3</span><h2>开始第${lesson.round}轮</h2><p>${descriptions[lesson.round]}</p><button class="primary-btn" onclick="closeRoundIntro()">开始这一轮 →</button></div></div>`;
}
function completionMarkup(lesson){
  if(!lesson.completionOpen)return'';
  const correct=Object.values(lesson.answers).filter(x=>x.correct).length;
  return`<div class="practice-overlay"><div class="practice-dialog complete"><div class="completion-mark">✓</div><span>51 次提取练习完成</span><h2>今日游戏关卡已解锁</h2><p>今天的17条答案已经变成关卡中的答案碎片。三轮共答对 ${correct}/51 次。</p><div class="completion-actions"><button class="primary-btn" onclick="chooseAfterPractice('game')">进入今日关卡 →</button><button class="text-btn" onclick="chooseAfterPractice('home')">稍后再去</button></div></div></div>`;
}
function practice(){
  const lesson=ensureDailyTask(),item=currentDailyItem(),round=lesson.round,index=lesson.index+1;
  const key=answerKey(item.id),result=lesson.answers[key]||null,selected=selectedForCurrent(),plan=maskPlan(item,round);
  const options=plan.options.map(option=>{
    const used=selected.includes(option),encoded=encodeURIComponent(option).replaceAll("'","%27");
    return`<button class="mask-option ${used?'used':''}" onclick="chooseMaskOption('${encoded}')" ${result||used?'disabled':''}>${escapeHtml(option)}</button>`;
  }).join('');
  const explanation=result?`<aside class="practice-answer ${result.correct?'is-correct':'is-wrong'}">
    <div class="answer-result"><b>${result.correct?'✓':'×'}</b><div><strong>${result.correct?'回答正确':'回答错误'}</strong><span>本题已自动保存</span></div></div>
    <section><span>完整答案</span><p>${escapeHtml(item.answerText)}</p></section>
    <section class="example-card"><span>用例子理解</span><p>${escapeHtml(item.example)}</p></section>
    <section class="why-card"><span>为什么这样答</span><p>${escapeHtml(item.explain)}</p></section>
  </aside>`:`<aside class="practice-answer is-empty"><div class="empty-answer-art">${round+1}</div><span>答题后，这里显示</span><h3>完整答案与具体例子</h3><p>右侧区域独立显示，不会把左侧题目向下撑开。</p></aside>`;
  const total=totalPracticeDone(),percent=Math.round(total/(DAILY_LESSON_SIZE*PRACTICE_ROUNDS)*100);
  return shell(`今天的17题 · 第${round}轮`,`MASKED PRACTICE · ROUND ${round} / 3`,`
    <div class="practice-v2-meta"><div><span>${lesson.chapterTitle}</span><strong>${item.section} · ${item.variant}</strong></div><div class="round-pills"><i class="${round>=1?'active':''}">1</i><i class="${round>=2?'active':''}">2</i><i class="${round>=3?'active':''}">3</i></div></div>
    <div class="practice-v2-progress"><span>本轮 ${index}/17</span><div><i style="width:${percent}%"></i></div><span>总进度 ${total}/51</span></div>
    <div class="practice-v2-layout">
      <section class="practice-question">
        <div class="question-number"><span>${String(index).padStart(2,'0')}</span><small>本轮遮住 ${round+1} 个部分</small></div>
        <h2>${escapeHtml(item.q)}</h2>
        <div class="masked-statement">${maskedSentence(item,plan,selected,result)}</div>
        <div class="option-label">从相似选项中依次选词填空</div>
        <div class="mask-options">${options}</div>
        <div class="practice-v2-actions">
          <button class="text-btn" onclick="previousQuestion()" ${lesson.index===0?'disabled':''}>← 上一题</button>
          ${result?'<button class="text-btn" onclick="retryCurrent()">重新作答</button>':'<button class="primary-btn" onclick="submitMaskAnswer()">提交答案</button>'}
          <button class="primary-btn" onclick="nextQuestion()" ${result?'':'disabled'}>${lesson.index===16?(round===3?'完成三轮':'进入下一轮'):'下一题'} →</button>
        </div>
      </section>
      ${explanation}
    </div>
    ${lesson.roundIntro?roundIntroMarkup(lesson):''}${completionMarkup(lesson)}`);
}
function home(){
  const lesson=ensureDailyTask(),done=totalPracticeDone(),game=normalizeDailyGame();
  const action=lesson.done
    ?`<button class="primary-btn" onclick="enterDailyGame()">${game.status==='completed'?'再次挑战今日关卡':'进入今日关卡'} →</button>`
    :`<button class="primary-btn" onclick="showView('practice')">${done?'继续三轮练习':'开始今日练习'} →</button>`;
  return shell('今天，把答案真正记住。',`DAY ${String(lesson.dayNumber).padStart(2,'0')} · ${lesson.date.replaceAll('-','.')}`,`
    <p class="lede">每天只推进当前计划章节。17条重点结论连续练三轮，完成后再进入当天专属游戏关卡。</p>
    <div class="hero-grid"><section class="hero-card practice-hero"><div class="eyebrow" style="color:#a8dfc3">当前计划 · ${lesson.chapterTitle}</div>
      <h2>${lesson.done?'三轮练习已完成':'第'+lesson.round+'轮 · '+(lesson.index+1)+'/17'}</h2>
      <p>第一轮2处填空，第二轮3处，第三轮4处；后两轮题序自动打乱，干扰项逐轮变得更相似。</p>
      <div class="progress-label"><span>三轮总进度</span><span>${done}/51</span></div><div class="progress"><i style="width:${done/51*100}%"></i></div><div class="hero-action">${action}</div>
    </section><section class="count-card"><span class="count-label">距离考试</span><div class="days">${daysLeft()} <small>天</small></div><div class="count-detail">首轮第 ${lesson.dayNumber} 天<br>${lesson.chapterTitle}</div></section></div>
    <div class="stats"><div class="stat"><span>今日提取练习</span><strong>${done}<small> / 51次</small></strong><small>${lesson.done?'三轮已完成':'自动保存到当前题'}</small></div><div class="stat"><span>错题待复习</span><strong>${state.mistakes.length}<small> 题</small></strong><small>错误会自动进入错题库</small></div><div class="stat"><span>累计经验</span><strong>${state.xp}<small> XP</small></strong><small>连续学习 ${state.streak} 天</small></div></div>
    ${gameStatusCard()}`);
}

/* 关卡只读取当天这17条结论；三轮完成前保持锁定。 */
dailyGameUnlocked=function(){return Boolean(ensureDailyTask().done)};
makeFragmentPool=function(){
  const lesson=ensureDailyTask();
  return lesson.items.flatMap(item=>fragmentSegments(item).map((text,index)=>({
    id:`${item.id}-g${index}`,questionId:item.id,text,order:index
  })));
};
battleQuestionIds=function(enemy){
  const tasks=ensureDailyTask().items;
  const ranked=[...tasks].sort((a,b)=>b.answerText.length-a.answerText.length);
  const rand=seeded(hashText(`${normalizeDailyGame().seed}-${enemy.id}`));
  const count=enemy.type==='medium'?1:enemy.maxHp;
  const heldTexts=normalizeDailyGame().inventory.map(getFragment).filter(Boolean).map(x=>x.text);
  const answerable=seededShuffle(tasks.filter(q=>fragmentSegments(q).every(text=>heldTexts.includes(text))),`${enemy.id}-answerable`);
  const source=enemy.type==='dictation'?ranked.filter(q=>q.answerText.length>=10):(answerable.length?answerable:seededShuffle(tasks,`${enemy.id}-tasks`));
  return Array.from({length:count},(_,i)=>(source[i%source.length]||tasks[i%tasks.length]).id);
};
currentBattleQuestion=function(){
  const battle=normalizeDailyGame().currentBattle;
  return battle?getDailyLessonItem(battle.questionIds[battle.questionIndex]):null;
};

ensureDailyTask();
normalizeDailyGame();
render();
