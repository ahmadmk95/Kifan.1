'use client';

import { useState } from 'react';
import { Avatar } from './Shared';
import ProfileModal from './ProfileModal';

export default function TopBar({ user, onLogout, ratingsCount, onRatingsClick, chatCount, onChatClick, onTasksClick, memberView }) {
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
          {onChatClick ? (
            <button
              className={'tb-icon-btn' + (memberView === 'chat' ? ' tb-icon-active' : '')}
              onClick={memberView === 'chat' ? onTasksClick : onChatClick}
              title="دردشة اللجنة"
              style={{ position: 'relative' }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={memberView === 'chat' ? 'var(--gold-deep)' : 'none'} stroke={memberView === 'chat' ? 'var(--gold-deep)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {chatCount > 0 && memberView !== 'chat' ? (
                <span className="notif-badge" style={{ position: 'absolute', top: -4, insetInlineEnd: -4, minWidth: 16, height: 16, fontSize: 10, padding: '0 3px' }}>{chatCount}</span>
              ) : null}
            </button>
          ) : null}
          {onRatingsClick ? (
            <button
              className={'tb-icon-btn' + (memberView === 'ratings' ? ' tb-icon-active' : '')}
              onClick={memberView === 'ratings' ? onTasksClick : onRatingsClick}
              title="كلمات تشجيعية"
              style={{ position: 'relative' }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={memberView === 'ratings' ? 'var(--gold-deep)' : 'none'} stroke={memberView === 'ratings' ? 'var(--gold-deep)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {ratingsCount > 0 && memberView !== 'ratings' ? (
                <span className="notif-badge" style={{ position: 'absolute', top: -4, insetInlineEnd: -4, minWidth: 16, height: 16, fontSize: 10, padding: '0 3px' }}>{ratingsCount}</span>
              ) : null}
            </button>
          ) : null}
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
