'use client';

import { useEffect, useState } from 'react';
import { avBg, toAr } from '@/lib/palette';
import { api } from '@/lib/api';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function HasanatModal({ currentUser, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.hasanat().then(({ members: m }) => { setMembers(m); setLoading(false); });
  }, []);

  const me = members.find((m) => m.is_me);
  const top3 = members.slice(0, 3);
  const rest = members.slice(3);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal hasanat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🌟 لوحة الحسنات</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="hasanat-sub">كل مهمة تُنجزينها تُضيف حسنة — تنافسي في خدمة الحسين عليه السلام 💚</p>

          {loading ? (
            <div className="empty" style={{ padding: '30px 0' }}><div className="ic">⏳</div>جاري التحميل</div>
          ) : (
            <>
              {/* My position banner if not in top 3 */}
              {me && me.rank > 3 ? (
                <div className="hasanat-me-banner">
                  <span className="hm-rank ar-num">#{toAr(me.rank)}</span>
                  <div className="hm-av" style={{ background: avBg(me.id) }}>{me.name[0]}</div>
                  <div className="hm-info">
                    <div className="hm-name">أنتِ — {me.name.split(' ')[0]}</div>
                    <div className="hm-pts ar-num">{toAr(me.points)} حسنة</div>
                  </div>
                  {me.rank > 3 ? (
                    <div className="hm-gap">
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>للمركز الثالث:</span>
                      <span className="ar-num" style={{ fontWeight: 700, color: 'var(--maroon-2)' }}>
                        +{toAr(members[2].points - me.points)} حسنة
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Podium top 3 */}
              {top3.length ? (
                <div className="hasanat-podium">
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map((m, podiumIdx) => {
                    const pos = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                    const actual = members.find((x) => x.id === m.id);
                    const heights = { 1: 90, 2: 68, 3: 52 };
                    return (
                      <div key={m.id} className={'hasanat-podium-item' + (actual?.is_me ? ' podium-me' : '')} style={{ '--ph': heights[pos] + 'px' }}>
                        <div className="pod-medal">{MEDALS[pos]}</div>
                        <div className="pod-av" style={{ background: avBg(m.id) }}>{m.name[0]}</div>
                        <div className="pod-name">{m.name.split(' ')[0]}</div>
                        <div className="pod-pts ar-num">{toAr(m.points)}</div>
                        {m.committee ? <div className="pod-comm" style={{ background: m.committee.soft, color: m.committee.color }}>{m.committee.name}</div> : null}
                        <div className="pod-stand" style={{ height: 'var(--ph)' }}></div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Full ranked list */}
              <div className="hasanat-list">
                {members.map((m) => (
                  <div key={m.id} className={'hasanat-row' + (m.is_me ? ' hrow-me' : '')}>
                    <div className="hr-rank">
                      {MEDALS[m.rank] ? <span>{MEDALS[m.rank]}</span> : <span className="ar-num" style={{ color: 'var(--muted)', fontSize: 13 }}>#{toAr(m.rank)}</span>}
                    </div>
                    <div className="hr-av" style={{ background: avBg(m.id) }}>{m.name[0]}</div>
                    <div className="hr-info">
                      <div className="hr-name">{m.name}{m.is_me ? <span className="hrow-you"> (أنتِ)</span> : ''}</div>
                      {m.committee ? <div className="hr-comm" style={{ color: m.committee.color }}>{m.committee.name}</div> : null}
                    </div>
                    <div className="hr-right">
                      <div className="hr-pts ar-num">{toAr(m.points)}</div>
                      <div className="hr-pts-label">حسنة</div>
                    </div>
                  </div>
                ))}
                {members.length === 0 ? (
                  <div className="empty"><div className="ic">🌱</div>لا بيانات بعد — أنجزي أول مهمة</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
