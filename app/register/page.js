'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [f, setF] = useState({ name: '', phone: '', password: '' });
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (busy) return;
    if (!f.name.trim() || !f.phone.trim() || !f.password) {
      setErr('يرجى تعبئة جميع الحقول');
      return;
    }
    setBusy(true); setErr(null);
    try {
      await api.register(f.name.trim(), f.phone.trim(), f.password);
      setDone(true);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo.png" alt="موكب أمير المؤمنين (ع)" />
          {done ? (
            <>
              <h1>تم إرسال طلبك</h1>
              <p style={{ color: 'var(--mawkab-ink)', fontSize: 15, lineHeight: 2 }}>
                حسابك الآن قيد المراجعة. ستتمكن من الدخول بعد موافقة الإدارة وتحديد صلاحياتك.
              </p>
              <Link href="/" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>عودة للرئيسية</Link>
            </>
          ) : (
            <>
              <h1>إنشاء حساب جديد</h1>
              <div className="pill-private">سيُراجع طلبك من قبل الإدارة</div>
              {err ? <div className="login-err">{err}</div> : null}
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={f.name}
                onChange={(e) => set('name', e.target.value)}
              />
              <input
                type="tel"
                dir="ltr"
                inputMode="tel"
                placeholder="رقم الهاتف"
                value={f.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              <input
                type="password"
                dir="ltr"
                placeholder="كلمة المرور"
                value={f.password}
                onChange={(e) => set('password', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              />
              <button className="btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
              </button>
              <Link href="/login" className="splash-link">لديك حساب؟ تسجيل الدخول</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
