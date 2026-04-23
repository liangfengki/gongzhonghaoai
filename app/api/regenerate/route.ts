import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const maxDuration = 120;

// POST /api/regenerate - Regenerate a specific paragraph
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  try {
    const { articleContent, paragraphIndex, instruction, settings, tone, stream = true } = await req.json();

    if (!articleContent || paragraphIndex === undefined) {
      return Response.json({ error: '缺少文章内容或段落索引' }, { status: 400 });
    }

    const creditsCost = 5;
    if (user.credits < creditsCost) {
      return Response.json(
        { error: { message: `积分不足，需要 ${creditsCost} 积分，当前仅剩 ${user.credits} 积分` } },
        { status: 403 }
      );
    }

    const paragraphs = articleContent.split(/\n{2,}/);
    const targetParagraph = paragraphs[paragraphIndex];
    if (!targetParagraph) {
      return Response.json({ error: '段落不存在' }, { status: 400 });
    }

    const contextBefore = paragraphs.slice(Math.max(0, paragraphIndex - 2), paragraphIndex).join('\n\n');
    const contextAfter = paragraphs.slice(paragraphIndex + 1, paragraphIndex + 3).join('\n\n');

    const toneMap: Record<string, string> = {
      professional: '专业严谨',
      casual: '轻松幽默',
      storytelling: '故事叙述',
    };

    const prompt = `你是一位公众号写手，请改写以下段落。改写后保持原文核心意思不变，但用不同的表达方式重新阐述。

写作风格：${toneMap[tone || 'professional'] || '自然流畅'}

上下文（前文）：
${contextBefore || '（文章开头）'}

需要改写的段落：
${targetParagraph}

上下文（后文）：
${contextAfter || '（文章结尾）'}

改写要求：
1. 保持核心观点和信息不变
2. 用全新的表达方式重写
3. 保持与前后文的连贯性
4. 长度与原文相近（±20%）
5. 不要使用AI套话（首先、其次、最后、综上所述等）
6. 语言自然口语化
${instruction ? `7. 额外要求：${instruction}` : ''}

只返回改写后的段落内容，不要加任何解释或前缀。`;

    const apiKey = settings?.apiKey || process.env.CHAT_API_KEY || '';
    const baseUrl = (settings?.baseUrl || process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || 'https://yunwu.ai/v1').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL_NAME || 'MiniMax-M2.7',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 4096,
        stream,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error('Regenerate API error:', errorText);
      return Response.json({ error: { message: '重新生成失败' } }, { status: upstream.status });
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: creditsCost } },
    });
    await prisma.usageLog.create({
      data: { userId: user.id, type: 'regenerate', creditsUsed: creditsCost },
    });

    if (stream && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content || '';
    return Response.json({ content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: { message } }, { status: 500 });
  }
}
