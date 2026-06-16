'use client';

import { Avatar } from './Shared';

export default function TopBar({ user, onLogout }) {
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
          <div className="tb-user">
            <div className="tb-meta" style={{ textAlign: 'start', lineHeight: 1.2 }}>
              <div className="nm">{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gold-soft)' }}>{user.title}</div>
            </div>
            <Avatar member={user} className="av" />
          </div>
          <button className="logout" onClick={onLogout}>
            خروج
          </button>
        </div>
      </div>
      <div className="topbar-strip"></div>
    </div>
  );
}
