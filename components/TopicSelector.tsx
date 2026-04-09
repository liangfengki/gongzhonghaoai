'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateText } from '@/services/ai';
import { useSettings } from '@/lib/settings';
import { useArticleStore } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { Loader2, Sparkles, ArrowRight, RotateCcw, Flame, TrendingUp, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TopicSelector() {
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingSource, setTrendingSource] = useState('weibo');
  const [webSearchResults, setWebSearchResults] = useState<string[]>([]);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const { settings } = useSettings();
  const { addArticle } = useArticleStore();
  const router = useRouter();
  const { showToast } = useToast();

  const loadTrendingTopics = useCallback(async (source = trendingSource) => {
    setTrendingLoading(true);
    try {
      const response = await fetch(`/api/trending?source=${source}&limit=8`);
      const data = await response.json();
      if (data.success) {
        setTrendingTopics(data.topics);
      }
    } catch (error) {
      console.error('Failed to load trending topics:', error);
    } finally {
      setTimeout(() => setTrendingLoading(false), 300);
    }
  }, [trendingSource]);

  const handleSourceChange = (source: string) => () => {
    setTrendingSource(source);
    loadTrendingTopics(source);
  };

  useEffect(() => {
    loadTrendingTopics();
  }, [loadTrendingTopics]);

  const performWebSearch = async (query: string) => {
    if (!query) return;
    setWebSearchLoading(true);
    setWebSearchResults([]);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10, settings }),
      });
      const data = await response.json();
      if (data.success) {
        setWebSearchResults(data.topics);
      }
    } catch {
      showToast('搜索失败，请重试', 'error');
    } finally {
      setWebSearchLoading(false);
    }
  };

  const handleWebSearch = async () => {
    await performWebSearch(webSearchQuery);
  };

  const handleWebSearchResult = (topic: string) => {
    setKeyword(topic);
    generateTopics(topic);
  };

  const generateTopics = async (targetKeyword: string) => {
    if (!targetKeyword) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const prompt = `
        请根据关键词 "${targetKeyword}"，为微信公众号生成 5 个具有爆款潜力的选题标题。
        要求：
        1. 标题吸引人，具有点击欲望。
        2. 覆盖不同角度（如：干货教程、行业洞察、情感共鸣）。
        3. 只返回标题列表，每行一个，不要带序号。
      `;
      const result = await generateText([{ role: 'user', content: prompt }], settings);
      const topics = result
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^\d+\.\s*/, ''));
      setSuggestions(topics);
    } catch {
      showToast('生成选题失败，请检查 API 设置', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTopics = async () => {
    await generateTopics(keyword);
  };

  const handleSelectTopic = (topic: string) => {
    addArticle(topic);
    router.push('/editor');
  };

  const SectionHeader = ({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    subtitle,
  }: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
  }) => (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <p className="text-[11px] text-gray-400">{subtitle}</p>
      </div>
    </div>
  );

  const SourcePills = ({
    sources,
    active,
    onChange,
    activeColor,
  }: {
    sources: { key: string; label: string }[];
    active: string;
    onChange: (key: string) => () => void;
    activeColor: string;
  }) => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {sources.map((source) => (
        <button
          key={source.key}
          onClick={onChange(source.key)}
          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
            active === source.key
              ? `bg-white ${activeColor} shadow-sm`
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {source.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Trending Topics */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon={Flame}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            title="今日热门话题"
            subtitle="点击话题直接进入编辑器"
          />
          <div className="flex items-center gap-2">
            <SourcePills
              sources={[
                { key: 'weibo', label: '微博' },
                { key: 'baidu', label: '百度' },
                { key: 'douyin', label: '抖音' },
                { key: 'bilibili', label: 'B站' },
                { key: 'toutiao', label: '头条' },
              ]}
              active={trendingSource}
              onChange={handleSourceChange}
              activeColor="text-orange-600"
            />
            <button
              onClick={() => loadTrendingTopics()}
              disabled={trendingLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw
                size={14}
                className={trendingLoading ? 'animate-spin text-orange-500' : ''}
              />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className={`grid grid-cols-2 gap-2 transition-opacity duration-300 ${
              trendingLoading ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {trendingTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => {
                  // 直接使用热门话题作为选题，跳转编辑器
                  addArticle(topic);
                  router.push('/editor');
                }}
                className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/50 cursor-pointer transition-all text-left group"
              >
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-700 line-clamp-2 group-hover:text-orange-700">
                    {topic}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {trendingLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center animate-fade-in">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500">刷新中...</span>
              </div>
            </div>
          )}

          {trendingTopics.length === 0 && !trendingLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              暂无热门话题
            </div>
          )}
        </div>
      </div>

      {/* Web Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[var(--shadow-xs)]">
        <SectionHeader
          icon={Search}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          title="搜索选题"
          subtitle="输入关键词，AI 为你推荐相关话题"
        />

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={webSearchQuery}
            onChange={(e) => setWebSearchQuery(e.target.value)}
            placeholder="搜索网络热点话题..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
          />
          <button
            onClick={handleWebSearch}
            disabled={webSearchLoading || !webSearchQuery}
            className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {webSearchLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}
            {webSearchLoading ? '搜索中...' : '搜索'}
          </button>
        </div>

        {webSearchResults.length > 0 && (
          <div className="space-y-1.5 mt-4">
            <p className="text-xs font-medium text-gray-400 tracking-wide mb-2">搜索结果</p>
            {webSearchResults.map((topic, index) => (
              <div
                key={index}
                onClick={() => handleWebSearchResult(topic)}
                className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/50 cursor-pointer transition-all group flex justify-between items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-700 truncate group-hover:text-purple-700">
                    {topic}
                  </span>
                </div>
                <ArrowRight
                  className="text-gray-300 group-hover:text-purple-500 flex-shrink-0 transition-all group-hover:translate-x-0.5"
                  size={14}
                />
              </div>
            ))}
          </div>
        )}

        {webSearchLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Custom Topic Generation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[var(--shadow-xs)]">
        <SectionHeader
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title="自定义选题"
          subtitle="输入关键词生成专属选题"
        />

        <div className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词，如 AI工具、职场成长..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white outline-none transition-all placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateTopics()}
          />
          <button
            onClick={handleGenerateTopics}
            disabled={loading || !keyword}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {loading ? '生成中...' : '生成选题'}
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[var(--shadow-xs)] animate-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400 tracking-wide">AI 推荐选题</p>
            <button
              onClick={handleGenerateTopics}
              disabled={loading}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} />
              换一批
            </button>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((topic, index) => (
              <div
                key={index}
                onClick={() => handleSelectTopic(topic)}
                className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all group flex justify-between items-center animate-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">{topic}</span>
                </div>
                <ArrowRight
                  className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-all group-hover:translate-x-0.5"
                  size={16}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}