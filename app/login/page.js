'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

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
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !username || !password) return;
    setBusy(true);
    setErr(null);
    try {
      const { user } = await api.login(username.trim(), password);
      router.push(next || landingFor(user));
      router.refresh();
    } catch (e) {
      setErr(e.message || 'رقم الهاتف أو كلمة المرور غير صحيحة');
      setBusy(false);
    }
  };

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
