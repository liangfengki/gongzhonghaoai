import { NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function POST(req: Request) {
  try {
    const { topic, settings } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Search for real information
    const searchResults = await searchWeb(topic);

    if (searchResults.length === 0) {
      return NextResponse.json({
        success: true,
        topic,
        research: '',
        sources: [],
      });
    }

    // Compile search results into a research brief directly (no AI summarization needed)
    const researchLines: string[] = [];
    for (const r of searchResults) {
      if (r.snippet) {
        researchLines.push(`【${r.title}】\n${r.snippet}`);
      }
    }

    const research = researchLines.join('\n\n');

    return NextResponse.json({
      success: true,
      topic,
      research,
      sources: searchResults.map((r) => r.title),
    });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json({ error: 'Research failed' }, { status: 500 });
  }
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const searchPromises = [
    searchDuckDuckGo(query),
    searchSogou(query),
    searchBing(query),
  ];

  const settled = await Promise.allSettled(searchPromises);
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      results.push(...result.value);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.title.slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return [];

    const html = await response.text();
    const results: SearchResult[] = [];

    const resultRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([^<]*)<\/td>/gi;

    let match;
    const urls: string[] = [];
    const titles: string[] = [];
    const snippets: string[] = [];

    while ((match = resultRegex.exec(html)) !== null) {
      urls.push(match[1]);
      titles.push(match[2].trim());
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].trim());
    }

    for (let i = 0; i < Math.min(titles.length, 5); i++) {
      if (titles[i] && titles[i].length > 5) {
        results.push({
          title: titles[i],
          snippet: snippets[i] || '',
          url: urls[i] || '',
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

async function searchSogou(query: string): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://www.sogou.com/web?query=${encodedQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return [];

    const html = await response.text();
    const results: SearchResult[] = [];

    const titleRegex = /<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/gi;
    const snippetRegex = /<p[^>]*class="space-summary"[^>]*>([\s\S]*?)<\/p>/gi;

    let match;
    const titles: string[] = [];
    const snippets: string[] = [];

    while ((match = titleRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title.length > 5) titles.push(title);
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    for (let i = 0; i < Math.min(titles.length, 5); i++) {
      results.push({
        title: titles[i],
        snippet: snippets[i] || '',
        url: '',
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function searchBing(query: string): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://www.bing.com/search?q=${encodedQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return [];

    const html = await response.text();
    const results: SearchResult[] = [];

    // Parse Bing results
    const titleRegex = /<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/gi;
    const snippetRegex = /<p[^>]*class="b_lineclamp[\s\S]*?">([\s\S]*?)<\/p>/gi;

    let match;
    const titles: string[] = [];
    const snippets: string[] = [];

    while ((match = titleRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title.length > 5) titles.push(title);
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    for (let i = 0; i < Math.min(titles.length, 5); i++) {
      results.push({
        title: titles[i],
        snippet: snippets[i] || '',
        url: '',
      });
    }

    return results;
  } catch {
    return [];
  }
}
