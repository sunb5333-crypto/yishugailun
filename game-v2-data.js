/* 艺术博物馆第二版：语义碎片、每日十题战斗牌组与章节主题。 */
const GAME_V2_CHAPTER_THEMES={
  'art-core':{panel:0,name:'艺术本质馆',accent:0xe3b55f},
  architecture:{panel:1,name:'建筑结构馆',accent:0xb68b5b},
  residence:{panel:2,name:'民居长廊',accent:0xd99a72},
  garden:{panel:3,name:'园林与宫殿',accent:0x80b78a},
  religion:{panel:4,name:'宗教艺术馆',accent:0xc69c65},
  modern:{panel:5,name:'现代艺术馆',accent:0x6eb9c8},
  creation:{panel:6,name:'艺术创作室',accent:0xe28269},
  appreciation:{panel:7,name:'鉴赏陈列馆',accent:0xa58ac7},
  exam:{panel:8,name:'考试档案馆',accent:0xd6574f}
};

const GAME_V2_DANGLING_END=/[的是了和与及并把被在从向以于为而或其这该之]$/;
const GAME_V2_KEYWORD_SPLIT=/[、，,；;|｜/]+/;

function gameV2CleanText(value){
  return String(value||'').replace(/\s+/g,'').replace(/[。；;]+$/g,'');
}

function gameV2Keywords(item){
  const raw=Array.isArray(item?.keywords)?item.keywords:String(item?.keywords||'').split(GAME_V2_KEYWORD_SPLIT);
  return [...new Set(raw.map(gameV2CleanText).filter(x=>x.length>=2&&x.length<=28))].slice(0,5);
}

function gameV2SemanticSegments(item){
  const answer=gameV2CleanText(item?.answerText);
  if(!answer)return gameV2Keywords(item);
  let parts=answer.split(/[，,；;。]/).map(gameV2CleanText).filter(x=>x.length>=3);
  if(parts.length<3){
    const connector=/((?:同时|并且|而且|因此|从而|最后|其次|再|以及|包括|分为|体现为|表现为|作用是|功能是|基础是|核心是|本质是))/g;
    const expanded=[];
    for(const part of parts.length?parts:[answer]){
      const starts=[];let match;
      connector.lastIndex=0;
      while((match=connector.exec(part))!==null){if(match.index>=4&&part.length-match.index>=4)starts.push(match.index)}
      if(!starts.length){expanded.push(part);continue}
      let last=0;
      for(const start of starts){expanded.push(part.slice(last,start));last=start}
      expanded.push(part.slice(last));
    }
    parts=expanded.map(gameV2CleanText).filter(x=>x.length>=3);
  }
  const safe=[];
  for(const part of parts){
    if(safe.length&&GAME_V2_DANGLING_END.test(safe[safe.length-1]))safe[safe.length-1]+=part;
    else safe.push(part);
  }
  parts=safe.filter(x=>x.length>=3&&!GAME_V2_DANGLING_END.test(x));
  if(parts.length<3)parts=gameV2Keywords(item);
  if(parts.length<3){
    const fallback=answer.match(/.{3,12}(?:思想|情感|形象|创造|生产|实践|功能|艺术|生活|社会|审美|关系|过程|形式|内容|特点|作用)?/g)||[];
    parts=fallback.map(gameV2CleanText).filter(x=>x.length>=3&&!GAME_V2_DANGLING_END.test(x));
  }
  if(parts.length<3)parts=[answer,'理解完整含义','联系题目作答'];
  while(parts.length>5){
    let best=0;
    for(let i=1;i<parts.length-1;i++)if(parts[i].length<parts[best].length)best=i;
    const target=best===0?1:best-1;
    parts[target]+=parts[best];parts.splice(best,1);
  }
  return [...new Set(parts)].slice(0,5);
}

function gameV2FragmentPool(items){
  return items.flatMap(item=>gameV2SemanticSegments(item).map((text,index)=>({
    id:`${item.id}-g${index}-${Math.abs(hashText(text)).toString(36)}`,
    questionId:item.id,text,index
  })));
}

function gameV2OrderPolicy(item){
  if(typeof answerOrderPolicy==='function')return answerOrderPolicy(item);
  return /包括|分为|主要有|功能|类型|特点/.test(`${item?.q||''}${item?.answerText||''}`)?'free':'strict';
}

function gameV2BuildPlan(items,date,weakIds=[]){
  const rand=seeded(hashText(`${date}-museum-v2-deck`));
  const deck=shuffled(items.map(x=>x.id),rand).slice(0,10);
  const split=hashText(`${date}-boss-split`)%2===0?3:4;
  const weak=[...new Set(weakIds)].filter(id=>deck.includes(id));
  const final=[...weak,...shuffled(deck.filter(id=>!weak.includes(id)),rand)].slice(0,5);
  return{
    deck,
    encounters:{m1:deck.slice(0,1),m2:deck.slice(1,2),b1:deck.slice(2,2+split),b2:deck.slice(2+split)},
    final
  };
}

function gameV2InitialInventory(items,plan){
  const pool=gameV2FragmentPool(items),guaranteed=[];
  for(const id of [plan.encounters.m1[0],plan.encounters.m2[0]]){
    pool.filter(x=>x.questionId===id).forEach(x=>{if(!guaranteed.includes(x.id))guaranteed.push(x.id)});
  }
  const rand=seeded(hashText(`${plan.deck.join('-')}-initial`));
  return [...guaranteed,...shuffled(pool.map(x=>x.id).filter(id=>!guaranteed.includes(id)),rand)].slice(0,10);
}

function gameV2WeakQuestionIds(){
  const answers=state?.dailyTask?.answers||{};
  return Object.entries(answers).filter(([,record])=>record&&record.correct===false).map(([id])=>id);
}

function gameV2ThemeForLesson(lesson){
  const id=lesson?.chapterId||lesson?.items?.[0]?.chapterId||'art-core';
  return GAME_V2_CHAPTER_THEMES[id]||GAME_V2_CHAPTER_THEMES['art-core'];
}
