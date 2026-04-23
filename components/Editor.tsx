'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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
  Palette, ChevronDown, Eye, Edit3,
  Wand2, Image as ImageIcon, RotateCcw, LayoutTemplate,
  Coins, History, ArrowLeft
} from 'lucide-react';
import NextLink from 'next/link';
import TiptapEditor from './TiptapEditor';
import type { ArticleTemplate } from '@/lib/templates';



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
  if (images.length === 0) return text;

  let restored = text;

  // First try to find and replace [IMG_X] markers (any number, not just original)
  for (const img of images) {
    // Try original id first
    if (restored.includes(img.id)) {
      restored = restored.split(img.id).join(img.original);
      continue;
    }
    // Try any [IMG_N] pattern and replace with first match
    const imgMatch = restored.match(/\[IMG_\d+\]/);
    if (imgMatch) {
      restored = restored.split(imgMatch[0]).join(img.original);
    }
  }

  // Check which images are still missing
  const restoredCheck = restored;
  const missingImages = images.filter(img => !restoredCheck.includes(img.original));

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
  // WeChat preview
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
  // Credits
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  // Templates
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  // Paragraph regeneration
  const [regeneratingParagraph, setRegeneratingParagraph] = useState<number | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');

  // Version history
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<Array<{id: string; version: number; note: string; createdAt: string}>>([]);
  // Auto-save debounce
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


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

  // Auto-save to server
  const autoSaveToServer = useCallback((articleId: string) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      useArticleStore.getState().syncToServer(articleId).catch(console.error);
    }, 2000);
  }, []);

  // Inline paragraph rewrite (called from TiptapEditor)
  const handleInlineRewrite = useCallback(async (paragraphIndex: number, instruction: string) => {
    if (!article?.content || regeneratingParagraph !== null) return;
    setRegeneratingParagraph(paragraphIndex);
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleContent: article.content,
          paragraphIndex,
          instruction,
          settings,
          tone,
          stream: true,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '重新生成失败');
      }
      const newCredits = response.headers.get('X-Remaining-Credits');
      if (newCredits) setRemainingCredits(parseInt(newCredits));
      let newParagraph = '';
      for await (const chunk of parseSSEStream(response)) {
        newParagraph += chunk;
      }
      if (newParagraph.trim()) {
        const paragraphs = article.content.split(/\n{2,}/);
        paragraphs[paragraphIndex] = newParagraph.trim();
        const newContent = paragraphs.join('\n\n');
        updateArticle(article.id, { content: newContent });
        autoSaveToServer(article.id);
        showToast('段落已重新生成', 'success');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误';
      showToast(`重新生成失败: ${message}`, 'error');
    } finally {
      setRegeneratingParagraph(null);
      setRegenInstruction('');
    }
  }, [article, regeneratingParagraph, settings, tone, updateArticle, autoSaveToServer, showToast]);

  // Fetch user credits
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user?.credits !== undefined) setRemainingCredits(data.user.credits);
    }).catch(() => {});
  }, []);

  // Load templates
  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      if (data.templates) setTemplates(data.templates);
    }).catch(() => {});
  }, []);

  // Load versions
  const loadVersions = useCallback(async () => {
    if (!article?._serverId) return;
    try {
      const res = await fetch(`/api/articles/${article._serverId}/versions`);
      const data = await res.json();
      if (data.versions) setVersions(data.versions);
    } catch {}
  }, [article?._serverId]);

  // Restore version
  const handleRestoreVersion = async (versionId: string) => {
    if (!article?._serverId) return;
    try {
      const res = await fetch(`/api/articles/${article._serverId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.article) {
        updateArticle(article.id, { content: data.article.content });
        showToast('已恢复到历史版本', 'success');
        setShowVersions(false);
      }
    } catch {
      showToast('恢复失败', 'error');
    }
  };

  // Apply template
  const handleApplyTemplate = (template: ArticleTemplate) => {
    if (!article) return;
    updateArticle(article.id, {
      outline: template.outline,
      tone: template.tone as WritingTone,
    });
    setShowTemplatePicker(false);
    showToast(`已应用「${template.name}」模板`, 'success');
  };

  // Regenerate paragraph
  const handleRegenerateParagraph = async (paragraphIndex: number) => {
    if (!article?.content || regeneratingParagraph !== null) return;
    setRegeneratingParagraph(paragraphIndex);

    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleContent: article.content,
          paragraphIndex,
          instruction: regenInstruction,
          settings,
          tone,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '重新生成失败');
      }

      // Update credits from response header
      const newCredits = response.headers.get('X-Remaining-Credits');
      if (newCredits) setRemainingCredits(parseInt(newCredits));

      // Stream the regenerated paragraph
      let newParagraph = '';
      for await (const chunk of parseSSEStream(response)) {
        newParagraph += chunk;
      }

      if (newParagraph.trim()) {
        // Replace the paragraph in the article
        const paragraphs = article.content.split(/\n{2,}/);
        paragraphs[paragraphIndex] = newParagraph.trim();
        const newContent = paragraphs.join('\n\n');
        updateArticle(article.id, { content: newContent });
        autoSaveToServer(article.id);
        showToast('段落已重新生成', 'success');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误';
      showToast(`重新生成失败: ${message}`, 'error');
    } finally {
      setRegeneratingParagraph(null);
      setRegenInstruction('');
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

      // Single streaming call with deai rules integrated
      const prompt = `你是一位公众号写手，擅长写出像真人一样的爆款文章。请根据以下真实资料，围绕"${article.topic}"撰写一篇有深度的文章。

真实资料：
---
${research || '无'}
---

文章大纲：
${outline.map((o, i) => `${i + 1}. ${o}`).join('\n')}

写作要求：
1. 内容必须基于上面的真实资料，引用具体事实、数据、观点
2. 不要编造内容，不要写空泛的套话
3. 每个段落至少 200 字，要有具体的案例或数据
4. 总字数 1500-2500 字
5. 使用 Markdown 格式，带标题层级
6. 在合适位置插入 2-3 个图片占位符：![IMAGE_PROMPT: 描述](placeholder)
7. 写作风格：${TONE_PROMPTS[tone]}

【去AI味硬规则】
8. 严禁使用：首先、其次、最后、想象一下、综上所述、值得注意的是、需要指出的是、显而易见、毋庸置疑、由此可见、与此同时、在此基础上、从长远来看、总体而言、换言之、简而言之、不可否认、总而言之
9. 严禁使用AI黑话，用口语替代：赋能→帮到、底层逻辑→根本原因、颗粒度→细节、闭环→兜底、抓手→切入点、深耕→一直做、赛道→领域、痛点→头疼的事、维度→角度、协同→配合、沉淀→积累、链路→流程、触达→到达、心智→想法、打法→做法、组合拳→一套办法、差异化→不一样、助力→帮着、旨在→就是想、聚焦→盯着、显著→实打实、生态→圈子、矩阵→一套组合、势能→势头、体系化→系统、复用→重复用
10. 长句拆分：超过20字的句子拆成短句，用逗号或破折号衔接
11. 所有句子必须有主语，表达简单直接
12. 适当使用"因为、所以、不过、但是、说白了、其实吧"等简单连接词
13. 每隔200-300字插入一句人类思考/吐槽，如"说实话我一开始也没想到""实操下来发现""这里其实有点反直觉"
14. 标题禁止"XX指南""XX分析""XX解读"这种官方风格
15. 每段感叹号最多1个
16. 语言自然口语化，像朋友聊天`;

      showToast('正在生成文章...', 'info');
      const response = await generateTextStream([{ role: 'user', content: prompt }], settings, 20);

      let accumulated = '';
      for await (const chunk of parseSSEStream(response)) {
        accumulated += chunk;
        let cleaned = cleanAIOutput(accumulated);
        if (cleaned.trim()) {
          updateArticle(article.id, { content: cleaned });
        }
      }

      let finalContent = cleanAIOutput(accumulated);
      if (finalContent) {
        updateArticle(article.id, { content: finalContent });
        autoSaveToServer(article.id);
        // Refresh credits
        fetch('/api/auth/me').then(r => r.json()).then(data => {
          if (data.user?.credits !== undefined) setRemainingCredits(data.user.credits);
        }).catch(() => {});
      }
      showToast('正文生成完成', 'success');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误';
      showToast(`生成正文失败: ${message}`, 'error');
    } finally {
      setLoading(false);
      setStreaming(false);
      actionLockRef.current.fullText = false;
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
      {/* Top Bar — 简化版 */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="flex items-center gap-3">
          <NextLink href="/" className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[13px] text-gray-500 hover:bg-gray-100 transition-all">
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">选题</span>
          </NextLink>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="relative">
            <button onClick={() => setShowToneMenu(!showToneMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-all">
              {(() => { const T = TONE_OPTIONS.find(t => t.key === tone); return T ? <T.icon size={14} className="text-gray-500" /> : null; })()}
              <span className="hidden sm:inline">{TONE_OPTIONS.find(t => t.key === tone)?.label}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {showToneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneMenu(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-1.5 z-50 animate-scale-in">
                  {TONE_OPTIONS.map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} onClick={() => { updateArticle(article.id, { tone: key }); setShowToneMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${tone === key ? 'bg-blue-50/50' : ''}`}>
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-all">
              <Palette size={14} className="text-gray-500" />
              <span className="hidden sm:inline">{THEME_LABELS[theme].name}</span>
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
        <div className="flex items-center gap-2">
          {remainingCredits !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg text-[13px] font-medium text-amber-700">
              <Coins size={14} />
              <span>{remainingCredits.toLocaleString()}</span>
            </div>
          )}
          {article.content && (
            <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5">
              <button onClick={() => setEditMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${editMode === 'edit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Edit3 size={12} /> 编辑
              </button>
              <button onClick={() => setEditMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${editMode === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Eye size={12} /> 预览
              </button>
            </div>
          )}
          {article.outline.length === 0 && !article.content && (
            <button onClick={() => setShowTemplatePicker(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-purple-600 rounded-lg text-[13px] font-medium hover:bg-purple-50 transition-all">
              <LayoutTemplate size={14} />
              <span className="hidden sm:inline">模板</span>
            </button>
          )}
          {article._serverId && article.content && (
            <button onClick={() => { setShowVersions(true); loadVersions(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 rounded-lg text-[13px] font-medium hover:bg-gray-100 transition-all">
              <History size={14} />
            </button>
          )}
          {article.outline.length === 0 && (article.content || forceEdit) && (
            <button onClick={handleGenerateOutline} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-600 rounded-lg text-[13px] font-medium hover:bg-blue-100 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {loading ? '生成中...' : '生成大纲'}
            </button>
          )}
          {article.outline.length > 0 && !article.content && (
            <button onClick={handleGenerateFullText} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              {loading ? '撰写中...' : '撰写正文'}
            </button>
          )}
          {article.content && (
            <>
              <button onClick={handleWeChatPreview}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-600 rounded-lg text-[13px] font-medium hover:bg-gray-100 transition-all">
                <Eye size={14} />
              </button>
              <button onClick={handleCopyToWeChat}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all shadow-sm ${
                  copied ? 'bg-green-600 text-white' : 'bg-[#07c160] text-white hover:bg-[#06ad56]'
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
              onRewrite={handleInlineRewrite}
              rewritingIndex={regeneratingParagraph}
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



      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowTemplatePicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[560px] w-full max-h-[80vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">选择文章模板</h3>
              <p className="text-sm text-gray-500 mt-1">选择一个模板快速开始，AI 会根据模板结构生成文章</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template)}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-purple-700">{template.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-md">{template.category}</span>
                    </div>
                    <p className="text-[12px] text-gray-500 leading-relaxed">{template.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.outline.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white text-gray-400 rounded border border-gray-100">{item.slice(0, 8)}...</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowTemplatePicker(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowVersions(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full max-h-[70vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">历史版本</h3>
              <p className="text-sm text-gray-500 mt-1">每次保存内容变更时自动创建版本</p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <History size={32} className="mb-2 text-gray-300" />
                  <p className="text-sm">暂无历史版本</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all">
                      <div>
                        <p className="text-sm font-medium text-gray-700">版本 {v.version}</p>
                        <p className="text-[11px] text-gray-400">{v.note} · {new Date(v.createdAt).toLocaleString('zh-CN')}</p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(v.id)}
                        className="px-3 py-1.5 text-[12px] text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        恢复
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowVersions(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">关闭</button>
            </div>
          </div>
        </div>
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
                onClick={proceedWithImageGeneration}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-[15px] font-medium hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ImageIcon size={16} />
                生成图片
              </button>
              <button
                onClick={cancelImageGeneration}
                className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[15px] font-medium hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
