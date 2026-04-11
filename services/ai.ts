import { AISettings } from '@/lib/settings';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Non-streaming text generation
export async function generateText(messages: ChatMessage[], settings: AISettings, creditsCost?: number): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, settings, stream: false, creditsCost: creditsCost || 0 }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined' && errorData.error?.message?.includes('重新登录')) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
    }
    throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Streaming text generation - returns a Response for SSE consumption
export async function generateTextStream(
  messages: ChatMessage[],
  settings: AISettings,
  creditsCost?: number
): Promise<Response> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, settings, stream: true, creditsCost: creditsCost || 0 }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined' && errorData.error?.message?.includes('重新登录')) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
    }
    throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
  }

  return response;
}

// Parse SSE stream and yield content deltas
export async function* parseSSEStream(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}

// Image generation - uses configured API (Yunwu AI / Gemini)
export async function generateImage(prompt: string, settings: AISettings): Promise<string> {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined' && errorData.error?.message?.includes('重新登录')) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
    }
    throw new Error(errorData.error?.message || '图片生成失败');
  }

  const data = await response.json();

  // Extract image URL from response
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    const item = data.data[0];
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  }
  if (data.url) return data.url;
  throw new Error('无法获取生成的图片');
}
