import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // Get user ID from query params or headers
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || 'default';

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: JSON.parse(settings.settings) });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId = 'default', settings } = await req.json();

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    const settingsString = JSON.stringify(settings);

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        settings: settingsString,
        updatedAt: new Date(),
      },
      create: {
        userId,
        settings: settingsString,
      },
    });

    return NextResponse.json({
      success: true,
      settings: JSON.parse(updatedSettings.settings)
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}