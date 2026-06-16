import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id);
  if (!committee) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const userId = body.userId || null;

  const txn = db.transaction(() => {
    if (committee.supervisor_id) {
      db.prepare(
        "UPDATE users SET role = 'servant', title = 'خادمة' WHERE id = ? AND role = 'committee_supervisor'"
      ).run(committee.supervisor_id);
    }
    if (userId) {
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!target || target.committee_id !== params.id) {
        throw new Error('عضو غير صالح');
      }
      db.prepare("UPDATE users SET role = 'committee_supervisor', title = ? WHERE id = ?").run(
        `خادمة الحسين للجنة ${committee.name}`,
        userId
      );
    }
    db.prepare('UPDATE committees SET supervisor_id = ? WHERE id = ?').run(userId, params.id);
  });

  try {
    txn();
  } catch (e) {
    return NextResponse.json({ error: e.message || 'تعذر التعيين' }, { status: 400 });
  }

  const updated = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id);
  return NextResponse.json({ committee: updated });
}
