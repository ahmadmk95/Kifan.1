'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

const ROLE_LABEL = { admin: 'مدير', member: 'مخوّل' };

export default function UsersAdmin({ currentUserId }) {
  const [users, setUsers] = useState(null);
  const [f, setF] = useState({ name: '', username: '', password: '', role: 'member' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.users().then(({ users }) => setUsers(users)).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const add = async () => {
    if (busy) return;
    if (!f.name.trim() || !f.username.trim() || !f.password) { setMsg({ t: 'err', x: 'يرجى تعبئة جميع الحقول' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api.addUser({ name: f.name.trim(), username: f.username.trim(), password: f.password, role: f.role });
      setF({ name: '', username: '', password: '', role: 'member' });
      setMsg({ t: 'ok', x: 'تمت إضافة المستخدم' });
      load();
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`حذف المستخدم «${u.name}»؟`)) return;
    try { await api.removeUser(u.id); load(); }
    catch (e) { setMsg({ t: 'err', x: e.message }); }
  };

  const resetPw = async (u) => {
    const pw = window.prompt(`كلمة مرور جديدة لـ «${u.name}»:`);
    if (!pw) return;
    await api.resetPassword(u.id, pw);
    setMsg({ t: 'ok', x: 'تم تحديث كلمة المرور' });
  };

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>المستخدمون</h1>
          <Link href="/admin" className="btn-ghost">← اللجان</Link>
        </div>

        {msg ? <div className={'form-msg ' + msg.t}>{msg.x}</div> : null}

        <div className="editor-page" style={{ marginBottom: 28 }}>
          <div className="form-row">
            <div className="form-field">
              <label>الاسم</label>
              <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="form-field">
              <label>اسم المستخدم</label>
              <input value={f.username} onChange={(e) => set('username', e.target.value)} placeholder="username" dir="ltr" />
            </div>
            <div className="form-field">
              <label>كلمة المرور</label>
              <input type="text" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="••••" dir="ltr" />
            </div>
            <div className="form-field" style={{ maxWidth: 160 }}>
              <label>الدور</label>
              <select value={f.role} onChange={(e) => set('role', e.target.value)}>
                <option value="member">مخوّل</option>
                <option value="admin">مدير</option>
              </select>
            </div>
          </div>
          <div>
            <button className="btn-add" onClick={add} disabled={busy}>+ إضافة مستخدم</button>
          </div>
        </div>

        {users === null ? null : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th style={{ width: 90 }}>الدور</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{u.username}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <div className="acts">
                      <button className="btn-small" onClick={() => resetPw(u)}>كلمة المرور</button>
                      {u.id !== currentUserId ? <button className="btn-danger" onClick={() => remove(u)}>حذف</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
