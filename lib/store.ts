import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeChatTheme } from '@/lib/wechatRenderer';

export type WritingTone = 'professional' | 'casual' | 'storytelling';
export type FormatStyle = 'minimal' | 'story' | 'academic' | 'social';

export interface Article {
  id: string;
  topic: string;
  outline: string[];
  content: string;
  images: { [key: string]: string };
  tone: WritingTone;
  theme: WeChatTheme;
  formatStyle?: FormatStyle;
  isOptimized?: boolean;
  createdAt: number;
}

interface ArticleStore {
  articles: Article[];
  currentArticleId: string | null;
  addArticle: (topic: string) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  setCurrentArticle: (id: string) => void;
  deleteArticle: (id: string) => void;
}

export const useArticleStore = create<ArticleStore>()(
  persist(
    (set) => ({
      articles: [],
      currentArticleId: null,

      addArticle: (topic: string) => {
        const newArticle: Article = {
          id: crypto.randomUUID(),
          topic,
          outline: [],
          content: '',
          images: {},
          tone: 'professional',
          theme: 'tech',
          createdAt: Date.now(),
        };
        set((state) => ({
          articles: [newArticle, ...state.articles],
          currentArticleId: newArticle.id,
        }));
      },

      updateArticle: (id: string, updates: Partial<Article>) =>
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      setCurrentArticle: (id: string) => set({ currentArticleId: id }),

      deleteArticle: (id: string) =>
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
          currentArticleId: state.currentArticleId === id ? null : state.currentArticleId,
        })),
    }),
    {
      name: '01agent-storage',
    }
  )
);
