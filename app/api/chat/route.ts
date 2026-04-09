import { NextRequest } from 'next/server';
import { STATIC_AUTH_CODES } from '@/lib/auth-codes';
import { checkCodeUsage, incrementUsage } from '@/lib/usage-tracker';

// Removed mock functions as we use real API exclusively

export async function POST(req: NextRequest) {
  try {
    const { messages, settings, stream = false } = await req.json();

    const lastMessage = messages?.[messages.length - 1]?.content || '';
    const isGeneratingArticle = lastMessage.includes('撰写') || lastMessage.includes('正文') || lastMessage.includes('改写') || lastMessage.includes('优化');

    // Check Auth Code Limits
    if (isGeneratingArticle) {
      const authCodeValue = req.cookies.get('auth_code')?.value;
      const codeUsageCookie = req.cookies.get('code_usage')?.value;

      if (authCodeValue) {
        if (!STATIC_AUTH_CODES.includes(authCodeValue)) {
          return Response.json({ error: { message: '无效的授权码，请重新登录' } }, { status: 401 });
        }

        const usageCheck = checkCodeUsage(authCodeValue, codeUsageCookie);
        if (!usageCheck.ok) {
          return Response.json({ error: { message: usageCheck.error } }, { status: 403 });
        }
      }
    }

    let apiKey = settings?.apiKey || process.env.CHAT_API_KEY || 'sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye';
    
    // If apiKey is explicitly set to 'demo', ignore it and use the built-in real key
    if (apiKey === 'demo' || !apiKey) {
      apiKey = process.env.CHAT_API_KEY || 'sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye';
    }

    const baseUrl = (settings?.baseUrl || process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || 'https://yunwu.ai/v1').replace(/\/+$/, '');
    const model = settings?.modelName || process.env.CHAT_MODEL_NAME || 'gemini-3.1-flash-lite-preview';

    // Real API call with retry for 429 errors
    const endpoint = `${baseUrl}/chat/completions`;

    const body = {
      model,
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
      Authorization: `Bearer ${apiKey}`,
    };

    let upstream: Response | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
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

        // Retry on 429 (rate limit) or 503 (overloaded)
        if (upstream.status === 429 || upstream.status === 503) {
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

    // Increment usage if successful
    let updatedUsageCookie: string | null = null;
    if (isGeneratingArticle) {
      const authCodeValue = req.cookies.get('auth_code')?.value;
      const codeUsageCookie = req.cookies.get('code_usage')?.value;
      if (authCodeValue && STATIC_AUTH_CODES.includes(authCodeValue)) {
        updatedUsageCookie = String(incrementUsage(codeUsageCookie));
      }
    }

    if (stream && upstream.body) {
      const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      };
      if (updatedUsageCookie) {
        headers['Set-Cookie'] = `code_usage=${updatedUsageCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
      }
      return new Response(upstream.body, { headers });
    }

    const data = await upstream.json();
    const response = Response.json(data);
    if (updatedUsageCookie && response instanceof Response) {
      response.headers.append('Set-Cookie', `code_usage=${updatedUsageCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: { message } }, { status: 500 });
  }
}
