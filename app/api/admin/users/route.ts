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
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          credits: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { usageLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count(),
    ]);

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      credits: u.credits,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      articleCount: u._count.usageLogs,
    }));

    return NextResponse.json({ users: result, total, page, pageSize });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
