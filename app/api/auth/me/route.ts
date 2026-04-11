import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({
      user: {
        username: user.username,
        email: user.email,
        credits: user.credits,
        isAdmin: user.isAdmin,
      },
    });
  } catch (response) {
    return response as Response;
  }
}
