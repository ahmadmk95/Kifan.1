'use client';

import { useEffect, useState } from 'react';
import { Avatar } from './Shared';
import { api } from '@/lib/api';

const ROLE_LABELS = { supervisor: 'مشرفة عامة', committee_supervisor: 'مشرفة لجنة', servant: 'خادمة' };
const STATUS_LABELS = { active: 'نشطة', pending: 'معلّقة' };

export default function ProfileModal({ user, onClose }) {
  const [committee, setCommittee] = useState(null);

  useEffect(() => {
    if (!user.committee_id) return;
    api.committees().then(({ committees }) => {
      setCommittee(committees.find((c) => c.id === user.committee_id) || null);
    });
  }, [user.committee_id]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>الملف الشخصي</h3>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56 }}>
              <Avatar member={user} className="av" />
            </div>
            <div>
              <div className="nm" style={{ fontSize: 16, fontWeight: 700 }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--gold-soft)' }}>{user.title}</div>
            </div>
          </div>

          <div className="field">
            <label>اسم المستخدم</label>
            <div>@{user.username}</div>
          </div>
          <div className="field">
            <label>الدور</label>
            <div>{ROLE_LABELS[user.role] || user.role}</div>
          </div>
          {committee ? (
            <div className="field">
              <label>اللجنة</label>
              <div>
                <span
                  className="cat-dot"
                  style={{ background: committee.color, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginInlineEnd: 6 }}
                ></span>
                {committee.name}
              </div>
            </div>
          ) : null}
          {user.status ? (
            <div className="field">
              <label>الحالة</label>
              <div>{STATUS_LABELS[user.status] || user.status}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
