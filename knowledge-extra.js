/* 每章补足至少 7 个独立知识点，保证每日稳定抽取 7 道本章题。 */
const EXTRA_KNOWLEDGE=[
  {id:'x01',chapterId:'architecture',chapter:'第二章 建筑艺术专题',section:'空间艺术',q:'为什么说空间是建筑艺术最基本的表现对象？',memorize:'建筑通过围合、分隔、连接和引导空间来组织人的活动，并使人在行走与使用中获得审美体验。',keywords:'围合空间｜组织活动｜行走体验'},
  {id:'x02',chapterId:'architecture',chapter:'第二章 建筑艺术专题',section:'功能与审美',q:'建筑的实用功能与审美价值应当形成什么关系？',memorize:'建筑首先满足安全和使用需要，同时通过比例、尺度、空间与造型形成审美价值，二者应当统一。',keywords:'安全使用｜比例尺度｜审美统一'},
  {id:'x03',chapterId:'architecture',chapter:'第二章 建筑艺术专题',section:'材料与结构',q:'材料和结构为什么会影响建筑的艺术形象？',memorize:'材料决定质感和建造可能，结构决定受力与空间形式，二者共同塑造建筑的外观、尺度和风格。',keywords:'材料质感｜结构受力｜空间形式'},
  {id:'x04',chapterId:'architecture',chapter:'第二章 建筑艺术专题',section:'比例与尺度',q:'建筑中的比例与尺度分别帮助人理解什么？',memorize:'比例处理建筑各部分之间的关系，尺度处理建筑与人体及使用活动的关系，二者共同形成秩序感。',keywords:'部分关系｜人体尺度｜秩序感'},
  {id:'x05',chapterId:'residence',chapter:'第三章 民居与地域气候',section:'窑洞',q:'黄土高原窑洞为什么具有较好的保温性能？',memorize:'窑洞利用厚实土层的热惰性减小室内温度变化，形成冬暖夏凉并适应黄土地区的气候和材料条件。',keywords:'厚实土层｜热惰性｜冬暖夏凉'},
  {id:'x06',chapterId:'residence',chapter:'第三章 民居与地域气候',section:'干栏式民居',q:'湿热地区的干栏式民居为什么把居住层架高？',memorize:'架高居住层有利于通风、隔潮和防虫，也能适应多雨或地面潮湿的自然环境。',keywords:'架高｜通风隔潮｜多雨环境'},
  {id:'x07',chapterId:'residence',chapter:'第三章 民居与地域气候',section:'院落空间',q:'传统院落为什么既是生活空间也是社会空间？',memorize:'院落连接各房间，承担采光通风、家务休息和家庭交往，并通过房屋位置体现家庭关系与生活秩序。',keywords:'连接房间｜家庭交往｜生活秩序'},
  {id:'x08',chapterId:'garden',chapter:'第四章 园林与宫殿',section:'框景',q:'园林中的框景手法怎样形成画面感？',memorize:'框景利用门、窗或廊柱限制视野，把远近景物组织在一个边框中，使自然景色形成完整画面。',keywords:'门窗边框｜限制视野｜完整画面'},
  {id:'x09',chapterId:'garden',chapter:'第四章 园林与宫殿',section:'水石关系',q:'山石与水体在中国园林中通常起什么作用？',memorize:'山石塑造地形与骨架，水体形成倒影和流动感，二者配合营造接近自然山水的空间意境。',keywords:'山石骨架｜水体倒影｜山水意境'},
  {id:'x10',chapterId:'garden',chapter:'第四章 园林与宫殿',section:'游观方式',q:'中国园林为什么强调移步换景？',memorize:'曲折路径让景物随人的移动逐步展开，使有限空间产生连续变化和更丰富的游览体验。',keywords:'曲折路径｜逐步展开｜连续变化'},
  {id:'x11',chapterId:'religion',chapter:'第五章 宗教建筑',section:'伊斯兰建筑',q:'清真寺常用庭院、礼拜殿和宣礼塔组织哪些活动？',memorize:'庭院用于集散，礼拜殿确定礼拜方向并容纳仪式，宣礼塔具有召唤礼拜和城市识别作用。',keywords:'庭院集散｜礼拜方向｜宣礼塔'},
  {id:'x12',chapterId:'religion',chapter:'第五章 宗教建筑',section:'宗教象征',q:'宗教建筑为什么经常使用具有象征意义的光线？',memorize:'经过控制的明暗、方向和彩色光线能够区别日常与神圣空间，并强化信仰所需要的精神感受。',keywords:'控制光线｜神圣空间｜精神感受'},
  {id:'x13',chapterId:'religion',chapter:'第五章 宗教建筑',section:'建筑本土化',q:'外来宗教建筑传入中国后为什么会发生本土化？',memorize:'外来宗教建筑会适应中国的材料、技术、气候和审美传统，从而形成兼有宗教特征与地方文化的形式。',keywords:'材料技术｜气候审美｜地方文化'},
  {id:'x14',chapterId:'modern',chapter:'第六章 建筑传承与现代建筑',section:'包豪斯',q:'包豪斯设计教育强调怎样的基本方向？',memorize:'包豪斯强调艺术、技术与生产相结合，重视功能、材料和现代制造方式，推动现代设计走向生活。',keywords:'艺术技术｜生产结合｜现代设计'},
  {id:'x15',chapterId:'modern',chapter:'第六章 建筑传承与现代建筑',section:'有机建筑',q:'有机建筑处理建筑与自然环境时强调什么？',memorize:'有机建筑强调建筑顺应场地、材料和人的生活，使建筑各部分以及建筑与环境形成有机整体。',keywords:'顺应场地｜生活需要｜有机整体'},
  {id:'x16',chapterId:'modern',chapter:'第六章 建筑传承与现代建筑',section:'新材料',q:'钢、玻璃和钢筋混凝土怎样改变现代建筑？',memorize:'新材料和新结构扩大了跨度与开窗可能，使空间更自由，并形成轻盈、简洁和开放的现代建筑形象。',keywords:'扩大跨度｜自由空间｜开放形象'},
  {id:'x17',chapterId:'creation',chapter:'第七章 艺术创作与作品',section:'艺术语言',q:'艺术语言在作品中承担什么作用？',memorize:'艺术语言是艺术家运用媒介和形式表达内容的方式，不同门类通过线条、色彩、声音、动作等塑造形象。',keywords:'媒介形式｜表达内容｜塑造形象'},
  {id:'x18',chapterId:'appreciation',chapter:'第八章 艺术鉴赏',section:'主观与客观',q:'艺术鉴赏为什么既有主观差异又不能完全随意？',memorize:'鉴赏受个人经验和审美趣味影响，但仍要以作品形象、历史背景和艺术规律为依据。',keywords:'个人经验｜作品依据｜艺术规律'},
  {id:'x19',chapterId:'appreciation',chapter:'第八章 艺术鉴赏',section:'审美共鸣',q:'艺术鉴赏中的情感共鸣是怎样产生的？',memorize:'观众在作品形象和情感中发现与自身经验相通的内容，从而产生理解、认同和情绪呼应。',keywords:'作品情感｜自身经验｜理解认同'},
  {id:'x20',chapterId:'appreciation',chapter:'第八章 艺术鉴赏',section:'再创造',q:'为什么说艺术鉴赏包含观众的再创造？',memorize:'观众会依据作品提供的形象，结合自己的经验进行联想和想象，从而补充并形成个人的审美理解。',keywords:'作品形象｜联想想象｜个人理解'},
  {id:'x21',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'概念题',q:'主观题解释“艺术”时应写出哪四个核心层次？',memorize:'艺术的主体是人类，方式是感性形象，活动是审美创造，性质是精神生产和社会实践。',keywords:'人类主体｜感性形象｜审美创造｜社会实践'},
  {id:'x22',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'简答题',q:'简答艺术的社会功能时怎样组织答案最完整？',memorize:'先指出艺术具有多种社会功能，再分写审美、认识、教育和娱乐功能，并说明它们通过艺术形象共同发挥作用。',keywords:'多种功能｜分点作答｜艺术形象'},
  {id:'x23',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'创作题',q:'回答艺术创作过程时应怎样分点？',memorize:'第一写艺术体验来自生活，第二写艺术构思加工主题和形象，第三写艺术表现借助媒介完成作品。',keywords:'体验生活｜构思形象｜媒介表现'},
  {id:'x24',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'关系题',q:'论述艺术作品内容与形式关系时应抓住什么主线？',memorize:'内容规定表达方向，形式使内容具体可感；内容离不开形式，形式也服务并影响内容，二者统一于作品。',keywords:'表达方向｜具体可感｜统一于作品'},
  {id:'x25',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'鉴赏题',q:'分析一件作品的鉴赏过程时应按什么顺序？',memorize:'先写审美感知作品的形式和形象，再写情感体验，最后联系背景与经验形成审美理解。',keywords:'感知形式｜情感体验｜联系背景'},
  {id:'x26',chapterId:'exam',chapter:'第九章 真题方向与主观题',section:'论述题',q:'论述传统与创新关系时怎样避免只喊口号？',memorize:'先说明继承保持文化连续性，再说明创新回应时代生活，最后用具体作品说明传统精神如何经过现代方式重新表达。',keywords:'文化连续｜回应时代｜作品举例'}
];
for(const entry of EXTRA_KNOWLEDGE){
  questionChapter[entry.id]=entry.chapterId;
  questionBank.push({
    id:entry.id,type:'choice',chapter:entry.chapter,section:entry.section,q:entry.q,
    options:[entry.memorize,'只记作品名称，不分析概念和关系','只看表面形式，不结合功能与背景','完全凭个人喜好判断，不需要作品依据'],
    answer:0,explain:entry.memorize,keywords:entry.keywords,memorize:entry.memorize
  });
}
