'use client';

import { useState } from 'react';
import { Avatar } from './Shared';
import ProfileModal from './ProfileModal';

export default function TopBar({ user, onLogout }) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="topbar">
      <div className="topbar-in">
        <div className="tb-logo">
          <img src="/logo.png" alt="" />
        </div>
        <div className="tb-titles">
          <div className="a">لجنة النساء</div>
          <div className="b">حسينية الأمير · كيفان</div>
        </div>
        <div className="tb-right">
          <button
            className="tb-user"
            onClick={() => setShowProfile(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="tb-meta" style={{ textAlign: 'start', lineHeight: 1.2 }}>
              <div className="nm">{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gold-soft)' }}>{user.title}</div>
            </div>
            <Avatar member={user} className="av" />
          </button>
          <button className="logout" onClick={onLogout}>
            خروج
          </button>
        </div>
      </div>
      <div className="topbar-strip"></div>
      {showProfile ? <ProfileModal user={user} onClose={() => setShowProfile(false)} /> : null}
    </div>
  );
}
