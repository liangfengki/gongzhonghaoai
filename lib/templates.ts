// Predefined article templates
export interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  outline: string[];
  tone: string;
  defaultPrompt?: string;
}

export const TEMPLATES: ArticleTemplate[] = [
  {
    id: 'hot-take',
    name: '热点评论',
    description: '针对时事热点发表观点，引发讨论',
    category: '热点',
    outline: ['事件回顾', '我的看法', '背后的逻辑', '对普通人的影响', '你怎么看？'],
    tone: 'casual',
  },
  {
    id: 'tutorial',
    name: '干货教程',
    description: '手把手教读者做某件事',
    category: '干货',
    outline: ['为什么你需要学这个', '准备工作', '核心步骤（1）', '核心步骤（2）', '核心步骤（3）', '常见踩坑点', '总结和下一步'],
    tone: 'professional',
  },
  {
    id: 'product-review',
    name: '产品评测',
    description: '深度体验后的真实评价',
    category: '评测',
    outline: ['入手原因', '第一印象', '核心功能体验', '优点盘点', '缺点吐槽', '值不值得买？'],
    tone: 'casual',
  },
  {
    id: 'story',
    name: '个人故事',
    description: '分享一段真实经历和感悟',
    category: '故事',
    outline: ['那个改变一切的瞬间', '挣扎和迷茫', '转折点', '我学到了什么', '给你的建议'],
    tone: 'storytelling',
  },
  {
    id: 'industry-analysis',
    name: '行业分析',
    description: '深度解读某个行业/领域的趋势',
    category: '深度',
    outline: ['行业现状', '关键玩家和格局', '核心趋势', '机会和风险', '未来展望', '普通人怎么参与'],
    tone: 'professional',
  },
  {
    id: 'listicle',
    name: '清单盘点',
    description: '盘点N个值得推荐的内容',
    category: '推荐',
    outline: ['为什么做这个盘点', '第1个推荐', '第2个推荐', '第3个推荐', '第4个推荐', '第5个推荐', '我的最爱', '使用建议'],
    tone: 'casual',
  },
  {
    id: 'qa',
    name: '问答解惑',
    description: '回答读者最关心的问题',
    category: '问答',
    outline: ['这个问题被问了太多次', '先说结论', '为什么是这样', '常见误解', '实操建议', '最后说两句'],
    tone: 'casual',
  },
  {
    id: 'comparison',
    name: '对比评测',
    description: 'A vs B 哪个更值得选',
    category: '评测',
    outline: ['为什么要对比', 'A 的特点', 'B 的特点', '核心差异对比', '不同场景推荐', '我的选择'],
    tone: 'professional',
  },
];

export function getTemplateCategories(): string[] {
  return [...new Set(TEMPLATES.map(t => t.category))];
}

export function getTemplatesByCategory(category?: string): ArticleTemplate[] {
  if (!category) return TEMPLATES;
  return TEMPLATES.filter(t => t.category === category);
}
