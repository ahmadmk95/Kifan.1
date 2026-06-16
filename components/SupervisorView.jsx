'use client';

import { useEffect, useState, useCallback } from 'react';
import DateRow from './DateRow';
import TaskCard, { groupByCommittee, CommHead } from './TaskCard';
import { ProgressRing, Avatar, Icon } from './Shared';
import AddTaskModal from './AddTaskModal';
import AddCommitteeModal from './AddCommitteeModal';
import RequestCard from './RequestCard';
import { toAr, avBg } from '@/lib/palette';
import { api } from '@/lib/api';

export default function SupervisorView({ user }) {
  const [tab, setTab] = useState('overview');
  const [taskModal, setTaskModal] = useState(false);
  const [commModal, setCommModal] = useState(false);
  const [night, setNight] = useState(null);
  const [nights, setNights] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overview, setOverview] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [{ night: n }, { nights: allNights }] = await Promise.all([api.activeNight(), api.nights()]);
    setNight(n);
    setNights(allNights);
    const [{ committees: c }, { tasks: t }, { requests: r }, ov, { comments: cm }] = await Promise.all([
      api.committees(),
      api.allTasks(n.id),
      api.requests(),
      api.overview(n.id),
      api.comments(n.id),
    ]);
    setCommittees(c);
    setTasks(t);
    setRequests(r);
    setOverview(ov);
    setComments(cm);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectNight = async (n) => {
    if (night && n.id === night.id) return;
    await api.setActiveNight(n.id);
    await loadAll();
  };

  const removeTask = async (id) => {
    await api.removeTask(id);
    await refreshTasksAndOverview();
  };

  const removeComment = async (taskId, commentId) => {
    await api.removeComment(taskId, commentId);
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, comments: (t.comments || []).filter((c) => c.id !== commentId) } : t)));
    const { comments: cm } = await api.comments(night.id);
    setComments(cm);
  };

  const refreshTasksAndOverview = async () => {
    if (!night) return;
    const [{ tasks: t }, ov, { comments: cm }] = await Promise.all([
      api.allTasks(night.id),
      api.overview(night.id),
      api.comments(night.id),
    ]);
    setTasks(t);
    setOverview(ov);
    setComments(cm);
  };

  const toggle = async (id, done) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      await api.toggleTask(id, done);
      const ov = await api.overview(night.id);
      setOverview(ov);
    } catch {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    }
  };

  const comment = async (id, text) => {
    const { comment: c } = await api.addComment(id, text);
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, comments: [...(t.comments || []), c] } : t)));
    const { comments: cm } = await api.comments(night.id);
    setComments(cm);
  };

  const addTask = async (payload) => {
    await api.addTask(payload);
    setTaskModal(false);
    setTab('tasks');
    await refreshTasksAndOverview();
  };

  const addCommittee = async (payload) => {
    const { committee } = await api.addCommittee(payload);
    setCommittees((cs) => [...cs, committee]);
    setCommModal(false);
    setTab('committees');
  };

  const removeCommittee = async (id) => {
    await api.removeCommittee(id);
    setCommittees((cs) => cs.filter((c) => c.id !== id));
    await refreshTasksAndOverview();
    const { requests: r } = await api.requests();
    setRequests(r);
  };

  const activate = async (userId, committeeId) => {
    await api.activateRequest(userId, committeeId);
    setRequests((rs) => rs.filter((r) => r.id !== userId));
    const ov = await api.overview(night.id);
    setOverview(ov);
  };

  const reject = async (userId) => {
    await api.rejectRequest(userId);
    setRequests((rs) => rs.filter((r) => r.id !== userId));
  };

  if (loading || !night) return <div className="main"></div>;

  const servants = overview ? overview.members : [];
  const totals = overview ? overview.totals : { done: 0, total: 0, servants: 0, committees: committees.length };
  const overall = totals.total ? (totals.done / totals.total) * 100 : 0;
  const commById = (id) => committees.find((c) => c.id === id);

  return (
    <div className="main">
      <DateRow night={night} nights={nights} onSelect={selectNight} />
      <div className="greet">
        <h2>لوحة المتابعة — {user.name.split(' ')[0]}</h2>
        <p>
          متابعة أداء اللجان لليلة الثالثة من محرم · {toAr(totals.servants)} خادمات · {toAr(totals.committees)} لجان
        </p>
      </div>

      <div className="toolbar">
        <div className="tabs" style={{ overflowX: 'auto' }}>
          <button className={'tab' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>
            نظرة عامة
          </button>
          <button className={'tab' + (tab === 'tasks' ? ' active' : '')} onClick={() => setTab('tasks')}>
            المهام
          </button>
          <button className={'tab' + (tab === 'committees' ? ' active' : '')} onClick={() => setTab('committees')}>
            اللجان
          </button>
          <button className={'tab' + (tab === 'requests' ? ' active' : '')} onClick={() => setTab('requests')}>
            الطلبات{requests.length ? <span className="badge-n ar-num">{toAr(requests.length)}</span> : null}
          </button>
          <button className={'tab' + (tab === 'comments' ? ' active' : '')} onClick={() => setTab('comments')}>
            التعليقات
          </button>
        </div>
        {tab === 'tasks' ? (
          <button className="add-btn" onClick={() => setTaskModal(true)}>
            <Icon.plus /> إضافة مهمة
          </button>
        ) : null}
        {tab === 'committees' ? (
          <button className="add-btn" onClick={() => setCommModal(true)}>
            <Icon.plus /> إضافة لجنة
          </button>
        ) : null}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="summary">
            <ProgressRing value={overall} />
            <div className="summary-txt">
              <h3>إنجاز اللجان العام</h3>
              <p>
                أُنجزت {toAr(totals.done)} مهمة من أصل {toAr(totals.total)}
              </p>
            </div>
            <div className="summary-stats">
              <div className="stat">
                <div className="v g ar-num">{toAr(totals.done)}</div>
                <div className="l">منجزة</div>
              </div>
              <div className="stat">
                <div className="v r ar-num">{toAr(totals.total - totals.done)}</div>
                <div className="l">متبقية</div>
              </div>
            </div>
          </div>
          <div className="cat-head">
            <h4>الخادمات</h4>
          </div>
          <div className="members-grid">
            {servants.map((m) => (
              <div className="mcard" key={m.id}>
                <div className="mcard-top">
                  <Avatar member={{ id: m.id, initials: m.name[0] }} className="av" />
                  <div>
                    <div className="nm">{m.name}</div>
                    <div className="tt">{m.title}</div>
                  </div>
                  <span className="mcard-pct ar-num" style={{ marginInlineStart: 'auto' }}>
                    {toAr(m.percent)}٪
                  </span>
                </div>
                <div className="mbar">
                  <i style={{ width: m.percent + '%' }}></i>
                </div>
                <div className="mcard-foot">
                  <span className="done ar-num">✓ {toAr(m.done)} منجزة</span>
                  <span className="rem ar-num">{toAr(m.total - m.done)} متبقية</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'tasks' ? (
        tasks.length ? (
          groupByCommittee(tasks, committees).map((g) => (
            <div key={g.committee.id}>
              <CommHead committee={g.committee} items={g.items} />
              {g.items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  committee={g.committee}
                  assignee={servants.find((s) => s.id === t.assignee_id) || { name: '' }}
                  currentUser={user}
                  onToggle={toggle}
                  onComment={comment}
                  onRemoveComment={removeComment}
                  onRemoveTask={removeTask}
                  showAssignee
                />
              ))}
            </div>
          ))
        ) : (
          <div className="empty">
            <div className="ic">📋</div>لا مهام بعد — أضيفي مهمة جديدة
          </div>
        )
      ) : null}

      {tab === 'committees' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 640 }}>
          {committees.map((c) => {
            const memCount = servants.filter((s) => s.committee_id === c.id).length;
            const taskCount = tasks.filter((t) => t.committee_id === c.id).length;
            return (
              <div className="comm-card" key={c.id}>
                <span className="comm-swatch" style={{ background: c.color }}></span>
                <div>
                  <div className="nm">{c.name}</div>
                  <div className="meta ar-num">
                    {toAr(memCount)} خادمات · {toAr(taskCount)} مهام
                  </div>
                </div>
                <div className="acts">
                  <button
                    className="icon-btn"
                    title="حذف اللجنة"
                    onClick={() => {
                      if (window.confirm('حذف لجنة «' + c.name + '»؟ ستُحذف مهامها وتُلغى إسناد خادماتها.')) removeCommittee(c.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'requests' ? (
        requests.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 700 }}>
            {requests.map((p) => (
              <RequestCard key={p.id} user={p} committees={committees} onActivate={activate} onReject={reject} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="ic">✅</div>لا طلبات تسجيل معلّقة حالياً
          </div>
        )
      ) : null}

      {tab === 'comments' ? (
        comments.length ? (
          <div className="feed">
            {comments.map((c) => (
              <div className="feed-item" key={c.id}>
                <div className="avatar av" style={{ background: avBg(c.author_id) }}>
                  {c.author[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fi-top">
                    <span className="au">{c.author}</span>
                    <span className="ctx">على مهمة: {c.task_title}</span>
                  </div>
                  <div className="tx">{c.text}</div>
                  <div className="tm ar-num">{c.time}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="ic">💬</div>لا توجد تعليقات حتى الآن
          </div>
        )
      ) : null}

      {taskModal ? (
        <AddTaskModal
          committees={committees}
          servants={servants.map((s) => ({ id: s.id, name: s.name, committee_id: s.committee_id }))}
          nightId={night.id}
          onClose={() => setTaskModal(false)}
          onAdd={addTask}
        />
      ) : null}
      {commModal ? <AddCommitteeModal committees={committees} onClose={() => setCommModal(false)} onAdd={addCommittee} /> : null}
    </div>
  );
}
