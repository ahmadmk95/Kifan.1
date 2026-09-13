import { NextResponse } from 'next/server';
import { getCurrentUser, canFridge, canFridgeView } from '@/lib/auth';
import { getRecipe, updateRecipe, deleteRecipe } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridgeView(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const recipe = getRecipe(params.id);
  if (!recipe) return NextResponse.json({ error: 'الطبخة غير موجودة' }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ recipe: updateRecipe(params.id, body) });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذّر الحفظ' }, { status: e.status || 400 });
  }
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });
  return NextResponse.json(deleteRecipe(params.id));
}
