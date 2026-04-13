import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import type { User } from '@prisma/client';

// Simple in-memory cache: userId -> { user, expiresAt }
const userCache = new Map<string, { user: User; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function getCurrentUser(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  // Check cache
  const cached = userCache.get(payload.userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (user) {
    userCache.set(payload.userId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return user;
}

export async function requireAuth(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user.isAdmin) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return user;
}
