'use client';

import { useState, useRef, useMemo, useCallback, Suspense, useEffect, lazy } from 'react';
import { useArticleStore, type WritingTone } from '@/lib/store';
import { useSettings } from '@/lib/settings';
import { generateText, generateImage, generateTextStream, parseSSEStream } from '@/services/ai';
import { convertToWeChatHtml, type WeChatTheme, THEME_LABELS } from '@/lib/wechatRenderer';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { deaiPostProcess } from '@/lib/prompts';
import { useToast } from '@/components/Toast';
import {
  Loader2, FileText, Send, Copy, Check, Sparkles,
  Briefcase, Coffee, BookOpen,
  Palette, Smartphone, ChevronDown, Eye, Edit3,
  Wand2, Plus, Type, Image as ImageIcon
} from 'lucide-react';
import NextLink from 'next/link';
import TiptapEditor from './TiptapEditor';

const ArticleOptimizer = lazy(() => import('@/components/ArticleOptimizer'));

const TONE_OPTIONS = [
  { key: 'professional', label: '专业严谨', icon: Briefcase, desc: '用词准确客观，适合行业分析、干货分享' },
  { key: 'casual', label: '轻松幽默', icon: Coffee, desc: '语气像和朋友聊天，多用流行梗，适合日常分享' },
  { key: 'storytelling', label: '故事叙述', icon: BookOpen, desc: '注重情感共鸣和场景描写，适合个人经历、情感故事' },
] as const;

const TONE_PROMPTS: Record<WritingTone, string> = {
  professional: '语气专业严谨，使用数据和事实支撑观点，逻辑清晰，适合行业分析和深度报告。',
  casual: '语气亲切自然，使用口语化表达，可适当使用 emoji，适合生活方式和轻松话题。',
  storytelling: '以故事驱动，善用比喻和场景描写，注重情感共鸣，开头引人入胜，结尾余味悠长。',
};

const THEME_OPTIONS: WeChatTheme[] = ['minimalist', 'tech', 'literature'];

// Block types for the visual editor
interface ContentBlock {
  id: string;
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image-placeholder' | 'image' | 'quote' | 'divider';
  content: string;
  imagePrompt?: string;
  imageUrl?: string;
}

// ... (skipping block parsing logic since it's removed)
// Clean AI output that might be wrapped in markdown code blocks or inline code
function cleanAIOutput(text: string): string {
  let cleaned = text;
  if (cleaned.startsWith('```markdown\n')) {
    cleaned = cleaned.slice(12);
  } else if (cleaned.startsWith('```\n')) {
    cleaned = cleaned.slice(4);
  }
  if (cleaned.endsWith('\n```')) {
    cleaned = cleaned.slice(0, -4);
  } else if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  // Remove inline backticks around image placeholders
  cleaned = cleaned.replace(/`!\[IMAGE_PROMPT:([^\]]+)\](?:\([^)]*\))?`/g, '![IMAGE_PROMPT:$1](placeholder)');
  // Fix AI omitting the (placeholder) part completely: ![IMAGE_PROMPT: ...]
  // We need to match ![IMAGE_PROMPT: ...] where it is NOT followed by (
  cleaned = cleaned.replace(/!\[IMAGE_PROMPT:([^\]]+)\](?!\()/g, '![IMAGE_PROMPT:$1](placeholder)');
  return cleaned;
}

export interface ExtractedImage {
  id: string;
  original: string;
  paragraphIndex: number;
}

export function extractImages(content: string): { text: string; images: ExtractedImage[] } {
  const images: ExtractedImage[] = [];
  const paragraphs = content.split(/\n{2,}/);
  const rebuiltParagraphs = paragraphs.map((para, pIdx) => {
    return para.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
      const id = `[IMG_${images.length}]`;
      images.push({ id, original: match, paragraphIndex: pIdx });
      return id;
    });
  });
  const text = rebuiltParagraphs.join('\n\n');
  return { text, images };
}

export function restoreImages(text: string, images: ExtractedImage[]): string {
  let restored = text;
  const missingImages: ExtractedImage[] = [];

  images.forEach(img => {
    const innerId = img.id.slice(1, -1);

    restored = restored.split(`\\[${innerId}\\]`).join(img.id);
    restored = restored.split(`\`${img.id}\``).join(img.id);
    restored = restored.split(`**${img.id}**`).join(img.id);

    if (restored.includes(img.id)) {
      restored = restored.split(img.id).join(img.original);
    } else {
      missingImages.push(img);
    }
  });

  if (missingImages.length > 0) {
    const paragraphs = restored.split(/\n{2,}/);
    const totalParagraphs = paragraphs.length;

    for (const img of missingImages) {
      const targetIdx = Math.min(img.paragraphIndex, totalParagraphs - 1);
      paragraphs[targetIdx] += '\n\n' + img.original;
    }
    restored = paragraphs.join('\n\n');
  }

  return restored;
}

export default function Editor() {
  const { currentArticleId, articles, updateArticle } = useArticleStore();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [researchData, setResearchData] = useState<string>('');
  const [researching, setResearching] = useState(false);
  const [forceEdit, setForceEdit] = useState(false);
  const [showImageWarning, setShowImageWarning] = useState(false);
  const [pendingImagePrompt, setPendingImagePrompt] = useState<string | null>(null);
  const imageGenCallbackRef = useRef<{ resolve: (url: string) => void; reject: (err: Error) => void } | null>(null);
  const actionLockRef = useRef({
    outline: false,
    fullText: false,
    optimize: false,
  });
  const researchPromiseRef = useRef<Promise<string> | null>(null);

  const article = articles.find((a) => a.id === currentArticleId);
  const tone: WritingTone = article?.tone || 'professional';
  const theme: WeChatTheme = article?.theme || 'tech';

  useEffect(() => {
    setForceEdit(false);
  }, [currentArticleId]);

  const handleWeChatPreview = useCallback(async () => {
    if (!article?.content) return;
    const html = await convertToWeChatHtml(article.content, theme);
    setPreviewHtml(html);
    setShowPreview(true);
  }, [article?.content, theme]);

  const contentForCounting = article?.content
    ? article.content
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
        .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '')
    : '';
  const wordCount = (contentForCounting.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g) || []).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 400));

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <FileText size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium">请先选择一个选题</p>
        <NextLink href="/" className="text-sm text-blue-500 hover:text-blue-600 mt-2">前往选择选题 &rarr;</NextLink>
      </div>
    );
  }

  const doResearch = async (topic: string): Promise<string> => {
    if (researchPromiseRef.current) {
      return researchPromiseRef.current;
    }
    const task = (async () => {
      setResearching(true);
      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, settings }),
        });
        const data = await response.json();
        if (data.success && data.research) {
          setResearchData(data.research);
          showToast('已搜索相关资料', 'success');
          return data.research;
        }
        return '';
      } catch {
        showToast('搜索资料失败，将直接生成', 'error');
        return '';
      } finally {
        setResearching(false);
      }
    })();
    researchPromiseRef.current = task;
    try {
      return await task;
    } finally {
      researchPromiseRef.current = null;
    }
  };

  const handleGenerateOutline = async () => {
    if (actionLockRef.current.outline || loading) return;
    actionLockRef.current.outline = true;
    setLoading(true);
    try {
      // Research first
      const research = await doResearch(article.topic);

      const prompt = `你是一位公众号写手。请根据以下搜索到的真实资料，为"${article.topic}"这个话题设计文章大纲。

搜索到的真实资料：
---
${research || '未搜索到相关资料，请根据话题自行构思'}
---

请根据上述资料中的关键信息，设计 4-6 个小标题。

要求：
1. 每个小标题必须对应资料中的某个具体信息或观点
2. 小标题要具体，能概括该段落的核心内容
3. 按照逻辑顺序排列（引入→展开→深入→总结）
4. 只返回小标题，每行一个`;

      const result = await generateText([{ role: 'user', content: prompt }], settings, 5);
      const outline = result
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^\d+[.、]\s*/, '').replace(/^[-*]\s*/, '').replace(/^[一二三四五六七八九十]+[、.]\s*/, '').trim())
        .filter((line) => line.length >= 4);
      updateArticle(article.id, { outline });
      showToast('大纲生成完成', 'success');
    } catch (e: any) {
      console.error('生成大纲错误:', e);
      showToast('生成大纲失败，请检查 API 设置: ' + (e?.message || ''), 'error');
    } finally {
      setLoading(false);
      actionLockRef.current.outline = false;
    }
  };

  const handleGenerateFullText = async () => {
    if (actionLockRef.current.fullText || loading) return;
    actionLockRef.current.fullText = true;
    setLoading(true);
    setStreaming(true);
    try {
      // Research first
      let research = researchData;
      if (!research) {
        research = await doResearch(article.topic);
      }

      const outline = article.outline;

      // Single call with strong research emphasis
      const prompt = `你是AI内容仿写与去痕专家，擅长写出像真人一样的爆款公众号文章。请根据以下真实资料，围绕"${article.topic}"撰写一篇有深度的文章。

真实资料（这是从网上搜索到的真实信息，必须基于这些内容写作）：
---
${research || '无'}
---

文章大纲：
${outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

写作规则：
1. 【最重要】文章内容必须基于上面的真实资料，引用资料中的具体事实、数据、观点
2. 不要编造内容，不要写空泛的套话
3. 对资料中的每个关键点进行展开解读
4. 每个段落至少 200 字，要有具体的案例或数据
5. 总字数 1500-2500 字
6. 使用 Markdown 格式，带标题层级
7. 在合适位置插入 2-3 个图片占位符：![IMAGE_PROMPT: 描述](placeholder)
8. 写作风格：${TONE_PROMPTS[tone]}

【去痕硬规则——违反任何一条即失败】
9. 严禁使用AI高频词：首先、其次、最后、想象一下、综上所述、值得注意的是、需要指出的是、显而易见、毋庸置疑、由此可见、与此同时、在此基础上、从长远来看、总体而言、换言之、简而言之、不可否认、总而言之
10. 严禁使用AI黑话（必须替换成括号里的口语）：赋能（→帮到）、底层逻辑（→根本原因）、颗粒度（→细节）、闭环（→兜底）、抓手（→切入点）、深耕（→一直做）、赛道（→领域）、痛点（→头疼的事）、维度（→角度）、协同（→配合）、对齐（→对上）、沉淀（→积累）、链路（→流程）、触达（→到达）、心智（→想法）、打法（→做法）、组合拳（→一套办法）、差异化（→不一样）、助力（→帮着）、旨在（→就是想）、聚焦（→盯着）、显著（→实打实）、生态（→圈子）、矩阵（→一套组合）、势能（→势头）、体系化（→系统）、复用（→重复用）、新常态（→现在的常态）、结构性（→根本上的）、战略性（→关键的）
11. 长句拆分：把超过20字的长句拆成2-3个短句，用逗号、分号或破折号衔接，制造呼吸感
12. 所有句子必须有主语，表达简单直接
13. 适当使用"因为、所以、不过、但是、说白了、其实吧"等简单连接词
14. 每隔200-300字插入一句人类思考/吐槽："说实话我一开始也没想到""实操下来发现""这里其实有点反直觉""你可能会觉得奇怪""我之前也踩过这个坑"
15. 标题仿写：关键词替换+句式改变（陈述改疑问/感叹），禁止"XX指南""XX分析""XX解读"这种官方标题
16. 段落改写：重新组织结构，用自己的话重述，加入新信息或论据
17. 结论重写：加入行动号召或情感升华
18. 每段感叹号最多1个，多余的换成句号或问号
19. 专业术语保留但不用生僻字，语言自然口语化`;

      showToast('正在生成文章...', 'info');
      const rawContent = await generateText([{ role: 'user', content: prompt }], settings, 20);
      let cleanResult = cleanAIOutput(rawContent);

      // 自动生成后自动用版本二（三段整句版）改写
      if (cleanResult) {
        showToast('正在改写文章...', 'info');
        // 先提取图片占位符，改写后再恢复
        const { text: textWithoutImages, images: extractedImages } = extractImages(cleanResult);
        const rewritePrompt = `请对提供的文案深度改写，严格执行以下规则，违者重罚：

1. 100%保留原文核心观点、情绪、细节、逻辑，不改动原意、不增删内容、不调整顺序，改写后更戳人、氛围感拉满，纯真人质感、零AI痕迹。
2. 全文整合为三大完整段落（开篇点题+中间拆解+结尾升华），不拆分长句、不打散段落、不新增分段，仅适度润色流畅度，字数浮动10%-15%。
3. 彻底删除AI通用套话、模板化抒情词，拒绝对称句式、完美排比，保留自然真人语气，不强行逻辑闭环。
4. 禁用：所以、因此、于是、其实等AI连接词；十分、非常、极其等极致修饰词。
5. 严格保留三段结构，仅输出改写后的正文。
6. 【必须保留】文中的所有 [IMG_X] 标记必须原封不动保留在原来的位置，绝对不能删除、修改或移动。

版本二：三段整句版（复刻软件风格/规整长文通用）

原文：
${textWithoutImages}`;

        try {
          const rewritten = await generateText([{ role: 'user', content: rewritePrompt }], settings, 10);
          let finalResult = cleanAIOutput(rewritten);
          if (finalResult && finalResult.trim().length > 50) {
            cleanResult = restoreImages(finalResult, extractedImages);
          } else {
            cleanResult = restoreImages(cleanResult, extractedImages);
          }
        } catch {
          console.warn('改写失败，使用原始生成结果');
          cleanResult = restoreImages(cleanResult, extractedImages);
        }
      }

      if (cleanResult) {
        updateArticle(article.id, { content: cleanResult });
      }
      showToast('正文生成完成', 'success');
    } catch {
      showToast('生成正文失败，请检查 API 设置', 'error');
    } finally {
      setLoading(false);
      setStreaming(false);
      actionLockRef.current.fullText = false;
    }
  };
  const handleOptimizeArticle = async (instruction: string, count: number, images: ExtractedImage[]) => {
    if (actionLockRef.current.optimize || loading) return;
    actionLockRef.current.optimize = true;
    setLoading(true);
    setStreaming(true);
    try {
      const hasOtherOptimization = instruction.trim().length > 0;
      const totalSteps = hasOtherOptimization ? 1 : 0;
      let stepContent = '';

      if (hasOtherOptimization) {
        const stepNum = totalSteps;
        showToast(`正在应用优化 (${stepNum}/${totalSteps})...`, 'info');

        const response = await generateTextStream(
          [{ role: 'user', content: instruction }],
          settings,
          10
        );

        let accumulated = '';
        for await (const chunk of parseSSEStream(response)) {
          accumulated += chunk;
          if (article) {
            let cleaned = cleanAIOutput(accumulated);
            cleaned = deaiPostProcess(cleaned);
            cleaned = restoreImages(cleaned, images);
            if (cleaned.trim()) {
              updateArticle(article.id, { content: cleaned, isOptimized: true });
            }
          }
        }
        stepContent = cleanAIOutput(accumulated);
      }
      showToast(`已应用优化`, 'success');
    } catch (e: unknown) {
      console.error('Optimize error:', e);
      const message = e instanceof Error ? e.message : '未知错误';
      showToast(`优化失败: ${message}`, 'error');
    } finally {
      setLoading(false);
      setStreaming(false);
      actionLockRef.current.optimize = false;
    }
  };

  const handleGenerateImageRequest = (prompt: string) => {
    return new Promise<string>((resolve, reject) => {
      if (!article?.isOptimized && article?.content) {
        setPendingImagePrompt(prompt);
        setShowImageWarning(true);
        imageGenCallbackRef.current = { resolve, reject };
      } else {
        generateImage(prompt, settings)
          .then(url => {
            showToast('图片生成完成', 'success');
            resolve(url);
          })
          .catch(e => {
            const message = e instanceof Error ? e.message : '未知错误';
            showToast(`生成图片失败: ${message}`, 'error');
            reject(e);
          });
      }
    });
  };

  const proceedWithImageGeneration = async () => {
    setShowImageWarning(false);
    if (!pendingImagePrompt) return;

    try {
      const url = await generateImage(pendingImagePrompt, settings);
      showToast('图片生成完成', 'success');
      imageGenCallbackRef.current?.resolve(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误';
      showToast(`生成图片失败: ${message}`, 'error');
      imageGenCallbackRef.current?.reject(e instanceof Error ? e : new Error(message));
    } finally {
      setPendingImagePrompt(null);
      imageGenCallbackRef.current = null;
    }
  };

  const cancelImageGeneration = () => {
    setShowImageWarning(false);
    setPendingImagePrompt(null);
    imageGenCallbackRef.current?.reject(new Error('用户取消了图片生成'));
    imageGenCallbackRef.current = null;
  };

  const handleCopyToWeChat = async () => {
    if (!article.content) return;
    try {
      const html = await convertToWeChatHtml(article.content, theme);
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([article.content], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ]);
      setCopied(true);
      showToast('已复制，可粘贴到公众号编辑器', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败，请重试', 'error');
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#fafafa]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100/80 rounded-lg p-1">
            <button
              onClick={() => setEditMode('edit')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                editMode === 'edit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <Edit3 size={14} /> 编辑
            </button>
            <button
              onClick={() => setEditMode('preview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                editMode === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <Eye size={14} /> 预览
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          <div className="relative">
            <button
              onClick={() => setShowToneMenu(!showToneMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-all"
            >
              {(() => { const T = TONE_OPTIONS.find(t => t.key === tone); return T ? <T.icon size={14} className="text-gray-500" /> : null; })()}
              <span>{TONE_OPTIONS.find(t => t.key === tone)?.label}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-1.5 z-50 animate-scale-in">
                  {TONE_OPTIONS.map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => { updateArticle(article.id, { tone: key }); setShowToneMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${tone === key ? 'bg-blue-50/50' : ''}`}
                    >
                      <Icon size={16} className={tone === key ? 'text-blue-600' : 'text-gray-400'} />
                      <div>
                        <p className={`text-[13px] font-medium ${tone === key ? 'text-blue-600' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-all">
              <Palette size={14} className="text-gray-500" />
              <span>{THEME_LABELS[theme].name}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {showThemeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-1.5 z-50 animate-scale-in">
                  {THEME_OPTIONS.map((t) => (
                    <button key={t} onClick={() => { updateArticle(article.id, { theme: t }); setShowThemeMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${theme === t ? 'bg-blue-50/50' : ''}`}>
                      <div>
                        <p className={`text-[13px] font-medium ${theme === t ? 'text-blue-600' : 'text-gray-700'}`}>{THEME_LABELS[t].name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{THEME_LABELS[t].description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {article.outline.length === 0 && (article.content || forceEdit) && (
            <button onClick={handleGenerateOutline} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[13px] font-medium hover:bg-blue-100 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {loading ? '生成中...' : '生成大纲'}
            </button>
          )}
          {article.outline.length > 0 && !article.content && (
            <button onClick={handleGenerateFullText} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm hover:shadow">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              {loading ? '撰写中...' : '撰写正文'}
            </button>
          )}
          {article.content && (
            <>
              <button onClick={() => setShowOptimizer(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-indigo-600 rounded-lg text-[13px] font-medium hover:bg-indigo-50 transition-all">
                <Wand2 size={14} />
                文章优化
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              <button onClick={handleWeChatPreview}
                className="flex items-center gap-1.5 px-3 py-2 text-gray-600 rounded-lg text-[13px] font-medium hover:bg-gray-100 transition-all">
                <Smartphone size={14} className="text-gray-500" /> 手机预览
              </button>
              <button onClick={handleCopyToWeChat}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all shadow-sm ${
                  copied ? 'bg-green-600 text-white' : 'bg-[#07c160] text-white hover:bg-[#06ad56] hover:shadow'
                }`}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制到公众号'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] w-full mx-auto px-8 py-10">
          {/* Title */}
          <div className="mb-10">
            <input
              type="text"
              value={article.topic}
              onChange={(e) => updateArticle(article.id, { topic: e.target.value })}
              className="w-full text-[32px] font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300 leading-tight tracking-tight"
              placeholder="请输入文章标题"
            />
            <div className="mt-4 flex items-center gap-3 text-[13px] text-gray-400 font-medium">
              <span>{wordCount} 字</span>
              <span className="text-gray-300">·</span>
              <span>预计阅读 {readTime} 分钟</span>
              {streaming && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-blue-500 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> AI 正在生成...
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Outline */}
          {article.outline.length > 0 && !article.content && (
            <div className="mb-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-700">文章大纲</span>
                  {researchData && (
                    <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium">
                      已联网调研
                    </span>
                  )}
                </div>
                <button onClick={handleGenerateFullText} disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  {loading ? '撰写中...' : '开始撰写'}
                </button>
              </div>
              <div className="space-y-3">
                {article.outline.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-[14px] text-gray-700">
                    <span className="w-5 h-5 rounded-md bg-blue-100/80 text-blue-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Editor or Empty State */}
          {article.outline.length === 0 && !article.content && !forceEdit ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-12 min-h-[450px] animate-fade-in mt-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-white">
                <Sparkles className="text-blue-600" size={36} strokeWidth={1.5} />
              </div>
              <h3 className="text-[22px] font-bold text-gray-900 mb-4 tracking-tight">让 AI 辅助构思文章结构</h3>
              <p className="text-gray-500 text-[15px] mb-10 max-w-[460px] text-center leading-relaxed">
                只需输入完整的文章标题，AI 将自动联网检索相关资料，为您生成一份结构清晰的写作大纲；当然，您也可以选择直接手动挥洒创意。
              </p>
              <div className="flex items-center gap-5">
                <button 
                  onClick={handleGenerateOutline} 
                  disabled={loading || !article.topic.trim()}
                  className="flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 text-white rounded-xl text-[15px] font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed group"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="group-hover:animate-pulse" />}
                  {loading ? '正在调研并生成大纲...' : '智能生成大纲'}
                </button>
                <button 
                  onClick={() => setForceEdit(true)}
                  className="flex items-center gap-2.5 px-8 py-3.5 bg-white border-2 border-gray-100 text-gray-700 rounded-xl text-[15px] font-medium hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
                >
                  <Edit3 size={20} className="text-gray-400" />
                  手动写作
                </button>
              </div>
              
              <div className="mt-12 flex items-center justify-center gap-3 text-xs font-medium text-gray-400/80">
                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/50"><FileText size={12} className="text-gray-400" /> 1. 选题</span>
                <span className="text-gray-300">&rarr;</span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/50"><Sparkles size={12} className="text-blue-400" /> 2. 智能大纲与正文</span>
                <span className="text-gray-300">&rarr;</span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/50"><Wand2 size={12} className="text-indigo-400" /> 3. 文章优化</span>
                <span className="text-gray-300">&rarr;</span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/50"><ImageIcon size={12} className="text-green-400" /> 4. 生成配图</span>
                <span className="text-gray-300">&rarr;</span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/50"><Copy size={12} className="text-gray-400" /> 5. 复制到公众号</span>
              </div>
            </div>
          ) : editMode === 'edit' ? (
            <TiptapEditor
              content={article.content || ''}
              isStreaming={streaming}
              onChange={(newContent) => updateArticle(article.id, { content: newContent })}
              onGenerateImage={handleGenerateImageRequest}
            />
          ) : (
            /* Preview mode */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-14" style={{ minHeight: 'calc(100vh - 350px)' }}>
              {article.content ? (
                <div 
                  className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600" 
                  style={{ fontSize: '16px', lineHeight: '2', color: '#374151' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(article.content) as string) }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                  <FileText size={40} className="mb-4 text-gray-200" />
                  <p className="text-[15px] text-gray-400 mb-6">暂无内容</p>
                  <button
                    onClick={() => setEditMode('edit')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-[14px] font-medium hover:bg-gray-50 transition-all shadow-sm"
                  >
                    去编辑
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="h-20" />
        </div>
      </div>

      {/* WeChat Mobile Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowPreview(false)}>
          <div className="animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-[375px] h-[700px] bg-white rounded-[44px] shadow-2xl border-[6px] border-gray-800 overflow-hidden flex flex-col relative">
              <div className="h-12 bg-white flex items-center justify-between px-8 pt-2">
                <span className="text-xs font-semibold text-gray-800">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-gray-600 rounded-sm relative"><div className="absolute inset-0.5 bg-gray-600 rounded-[1px]" style={{width: '70%'}} /></div>
                </div>
              </div>
              <div className="h-11 bg-[#ededed] flex items-center px-4 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-800 flex-1 text-center">公众号文章</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="px-5 pt-5 pb-3">
                  <h1 className="text-lg font-bold text-gray-900 leading-snug">{article.topic}</h1>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <span>牧咔AI</span><span>·</span><span>{new Date().toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                <div className="px-5 pb-8" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
              </div>
            </div>
            <p className="text-center text-white/70 text-sm mt-4">点击任意处关闭</p>
          </div>
        </div>
      )}

      {/* Article Optimizer Panel */}
      {showOptimizer && article.content && (
        <Suspense fallback={null}>
          <ArticleOptimizer
            content={article.content}
            onOptimize={handleOptimizeArticle}
            onClose={() => setShowOptimizer(false)}
          />
        </Suspense>
      )}

      {/* Image Generation Warning Dialog */}
      {showImageWarning && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in" onClick={cancelImageGeneration}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[400px] w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
              <ImageIcon className="text-amber-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">建议先优化文章</h3>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
              由于文章在优化改写后，可能会增加或减少字数，导致原先生成的图片位置变得不协调。建议您先进行「文章优化」，待排版确认无误后再统一生成图片。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  cancelImageGeneration();
                  setShowOptimizer(true);
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[15px] font-medium hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Wand2 size={16} />
                去优化文章
              </button>
              <button
                onClick={proceedWithImageGeneration}
                className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[15px] font-medium hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                直接生成图片
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
