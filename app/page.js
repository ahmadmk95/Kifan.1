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

  const [memberView, setMemberView] = useState('tasks');
  const [ratingsCount, setRatingsCount] = useState(0);

  useEffect(() => {
    if (user) setRatingsCount(user.unseen_ratings || 0);
  }, [user]);

  const openRatings = () => {
    setMemberView('ratings');
    setRatingsCount(0);
  };

  if (!checked) return null;
  if (!user) return <AuthScreen onAuthed={(u) => { setUser(u); setRatingsCount(u.unseen_ratings || 0); }} />;

  const isServant = user.role === 'servant';

  return (
    <div className="app">
      <TopBar
        user={user}
        onLogout={logout}
        ratingsCount={isServant ? ratingsCount : 0}
        onRatingsClick={isServant ? openRatings : null}
        onTasksClick={isServant ? () => setMemberView('tasks') : null}
        memberView={isServant ? memberView : null}
      />
      {!isServant ? (
        <SupervisorView user={user} />
      ) : (
        <MemberView user={user} view={memberView} />
      )}
      <div className="footer-dua">رحم الله من أحيا أمرنا</div>
    </div>
  );
}
