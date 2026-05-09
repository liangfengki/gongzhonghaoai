'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useArticleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe, Trash2, Edit, Copy, TrendingUp, Flame, ArrowRight, Sparkles, Zap, BookOpen, Music } from 'lucide-react';

interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  heat: number;
  summary: string;
}

export default function Home() {
  const router = useRouter();
  const { articles, createArticle, deleteArticle, setCurrentArticle, loadFromServer } = useArticleStore();
  const [topic, setTopic] = useState('');
  const [wordCount, setWordCount] = useState<number>(0); // 0 = 自动
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    try {
      const res = await fetch('/api/trending');
      const data = await res.json();
      setTrendingTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to load trending topics:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `为一个公众号文章生成完整内容，主题是：${topic}${wordCount > 0 ? `，文章字数要求${wordCount}字左右` : ''}` }],
          stream: false,
        }),
      });
      const data = await res.json();
      if (data?.content) {
        createArticle({
          title: `关于${topic}的文章`,
          content: data.content,
          outline: [],
          tone: 'professional',
          theme: 'tech',
        });
        setTopic('');
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    await loadFromServer();
    setLoading(false);
  };

  const handleCopyToWeChat = (article: any) => {
    navigator.clipboard.writeText(`${article.title}\n\n${article.content}`);
  };

  const handleTopicClick = (topicTitle: string) => {
    setTopic(topicTitle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getHeatColor = (heat: number) => {
    if (heat >= 90) return 'text-red-400';
    if (heat >= 80) return 'text-orange-400';
    return 'text-yellow-400';
  };

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      '科技': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
      '商业': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
      '生活': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
      '自媒体': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
      '职场': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    };
    return styles[category] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' };
  };

  const getTopicGradient = (index: number) => {
    const gradients = [
      'from-blue-500/20 to-purple-500/20',
      'from-purple-500/20 to-pink-500/20',
      'from-orange-500/20 to-red-500/20',
      'from-green-500/20 to-teal-500/20',
      'from-pink-500/20 to-rose-500/20',
      'from-indigo-500/20 to-blue-500/20',
      'from-amber-500/20 to-orange-500/20',
      'from-teal-500/20 to-cyan-500/20',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen gradient-bg text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-50 bg-[#0a0a0f]/90">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">
              牧咔 AI 写作
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/oldies')} 
              className="text-gray-400 hover:text-orange-400 hover:bg-orange-400/10"
            >
              <Music className="w-4 h-4 mr-1" />
              老歌推荐
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loading} className="text-gray-400 hover:text-white hover:bg-white/[0.06]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span className="ml-1">{articles.length}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        <div className={`text-center mb-16 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>AI 驱动，效率提升 10 倍</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            让 AI 成为你的
            <br />
            <span className="gradient-text">公众号写作搭档</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
            输入关键词，AI 自动生成选题、大纲和全文
            <br />
            一键复制到公众号后台，专注内容创作
          </p>
        </div>

        {/* Input Section */}
        <div className={`max-w-2xl mx-auto mb-16 ${mounted ? 'animate-fade-in-up stagger-2' : 'opacity-0'}`}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative flex gap-3 p-2 bg-[#111118] rounded-2xl border border-white/[0.06]">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入文章主题，例如：2025年AI发展趋势..."
                className="flex-1 text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder-gray-500 h-14 px-4"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <select
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="h-14 px-3 bg-[#1a1a24] border border-white/[0.06] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 cursor-pointer appearance-none min-w-[100px] text-center"
              >
                <option value={0}>自动</option>
                <option value={500}>500字</option>
                <option value={800}>800字</option>
                <option value={1000}>1000字</option>
                <option value={1500}>1500字</option>
                <option value={2000}>2000字</option>
                <option value={3000}>3000字</option>
              </select>
              <Button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="h-14 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all duration-300 btn-glow"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成文章
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Trending Topics Section */}
        <div className={`max-w-5xl mx-auto mb-16 ${mounted ? 'animate-fade-in-up stagger-3' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">热点选题推荐</h2>
              <p className="text-sm text-gray-500">点击即可快速生成文章</p>
            </div>
          </div>
          
          {loadingTrending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingTopics.map((topic, index) => {
                const style = getCategoryStyle(topic.category);
                return (
                  <Card
                    key={topic.id}
                    className={`relative overflow-hidden bg-gradient-to-br ${getTopicGradient(index)} border-white/[0.06] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-500 cursor-pointer group hover-lift`}
                    onClick={() => handleTopicClick(topic.title)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                          {topic.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <Flame className={`w-3 h-3 ${getHeatColor(topic.heat)}`} />
                          <span className={`text-xs font-medium ${getHeatColor(topic.heat)}`}>
                            {topic.heat}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-sm font-semibold text-white line-clamp-2 group-hover:text-white/90 transition-colors leading-relaxed">
                        {topic.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-white/50 line-clamp-2 mb-3">{topic.summary}</p>
                      <div className="flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {articles.length === 0 && !loadingTrending && (
            <div className={`text-center py-16 ${mounted ? 'animate-fade-in-up stagger-4' : 'opacity-0'}`}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-gray-400 text-lg mb-2">暂无文章</p>
              <p className="text-gray-500 text-sm">
                在上方输入主题，或点击热点选题快速开始创作
              </p>
            </div>
          )}
          {articles.map((article, index) => (
            <Card 
              key={article.id} 
              className="bg-[#111118]/80 border-white/[0.06] backdrop-blur-sm hover:border-blue-500/30 transition-all duration-500 cursor-pointer group hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-semibold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">{article.content?.substring(0, 150)}...</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{new Date(article.createdAt).toLocaleString('zh-CN')}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentArticle(article);
                      }}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-8 px-3"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      <span className="text-xs">编辑</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToWeChat(article);
                      }}
                      className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-8 px-3"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      <span className="text-xs">复制</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteArticle(article.id);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-3 h-3" />
          <span>简洁 · 高效 · 专注</span>
        </div>
      </footer>
    </div>
  );
}
