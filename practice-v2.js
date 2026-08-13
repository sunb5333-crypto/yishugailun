/* 三轮掩码练习：每天10个不同知识点，7道章节题加3道复习题。 */
const PRACTICE_VERSION=9;
const COURSE_START_DATE='2026-07-27';
const DAILY_LESSON_SIZE=10;
const PRACTICE_ROUNDS=3;
const DAILY_CURRENT_COUNT=7;
const FREE_ORDER_IDS=new Set(['a2','a3','a4','a5','a6','a7','a8','a12','a13','a15','a17','f1','f2','f3','m1','x01']);
// Only genuine lists and classifications can be answered in any order.
// A relational statement such as “在满足 A 的同时追求 B” changes its meaning when A/B swap.
const FREE_ORDER_PROMPT=/(包括|哪些|哪几|分类|分为|要素|方面)/;
const RELATIONSHIP_ANSWER=/((在)?[^。；，]{0,16}(同时|基础上|通过)[^。；，]{0,24}|不是[^。；，]{0,20}而是|既[^。；，]{0,20}(又|也)[^。；，]{0,20}|首先[^。；，]{0,20}(再|然后|最后)|前者[^。；，]{0,20}后者)/;
const SEMANTIC_ORDER_PROMPT=/(关系|联系|区别|异同|统一|相互作用)/;
const STRICT_ORDER_PROMPT=/(过程|阶段|先后|首先|其次|最后|不是.+而是|基础上|导致|因此|从.+到)/;
const WEAK_FRAGMENT=/^(是|和|与|而|或|的|了|在|为|以|及|并|把|被|从|向|于|中|上|下)$/;

function sourceQuestionIdOf(item){
  return item?.sourceQuestionId||item?.knowledgePointId||String(item?.id||'').split('-')[0];
}
function answerOrderPolicy(item){
  const sourceId=sourceQuestionIdOf(item),source=getQuestion(sourceId),prompt=String(source?.q||item?.q||'');
  const answer=String(item?.answerText||source?.answerText||'');
  // These are verified concept lists: their members can be recalled in a different order.
  if(FREE_ORDER_IDS.has(sourceId))return'free';
  if(RELATIONSHIP_ANSWER.test(answer))return'strict';
  if(STRICT_ORDER_PROMPT.test(`${prompt}${answer}`))return'strict';
  if(FREE_ORDER_PROMPT.test(prompt))return'free';
  if(SEMANTIC_ORDER_PROMPT.test(prompt))return'semantic';
  return'strict';
}
function sameAnswerMultiset(selected,expected){
  if(!Array.isArray(selected)||!Array.isArray(expected)||selected.length!==expected.length)return false;
  const counts=new Map();
  expected.forEach(value=>counts.set(value,(counts.get(value)||0)+1));
  for(const value of selected){
    const left=counts.get(value)||0;
    if(left<=0)return false;
    counts.set(value,left-1);
  }
  return true;
}
function maskAnswerCorrect(item,selected,expected){
  // “semantic” means the sentence has a meaningful word order, not that order is optional.
  // Only verified parallel/list questions use the free-order comparison.
  return answerOrderPolicy(item)==='free'
    ?sameAnswerMultiset(selected,expected)
    :selected.length===expected.length&&selected.every((value,index)=>value===expected[index]);
}
function maskSelectionStatus(item,selected,expected,index){
  const value=selected[index];
  if(!value)return'wrong';
  if(answerOrderPolicy(item)!=='free')return value===expected[index]?'correct':'wrong';
  const allowed=expected.filter(x=>x===value).length;
  const used=selected.slice(0,index+1).filter(x=>x===value).length;
  return used<=allowed?'correct':'wrong';
}

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
// Extra whole concepts which are safe to hide. Never fall back to arbitrary character slices.
const SAFE_MASK_TERMS=['艺术门类','实用艺术','造型艺术','存在方式','艺术作品','艺术语言','建筑艺术','艺术鉴赏','艺术发展','艺术本质','艺术功能','社会功能','艺术形象','生活方式','空间形式','地域文化','现代建筑','传统民居','完整画面','山水意境','有机整体','宗教建筑','艺术规律','作品形象','个人经验','审美理解','艺术体验','艺术构思','艺术表现','文化连续性','回应时代','具体作品','安全','材料','结构','功能','造型','空间','文化表达','比例','尺度','围合','分隔','连接','引导','组织活动','行走体验','审美体验','二者统一','材料质感','结构受力','外观','风格','架高居住层','通风','隔潮','防虫','多雨环境','山石','水体','地形','骨架','倒影','流动感','艺术技术','生产结合','现代制造','新材料','新结构','扩大跨度','开窗','自由空间','开放形象','作品提供的形象','联想想象','个人审美理解','佛舍利','传入中国','建筑形式','绘画','雕塑','摄影','高耸','尖拱','情感体验','联系背景','自身经验','理解传统','顺应场地','现代主义','尖拱','神圣氛围'];

function localDateString(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return`${y}-${m}-${d}`;
}
function parseLocalDate(value){
  const [y,m,d]=String(value).split('-').map(Number);
  return new Date(y,m-1,d,12,0,0);
}
function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffled(items,rand){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
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
function normalizedLearningText(value){
  return String(value||'').replace(/[\s，。；、：:“”‘’（）()《》！？,.!?;:'"-]/g,'').replace(/(主要|基本|一般|通常|可以|能够)/g,'');
}
function materiallySameQuestion(a,b){
  const aq=normalizedLearningText(a?.q),bq=normalizedLearningText(b?.q),aa=normalizedLearningText(baseAnswer(a)),ba=normalizedLearningText(baseAnswer(b));
  if(!aq||!bq||!aa||!ba)return false;
  if(aa===ba||aq===bq)return true;
  const answerOverlap=aa.includes(ba)||ba.includes(aa),questionOverlap=aq.includes(bq)||bq.includes(aq);
  return answerOverlap&&questionOverlap;
}
function uniqueLearningQuestions(items){
  const kept=[];
  for(const item of items)if(!kept.some(existing=>materiallySameQuestion(existing,item)))kept.push(item);
  return kept;
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
  return[{kind:'考试重点',prompt:String(q.q||`请说明${q.section}`).replace(/^背诵[：:]\s*/,''),answerText:baseAnswer(q)}];
}
function studyModeForPractice(){return typeof currentStudyMode==='function'?currentStudyMode():'A'}
function lessonShape(){
  const mode=studyModeForPractice(),pending=(state.mistakes||[]).length;
  return mode==='C'
    ?{mode,size:7,rounds:3,currentCount:7}
    :{mode,size:10,rounds:3,currentCount:mode==='A+B'?5:(pending>=40?5:DAILY_CURRENT_COUNT)};
}
function dueMasteredQuestionIds(date=localDateString()){
  const now=parseLocalDate(date).getTime();
  return(state.mastered||[]).filter(item=>item.nextReviewAt&&new Date(item.nextReviewAt).getTime()<=now).map(item=>item.id);
}
function buildDailyItems(chapter,date){
  const shape=lessonShape();
  const current=uniqueLearningQuestions(seededShuffle(questionBank.filter(q=>questionChapter[q.id]===chapter.id),`${date}-${chapter.id}-current`));
  const mistakeIds=[...(state.mistakes||[]).map(x=>x.id),...dueMasteredQuestionIds(date)];
  const reviewLimit=Math.max(0,shape.size-shape.currentCount);
  const reviews=uniqueLearningQuestions(seededShuffle(questionBank.filter(q=>mistakeIds.includes(q.id)&&!current.some(x=>x.id===q.id)),`${date}-mistakes`)).slice(0,reviewLimit);
  const fallback=uniqueLearningQuestions(seededShuffle(questionBank.filter(q=>questionChapter[q.id]!==chapter.id&&!reviews.some(x=>x.id===q.id)),`${date}-reviews`));
  const sources=uniqueLearningQuestions([...current.slice(0,shape.currentCount),...reviews,...current.slice(shape.currentCount),...fallback]).slice(0,shape.size);
  return sources.flatMap(q=>lessonVariants(q).map((v,index)=>({
    id:`${q.id}-d`,knowledgePointId:q.id,sourceQuestionId:q.id,type:'mask',chapter:q.chapter||chapter.title,
    section:q.section,q:v.prompt,answerText:v.answerText,explain:q.explain||baseAnswer(q),
    keywords:q.keywords||'',example:exampleForQuestion(q),variant:v.kind,
    orderPolicy:answerOrderPolicy(q)
  })));
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
  const shape=lessonShape();
  const items=buildDailyItems(chapter,date);
  const ids=items.map(x=>x.id);
  return{
    version:PRACTICE_VERSION,date,dayNumber,chapterId:chapter.id,chapterTitle:chapter.title,
    mode:shape.mode,size:shape.size,rounds:shape.rounds,
    items,orders:{
      1:ids,
      2:seededShuffle(ids,`${date}-round-2`),
      3:seededShuffle(ids,`${date}-round-3`)
    },
    round:1,index:0,answers:{},selections:{},done:false,completedAt:null,completionOpen:false
  };
}
function migrateLessonProgress(previous,next){
  if(!previous||previous.date!==next.date||!Array.isArray(previous.items))return next;
  for(const item of next.items){
    const oldItem=previous.items.find(x=>(x.sourceQuestionId||x.knowledgePointId||String(x.id).split('-')[0])===item.sourceQuestionId);
    if(!oldItem)continue;
    for(let round=1;round<=next.rounds;round++){
      const oldKey=`${round}:${oldItem.id}`,newKey=`${round}:${item.id}`;
      if(previous.answers?.[oldKey])next.answers[newKey]=previous.answers[oldKey];
      if(previous.selections?.[oldKey])next.selections[newKey]=previous.selections[oldKey];
    }
  }
  for(let round=1;round<=next.rounds;round++){
    const order=next.orders[round],firstOpen=order.findIndex(id=>!next.answers[`${round}:${id}`]?.answered);
    if(firstOpen>=0){next.round=round;next.index=firstOpen;break}
    if(round===next.rounds){next.round=round;next.index=next.size-1}
  }
  if(previous.done){next.done=true;next.completedAt=previous.completedAt||new Date().toISOString()}
  return next;
}
function reconcileLessonPolicies(lesson){
  let changed=false;
  for(const item of lesson.items||[]){
    const policy=answerOrderPolicy(item);
    if(item.orderPolicy!==policy){item.orderPolicy=policy;changed=true}
    for(let round=1;round<=(lesson.rounds||PRACTICE_ROUNDS);round++){
      const result=lesson.answers?.[`${round}:${item.id}`];
      if(!result?.answered||!Array.isArray(result.userAnswer)||!Array.isArray(result.expected))continue;
      const regraded=maskAnswerCorrect(item,result.userAnswer,result.expected);
      if(regraded!==Boolean(result.correct)){
        result.correct=regraded;result.regradedFromOrder=true;result.regradedAt=new Date().toISOString();changed=true;
        const joined=result.userAnswer.join('、');
        if(regraded)state.mistakes=(state.mistakes||[]).filter(m=>!(m.id===item.sourceQuestionId&&m.userAnswer===joined));
        else upsertMistake(getQuestion(item.sourceQuestionId)||item,joined);
      }
    }
  }
  return changed;
}
function ensureDailyTask(){
  const date=localDateString();
  const current=state.dailyLesson;
  const shape=lessonShape();
  if(!current||current.version!==PRACTICE_VERSION||current.date!==date||current.mode!==shape.mode){
    if(current&&current.version!==PRACTICE_VERSION&&!state.legacyPracticeBackup){
      state.legacyPracticeBackup={savedAt:new Date().toISOString(),dailyLesson:JSON.parse(JSON.stringify(current))};
    }
    if(!current&&Array.isArray(state.dailyTask)&&state.dailyTask.length&&!state.legacyPracticeBackup){
      state.legacyPracticeBackup={
        savedAt:new Date().toISOString(),dailyDate:state.dailyDate,dailyTask:[...state.dailyTask],
        dailyIndex:state.dailyIndex,dailyAnswers:JSON.parse(JSON.stringify(state.dailyAnswers||{})),
        dailyDone:Boolean(state.dailyDone)
      };
    }
    const legacyDone=state.dailyDate===date&&state.dailyDone;
    archivePreviousLesson();
    state.dailyLesson=migrateLessonProgress(current,createDailyLesson(date));
    state.phaserGame=null;
    if(legacyDone){
      state.dailyLesson.done=true;
      state.dailyLesson.round=state.dailyLesson.rounds;
      state.dailyLesson.index=state.dailyLesson.size-1;
      state.dailyLesson.completedAt=new Date().toISOString();
    }
  }
  const lesson=state.dailyLesson;
  const reconciled=reconcileLessonPolicies(lesson);
  state.dailyDate=lesson.date;
  state.dailyTask=lesson.items.map(x=>x.id);
  state.dailyIndex=lesson.index;
  state.dailyAnswers=lesson.answers;
  state.dailyDone=Boolean(lesson.done);
  if(reconciled)localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  return lesson;
}
function getDailyLessonItem(id){
  return ensureDailyTask().items.find(x=>x.id===id)||null;
}
function dailyItemFromQuestion(q,chapterTitle=ensureDailyTask().chapterTitle){
  const variant=lessonVariants(q)[0];
  return{id:`${q.id}-d`,knowledgePointId:q.id,sourceQuestionId:q.id,type:'mask',chapter:q.chapter||chapterTitle,
    section:q.section,q:variant.prompt,answerText:variant.answerText,explain:q.explain||baseAnswer(q),
    keywords:q.keywords||'',example:exampleForQuestion(q),variant:variant.kind,
    orderPolicy:answerOrderPolicy(q)};
}
function currentDailyItem(){
  const lesson=ensureDailyTask(),order=lesson.orders[lesson.round]||lesson.orders[1];
  return getDailyLessonItem(order[lesson.index])||lesson.items[0];
}
function currentQuestion(){return currentDailyItem()}
function answerKey(itemId,round=ensureDailyTask().round){return`${round}:${itemId}`}
function answerFor(id){return ensureDailyTask().answers[answerKey(id)]||null}

function validMaskFragment(text,existing=[]){
  const cleaned=String(text||'').trim(),fingerprint=normalizedLearningText(cleaned);
  if(cleaned.length<2||WEAK_FRAGMENT.test(cleaned)||!fingerprint)return false;
  return !existing.some(value=>{
    const other=normalizedLearningText(value);
    return other===fingerprint||(Math.min(other.length,fingerprint.length)>=2&&(other.includes(fingerprint)||fingerprint.includes(other)));
  });
}
function maskRanges(text,count,round,itemId){
  const chars=[...text],ranges=[];
  const source=getQuestion(sourceQuestionIdOf({id:itemId}))||{};
  const semantic=[...new Set([
    ...SEMANTIC_TERMS,
    ...SAFE_MASK_TERMS,
    ...String(source.keywords||'').split(/[｜|、，；]/)
  ].map(x=>x.trim()).filter(x=>x.length>=2&&text.includes(x)))]
    .map(term=>({start:text.indexOf(term),end:text.indexOf(term)+[...term].length,text:term}))
    .sort((a,b)=>b.text.length-a.text.length);
  for(const candidate of seededShuffle(semantic,`${itemId}-${round}-semantic`)){
    if(ranges.some(existing=>candidate.start<existing.end&&candidate.end>existing.start))continue;
    if(!validMaskFragment(candidate.text,ranges.map(x=>x.text)))continue;
    ranges.push(candidate);
    if(ranges.length>=count)break;
  }
  ranges.sort((a,b)=>a.start-b.start);
  if(ranges.length>=count)return ranges.slice(0,count).map((range,index)=>({...range,index}));
  // Quality wins over a fixed blank count: an incomplete or cut-off phrase is never a valid answer option.
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
  const correct=ranges.map(r=>r.text);
  let distractors=ranges.map(r=>confusablePhrase(r.text,round)).filter((x,i,a)=>validMaskFragment(x,correct)&&a.indexOf(x)===i);
  for(const candidate of seededShuffle(nearby,`${item.id}-${round}-nearby`)){
    const min=Math.max(2,ranges[0]?.text.length-2),max=(ranges[0]?.text.length||4)+3;
    if(candidate.length>=min&&candidate.length<=max&&validMaskFragment(candidate,[...correct,...distractors]))distractors.push(candidate);
    if(distractors.length>=count+2)break;
  }
  const options=seededShuffle([...correct,...distractors.slice(0,count+2)],`${item.id}-${round}-options`);
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
  const expected=plan.ranges.map(x=>x.text);
  item.orderPolicy=answerOrderPolicy(item);
  const correct=maskAnswerCorrect(item,selected,expected);
  lesson.answers[key]={answered:true,correct,userAnswer:[...selected],expected,submittedAt:new Date().toISOString()};
  // Keep the learner's original fill order after submission so it can be compared with the standard answer.
  if(lesson.retryBackups)delete lesson.retryBackups[key];
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
  if(lesson.index<lesson.size-1){
    lesson.index++;state.dailyIndex=lesson.index;save();render();return;
  }
  if(lesson.round<lesson.rounds){
    lesson.round++;lesson.index=0;state.dailyIndex=0;lesson.roundIntro=true;save();render();return;
  }
  lesson.done=true;lesson.completedAt=new Date().toISOString();lesson.completionOpen=true;
  state.dailyDone=true;state.xp+=50;state.streak=Math.max(1,state.streak);
  state.phaserGame=null;save();render();notify('三轮完成，今日游戏关卡已解锁');
}
function closeRoundIntro(){ensureDailyTask().roundIntro=false;save();render()}
function chooseAfterPractice(choice){
  const lesson=ensureDailyTask();lesson.completionOpen=false;
  if(choice==='dictation'&&typeof openDailyDictation==='function'){openDailyDictation();return}
  if(choice==='game')enterDailyGame();else{state.view='home';save();render();window.scrollTo({top:0})}
}
function completedCountForRound(round){
  const lesson=ensureDailyTask();
  return lesson.items.filter(item=>{const key=answerKey(item.id,round);return lesson.answers[key]?.answered||lesson.retryBackups?.[key]?.answered}).length;
}
function totalPracticeDone(){
  const lesson=ensureDailyTask();let total=0;for(let round=1;round<=lesson.rounds;round++)total+=completedCountForRound(round);
  return total;
}
function maskedSentence(item,plan,selected,result){
  const chars=[...item.answerText],parts=[];let cursor=0;
  plan.ranges.forEach((range,index)=>{
    parts.push(escapeHtml(chars.slice(cursor,range.start).join('')));
    const value=selected[index]||'';
    const status=result?maskSelectionStatus(item,selected,plan.ranges.map(x=>x.text),index):(value?'filled':'');
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
  return`<div class="practice-overlay"><div class="practice-dialog"><span>ROUND ${lesson.round} / ${lesson.rounds}</span><h2>开始第${lesson.round}轮</h2><p>${descriptions[lesson.round]}</p><button class="primary-btn" onclick="closeRoundIntro()">开始这一轮 →</button></div></div>`;
}
function completionMarkup(lesson){
  if(!lesson.completionOpen)return'';
  const correct=Object.values(lesson.answers).filter(x=>x.correct).length;
  const total=lesson.size*lesson.rounds;
  return`<div class="practice-overlay"><div class="practice-dialog complete"><div class="completion-mark">✓</div><span>${total} 次提取练习完成</span><h2>基础训练已完成</h2><p>今天的${lesson.size}条答案已经完成提取练习，共答对 ${correct}/${total} 次。接下来用默写确认自己真的能写出来。</p><div class="completion-actions"><button class="primary-btn" onclick="chooseAfterPractice('dictation')">进入今日默写 →</button><button class="text-btn" onclick="chooseAfterPractice('home')">先返回今日计划</button></div></div></div>`;
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
    <section class="${result.correct?'':'answer-correction-glow'}"><span>完整答案</span><p>${escapeHtml(item.answerText)}</p></section>
    <section class="example-card"><span>用例子理解</span><p>${escapeHtml(item.example)}</p></section>
    <section class="why-card"><span>为什么这样答</span><p>${escapeHtml(item.explain)}</p></section>
  </aside>`:`<aside class="practice-answer is-empty"><div class="empty-answer-art">${round+1}</div><span>答题后，这里显示</span><h3>完整答案与具体例子</h3><p>右侧区域独立显示，不会把左侧题目向下撑开。</p></aside>`;
  const target=lesson.size*lesson.rounds,total=totalPracticeDone(),percent=Math.round(total/target*100);
  return shell(`今天的${lesson.size}题 · 第${round}轮`,`MASKED PRACTICE · ROUND ${round} / ${lesson.rounds}` ,`
    <div class="practice-v2-meta"><div><span>${lesson.chapterTitle}</span><strong>${item.section} · ${item.variant}</strong></div><div class="round-pills"><i class="${round>=1?'active':''}">1</i><i class="${round>=2?'active':''}">2</i><i class="${round>=3?'active':''}">3</i></div></div>
    <div class="practice-v2-progress"><span>本轮 ${index}/${lesson.size}</span><div><i style="width:${percent}%"></i></div><span>总进度 ${total}/${target}</span></div>
    <div class="practice-v2-layout">
      <section class="practice-question">
        <div class="question-number"><span>${String(index).padStart(2,'0')}</span><small>本轮遮住 ${plan.ranges.length} 个完整概念</small></div>
        <h2>${escapeHtml(item.q)}</h2>
        <div class="masked-statement">${maskedSentence(item,plan,selected,result)}</div>
        <div class="option-label">从相似选项中选择 · ${answerOrderPolicy(item)==='free'?'并列答案顺序不限，选对词即可':'本题按语意顺序作答'}</div>
        <div class="mask-options">${options}</div>
        <div class="practice-v2-actions">
          <button class="text-btn" onclick="previousQuestion()" ${lesson.index===0?'disabled':''}>← 上一题</button>
          ${result?'<button class="text-btn" onclick="retryCurrent()">重新作答</button>':'<button class="primary-btn" onclick="submitMaskAnswer()">提交答案</button>'}
          <button class="primary-btn" onclick="nextQuestion()" ${result?'':'disabled'}>${lesson.index===lesson.size-1?(round===lesson.rounds?'完成基础训练':'进入下一轮'):'下一题'} →</button>
        </div>
      </section>
      ${explanation}
    </div>
    ${lesson.roundIntro?roundIntroMarkup(lesson):''}${completionMarkup(lesson)}`);
}
function home(){
  const lesson=ensureDailyTask(),done=totalPracticeDone(),game=typeof normalizePhaserState==='function'?normalizePhaserState():{status:'locked'};
  const action=lesson.done
    ?`<button class="primary-btn" onclick="enterDailyGame()">${game.status==='completed'?'再次挑战今日关卡':'进入今日关卡'} →</button>`
    :`<button class="primary-btn" onclick="showView('practice')">${done?'继续三轮练习':'开始今日练习'} →</button>`;
  return shell('今天，把答案真正记住。',`DAY ${String(lesson.dayNumber).padStart(2,'0')} · ${lesson.date.replaceAll('-','.')}`,`
    <p class="lede">每天10个不同知识点：7道当前章节题、3道错题或到期复习题。连续练三轮后进入当天专属游戏关卡。</p>
    <div class="hero-grid"><section class="hero-card practice-hero"><div class="eyebrow" style="color:#a8dfc3">当前计划 · ${lesson.chapterTitle}</div>
      <h2>${lesson.done?'三轮练习已完成':'第'+lesson.round+'轮 · '+(lesson.index+1)+'/10'}</h2>
      <p>第一轮2处填空，第二轮3处，第三轮4处；后两轮题序自动打乱，并列答案不限制顺序。</p>
      <div class="progress-label"><span>三轮总进度</span><span>${done}/30</span></div><div class="progress"><i style="width:${done/30*100}%"></i></div><div class="hero-action">${action}</div>
    </section><section class="count-card"><span class="count-label">距离考试</span><div class="days">${daysLeft()} <small>天</small></div><div class="count-detail">首轮第 ${lesson.dayNumber} 天<br>${lesson.chapterTitle}</div></section></div>
    <div class="stats"><div class="stat"><span>今日提取练习</span><strong>${done}<small> / 30次</small></strong><small>${lesson.done?'三轮已完成':'自动保存到当前题'}</small></div><div class="stat"><span>错题待复习</span><strong>${state.mistakes.length}<small> 题</small></strong><small>错误会自动进入错题库</small></div><div class="stat"><span>累计经验</span><strong>${state.xp}<small> XP</small></strong><small>连续学习 ${state.streak} 天</small></div></div>
    ${typeof gameStatusCard==='function'?gameStatusCard():''}`);
}

function retryMistake(id){
  const lesson=ensureDailyTask(),source=getQuestion(id);if(!source){notify('这道错题暂时无法读取');return}
  let item=lesson.items.find(x=>x.sourceQuestionId===id);
  if(!item){
    const replaceIndex=Math.min(DAILY_CURRENT_COUNT,lesson.items.length-1),oldId=lesson.items[replaceIndex].id;
    item=dailyItemFromQuestion(source,lesson.chapterTitle);lesson.items[replaceIndex]=item;
    for(const round of [1,2,3])lesson.orders[round]=lesson.orders[round].map(x=>x===oldId?item.id:x);
  }
  const order=lesson.orders[lesson.round],key=answerKey(item.id,lesson.round);lesson.index=Math.max(0,order.indexOf(item.id));
  lesson.retryBackups=lesson.retryBackups||{};if(lesson.answers[key])lesson.retryBackups[key]=lesson.answers[key];
  delete lesson.answers[key];delete lesson.selections[key];state.view='practice';save();render();window.scrollTo({top:0});
}
function review(){
  const due=state.mistakes||[];
  return shell('复习，不是重来','SPACED REVIEW · '+due.length+' DUE',`<p class="lede">错题会优先进入每天3道复习题；连续答对后才会移入已掌握。</p><div class="panel" style="margin-top:30px">${due.length?due.map(x=>`<div class="review-card"><div class="review-badge">↻</div><div><h4>${escapeHtml(x.question)}</h4><p>${escapeHtml(x.chapter||'艺术概论')} · 错过 ${x.wrongCount||1} 次</p></div><button class="primary-btn" onclick="retryMistake('${x.id}')">开始复习</button></div>`).join(''):'<div class="empty-state"><h3>今天没有待复习错题</h3><p>继续完成每日10题；答错的知识点会自动进入这里，并出现在后续复习题中。</p></div>'}</div>`);
}
function courseView(){
  const active=chapterForDay(courseDayNumber()).id;
  const rows=syllabusChapters.map((c,i)=>{const covered=questionBank.filter(q=>questionChapter[q.id]===c.id).length;return`<div class="chapter-row"><span class="chapter-num">${String(i+1).padStart(2,'0')}</span><div><h4>${c.title}</h4><p>${c.summary} · 首轮计划 ${c.days} 天 · ${covered}个独立知识点</p></div><span class="row-status">${c.id===active?'进行中':'待学习'}</span></div>`}).join('');
  return shell('课程地图','COURSE MAP · 9 CHAPTERS · 60 DAYS',`<p class="lede">全课程共9章，不是一天学完一章。每天从当前章节抽7个知识点，再加入3道错题或旧章节复习题；同一组10题练三轮，共30次提取练习。</p><div class="panel" style="margin-top:30px">${rows}</div>`);
}

/* Phaser关卡在 phaser-game.js 中读取当天10个知识点。 */
