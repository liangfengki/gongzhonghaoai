'use client';

import Nav from '@/components/Nav';
import TopicSelector from '@/components/TopicSelector';
import { useArticleStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const { articles, setCurrentArticle, deleteArticle } = useArticleStore();
  const router = useRouter();
  const recentArticles = articles.slice(0, 6);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenArticle = (id: string) => {
    setCurrentArticle(id);
    router.push('/editor');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = (id: string) => {
    deleteArticle(id);
    setDeletingId(null);
  };

  const getWordCount = (content: string) => {
    return (content.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g) || []).length;
  };

  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-6 pt-14 pb-10 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI 驱动
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              AI 公众号写作助手
            </h1>
            <p className="text-gray-500 text-[15px] max-w-md mx-auto leading-relaxed">
              输入关键词，AI 自动生成选题、大纲、全文和配图，
              <br className="hidden sm:block" />
              一键复制到公众号后台。
            </p>
          </div>
        </div>

        {/* Topic Selector */}
        <TopicSelector />

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <div className="max-w-2xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 tracking-wide">最近的文章</h2>
            </div>
            <div className="space-y-2">
              {recentArticles.map((article) => (
                <div key={article.id} className="relative group">
                  <button
                    onClick={() => handleOpenArticle(article.id)}
                    className="w-full text-left p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-[var(--shadow-card)] transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{article.topic}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                          {article.content
                            ? ` · ${getWordCount(article.content)} 字`
                            : article.outline.length > 0
                            ? ' · 有大纲'
                            : ' · 仅选题'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight
                        size={16}
                        className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
                      />
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, article.id)}
                    className="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                  </button>

                  {/* Delete confirmation */}
                  {deletingId === article.id && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 animate-scale-in z-10">
                      <span className="text-sm text-gray-600">确定删除？</span>
                      <button
                        onClick={() => confirmDelete(article.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">牧咔AI · AI 公众号写作助手</p>
      </footer>
    </div>
  );
}
