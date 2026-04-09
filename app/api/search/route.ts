import { NextResponse } from 'next/server';

// Smart fallback topic generator based on keyword
function generateFallbackTopics(query: string, limit: number): string[] {
  const templates = [
    (kw: string) => `${kw}：2026年最值得关注的5个趋势`,
    (kw: string) => `深度解析：${kw}背后的底层逻辑`,
    (kw: string) => `${kw}实战指南：从入门到精通的完整攻略`,
    (kw: string) => `关于${kw}，90%的人都理解错了`,
    (kw: string) => `${kw}如何改变我们的生活？这3个案例说清楚了`,
    (kw: string) => `${kw}新手必看：避开这3个常见误区`,
    (kw: string) => `为什么${kw}越来越火？一篇文章讲透`,
    (kw: string) => `${kw}变现攻略：普通人也能月入过万`,
    (kw: string) => `${kw}行业报告：未来3年发展方向`,
    (kw: string) => `从零开始学${kw}：小白也能快速上手`,
    (kw: string) => `${kw}高手都在用的5个进阶技巧`,
    (kw: string) => `${kw}踩坑实录：这些弯路你不必走`,
    (kw: string) => `2026年${kw}领域最新动态盘点`,
    (kw: string) => `${kw}与其他领域的跨界融合趋势`,
    (kw: string) => `${kw}的商业价值与应用场景分析`,
  ];

  return templates.slice(0, limit).map((fn) => fn(query));
}

// AI-powered topic search - generates related trending-style topics
export async function POST(req: Request) {
  try {
    const { query, limit = 10, settings } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    // Use the chat API internally to generate related topics
    const chatUrl = new URL('/api/chat', req.url).toString();
    const prompt = `根据关键词"${query}"，生成${limit}个适合微信公众号写作的热门话题标题。
要求：
1. 标题要吸引人，有点击欲望
2. 结合当前热点趋势
3. 只返回标题列表，每行一个，不要带序号
4. 每个标题控制在30字以内`;

    try {
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          settings: settings || {},
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const content = chatData.choices?.[0]?.message?.content || '';
        const topics = content
          .split('\n')
          .map((line: string) => line.replace(/^\d+[.、]\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter((line: string) => line.length >= 4 && line.length <= 60)
          .slice(0, limit);

        if (topics.length > 0) {
          return NextResponse.json({
            success: true,
            source: 'ai',
            query,
            topics,
            realtime: true,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Chat API failed, fall through to fallback
    }

    // Fallback: generate smart topics based on keyword
    const fallbackTopics = generateFallbackTopics(query, limit);
    return NextResponse.json({
      success: true,
      source: 'fallback',
      query,
      topics: fallbackTopics,
      realtime: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
