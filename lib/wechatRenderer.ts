import juice from 'juice';
import { marked } from 'marked';

export type WeChatTheme = 'minimalist' | 'tech' | 'literature';

const THEME_STYLES: Record<WeChatTheme, string> = {
  minimalist: `
    #wechat-content { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif; }
    h1 { font-size: 22px; font-weight: 700; margin: 28px 0 14px; color: #1a1a1a; letter-spacing: 1px; }
    h2 { font-size: 18px; font-weight: 600; margin: 22px 0 10px; color: #1a1a1a; border-left: 3px solid #1a1a1a; padding-left: 12px; }
    h3 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; color: #333; }
    p { font-size: 15px; line-height: 2; margin-bottom: 16px; color: #555; text-align: justify; }
    ul, ol { padding-left: 20px; margin-bottom: 16px; }
    li { font-size: 15px; line-height: 2; color: #555; margin-bottom: 6px; }
    blockquote { margin: 16px 0; padding: 14px 18px; background-color: #f9f9f9; border-left: 3px solid #ddd; color: #888; font-size: 14px; line-height: 1.8; }
    strong { color: #1a1a1a; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 4px; margin: 18px 0; display: block; }
    hr { border: none; border-top: 1px solid #eee; margin: 28px 0; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #555; }
  `,

  tech: `
    #wechat-content { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif; }
    h1 { font-size: 24px; font-weight: bold; margin: 24px 0 12px; padding-bottom: 10px; border-bottom: 2px solid #07c160; color: #1a1a1a; }
    h2 { font-size: 20px; font-weight: bold; margin: 20px 0 10px; padding-left: 10px; border-left: 4px solid #07c160; color: #1a1a1a; }
    h3 { font-size: 17px; font-weight: bold; margin: 16px 0 8px; color: #333; }
    p { font-size: 16px; line-height: 1.8; margin-bottom: 16px; color: #3f3f3f; text-align: justify; }
    ul, ol { padding-left: 20px; margin-bottom: 16px; }
    li { font-size: 16px; line-height: 1.8; color: #3f3f3f; margin-bottom: 8px; }
    blockquote { margin: 16px 0; padding: 16px; background: #f0fdf4; border-left: 4px solid #07c160; color: #4a4a4a; font-size: 15px; line-height: 1.6; }
    strong { color: #07c160; font-weight: bold; }
    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 20px 0; display: block; }
    hr { border: none; border-top: 1px dashed #07c160; margin: 30px 0; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; color: #e83e8c; }
  `,

  literature: `
    #wechat-content { font-family: "Songti SC", "STSong", "SimSun", serif; }
    h1 { font-size: 24px; font-weight: 700; margin: 32px 0 16px; color: #2c3e50; text-align: center; letter-spacing: 3px; }
    h2 { font-size: 19px; font-weight: 600; margin: 26px 0 12px; color: #34495e; text-align: center; letter-spacing: 1px; }
    h3 { font-size: 17px; font-weight: 600; margin: 20px 0 10px; color: #555; }
    p { font-size: 16px; line-height: 2.2; margin-bottom: 18px; color: #444; text-align: justify; text-indent: 2em; }
    ul, ol { padding-left: 20px; margin-bottom: 16px; }
    li { font-size: 16px; line-height: 2; color: #444; margin-bottom: 8px; }
    blockquote { margin: 20px 0; padding: 16px 20px; border-left: none; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; color: #777; font-style: italic; text-align: center; background: #fefefe; font-size: 15px; line-height: 1.8; }
    strong { color: #c0392b; font-weight: bold; }
    img { max-width: 100%; height: auto; border-radius: 0; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: block; }
    hr { border: none; height: 1px; background: linear-gradient(to right, transparent, #ccc, transparent); margin: 32px 0; }
    code { background: #fdf6ec; padding: 2px 6px; border-radius: 2px; font-size: 14px; color: #c0392b; }
  `,
};

export const THEME_LABELS: Record<WeChatTheme, { name: string; description: string }> = {
  minimalist: { name: '简约', description: '黑白灰为主，干净利落' },
  tech: { name: '科技', description: '微信绿强调，现代感' },
  literature: { name: '文艺', description: '居中排版，温暖文艺' },
};

export async function convertToWeChatHtml(
  markdown: string,
  theme: WeChatTheme = 'tech'
): Promise<string> {
  const rawHtml = await marked.parse(markdown);
  const wrappedHtml = `<div id="wechat-content">${rawHtml}</div>`;
  const css = THEME_STYLES[theme];
  const inlinedHtml = juice.inlineContent(wrappedHtml, css);
  return inlinedHtml;
}
