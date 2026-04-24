import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeChatTheme } from '@/lib/wechatRenderer';

export type WritingTone = 'professional' | 'casual' | 'storytelling';

export interface Article {
  id: string;
  topic: string;
  outline: string[];
  content: string;
  images: { [key: string]: string };
  tone: WritingTone;
  theme: WeChatTheme;
  isOptimized?: boolean;
  isFavorite?: boolean;
  createdAt: number;
  _serverId?: string; // Server-side article ID for syncing
  _versions?: number; // Number of saved versions
}

interface ArticleStore {
  articles: Article[];
  currentArticleId: string | null;
  loading: boolean;
  addArticle: (topic: string, template?: Partial<Article>) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  setCurrentArticle: (id: string) => void;
  deleteArticle: (id: string) => void;
  setLoading: (loading: boolean) => void;
  // Server sync
  syncToServer: (id: string) => Promise<string | null>;
  loadFromServer: () => Promise<void>;
  deleteFromServer: (serverId: string) => Promise<void>;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const useArticleStore = create<ArticleStore>()(
  persist(
    (set, get) => ({
      articles: [],
      currentArticleId: null,
      loading: false,

      setLoading: (loading: boolean) => set({ loading }),

      addArticle: (topic: string, template?: Partial<Article>) => {
        const newArticle: Article = {
          id: crypto.randomUUID(),
          topic,
          outline: template?.outline || [],
          content: template?.content || '',
          images: {},
          tone: template?.tone || 'professional',
          theme: template?.theme || 'tech',
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

      deleteArticle: (id: string) => {
        const article = get().articles.find(a => a.id === id);
        // Delete from server if synced
        if (article?._serverId) {
          get().deleteFromServer(article._serverId).catch(console.error);
        }
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
          currentArticleId: state.currentArticleId === id ? null : state.currentArticleId,
        }));
      },

      syncToServer: async (id: string) => {
        const article = get().articles.find(a => a.id === id);
        if (!article) return null;

        try {
          if (article._serverId) {
            // Update existing
            await apiFetch(`/api/articles/${article._serverId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: article.topic,
                outline: article.outline,
                content: article.content,
                tone: article.tone,
                theme: article.theme,
                isOptimized: article.isOptimized,
              }),
            });
            return article._serverId;
          } else {
            // Create new
            const data = await apiFetch('/api/articles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: article.topic,
                outline: article.outline,
                content: article.content,
                tone: article.tone,
                theme: article.theme,
              }),
            });
            const serverId = data.article.id;
            set((state) => ({
              articles: state.articles.map(a =>
                a.id === id ? { ...a, _serverId: serverId } : a
              ),
            }));
            return serverId;
          }
        } catch (error) {
          console.error('Sync to server failed:', error);
          return null;
        }
      },

      loadFromServer: async () => {
        try {
          const data = await apiFetch('/api/articles');
          if (!data.articles) return;

          // Merge server articles with local ones
          const localArticles = get().articles;
          const serverArticles: Article[] = data.articles.map((s: Record<string, unknown>) => ({
            id: localArticles.find(a => a._serverId === s.id)?.id || crypto.randomUUID(),
            topic: s.title as string,
            outline: JSON.parse((s.outline as string) || '[]'),
            content: (s.content as string) || '',
            images: {},
            tone: (s.tone as WritingTone) || 'professional',
            theme: (s.theme as WeChatTheme) || 'tech',
            isOptimized: s.isOptimized as boolean,
            isFavorite: s.isFavorite as boolean,
            createdAt: new Date(s.createdAt as string).getTime(),
            _serverId: s.id as string,
            _versions: (s._count as Record<string, number>)?.versions || 0,
          }));

          // Keep local-only articles (not yet synced)
          const localOnly = localArticles.filter(
            a => !a._serverId && !serverArticles.find(s => s.id === a.id)
          );

          set({ articles: [...serverArticles, ...localOnly] });
        } catch (error) {
          console.error('Load from server failed:', error);
        }
      },

      deleteFromServer: async (serverId: string) => {
        try {
          await apiFetch(`/api/articles/${serverId}`, { method: 'DELETE' });
        } catch (error) {
          console.error('Delete from server failed:', error);
        }
      },
    }),
    {
      name: 'muka-storage',
    }
  )
);
