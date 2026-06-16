'use client';

import { useEffect, useState, useCallback } from 'react';
import AuthScreen from '@/components/AuthScreen';
import TopBar from '@/components/TopBar';
import MemberView from '@/components/MemberView';
import SupervisorView from '@/components/SupervisorView';
import { api } from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(async () => {
    const { user: u } = await api.me();
    setUser(u);
    setChecked(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  if (!checked) return null;
  if (!user) return <AuthScreen onAuthed={setUser} />;

  return (
    <div className="app">
      <TopBar user={user} onLogout={logout} />
      {user.role === 'supervisor' ? <SupervisorView user={user} /> : <MemberView user={user} />}
      <div className="footer-dua">رحم الله من أحيا أمرنا</div>
    </div>
  );
}
