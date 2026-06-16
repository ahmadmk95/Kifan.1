'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function AuthScreen({ onAuthed, initialMode }) {
  const [mode, setMode] = useState(initialMode || 'login');
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const doLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { user } = await api.login(f.username.trim(), f.password);
      onAuthed(user);
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async () => {
    if (busy) return;
    if (!f.name.trim() || !f.username.trim() || !f.password.trim()) {
      setMsg({ t: 'err', x: 'يرجى تعبئة جميع الحقول' });
      return;
    }
    setBusy(true);
    try {
      await api.register(f.name.trim(), f.username.trim(), f.password);
      setMsg({ t: 'ok', x: 'تم إرسال طلبكِ — بانتظار تفعيله من خادمة الحسين' });
      setF({ name: '', username: '', password: '' });
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-logo">
            <img src="/logo.png" alt="شعار الحسينية" />
          </div>
          <h1>لجنة النساء — متابعة المهام</h1>
          <div className="sub">حسينية الحاج عبدالله الحسين الأمير · كيفان · محرم ١٤٤٨ هـ</div>
        </div>
        <div className="login-body">
          <div className="login-dua">
            <span>۞</span> اللهم اجعلني عندك وجيهاً بالحسين <span>۞</span>
          </div>
          <div className="auth-tabs" style={{ marginTop: 18 }}>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMsg(null); }}>
              تسجيل الدخول
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMsg(null); }}>
              طلب تسجيل
            </button>
          </div>

          {msg ? <div className={'auth-msg ' + msg.t}>{msg.x}</div> : null}

          <div className="auth-form">
            {mode === 'register' ? (
              <div className="field">
                <label>الاسم الكامل</label>
                <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: زينب علي" />
              </div>
            ) : null}
            <div className="field">
              <label>اسم المستخدم</label>
              <input
                value={f.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="username"
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <input
                type="password"
                value={f.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (mode === 'login' ? doLogin() : doRegister());
                }}
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
            </div>
            <button className="auth-submit" onClick={mode === 'login' ? doLogin : doRegister} disabled={busy}>
              {mode === 'login' ? 'دخول' : 'إرسال الطلب'}
            </button>
          </div>

          {mode === 'login' ? (
            <div className="login-hint">
              للتجربة — المشرفة: <b>fatima</b> · خادمة: <b>zahra</b> · كلمة المرور: <b>1234</b>
            </div>
          ) : (
            <div className="login-hint">سيصلكِ التفعيل بعد مراجعة خادمة الحسين وإسناد لجنتكِ</div>
          )}
        </div>
      </div>
      <div className="footer-dua">رحم الله من أحيا أمرنا</div>
    </div>
  );
}
