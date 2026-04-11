import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (response) {
    return response as Response;
  }

  try {
    const { userId, amount, action } = await req.json();

    if (!userId || typeof amount !== 'number' || !action) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    if (!['add', 'deduct', 'set'].includes(action)) {
      return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
    }

    if (action === 'add') {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      });
    } else if (action === 'deduct') {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });
      // Ensure credits don't go below 0
      await prisma.user.updateMany({
        where: { id: userId, credits: { lt: 0 } },
        data: { credits: 0 },
      });
    } else if (action === 'set') {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: Math.max(0, amount) },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, credits: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Admin credits error:', error);
    return NextResponse.json({ error: '更新积分失败' }, { status: 500 });
  }
}
