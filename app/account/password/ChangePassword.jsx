'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SITE_NAME } from '@/lib/brand';

export default function ChangePassword({ name }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (next.length < 8) return setMsg({ t: 'err', x: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' });
    if (next !== again) return setMsg({ t: 'err', x: 'كلمتا المرور الجديدتان غير متطابقتين' });
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      // The remembered auto sign-in holds the old password — update it.
      try {
        const saved = JSON.parse(window.localStorage.getItem('mwk_autologin') || 'null');
        if (saved?.u) window.localStorage.setItem('mwk_autologin', JSON.stringify({ u: saved.u, p: next }));
      } catch {}
      setCurrent(''); setNext(''); setAgain('');
      setMsg({ t: 'ok', x: 'تم تغيير كلمة المرور بنجاح' });
    } catch (err) {
      setMsg({ t: 'err', x: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1 className="brand-name">{SITE_NAME}</h1>
        <p style={{ margin: '0 0 14px', color: 'var(--mawkab-muted)' }}>تغيير كلمة المرور — {name}</p>
        {msg ? <div className={'form-msg ' + msg.t}>{msg.x}</div> : null}
        <label className="field">
          <span>كلمة المرور الحالية</span>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label className="field">
          <span>كلمة المرور الجديدة (8 أحرف على الأقل)</span>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </label>
        <label className="field">
          <span>أعد كتابة كلمة المرور الجديدة</span>
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </label>
        <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
        </button>
        <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => router.back()}>رجوع</button>
      </form>
    </div>
  );
}
