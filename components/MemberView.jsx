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
  const [committees, setCommittees] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ night: n }, { nights: allNights }] = await Promise.all([api.activeNight(), api.nights()]);
    setNight(n);
    setNights(allNights);
    const [{ tasks: t }, { committees: c }, { ratings: r }] = await Promise.all([
      api.myTasks(n.id),
      api.committees(),
      api.ratings(),
    ]);
    setTasks(t);
    setCommittees(c);
    setRatings(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id, done) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      await api.toggleTask(id, done);
    } catch {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !done } : t)));
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

  return (
    <div className="main">
      <DateRow night={night} nights={nights} />
      <div className="greet">
        <h2>السلام عليكِ، {user.name.split(' ')[0]} 🤍</h2>
        <p>{user.title} — وفّقكِ الله في خدمة عزاء الحسين عليه السلام</p>
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

      <div className="cat-head">
        <h4>تقييمات وكلمات تشجيعية</h4>
      </div>
      {ratings.length ? (
        <div className="ratings-list">
          {ratings.map((r) => (
            <div className="rating-card" key={r.id}>
              <div className="rc-top">
                <span className="rc-stars">{'★'.repeat(r.rating)}</span>
                <span className="rc-author">{r.author}</span>
              </div>
              {r.comment ? <div className="rc-comment">{r.comment}</div> : null}
              <div className="rc-time ar-num">{r.time}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="ic">⭐</div>لا تقييمات بعد
        </div>
      )}
    </div>
  );
}
