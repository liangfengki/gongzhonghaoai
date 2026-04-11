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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, creditsSum, articlesToday, articlesTotal, newUsersThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({ _sum: { credits: true } }),
      prisma.usageLog.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.usageLog.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalCreditsInSystem: creditsSum._sum.credits || 0,
      articlesToday,
      articlesTotal,
      newUsersThisWeek,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
