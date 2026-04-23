import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/articles/[id] - Get single article
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const { id } = await params;
  const article = await prisma.article.findFirst({
    where: { id, userId: user.id },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 10 },
    },
  });

  if (!article) {
    return Response.json({ error: '文章不存在' }, { status: 404 });
  }

  return Response.json({ article });
}

// PATCH /api/articles/[id] - Update article (auto-creates version on content change)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const { id } = await params;
  const body = await req.json();
  const { title, outline, content, tone, theme, isOptimized, isFavorite } = body;

  // Verify ownership
  const existing = await prisma.article.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return Response.json({ error: '文章不存在' }, { status: 404 });
  }

  // Auto-create version if content changed
  if (content && content !== existing.content) {
    const lastVersion = await prisma.articleVersion.findFirst({
      where: { articleId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await prisma.articleVersion.create({
      data: {
        articleId: id,
        content: existing.content,
        outline: existing.outline,
        version: nextVersion,
        note: body.versionNote || '自动保存',
      },
    });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (outline !== undefined) updateData.outline = JSON.stringify(outline);
  if (content !== undefined) updateData.content = content;
  if (tone !== undefined) updateData.tone = tone;
  if (theme !== undefined) updateData.theme = theme;
  if (isOptimized !== undefined) updateData.isOptimized = isOptimized;
  if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

  const article = await prisma.article.update({
    where: { id },
    data: updateData,
  });

  return Response.json({ article });
}

// DELETE /api/articles/[id] - Delete article
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const { id } = await params;
  const existing = await prisma.article.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return Response.json({ error: '文章不存在' }, { status: 404 });
  }

  await prisma.article.delete({ where: { id } });
  return Response.json({ success: true });
}
