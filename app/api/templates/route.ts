import { NextRequest } from 'next/server';
import { TEMPLATES, getTemplatesByCategory } from '@/lib/templates';

// GET /api/templates - List templates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;

  const templates = getTemplatesByCategory(category);
  return Response.json({ templates });
}
