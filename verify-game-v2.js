const fs=require('fs'),vm=require('vm');
const context={console,state:{dailyTask:{answers:{}}}};
context.hashText=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h|0};
context.seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
context.shuffled=(items,rand)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
context.answerOrderPolicy=item=>/包括|分为/.test(item.q)?'free':'strict';
vm.createContext(context);
const source=fs.readFileSync('game-v2-data.js','utf8')+'\n;globalThis.api={segments:gameV2SemanticSegments,pool:gameV2FragmentPool,plan:gameV2BuildPlan,initial:gameV2InitialInventory};';
vm.runInContext(source,context);
const items=Array.from({length:10},(_,i)=>({id:`q${i}`,q:i%2?'艺术的特点是什么？':'艺术包括哪些功能？',answerText:i%2?'艺术以感性形象反映生活，并通过审美创造表达思想情感。':'艺术具有审美、认识、教育和娱乐功能。',keywords:i%2?'感性形象、审美创造、思想情感':'审美、认识、教育、娱乐'}));
const {segments,pool,plan,initial}=context.api,p=plan(items,'2026-08-02',[]),fragments=pool(items),firstTwo=[p.encounters.m1[0],p.encounters.m2[0]];
if(new Set(p.deck).size!==10)throw new Error('Daily battle deck contains duplicates');
if(p.encounters.b1.length<3||p.encounters.b1.length>5||p.encounters.b2.length<3||p.encounters.b2.length>5)throw new Error('Boss HP split invalid');
if(p.final.length!==5)throw new Error('Final boss must have five questions');
if(initial(items,p).length!==10)throw new Error('Initial inventory must contain ten fragments');
for(const item of items){const result=segments(item);if(result.length<3||result.length>5)throw new Error(`Invalid semantic segment count: ${item.id}`);if(result.some(x=>x.length<2))throw new Error(`Dangling segment: ${item.id}`)}
for(const id of firstTwo){const required=fragments.filter(x=>x.questionId===id).map(x=>x.id);if(!required.every(x=>initial(items,p).includes(x)))throw new Error(`First encounters not solvable: ${id}`)}
console.log(JSON.stringify({deck:p.deck,medium:[p.encounters.m1.length,p.encounters.m2.length],boss:[p.encounters.b1.length,p.encounters.b2.length],final:p.final.length,initial:initial(items,p).length,fragments:fragments.length},null,2));
