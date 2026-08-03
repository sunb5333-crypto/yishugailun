/* 艺术博物馆第三版：完整语义短语、去重牌组与章节主题。 */
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

const GAME_V2_DANGLING_END=/[的是了和与及并把被在从向以于为而或其这该之可会将由能]$/;
const GAME_V2_KEYWORD_SPLIT=/[、，,；;|｜/]+/;

function gameV2CleanText(value){
  return String(value||'').replace(/\s+/g,'').replace(/[。；;]+$/g,'');
}

function gameV2Keywords(item){
  const raw=Array.isArray(item?.keywords)?item.keywords:String(item?.keywords||'').split(GAME_V2_KEYWORD_SPLIT);
  return [...new Set(raw.map(gameV2CleanText).filter(x=>x.length>=2&&x.length<=28))].slice(0,5);
}

function gameV2SameMeaningFragment(a,b){
  const clean=value=>gameV2CleanText(value).replace(/[，,：:、“”‘’]/g,'').replace(/^(同时|并且|而且|因此|从而|其次|最后|以及)/,'');
  const x=clean(a),y=clean(b);if(!x||!y)return false;
  return x===y||(Math.min(x.length,y.length)>=4&&(x.includes(y)||y.includes(x)));
}
function gameV2SplitLongest(parts){
  let longest=0;for(let i=1;i<parts.length;i++)if(parts[i].length>parts[longest].length)longest=i;
  const part=parts[longest];if(part.length<8)return parts;
  const connectors=['而是','同时','并且','而且','因此','从而','以及','最后','其次','再','包括','分为','体现为','表现为','作用是','功能是','基础是','核心是','本质是','面向','通过'];
  const candidates=connectors.map(word=>({word,index:part.indexOf(word)})).filter(x=>x.index>=3&&part.length-x.index>=3).sort((a,b)=>Math.abs(a.index-part.length/2)-Math.abs(b.index-part.length/2));
  if(!candidates.length)return parts;
  let split=candidates[0].index;
  while(split>3&&GAME_V2_DANGLING_END.test(part.slice(0,split)))split--;
  if(split<3||part.length-split<3)return parts;
  return [...parts.slice(0,longest),part.slice(0,split),part.slice(split),...parts.slice(longest+1)];
}
function gameV2UniqueSegments(parts){
  const result=[];
  for(const raw of parts){const part=gameV2CleanText(raw);if(part.length<2||GAME_V2_DANGLING_END.test(part))continue;if(!result.some(x=>gameV2SameMeaningFragment(x,part)))result.push(part)}
  return result;
}

function gameV2SemanticSegments(item){
  const answer=gameV2CleanText(item?.answerText);
  if(!answer)return gameV2Keywords(item);
  const keywords=gameV2Keywords(item);
  let parts=answer.split(/[，,；;。]/).map(gameV2CleanText).filter(x=>x.length>=3);
  while(parts.length<3){const next=gameV2SplitLongest(parts.length?parts:[answer]);if(next.length===parts.length)break;parts=next}
  const safe=[];
  for(const part of parts){
    if(safe.length&&GAME_V2_DANGLING_END.test(safe[safe.length-1]))safe[safe.length-1]+=part;
    else safe.push(part);
  }
  parts=gameV2UniqueSegments(safe);
  if(parts.length<3&&keywords.length>=3)parts=gameV2UniqueSegments(keywords);
  else if(parts.length<3)parts=gameV2UniqueSegments([...parts,...keywords]);
  if(parts.length<2)parts=[answer];
  while(parts.length>5){
    let best=0;
    for(let i=1;i<parts.length-1;i++)if(parts[i].length<parts[best].length)best=i;
    const target=best===0?1:best-1;
    parts[target]+=parts[best];parts.splice(best,1);
  }
  return gameV2UniqueSegments(parts).slice(0,5);
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
