import { NextResponse, NextRequest } from 'next/server';
import { STATIC_AUTH_CODES } from '@/lib/auth-codes';
import { validateCodeForLogin } from '@/lib/usage-tracker';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: '请输入授权码' }, { status: 400 });
    }

    const existingUsageCookie = req.cookies.get('code_usage')?.value;

    const result = validateCodeForLogin(code, existingUsageCookie);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const deviceId = req.cookies.get('device_id')?.value || crypto.randomUUID();

    const response = NextResponse.json({ success: true });

    response.cookies.set('auth_code', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    response.cookies.set('device_id', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 300,
      path: '/',
    });

    response.cookies.set('code_usage', String(result.currentUsage ?? 0), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
