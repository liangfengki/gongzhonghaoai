import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60; // Max timeout for image generation

const IMAGE_COST = 10;

// Extract image from API response
function extractImage(data: Record<string, unknown>): string | null {
  // Standard images/generations response
  const dataArray = data.data as Array<Record<string, unknown>> | undefined;
  if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
    const item = dataArray[0];
    if (item.url) return item.url as string;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  }

  // Chat completion response
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;

  if (message) {
    const images = message.images as Array<Record<string, unknown>> | undefined;
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img.type === 'image_url' && (img.image_url as Record<string, unknown>)?.url) {
          return (img.image_url as Record<string, string>).url;
        }
        if (img.url) return img.url as string;
        if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
      }
    }

    const content = message.content;
    if (typeof content === 'string') {
      const base64InMarkdown = content.match(/!\[[^\]]*\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/);
      if (base64InMarkdown) return base64InMarkdown[1];
      if (content.startsWith('data:image')) return content;
      const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) return base64Match[0];
    }

    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'image_url' && part.image_url?.url) return part.image_url.url;
        if (part.inline_data?.data) {
          return `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
        }
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  try {
    const { settings, prompt } = await req.json();

    // Check credits
    if (user.credits < IMAGE_COST) {
      return NextResponse.json(
        { error: { message: `生成图片需要 ${IMAGE_COST} 积分，当前仅剩 ${user.credits} 积分` } },
        { status: 403 }
      );
    }

    const { imageBaseUrl, imageApiKey, imageModelName, apiKey, baseUrl } = settings;

    let targetApiKey = imageApiKey || apiKey || process.env.IMAGE_API_KEY || 'sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy' || '';

    // Force use built-in image API key if no valid custom key is provided
    if (targetApiKey === 'demo' || !targetApiKey) {
      targetApiKey = process.env.IMAGE_API_KEY || 'sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy' || '';
    }
    const targetBaseUrl = imageBaseUrl || baseUrl || process.env.NEXT_PUBLIC_IMAGE_API_BASE_URL || process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || 'https://yunwu.ai/v1';
    const targetModel = imageModelName || process.env.IMAGE_MODEL_NAME || 'gemini-3.1-flash-image-preview';

    if (!targetApiKey) {
      return NextResponse.json({ error: { message: '请先配置图片生成 API Key' } }, { status: 401 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${targetApiKey}`,
    };

    const chatUrl = targetBaseUrl.replace(/\/$/, '').replace(/\/images\/generations$/, '') + '/chat/completions';
    const body = {
      model: targetModel,
      messages: [{ role: 'user', content: `Generate an image: ${prompt}` }],
      max_tokens: 4096,
    };

    let response: Response;
    try {
      response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });
    } catch (fetchError: unknown) {
      const errMsg = fetchError instanceof Error ? fetchError.message : '未知错误';
      console.error('Fetch failed:', chatUrl, errMsg);
      return NextResponse.json(
        { error: { message: `网络连接失败: ${errMsg}` } },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      try {
        return NextResponse.json(JSON.parse(errorText), { status: response.status });
      } catch {
        return NextResponse.json(
          { error: { message: `API 错误 (${response.status}): ${errorText.slice(0, 200)}` } },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    const imageUrl = extractImage(data);

    if (imageUrl) {
      // Deduct credits and log usage (atomic)
      const result = await prisma.user.updateMany({
        where: { id: user.id, credits: { gte: IMAGE_COST } },
        data: { credits: { decrement: IMAGE_COST } },
      });
      if (result.count > 0) {
        await prisma.usageLog.create({
          data: { userId: user.id, type: 'image', creditsUsed: IMAGE_COST },
        });
        const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
        return NextResponse.json({ data: [{ url: imageUrl }], remainingCredits: updated?.credits ?? 0 });
      }
      return NextResponse.json({ data: [{ url: imageUrl }] });
    }

    return NextResponse.json({ error: { message: 'API 未返回图片数据' } }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '服务器错误';
    console.error('Image API error:', message);
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
