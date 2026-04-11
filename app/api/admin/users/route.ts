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
    const users = await prisma.user.findMany({
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
    });

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      credits: u.credits,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      articleCount: u._count.usageLogs,
    }));

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
