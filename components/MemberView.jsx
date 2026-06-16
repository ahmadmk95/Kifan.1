'use client';

import { useEffect, useState, useCallback } from 'react';
import DateRow from './DateRow';
import TaskCard, { groupByCommittee, CommHead } from './TaskCard';
import { ProgressRing } from './Shared';
import { toAr } from '@/lib/palette';
import { api } from '@/lib/api';

export default function MemberView({ user }) {
  const [night, setNight] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { night: n } = await api.activeNight();
    setNight(n);
    const [{ tasks: t }, { committees: c }] = await Promise.all([api.myTasks(n.id), api.committees()]);
    setTasks(t);
    setCommittees(c);
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

  if (loading) return <div className="main"></div>;

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? (done / total) * 100 : 0;
  const groups = groupByCommittee(tasks, committees);
  const commById = (id) => committees.find((c) => c.id === id);

  return (
    <div className="main">
      <DateRow night={night} />
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
              <TaskCard key={t.id} task={t} committee={commById(t.committee_id)} onToggle={toggle} onComment={comment} />
            ))}
          </div>
        ))
      ) : (
        <div className="empty">
          <div className="ic">🕊️</div>لم تُسند إليكِ مهام بعد — ستظهر هنا فور إضافتها
        </div>
      )}
    </div>
  );
}
