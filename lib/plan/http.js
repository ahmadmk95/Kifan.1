import { NextResponse } from 'next/server';
import { getCurrentUser, canViewPlan, canEditPlan, isAdmin, checkPassword, lockMessage } from '../auth';
import { ensureDailyBackup } from './store';

// Wrap a route handler: turns thrown errors (with .status) into JSON replies.
export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (!e.status) console.error('[plan api]', e);
      return NextResponse.json({ error: e.status ? e.message : 'حدث خطأ في الخادم' }, { status: e.status || 500 });
    }
  };
}

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Reading the plan: any signed-in, approved user.
export async function requireViewer() {
  const user = await getCurrentUser();
  if (!canViewPlan(user)) throw fail(401, 'يرجى تسجيل الدخول لعرض الخطة');
  return user;
}

export async function requireEditor() {
  const user = await getCurrentUser();
  if (!user) throw fail(401, 'يرجى تسجيل الدخول للتعديل');
  if (!canEditPlan(user)) throw fail(403, 'ليست لديك صلاحية تعديل الخطة');
  ensureDailyBackup();
  return user;
}

export async function requireAdmin() {
  const user = await requireEditor();
  if (!isAdmin(user)) throw fail(403, 'هذه العملية للمدير فقط');
  return user;
}

// Sensitive operations (restoring a backup, importing over everything) ask for
// the password again; wrong answers count toward the sign-in lockout.
export function confirmPassword(user, password) {
  const res = checkPassword(user, password);
  if (res.ok) return;
  if (res.locked) throw fail(423, lockMessage(res.locked));
  throw fail(401, 'كلمة المرور غير صحيحة');
}

export const json = (data, init) => NextResponse.json(data, init);
