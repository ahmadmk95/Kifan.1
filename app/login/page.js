'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const AUTO_KEY = 'mwk_autologin';

function landingFor(user) {
  if (user?.role === 'admin' || user?.access === 'viewer') return '/admin';
  if (user?.access === 'accounting') return '/admin/accounting';
  if (user?.access === 'fridge') return '/admin/fridge';
  return '/private';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false); // signing in automatically
  const tried = useRef(false);

  const goto = (user) => { router.push(next || landingFor(user)); router.refresh(); };

  // Auto sign-in with the remembered credentials, if enabled.
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(AUTO_KEY) || 'null'); } catch {}
    if (saved && saved.u && saved.p) {
      setAuto(true);
      setUsername(saved.u);
      api.login(saved.u, saved.p)
        .then(({ user }) => goto(user))
        .catch(() => {
          // stored password no longer valid — forget it and show the form
          try { window.localStorage.removeItem(AUTO_KEY); } catch {}
          setAuto(false);
        });
    }
  }, []);

  const submit = async () => {
    if (busy || !username || !password) return;
    setBusy(true);
    setErr(null);
    try {
      const { user } = await api.login(username.trim(), password);
      try {
        if (remember) window.localStorage.setItem(AUTO_KEY, JSON.stringify({ u: username.trim(), p: password }));
        else window.localStorage.removeItem(AUTO_KEY);
      } catch {}
      goto(user);
    } catch (e) {
      setErr(e.message || 'رقم الهاتف أو كلمة المرور غير صحيحة');
      setBusy(false);
    }
  };

  if (auto) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
          <h1>دليل تعليمات الموكب</h1>
          <p style={{ color: 'var(--mawkab-muted)', fontSize: 15 }}>جارٍ تسجيل الدخول تلقائياً…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
        <h1>دليل تعليمات الموكب</h1>
        <div className="pill-private">نسخة خاصة — للمخوّلين فقط</div>
        <input
          type="tel"
          dir="ltr"
          inputMode="tel"
          placeholder="رقم الهاتف"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <input
          type="password"
          dir="ltr"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <label className="remember-row">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>تسجيل الدخول تلقائياً في المرة القادمة</span>
        </label>
        {err ? <div className="login-err">{err}</div> : null}
        <button className="btn-primary" onClick={submit} disabled={busy}>دخول</button>
        <Link href="/register" className="splash-link">مستخدم جديد؟ إنشاء حساب</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="page">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
