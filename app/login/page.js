'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/private';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !username || !password) return;
    setBusy(true);
    setErr(false);
    try {
      await api.login(username.trim(), password);
      router.push(next);
      router.refresh();
    } catch {
      setErr(true);
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
          type="text"
          dir="ltr"
          placeholder="اسم المستخدم"
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
        {err ? <div className="login-err">اسم المستخدم أو كلمة المرور غير صحيحة</div> : null}
        <button className="btn-primary" onClick={submit} disabled={busy}>دخول</button>
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
