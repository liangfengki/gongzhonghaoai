import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/articles/[id]/versions - List versions
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
  });

  if (!article) {
    return Response.json({ error: '文章不存在' }, { status: 404 });
  }

  const versions = await prisma.articleVersion.findMany({
    where: { articleId: id },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      note: true,
      outline: true,
      createdAt: true,
      // Don't include content in list (too large), fetch individually if needed
    },
  });

  return Response.json({ versions });
}

// POST /api/articles/[id]/versions - Restore a version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (response) {
    return response as Response;
  }

  const { id } = await params;
  const { versionId } = await req.json();

  const article = await prisma.article.findFirst({
    where: { id, userId: user.id },
  });

  if (!article) {
    return Response.json({ error: '文章不存在' }, { status: 404 });
  }

  const version = await prisma.articleVersion.findFirst({
    where: { id: versionId, articleId: id },
  });

  if (!version) {
    return Response.json({ error: '版本不存在' }, { status: 404 });
  }

  // Save current state as a new version before restoring
  const lastVersion = await prisma.articleVersion.findFirst({
    where: { articleId: id },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  await prisma.articleVersion.create({
    data: {
      articleId: id,
      content: article.content,
      outline: article.outline,
      version: (lastVersion?.version ?? 0) + 1,
      note: `恢复前自动保存`,
    },
  });

  // Restore the version
  const updated = await prisma.article.update({
    where: { id },
    data: {
      content: version.content,
      outline: version.outline,
    },
  });

  return Response.json({ article: updated });
}
