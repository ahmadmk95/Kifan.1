'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

const AUTHORITIES = [
  { value: 'committees', label: 'عرض اللجان فقط' },
  { value: 'accounting', label: 'المحاسبة فقط' },
  { value: 'fridge', label: 'الثلاجة فقط' },
  { value: 'viewer', label: 'مشرف — عرض فقط' },
  { value: 'admin', label: 'مدير كامل' },
];
const AUTH_LABEL = { admin: 'مدير كامل', viewer: 'مشرف — عرض فقط', committees: 'عرض اللجان', accounting: 'المحاسبة', fridge: 'الثلاجة' };

function authorityOf(u) {
  if (u.role === 'admin') return 'admin';
  if (u.access === 'viewer') return 'viewer';
  if (u.access === 'accounting') return 'accounting';
  if (u.access === 'fridge') return 'fridge';
  return 'committees';
}

export default function UsersAdmin({ currentUserId, canManage = true }) {
  const [users, setUsers] = useState(null);
  const [msg, setMsg] = useState(null);
  const [pendingAuth, setPendingAuth] = useState({}); // id -> chosen authority
  const [f, setF] = useState({ name: '', username: '', password: '', authority: 'committees' });
  const [busy, setBusy] = useState(false);

  const load = () => api.users().then(({ users }) => setUsers(users)).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const { pending, active } = useMemo(() => {
    const list = users || [];
    return {
      pending: list.filter((u) => u.status === 'pending'),
      active: list.filter((u) => u.status !== 'pending'),
    };
  }, [users]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const approve = async (u) => {
    const authority = pendingAuth[u.id] || 'committees';
    try {
      await api.updateUser(u.id, { status: 'active', authority });
      setMsg({ t: 'ok', x: `تم قبول ${u.name}` });
      load();
    } catch (e) { setMsg({ t: 'err', x: e.message }); }
  };

  const reject = async (u) => {
    if (!window.confirm(`رفض طلب «${u.name}»؟ سيُحذف الطلب.`)) return;
    try { await api.removeUser(u.id); setMsg({ t: 'ok', x: 'تم رفض الطلب' }); load(); }
    catch (e) { setMsg({ t: 'err', x: e.message }); }
  };

  const changeAuthority = async (u, authority) => {
    try { await api.updateUser(u.id, { authority }); load(); }
    catch (e) { setMsg({ t: 'err', x: e.message }); }
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

  const add = async () => {
    if (busy) return;
    if (!f.name.trim() || !f.username.trim() || !f.password) { setMsg({ t: 'err', x: 'يرجى تعبئة جميع الحقول' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api.addUser({ name: f.name.trim(), username: f.username.trim(), password: f.password, authority: f.authority });
      setF({ name: '', username: '', password: '', authority: 'committees' });
      setMsg({ t: 'ok', x: 'تمت إضافة المستخدم' });
      load();
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>المستخدمون</h1>
          <Link href="/admin" className="btn-ghost">← اللجان</Link>
        </div>

        {msg ? <div className={'form-msg ' + msg.t}>{msg.x}</div> : null}

        {/* Pending registration requests */}
        <h2 className="acc-h">طلبات الانضمام {pending.length ? `(${pending.length})` : ''}</h2>
        {users === null ? null : pending.length === 0 ? (
          <p style={{ color: 'var(--mawkab-muted)', marginBottom: 20 }}>لا توجد طلبات جديدة.</p>
        ) : (
          <div className="req-list">
            {pending.map((u) => (
              <div className="req-card" key={u.id}>
                <div className="req-info">
                  <div className="req-name">{u.name}</div>
                  <div className="req-phone" dir="ltr">{u.username}</div>
                </div>
                <div className="req-controls">
                  <select
                    value={pendingAuth[u.id] || 'committees'}
                    onChange={(e) => setPendingAuth((s) => ({ ...s, [u.id]: e.target.value }))}
                  >
                    {AUTHORITIES.filter((a) => canManage || a.value !== 'admin').map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <button className="btn-ok" onClick={() => approve(u)}>قبول</button>
                  <button className="btn-danger" onClick={() => reject(u)}>رفض</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active users */}
        <h2 className="acc-h" style={{ marginTop: 26 }}>المستخدمون المفعّلون</h2>
        {users === null ? null : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الهاتف</th>
                  <th style={{ width: 170 }}>الصلاحية</th>
                  <th style={{ width: 190 }}></th>
                </tr>
              </thead>
              <tbody>
                {active.map((u) => (
                  <tr key={u.id}>
                    <td data-label="الاسم" style={{ fontWeight: 600 }}>{u.name}</td>
                    <td data-label="رقم الهاتف" dir="ltr" style={{ textAlign: 'right' }}>{u.username}</td>
                    <td data-label="الصلاحية">
                      {!canManage || u.id === currentUserId ? (
                        AUTH_LABEL[authorityOf(u)]
                      ) : (
                        <select value={authorityOf(u)} onChange={(e) => changeAuthority(u, e.target.value)}>
                          {AUTHORITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td data-label="">
                      {canManage ? (
                        <div className="acts">
                          <button className="btn-small" onClick={() => resetPw(u)}>كلمة المرور</button>
                          {u.id !== currentUserId ? <button className="btn-danger" onClick={() => remove(u)}>حذف</button> : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Manual add (active immediately) */}
        {canManage ? (<>
        <h2 className="acc-h" style={{ marginTop: 26 }}>إضافة مستخدم يدوياً</h2>
        <div className="editor-page">
          <div className="form-row">
            <div className="form-field">
              <label>الاسم</label>
              <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="form-field">
              <label>رقم الهاتف</label>
              <input value={f.username} onChange={(e) => set('username', e.target.value)} placeholder="رقم الهاتف" dir="ltr" />
            </div>
            <div className="form-field">
              <label>كلمة المرور</label>
              <input type="text" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="••••" dir="ltr" />
            </div>
            <div className="form-field" style={{ maxWidth: 180 }}>
              <label>الصلاحية</label>
              <select value={f.authority} onChange={(e) => set('authority', e.target.value)}>
                {AUTHORITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <button className="btn-add" onClick={add} disabled={busy}>+ إضافة مستخدم</button>
          </div>
        </div>
        </>) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
