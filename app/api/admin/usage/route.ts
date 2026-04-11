import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (response) {
    return response as Response;
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10)));

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      prisma.usageLog.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.usageLog.count({ where }),
    ]);

    const result = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user.username,
      type: log.type,
      creditsUsed: log.creditsUsed,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ logs: result, total, page, pageSize });
  } catch (error) {
    console.error('Admin usage error:', error);
    return NextResponse.json({ error: '获取使用记录失败' }, { status: 500 });
  }
}
