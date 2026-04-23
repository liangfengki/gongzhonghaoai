import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/articles - List user's articles
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const articles = await prisma.article.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      outline: true,
      content: true,
      tone: true,
      theme: true,
      isOptimized: true,
      isFavorite: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });

  return Response.json({ articles });
}

// POST /api/articles - Create new article
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const body = await req.json();
  const { title, outline, content, tone, theme } = body;

  const article = await prisma.article.create({
    data: {
      userId: user.id,
      title: title || '未命名文章',
      outline: JSON.stringify(outline || []),
      content: content || '',
      tone: tone || 'professional',
      theme: theme || 'tech',
    },
  });

  return Response.json({ article }, { status: 201 });
}
