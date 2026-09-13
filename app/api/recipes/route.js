import { NextResponse } from 'next/server';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { listRecipes, createRecipe } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json({ recipes: listRecipes() });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ recipe: createRecipe(body) });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الحفظ' }, { status: e.status || 400 });
  }
}
