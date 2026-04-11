import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createJWT } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: '用户名需 3-20 个字符' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 个字符' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existing) {
      const field = existing.username === username ? '用户名' : '邮箱';
      return NextResponse.json({ error: `${field}已被注册` }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed, credits: 50 },
    });

    const token = await createJWT({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json({
      success: true,
      user: { username: user.username, credits: user.credits, isAdmin: user.isAdmin },
    });

    // 修复 Vercel 上的跨域 cookie 丢失问题：显式设置 domain 和 sameSite
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Vercel 部署环境需要设置为 none 以允许跨域 cookie
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
