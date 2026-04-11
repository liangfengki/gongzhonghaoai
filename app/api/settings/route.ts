import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

function sanitizeSettings(raw: unknown) {
  const settings = typeof raw === 'object' && raw !== null ? { ...(raw as Record<string, unknown>) } : {};
  settings.apiKey = '';
  settings.imageApiKey = '';
  return settings;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: sanitizeSettings(JSON.parse(settings.settings)) });
  } catch (response) {
    return response as Response;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { settings } = await req.json();

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    const settingsString = JSON.stringify(sanitizeSettings(settings));

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        settings: settingsString,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        settings: settingsString,
      },
    });

    return NextResponse.json({
      success: true,
      settings: sanitizeSettings(JSON.parse(updatedSettings.settings))
    });
  } catch (response) {
    return response as Response;
  }
}
