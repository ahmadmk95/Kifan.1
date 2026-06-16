import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
  if (params.id === user.id) return NextResponse.json({ error: 'لا يمكنكِ حذف حسابكِ الخاص' }, { status: 400 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const txn = db.transaction(() => {
    const taskIds = db.prepare('SELECT id FROM tasks WHERE assignee_id = ?').all(params.id).map((t) => t.id);
    const delComments = db.prepare('DELETE FROM comments WHERE task_id = ?');
    taskIds.forEach((tid) => delComments.run(tid));
    db.prepare('DELETE FROM tasks WHERE assignee_id = ?').run(params.id);
    db.prepare('DELETE FROM comments WHERE author_id = ?').run(params.id);
    db.prepare('DELETE FROM ratings WHERE member_id = ? OR author_id = ?').run(params.id, params.id);
    db.prepare('UPDATE committees SET supervisor_id = NULL WHERE supervisor_id = ?').run(params.id);
    db.prepare('DELETE FROM spotlight WHERE member_id = ? OR set_by = ?').run(params.id, params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(params.id);
  });
  txn();

  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مسجّل الدخول' }, { status: 401 });
  if (user.role !== 'supervisor') return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (params.id === user.id && body.role && body.role !== 'supervisor') {
    return NextResponse.json({ error: 'لا يمكنكِ تغيير دورك الخاص' }, { status: 400 });
  }

  if (body.committee_id) {
    const committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(body.committee_id);
    if (!committee) return NextResponse.json({ error: 'لجنة غير موجودة' }, { status: 400 });
  }

  const txn = db.transaction(() => {
    if (target.role === 'committee_supervisor' && (body.role !== undefined || body.committee_id !== undefined)) {
      db.prepare('UPDATE committees SET supervisor_id = NULL WHERE supervisor_id = ?').run(target.id);
    }

    const newRole = body.role === 'supervisor' ? 'supervisor' : body.role === 'servant' ? 'servant' : target.role === 'committee_supervisor' ? 'servant' : target.role;

    const newCommittee =
      newRole === 'supervisor' ? null : body.committee_id !== undefined ? body.committee_id || null : target.committee_id;

    let title;
    if (newRole === 'supervisor') title = 'خادمة الحسين';
    else if (newCommittee) {
      const c = db.prepare('SELECT * FROM committees WHERE id = ?').get(newCommittee);
      title = c ? 'خادمة ' + c.name : '';
    } else title = '';

    db.prepare('UPDATE users SET role = ?, committee_id = ?, title = ? WHERE id = ?').run(newRole, newCommittee, title, target.id);
  });
  txn();

  const updated = db
    .prepare('SELECT id, name, username, role, title, committee_id, status, initials FROM users WHERE id = ?')
    .get(target.id);
  return NextResponse.json({ user: updated });
}
