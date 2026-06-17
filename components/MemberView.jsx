'use client';

import { useEffect, useState, useCallback } from 'react';
import DateRow from './DateRow';
import TaskCard, { groupByCommittee, CommHead } from './TaskCard';
import { ProgressRing } from './Shared';
import { toAr } from '@/lib/palette';
import { api } from '@/lib/api';

export default function MemberView({ user }) {
  const [night, setNight] = useState(null);
  const [nights, setNights] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [newRatingsCount, setNewRatingsCount] = useState(user.unseen_ratings || 0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ night: n }, { nights: allNights }] = await Promise.all([api.activeNight(), api.nights()]);
    setNight(n);
    setNights(allNights);
    const [{ tasks: t, unassigned: u }, { committees: c }, { ratings: r }] = await Promise.all([
      api.myTasks(n.id),
      api.committees(),
      api.ratings(),
    ]);
    setTasks(t);
    setUnassigned(u || []);
    setCommittees(c);
    setRatings(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectNight = async (n) => {
    if (night && n.id === night.id) return;
    setNight(n);
    const { tasks: t, unassigned: u } = await api.myTasks(n.id);
    setTasks(t);
    setUnassigned(u || []);
  };

  const toggle = async (id, done) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
    setUnassigned((ts) => ts.map((t) => (t.id === id ? { ...t, my_done: done } : t)));
    try {
      await api.toggleTask(id, done);
      if (unassigned.some((t) => t.id === id)) {
        const { unassigned: u } = await api.myTasks(night.id);
        setUnassigned(u || []);
      }
    } catch {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !done } : t)));
      setUnassigned((ts) => ts.map((t) => (t.id === id ? { ...t, my_done: !done } : t)));
    }
  };

  const claim = async (id, val) => {
    setUnassigned((ts) => ts.map((t) => (t.id === id ? { ...t, my_claimed: val } : t)));
    try {
      await api.claimTask(id, val);
      const { unassigned: u } = await api.myTasks(night.id);
      setUnassigned(u || []);
    } catch {
      setUnassigned((ts) => ts.map((t) => (t.id === id ? { ...t, my_claimed: !val } : t)));
    }
  };

  const comment = async (id, text) => {
    const { comment: c } = await api.addComment(id, text);
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, comments: [...(t.comments || []), c] } : t)));
  };

  const removeComment = async (taskId, commentId) => {
    await api.removeComment(taskId, commentId);
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, comments: (t.comments || []).filter((c) => c.id !== commentId) } : t)));
  };

  if (loading) return <div className="main"></div>;

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? (done / total) * 100 : 0;
  const groups = groupByCommittee(tasks, committees);
  const commById = (id) => committees.find((c) => c.id === id);
  const myCommittee = committees.find((c) => c.id === user.committee_id);

  const claimedByMe = unassigned.filter((t) => t.my_claimed);
  const available = unassigned.filter((t) => !t.my_claimed);

  return (
    <div className="main">
      <DateRow night={night} nights={nights} onSelect={selectNight} />
      <div className="greet">
        <h2>السلام عليكِ، {user.name.split(' ')[0]} 🤍</h2>
        <p>{user.title} — وفّقكِ الله في خدمة عزاء الحسين عليه السلام</p>
        {myCommittee ? (
          <p style={{ marginTop: 4, fontWeight: 600, color: 'var(--maroon-2)' }}>
            <span className="cat-dot" style={{ background: myCommittee.color, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginInlineEnd: 6 }}></span>
            لجنة {myCommittee.name}
          </p>
        ) : null}
      </div>

      <div className="summary">
        <ProgressRing value={pct} />
        <div className="summary-txt">
          <h3>{total && done === total ? 'أتممتِ كل مهامكِ — أحسنتِ' : 'تقدّم مهامكِ هذه الليلة'}</h3>
          <p>{user.title}</p>
        </div>
        <div className="summary-stats">
          <div className="stat">
            <div className="v g ar-num">{toAr(done)}</div>
            <div className="l">منجزة</div>
          </div>
          <div className="stat">
            <div className="v r ar-num">{toAr(total - done)}</div>
            <div className="l">متبقية</div>
          </div>
          <div className="stat">
            <div className="v ar-num">{toAr(total)}</div>
            <div className="l">الإجمالي</div>
          </div>
        </div>
      </div>

      {ratings.length || newRatingsCount > 0 ? (
        <div className="ratings-pinned">
          <div className="ratings-pinned-head">
            <span>كلمات تشجيعية 🤍</span>
            {newRatingsCount > 0 ? <span className="notif-badge">{newRatingsCount}</span> : null}
          </div>
          <div className="ratings-scroll">
            {ratings.map((r) => (
              <div className={`rating-card rc-compact${r.is_new ? ' rating-new' : ''}`} key={r.id}>
                {r.is_new ? <div className="new-tag">جديد ✨</div> : null}
                <div className="rc-top">
                  <span className="rc-stars">{'★'.repeat(r.rating)}</span>
                  <span className="rc-author">{r.author}</span>
                </div>
                {r.comment ? <div className="rc-comment">{r.comment}</div> : null}
                <div className="rc-time ar-num">{r.time}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {groups.length ? (
        groups.map((g) => (
          <div key={g.committee.id}>
            <CommHead committee={g.committee} items={g.items} />
            {g.items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                committee={commById(t.committee_id)}
                currentUser={user}
                onToggle={toggle}
                onComment={comment}
                onRemoveComment={removeComment}
              />
            ))}
          </div>
        ))
      ) : (
        <div className="empty">
          <div className="ic">🕊️</div>لم تُسند إليكِ مهام بعد — ستظهر هنا فور إضافتها
        </div>
      )}

      {claimedByMe.length ? (
        <>
          <div className="cat-head" style={{ marginTop: 22 }}>
            <h4>مهام أسندتها لنفسي</h4>
            <span className="count">{claimedByMe.length}</span>
          </div>
          {claimedByMe.map((t) => (
            <div key={t.id}>
              <TaskCard
                task={{ ...t, done: t.my_done }}
                committee={commById(t.committee_id)}
                currentUser={user}
                onToggle={toggle}
                onComment={comment}
                onRemoveComment={removeComment}
                hideCheck
              />
              <div className="unassigned-actions">
                <button className="ua-btn" onClick={() => claim(t.id, false)}>
                  إلغاء الإسناد
                </button>
                <button
                  className={`ua-btn ua-done${t.my_done ? ' ua-active' : ''}`}
                  onClick={() => toggle(t.id, !t.my_done)}
                >
                  {t.my_done ? '✓ أنجزتُها' : 'تم الإنجاز'}
                </button>
              </div>
              {((t.claimors && t.claimors.filter((n) => n !== user.name).length > 0) || (t.completors && t.completors.filter((n) => n !== user.name).length > 0)) ? (
                <div className="completors-row">
                  {t.claimors && t.claimors.filter((n) => n !== user.name).length > 0 ? <span>📌 تعمل معكِ أيضاً: {t.claimors.filter((n) => n !== user.name).join('، ')}</span> : null}
                  {t.completors && t.completors.filter((n) => n !== user.name).length > 0 ? <span>✓ أنجزتها أيضاً: {t.completors.filter((n) => n !== user.name).join('، ')}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      {available.length ? (
        <>
          <div className="cat-head" style={{ marginTop: 22 }}>
            <h4>مهام لجنتكِ — متاحة للمساعدة</h4>
            <span className="count">{available.length}</span>
          </div>
          {available.map((t) => (
            <div key={t.id}>
              <TaskCard
                task={{ ...t, done: t.my_done }}
                committee={commById(t.committee_id)}
                currentUser={user}
                onToggle={toggle}
                onComment={comment}
                onRemoveComment={removeComment}
                hideCheck
              />
              <div className="unassigned-actions">
                <button className="ua-btn" onClick={() => claim(t.id, true)}>
                  ＋ أسند لي
                </button>
                <button
                  className={`ua-btn ua-done${t.my_done ? ' ua-active' : ''}`}
                  onClick={() => toggle(t.id, !t.my_done)}
                >
                  {t.my_done ? '✓ أنجزتُها' : 'تم الإنجاز'}
                </button>
              </div>
              {(t.claimors && t.claimors.length) || (t.completors && t.completors.length) ? (
                <div className="completors-row">
                  {t.claimors && t.claimors.length ? <span>📌 تعمل عليها: {t.claimors.join('، ')}</span> : null}
                  {t.completors && t.completors.length ? <span>✓ أنجزتها: {t.completors.join('، ')}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

    </div>
  );
}
