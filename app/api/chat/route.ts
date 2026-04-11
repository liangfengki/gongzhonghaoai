import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
const HARDCODED_CHAT_KEY = 'sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye';
const HARDCODED_IMAGE_KEY = 'sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy'; 
const FALLBACK_POOL = [
  { model: process.env.FALLBACK_MODEL_1 || 'gemini-3.1-flash-lite-preview', key: process.env.FALLBACK_KEY_1 || '' },
  { model: process.env.FALLBACK_MODEL_2 || 'gpt-5.4-nano', key: process.env.FALLBACK_KEY_2 || '' },
  { model: process.env.FALLBACK_MODEL_3 || 'grok-4.2', key: process.env.FALLBACK_KEY_3 || '' },
] as const;

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  try {
    const { messages, settings, stream = false, creditsCost = 0 } = await req.json();

    // Check credits if this operation costs credits
    if (creditsCost > 0) {
      if (user.credits < creditsCost) {
        return Response.json(
          { error: { message: `积分不足，需要 ${creditsCost} 积分，当前仅剩 ${user.credits} 积分` } },
          { status: 403 }
        );
      }
    }

    const apiKey = settings?.apiKey || process.env.CHAT_API_KEY || HARDCODED_CHAT_KEY;
    const isDefaultKey = apiKey === 'demo';
// Debug logging
console.log('Chat API Debug:', {
  hasSettings: !!settings,
  settingsApiKey: settings?.apiKey ? '***SET***' : 'empty',
  hasEnvKey: !!process.env.CHAT_API_KEY,
  usingHardcoded: !(settings?.apiKey || process.env.CHAT_API_KEY),
  keySource: settings?.apiKey ? 'settings' : (process.env.CHAT_API_KEY ? 'env' : 'hardcoded')
});


    const baseUrl = (settings?.baseUrl || process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || 'https://yunwu.ai/v1').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    let upstream: Response | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        let currentModel = settings?.modelName || process.env.CHAT_MODEL_NAME || 'gemini-3.1-flash-lite-preview';
        let currentKey = apiKey;

        if (isDefaultKey) {
          const poolConfig = FALLBACK_POOL[attempt % FALLBACK_POOL.length];
          currentModel = poolConfig.model;
          currentKey = poolConfig.key;
        }

        const body = {
          model: currentModel,
          messages: messages.map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: (msg.content || '').replace(/\0/g, '').trim() || '请继续',
          })),
          temperature: 0.7,
          max_tokens: 8192,
          stream,
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentKey}`,
        };

        upstream = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000),
        });

        if (upstream.ok) break;

        const errorText = await upstream.text();
        try {
          const errorJson = JSON.parse(errorText);
          lastError = errorJson.error?.message || errorJson.message || `API Error ${upstream.status}`;
        } catch {
          lastError = errorText.slice(0, 300) || `API Error ${upstream.status}`;
        }

        // Retry on 429 (rate limit) or 50x (server errors/overloaded) or specific proxy errors
        const isProxyOverloaded = lastError.includes('负载已饱和') || lastError.includes('并发数') || lastError.includes('rate limit');
        if (upstream.status === 429 || upstream.status >= 500 || isProxyOverloaded) {
          if (isProxyOverloaded && attempt >= 1) {
            break;
          }
          console.error(`API attempt ${attempt + 1} failed (${upstream.status}): ${lastError}, retrying...`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }

        break;
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : '网络连接失败';
        console.error(`API attempt ${attempt + 1} failed: ${lastError}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    if (!upstream || !upstream.ok) {
      console.error('API failed after retries:', lastError);
      return Response.json(
        { error: { message: `API 请求失败: ${lastError}` } },
        { status: upstream?.status || 502 }
      );
    }

    // Deduct credits on success (atomic to prevent race conditions)
    let remainingCredits: number | null = null;
    if (creditsCost > 0) {
      const result = await prisma.user.updateMany({
        where: { id: user.id, credits: { gte: creditsCost } },
        data: { credits: { decrement: creditsCost } },
      });
      if (result.count > 0) {
        const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
        remainingCredits = updated?.credits ?? null;
        // Determine usage type for logging
        const lastMessage = messages?.[messages.length - 1]?.content || '';
        let logType = 'chat';
        if (lastMessage.includes('大纲') || lastMessage.includes('outline')) logType = 'outline';
        else if (lastMessage.includes('撰写') || lastMessage.includes('正文')) logType = 'article';
        else if (lastMessage.includes('优化') || lastMessage.includes('改写')) logType = 'optimize';
        await prisma.usageLog.create({
          data: { userId: user.id, type: logType, creditsUsed: creditsCost },
        });
      }
    }

    if (stream && upstream.body) {
      const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      };
      if (remainingCredits !== null) {
        headers['X-Remaining-Credits'] = String(remainingCredits);
      }
      return new Response(upstream.body, { headers });
    }

    const data = await upstream.json();
    const response = Response.json(
      remainingCredits !== null ? { ...data, remainingCredits } : data
    );
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: { message } }, { status: 500 });
  }
}
