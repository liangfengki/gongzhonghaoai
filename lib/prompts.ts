// Article optimization prompt templates
// Each template transforms existing content with a specific technique

export interface OptimizerTemplate {
  id: string;
  name: string;
  icon: string;
  category: 'perspective' | 'structure' | 'expression' | 'value';
  description: string;
  systemPrompt: string;
  userPromptTemplate: (content: string, options?: Record<string, string>) => string;
}

export const OPTIMIZER_TEMPLATES: OptimizerTemplate[] = [
  {
    id: 'professional-role',
    name: '专业角色改写',
    icon: '🎭',
    category: 'perspective',
    description: '化身专业身份，用行业视角重新解读',
    systemPrompt: '你是一位资深的行业专家，擅长用专业视角、行业术语和独特洞察重新解读文章。你的改写会让内容更具权威感和个人风格，同时保持可读性。请直接输出改写后的完整文章，不要添加任何解释。',
    userPromptTemplate: (content, opts) => `请你化身一位${opts?.role || '资深行业专家'}，用该身份的专业视角、行业术语和独特洞察，重新解读并改写这篇公众号文章，让内容更具权威感和个人风格。

原文：
${content}`,
  },
  {
    id: 'counter-argument',
    name: '反向观点重构',
    icon: '⚡',
    category: 'perspective',
    description: '站在对立面重写，制造辩论张力',
    systemPrompt: '你是一位善于思辨的评论员，擅长从不同角度审视问题，用逻辑闭环、论据扎实的方式表达与主流不同的观点。你的文章会制造有张力的辩论感，引发读者思考。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `这篇公众号文章的核心观点如下。请你站在"反驳核心观点"或"补充其另一面"的立场，重写一篇逻辑闭环、论据扎实的文章，制造有张力的辩论感。

原文：
${content}`,
  },
  {
    id: 'emotion-shift',
    name: '情绪氛围重塑',
    icon: '🎨',
    category: 'perspective',
    description: '保留事实，切换情绪基调',
    systemPrompt: '你是一位情感调性大师，擅长在保留核心事实的前提下，通过用词、句式和案例调整，将文章的情绪基调切换为全新的感受。请直接输出改写后的完整文章。',
    userPromptTemplate: (content, opts) => `保留文章核心事实不变，将原文的情绪基调切换为"${opts?.tone || '理性温和'}"的风格，通过用词、句式和案例调整，传递全新情绪感受。

原文：
${content}`,
  },
  {
    id: 'conversation-style',
    name: '对话体改写',
    icon: '💬',
    category: 'perspective',
    description: '朋友聊天式，拉近距离',
    systemPrompt: '你是一位擅长用对话体写作的公众号作者，能把任何文章改写成像朋友聊天一样的风格。你善于使用设问、反问和口语化表达，让阅读轻松有代入感。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `把这篇公众号文章改成"朋友聊天式"对话体，多用设问、反问和口语化表达，像跟读者唠嗑一样，拉近距离，让阅读更轻松有代入感。

原文：
${content}`,
  },
  {
    id: 'checklist-extract',
    name: '清单化提炼',
    icon: '📋',
    category: 'structure',
    description: '浓缩为方法论清单，快速吸收',
    systemPrompt: '你是一位擅长内容结构化的大师，能把长文的核心方法论、关键观点浓缩成简洁有力的清单。每个要点都会搭配精炼案例，方便读者快速吸收。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `将这篇长文的核心方法论、关键观点或操作步骤，浓缩成一份清单文，每个要点简洁有力，搭配精炼案例，方便读者快速吸收。

原文：
${content}`,
  },
  {
    id: 'hook-opening',
    name: '吸引力开头',
    icon: '🎣',
    category: 'structure',
    description: '设计吸引人的开头，抓住读者注意力',
    systemPrompt: '你是一位爆款文章开头设计师，擅长用不同风格的开头钩子抓住读者注意力。请直接使用你认为最吸引人的开头重写文章，不要输出多种方案让用户选，也不要带上“开头方案”之类的标签，要让文章浑然一体。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `保留文章核心内容，为它设计一个极具吸引力的开头钩子（例如：颠覆常识的反常识观点、戳中读者的痛点场景、时效性强的热点事件引入），并直接完成全文改写。注意：不要输出多个方案，不要带有“开头方案”等标签。
    
原文：
${content}`,
  },
  {
    id: 'golden-quotes',
    name: '金句密度升级',
    icon: '✨',
    category: 'expression',
    description: '每500字植入记忆点金句',
    systemPrompt: '你是一位金句大师，擅长在文章中植入犀利观点、诗意总结或巧妙比喻，让文章更有传播力。你会刻意在适当密度内植入记忆点金句。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `改写这篇文章，刻意在每500字内植入1句"记忆点金句"，可以是犀利观点、诗意总结或巧妙比喻，让文章更有传播力，让读者愿意收藏转发。

原文：
${content}`,
  },
  {
    id: 'local-cases',
    name: '本土案例替换',
    icon: '🌏',
    category: 'expression',
    description: '替换为接地气的本土案例',
    systemPrompt: '你是一位熟悉中国本土文化和行业动态的内容创作者，擅长把抽象概念用读者身边的故事和案例来表达，让内容更有说服力和亲切感。请直接输出改写后的完整文章。',
    userPromptTemplate: (content, opts) => `把原文里的案例、故事和比喻，替换成${opts?.domain || '贴近国内日常生活'}的新鲜贴切案例，让内容更接地气，对目标读者更有说服力和亲切感。

原文：
${content}`,
  },
  {
    id: 'value-extension',
    name: '价值增量拓展',
    icon: '📦',
    category: 'value',
    description: '补充实操步骤、工具资源',
    systemPrompt: '你是一位擅长增值内容创作的专家，能在原有内容基础上做有价值的内容延伸，补充实操步骤、工具资源包、行业趋势分析等，让内容更有干货感。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `在原文核心内容基础上，做20%的价值延伸：补充1个可落地的实操步骤、整理1份工具资源包、分析最新行业趋势，或点出普通人容易踩的误区，让内容更有干货感。

原文：
${content}`,
  },
  {
    id: 'interactive-ending',
    name: '互动结尾设计',
    icon: '🗣️',
    category: 'structure',
    description: '设计强互动引导结尾',
    systemPrompt: '你是一位擅长提升文章互动率的公众号运营专家，能设计出让读者忍不住想评论、转发的结尾。你的互动话语应该非常自然地融入文章结尾，绝对不要出现【互动话题】、【结尾设计】之类的标签文字。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `为这篇文章设计一个强互动结尾，引导读者留言评论。注意：这些互动话语必须非常自然地融入段落中，绝对不允许出现【互动话题】之类的标记词。
    
原文：
${content}`,
  },
  {
    id: 'internet-slang',
    name: '网感语言优化',
    icon: '🔥',
    category: 'expression',
    description: '融入热词，加快节奏适配手机',
    systemPrompt: '你是一位拥有极强网感的自媒体作者，擅长用当下流行但不低俗的网络热词和表达方式改写文章，把句子拆短、节奏加快，更符合手机端碎片化阅读习惯。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `给这篇文章做"网感升级"：适当用当下流行但不低俗的网络热词，融入热门梗意境，把句子拆短、节奏加快，更符合手机端碎片化阅读习惯。

原文：
${content}`,
  },
  {
    id: 'story-narrative',
    name: '故事叙事重构',
    icon: '📖',
    category: 'expression',
    description: '用故事承载观点，有温度有画面',
    systemPrompt: '你是一位擅长故事化写作的作者，能把干巴巴的论述装进一个完整的故事里，通过典型人物的经历引出、论证并升华观点，让道理变得有温度、有画面感。请直接输出改写后的完整文章。',
    userPromptTemplate: (content) => `把这篇文章的核心观点装进一个完整故事里，通过真实或虚构的典型人物经历，引出、论证并升华观点，让干巴巴的道理变得有温度、有画面感。

原文：
${content}`,
  },
];

export const CATEGORY_LABELS: Record<string, { name: string; color: string }> = {
  perspective: { name: '视角重塑', color: 'blue' },
  structure: { name: '结构优化', color: 'purple' },
  expression: { name: '表达升级', color: 'orange' },
  value: { name: '价值延伸', color: 'green' },
};

// Preset options for templates that need them
export const TEMPLATE_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  'professional-role': [
    { label: '资深营销专家', value: '资深营销专家' },
    { label: '情感咨询师', value: '情感咨询师' },
    { label: '行业观察者', value: '行业观察者' },
    { label: '心理学教授', value: '心理学教授' },
    { label: '商业分析师', value: '商业分析师' },
  ],
  'emotion-shift': [
    { label: '理性温和', value: '理性温和' },
    { label: '治愈共情', value: '治愈共情' },
    { label: '积极向上', value: '积极向上' },
    { label: '幽默诙谐', value: '幽默诙谐' },
    { label: '冷静分析', value: '冷静分析' },
  ],
  'local-cases': [
    { label: '国内生活场景', value: '贴近国内日常生活' },
    { label: '互联网行业', value: '互联网科技行业' },
    { label: '职场打工人', value: '职场打工人日常' },
    { label: '年轻人文化', value: 'Z世代年轻人文化' },
    { label: '创业商业', value: '创业和商业领域' },
  ],
};

const AI_PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [/综上所述[，,]?\s*/g, ''],
  [/值得注意的是[，,]?\s*/g, ''],
  [/需要指出的是[，,]?\s*/g, ''],
  [/显而易见[，,]?\s*/g, ''],
  [/毋庸置疑[，,]?\s*/g, ''],
  [/由此可见[，,]?\s*/g, ''],
  [/与此同时[，,]?\s*/g, ''],
  [/在此基础上[，,]?\s*/g, ''],
  [/从长远来看[，,]?\s*/g, ''],
  [/总体而言[，,]?\s*/g, ''],
  [/换言之[，,]?\s*/g, '换句话说'],
  [/简而言之[，,]?\s*/g, ''],
  [/不可否认[，,]?\s*/g, ''],
  [/总而言之[，,]?\s*/g, ''],
  [/首先[，,]?\s*/g, ''],
  [/其次[，,]?\s*/g, ''],
  [/最后[，,]?\s*/g, ''],
  [/此外[，,]?\s*/g, ''],
  [/因此[，,]?\s*/g, ''],
  [/不仅如此[，,]?\s*/g, ''],
  [/事实上[，,]?\s*/g, ''],
  [/实际上[，,]?\s*/g, ''],
  [/一般来说[，,]?\s*/g, ''],
  [/通常来说[，,]?\s*/g, ''],
  [/在一定程度上[，,]?\s*/g, ''],
  [/在某种意义上[，,]?\s*/g, ''],
  [/想象一下[，,]?\s*/g, ''],
  [/不容忽视[，,]?\s*/g, ''],
  [/至关重要[，,]?\s*/g, '很要紧'],
  [/举足轻重[，,]?\s*/g, '很关键'],
  [/不可或缺[，,]?\s*/g, '少不了'],
  [/息息相关[，,]?\s*/g, '绑在一起'],
  [/日新月异[，,]?\s*/g, '一天一个样'],
  [/蓬勃发展[，,]?\s*/g, '越搞越火'],
  [/方兴未艾[，,]?\s*/g, '还在往上走'],
  [/应运而生[，,]?\s*/g, '就这么出来了'],
  [/层出不穷[，,]?\s*/g, '一个接一个'],
  [/推陈出新[，,]?\s*/g, '不断翻新'],
  [/与时俱进[，,]?\s*/g, '跟着时代走'],
  [/深入探讨/g, '好好聊聊'],
  [/深入分析/g, '仔细看看'],
  [/深入理解/g, '搞明白'],
  [/深入思考/g, '好好想想'],
  [/深入研究了?/g, '好好研究了'],
  [/深入了解了?/g, '搞清楚了'],
  [/深入探索/g, '好好摸索'],
  [/深入挖掘/g, '好好挖一挖'],
  [/有效提升/g, '真的能提高'],
  [/有效改善/g, '真的能改善'],
  [/有效解决/g, '真能解决'],
  [/有效促进/g, '真能推动'],
  [/有效防止/g, '真能防住'],
  [/有效降低/g, '真能降下来'],
  [/持续增长/g, '一直在涨'],
  [/持续发展/g, '一直在发展'],
  [/持续优化/g, '一直在改'],
  [/持续改进/g, '一直在调'],
  [/不断提升/g, '一直在提高'],
  [/不断完善/g, '一直在完善'],
  [/不断优化/g, '一直在改好'],
  [/不断推进/g, '一直在推'],
  [/不断深入/g, '一直在深入'],
  [/积极推进/g, '主动在推'],
  [/积极推动/g, '主动推着走'],
  [/积极探索/g, '主动去试'],
  [/积极应对/g, '主动去应对'],
  [/全面覆盖/g, '方方面面都覆盖了'],
  [/全面提升/g, '整体提高'],
  [/全面优化/g, '整体改好'],
  [/全面推动/g, '整体推着走'],
  [/全面构建/g, '整体搭起来'],
  [/全面实施/g, '整体做起来'],
  [/打造了?一个/g, '弄了个'],
  [/构建了?一个/g, '搭了个'],
  [/实现了一个/g, '做到了一个'],
  [/提供了一个/g, '给了个'],
  [/确保了?/g, '保证'],
  [/致力于/g, '一心想'],
  [/旨在/g, '就是想'],
  [/助力/g, '帮着'],
  [/推动/g, '推着走'],
  [/引领/g, '带着走'],
  [/驱动/g, '推着'],
  [/赋能/g, '帮到'],
  [/助力于/g, '帮着'],
];

const AI_WORD_REPLACEMENTS: [RegExp, string][] = [
  [/赋能/g, '帮到'],
  [/底层逻辑/g, '根本原因'],
  [/颗粒度/g, '细节'],
  [/闭环/g, '兜底'],
  [/抓手/g, '切入点'],
  [/深耕/g, '一直做'],
  [/生态(?!系)/g, '圈子'],
  [/矩阵/g, '一套组合'],
  [/赛道/g, '领域'],
  [/痛点/g, '头疼的事'],
  [/维度/g, '角度'],
  [/体系化/g, '系统'],
  [/协同/g, '配合'],
  [/对齐/g, '对上'],
  [/沉淀/g, '积累'],
  [/复用/g, '重复用'],
  [/链路/g, '流程'],
  [/触达/g, '到达'],
  [/心智/g, '想法'],
  [/势能/g, '势头'],
  [/打法/g, '做法'],
  [/组合拳/g, '一套办法'],
  [/新常态/g, '现在的常态'],
  [/差异化/g, '不一样'],
  [/结构性/g, '根本上的'],
  [/战略性/g, '关键的'],
  [/助力/g, '帮着'],
  [/旨在/g, '就是想'],
  [/显著(?=地|的|差异|提升|提高|增加|增长|改善|变化)/g, '实打实'],
  [/聚焦/g, '盯着'],
  [/核心(?=竞争力|能力|技术|业务|产品|优势|问题|观点|要素|成员)/g, '最关键的'],
  [/关键(?=因素|环节|步骤|点|技术|问题|挑战|路径)/g, '要命的'],
  [/全面(?=推进|覆盖|提升|优化|发展|实施|部署|落实)/g, '方方面面'],
  [/有效(?=提升|改善|解决|促进|防止|降低|推进|推动|实施|执行)/g, '管用'],
  [/持续(?=增长|发展|优化|改进|提升|完善|推进|深入)/g, '一直'],
  [/不断(?=提升|完善|优化|推进|深入|发展|增长|改进)/g, '不停'],
  [/积极(?=推进|推动|探索|应对|参与|落实|开展)/g, '主动'],
  [/优化(?=方案|策略|流程|结构|配置|体验|效果)/g, '改好'],
  [/提升(?=效率|体验|质量|水平|能力|价值|竞争力)/g, '提高'],
  [/推动(?=发展|转型|升级|创新|改革|进程)/g, '推着走'],
  [/打造(?=平台|体系|生态|品牌|产品|服务)/g, '弄出'],
  [/构建(?=体系|平台|生态|框架|机制|模型)/g, '搭起来'],
  [/实现(?=目标|突破|转型|升级|增长|发展)/g, '做到'],
  [/提供(?=支持|保障|服务|帮助|方案|解决)/g, '给到'],
  [/确保(?=安全|稳定|质量|效果|成功)/g, '保证'],
  [/深入(?=探讨|分析|理解|思考|研究|了解|探索|挖掘)/g, '好好'],
  [/显著(?=提升|提高|增加|增长|改善|变化|差异|降低|减少)/g, '实打实'],
  [/日益(?=增长|增加|广泛|重要|突出|明显|严重|普及)/g, '越来越'],
  [/逐步(?=推进|实现|完善|建立|形成|发展|扩大)/g, '一步步'],
  [/进一步(?=提升|优化|完善|推进|加强|深化|扩大)/g, '再'],
  [/充分(?=发挥|利用|体现|考虑|保障|准备)/g, '好好'],
  [/高度(?=重视|关注|认可|评价|赞扬)/g, '非常'],
  [/广泛(?=应用|关注|认可|使用|传播|讨论)/g, '到处'],
  [/深刻(?=认识|理解|影响|变化|意义|启示)/g, '深深'],
  [/巨大(?=潜力|市场|空间|变化|影响|挑战)/g, '超大'],
  [/重要(?=意义|作用|地位|影响|价值|贡献)/g, '要紧'],
  [/显著(?=优势|特点|特征|效果|成果)/g, '实打实'],
  [/关键(?=在于|因素|环节|步骤|点)/g, '要命的'],
  [/核心(?=观点|问题|要素|成员|技术)/g, '最关键的'],
  [/想象一下/g, '你想想'],
  [/不容忽视/g, '不能不当回事'],
  [/至关重要/g, '很要紧'],
  [/举足轻重/g, '很关键'],
  [/不可或缺/g, '少不了'],
  [/息息相关/g, '绑在一起'],
  [/日新月异/g, '一天一个样'],
  [/蓬勃发展/g, '越搞越火'],
  [/方兴未艾/g, '还在往上走'],
  [/应运而生/g, '就这么出来了'],
  [/层出不穷/g, '一个接一个'],
  [/推陈出新/g, '不断翻新'],
  [/与时俱进/g, '跟着时代走'],
  [/众所周知/g, '大家都知道'],
  [/毋庸置疑/g, ''],
  [/不言而喻/g, '明摆着'],
  [/有目共睹/g, '大家都看得到'],
  [/众所周知/g, '大家都知道'],
  [/由此可见/g, ''],
  [/总而言之/g, ''],
  [/综上所述/g, ''],
  [/一言以蔽之/g, '一句话'],
  [/简而言之/g, ''],
  [/换言之/g, '换句话说'],
  [/具体而言/g, '具体说'],
  [/总体而言/g, ''],
  [/一般而言/g, '一般来说'],
  [/从某种意义上说/g, '某种角度来说'],
  [/在一定程度上/g, '某种程度上'],
  [/在当今社会/g, '现在这个社会'],
  [/在现代社会/g, '现在'],
  [/随着.*的发展/g, ''],
  [/在.*的背景下/g, ''],
];

const HUMAN_INTERJECTIONS = [
  '说实话，', '讲真，', '说白了，', '你敢信？', '对吧。',
  '就是这么回事。', '也是绝了。', '懂的都懂。', '真的不是吹。',
  '我跟你讲，', '别笑，', '嗯...', '哎，', '讲道理，',
  '不瞒你说，', '你品，', '细品。', '就是这么现实。',
  '我之前也不信。', '后来才搞明白。', '这事儿吧，', '你想想看，',
];

const SENTENCE_END_VARIANTS = ['。', '…', '——', '~', '！'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function deaiPostProcess(text: string): string {
  let result = text;

  for (const [pattern, replacement] of AI_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of AI_WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/([！!]){2,}/g, '$1');

  const lines = result.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const exclCount = (lines[i].match(/[！!]/g) || []).length;
    if (exclCount > 1) {
      let count = 0;
      lines[i] = lines[i].replace(/[！!]/g, (match) => {
        count++;
        return count > 1 ? '。' : match;
      });
    }
  }
  result = lines.join('\n');

  result = result.replace(/\n{3,}/g, '\n\n');

  result = result.replace(/^[，,]\s*/gm, '');

  result = result.replace(/[ \t]{2,}/g, ' ');

  result = result.replace(/[。]{2,}/g, '。');

  const rand = seededRandom(Date.now());

  const paragraphs = result.split(/\n\n+/);
  const processedParagraphs: string[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    let para = paragraphs[pIdx];

    if (/^#{1,3}\s/.test(para) || /^\[IMG_/.test(para) || /^!\[/.test(para)) {
      processedParagraphs.push(para);
      continue;
    }

    const sentences = para.split(/(?<=[。！？…——~])/g);
    const processedSentences: string[] = [];

    for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
      let sentence = sentences[sIdx];
      if (!sentence.trim()) {
        processedSentences.push(sentence);
        continue;
      }

      if (sentence.length > 35 && rand() < 0.3) {
        const mid = Math.floor(sentence.length * (0.4 + rand() * 0.3));
        const breakChars = ['，', '、', '；'];
        let breakPos = -1;
        for (let k = mid; k > mid - 8 && k > 0; k--) {
          if (breakChars.includes(sentence[k])) {
            breakPos = k;
            break;
          }
        }
        if (breakPos === -1) {
          for (let k = mid; k < mid + 8 && k < sentence.length; k++) {
            if (breakChars.includes(sentence[k])) {
              breakPos = k;
              break;
            }
          }
        }
        if (breakPos > 0) {
          sentence = sentence.slice(0, breakPos + 1) + '\n' + sentence.slice(breakPos + 1);
        }
      }

      if (rand() < 0.08 && sentence.length > 10) {
        const interjection = HUMAN_INTERJECTIONS[Math.floor(rand() * HUMAN_INTERJECTIONS.length)];
        const insertPos = Math.floor(sentence.length * (0.3 + rand() * 0.4));
        const commaPos = sentence.indexOf('，', insertPos);
        const actualPos = commaPos > 0 ? commaPos + 1 : insertPos;
        sentence = sentence.slice(0, actualPos) + interjection + sentence.slice(actualPos);
      }

      processedSentences.push(sentence);
    }

    para = processedSentences.join('');

    if (rand() < 0.15 && para.length > 50) {
      const shortPunch = ['对吧。', '就是这么现实。', '你敢信？', '绝了。', '懂的都懂。', '细品。', '真的。'];
      para += shortPunch[Math.floor(rand() * shortPunch.length)];
    }

    processedParagraphs.push(para);
  }

  result = processedParagraphs.join('\n\n');

  return result;
}
