'use client';

import { useEffect, useState, useCallback } from 'react';
import DateRow from './DateRow';
import TaskCard, { groupByCommittee, CommHead } from './TaskCard';
import { ProgressRing, Avatar, Icon } from './Shared';
import AddTaskModal from './AddTaskModal';
import AddCommitteeModal from './AddCommitteeModal';
import CommitteeDetailModal from './CommitteeDetailModal';
import RequestCard from './RequestCard';
import { toAr, avBg } from '@/lib/palette';
import { api } from '@/lib/api';

export default function SupervisorView({ user }) {
  const isAdmin = user.role === 'supervisor';
  const [tab, setTab] = useState('overview');
  const [taskModal, setTaskModal] = useState(false);
  const [commModal, setCommModal] = useState(false);
  const [detailCommittee, setDetailCommittee] = useState(null);
  const [night, setNight] = useState(null);
  const [nights, setNights] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overview, setOverview] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rateMember, setRateMember] = useState('');
  const [rateValue, setRateValue] = useState('5');
  const [rateComment, setRateComment] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [memberRatings, setMemberRatings] = useState([]);

  const [spotlight, setSpotlight] = useState(null);
  const [spotMember, setSpotMember] = useState('');
  const [spotNote, setSpotNote] = useState('');
  const [spotBusy, setSpotBusy] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'servant', committee_id: '' });
  const [userBusy, setUserBusy] = useState(false);
  const [userErr, setUserErr] = useState('');

  const loadAll = useCallback(async () => {
    const [{ night: n }, { nights: allNights }] = await Promise.all([api.activeNight(), api.nights()]);
    setNight(n);
    setNights(allNights);
    const [{ committees: c }, { tasks: t }, ov, { comments: cm }] = await Promise.all([
      api.committees(),
      api.allTasks(n.id),
      api.overview(n.id),
      api.comments(n.id),
    ]);
    setCommittees(c);
    setTasks(t);
    setOverview(ov);
    setComments(cm);
    if (isAdmin) {
      const [{ requests: r }, { users: u }] = await Promise.all([api.requests(), api.users()]);
      setRequests(r);
      setAllUsers(u);
    }
    setLoading(false);
  }, [isAdmin]);

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
    const [ov, { users: u }] = await Promise.all([api.overview(night.id), api.users()]);
    setOverview(ov);
    setAllUsers(u);
  };

  const reject = async (userId) => {
    await api.rejectRequest(userId);
    setRequests((rs) => rs.filter((r) => r.id !== userId));
  };

  const setSupervisor = async (committeeId, userId) => {
    await api.setCommitteeSupervisor(committeeId, userId || null);
    await loadAll();
  };

  const loadMemberRatings = useCallback(async (memberId) => {
    if (!memberId) {
      setMemberRatings([]);
      return;
    }
    const { ratings } = await api.ratings(memberId);
    setMemberRatings(ratings);
  }, []);

  useEffect(() => {
    if (tab === 'ratings') loadMemberRatings(rateMember);
  }, [tab, rateMember, loadMemberRatings]);

  const submitRating = async () => {
    if (!rateMember || rateBusy) return;
    setRateBusy(true);
    try {
      await api.addRating(rateMember, Number(rateValue), rateComment);
      setRateComment('');
      await loadMemberRatings(rateMember);
    } finally {
      setRateBusy(false);
    }
  };

  const removeRating = async (id) => {
    await api.removeRating(id);
    await loadMemberRatings(rateMember);
  };

  useEffect(() => {
    if (tab === 'spotlight') {
      api.spotlight().then(({ spotlight: s }) => setSpotlight(s));
    }
  }, [tab]);

  const submitSpotlight = async () => {
    if (!spotMember || spotBusy) return;
    setSpotBusy(true);
    try {
      const { spotlight: s } = await api.setSpotlight(spotMember, spotNote);
      setSpotlight(s);
      setSpotNote('');
    } finally {
      setSpotBusy(false);
    }
  };

  const loadUsers = useCallback(async () => {
    const { users: u } = await api.users();
    setAllUsers(u);
  }, []);

  useEffect(() => {
    if ((tab === 'users' || tab === 'committees') && isAdmin) loadUsers();
  }, [tab, isAdmin, loadUsers]);

  const submitNewUser = async () => {
    if (userBusy) return;
    setUserBusy(true);
    setUserErr('');
    try {
      await api.addUser(userForm);
      setUserForm({ name: '', username: '', password: '', role: 'servant', committee_id: '' });
      await loadUsers();
    } catch (e) {
      setUserErr(e.message || 'حدث خطأ');
    } finally {
      setUserBusy(false);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm('حذف المستخدمة «' + name + '»؟ سيُحذف كل ما يخصها من مهام وتعليقات.')) return;
    await api.removeUser(id);
    await loadUsers();
    await refreshTasksAndOverview();
  };

  const updateUser = async (id, payload) => {
    await api.updateUser(id, payload);
    await loadUsers();
    await loadAll();
  };

  const resetUserPassword = async (id) => {
    const pw = window.prompt('كلمة المرور الجديدة (٤ أحرف على الأقل):');
    if (!pw) return;
    try {
      await api.resetPassword(id, pw);
      window.alert('تم تحديث كلمة المرور');
    } catch (e) {
      window.alert(e.message || 'حدث خطأ');
    }
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
          {isAdmin ? (
            <button className={'tab' + (tab === 'committees' ? ' active' : '')} onClick={() => setTab('committees')}>
              اللجان
            </button>
          ) : null}
          {isAdmin ? (
            <button className={'tab' + (tab === 'requests' ? ' active' : '')} onClick={() => setTab('requests')}>
              الطلبات{requests.length ? <span className="badge-n ar-num">{toAr(requests.length)}</span> : null}
            </button>
          ) : null}
          <button className={'tab' + (tab === 'comments' ? ' active' : '')} onClick={() => setTab('comments')}>
            التعليقات
          </button>
          <button className={'tab' + (tab === 'ratings' ? ' active' : '')} onClick={() => setTab('ratings')}>
            التقييم
          </button>
          {isAdmin ? (
            <button className={'tab' + (tab === 'spotlight' ? ' active' : '')} onClick={() => setTab('spotlight')}>
              خادمة اليوم
            </button>
          ) : null}
          {isAdmin ? (
            <button className={'tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>
              إدارة المستخدمين
            </button>
          ) : null}
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
            const members = allUsers.filter(
              (u) => u.committee_id === c.id && (u.role === 'servant' || u.role === 'committee_supervisor')
            );
            return (
              <div className="comm-card" key={c.id} style={{ flexWrap: 'wrap' }}>
                <span className="comm-swatch" style={{ background: c.color }}></span>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setDetailCommittee(c)}>
                  <div className="nm">{c.name}</div>
                  <div className="meta ar-num">
                    {toAr(memCount)} خادمات · {toAr(taskCount)} مهام
                  </div>
                </div>
                <div className="acts" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={c.supervisor_id || ''}
                    onChange={(e) => setSupervisor(c.id, e.target.value)}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 9,
                      padding: '7px 9px',
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                      background: '#FCFAF5',
                    }}
                  >
                    <option value="">بدون مشرفة لجنة</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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

      {tab === 'ratings' ? (
        <div style={{ maxWidth: 640 }}>
          <div className="rate-form">
            <div className="rf-row">
              <select value={rateMember} onChange={(e) => setRateMember(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">اختر الخادمة</option>
                {servants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select value={rateValue} onChange={(e) => setRateValue(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="كلمة تشجيعية..."
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
            />
            <button className="add-btn" onClick={submitRating} disabled={!rateMember || rateBusy} style={{ alignSelf: 'flex-end' }}>
              إضافة تقييم
            </button>
          </div>
          {rateMember ? (
            memberRatings.length ? (
              <div className="ratings-list">
                {memberRatings.map((r) => (
                  <div className="rating-card" key={r.id}>
                    <div className="rc-top">
                      <span className="rc-stars">{'★'.repeat(r.rating)}</span>
                      <span className="rc-author">{r.author}</span>
                    </div>
                    {r.comment ? <div className="rc-comment">{r.comment}</div> : null}
                    <div className="rc-time ar-num">{r.time}</div>
                    {r.author_id === user.id || isAdmin ? (
                      <button
                        className="icon-btn"
                        style={{ marginTop: 6 }}
                        title="حذف"
                        onClick={() => removeRating(r.id)}
                      >
                        حذف
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="ic">⭐</div>لا تقييمات لهذه الخادمة بعد
              </div>
            )
          ) : null}
        </div>
      ) : null}

      {tab === 'spotlight' ? (
        <div style={{ maxWidth: 520 }}>
          <div className="spot-form">
            <select value={spotMember} onChange={(e) => setSpotMember(e.target.value)}>
              <option value="">اختر خادمة اليوم</option>
              {servants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              placeholder="كلمة شكر وتقدير..."
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
            />
            <button className="add-btn" onClick={submitSpotlight} disabled={!spotMember || spotBusy}>
              نشر التكريم
            </button>
          </div>
          {spotlight ? (
            <div className="rating-card" style={{ marginTop: 12 }}>
              <div className="rc-top">
                <span className="rc-author">حالياً: {spotlight.member_name}</span>
                <span className="ar-num">{toAr(spotlight.cheer_count)} 🤍</span>
              </div>
              {spotlight.note ? <div className="rc-comment">{spotlight.note}</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'users' ? (
        <div style={{ maxWidth: 700 }}>
          <div className="rate-form">
            <div className="rf-row">
              <input
                placeholder="الاسم الكامل"
                value={userForm.name}
                onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                style={{ flex: 1, minWidth: 150 }}
              />
              <input
                placeholder="اسم المستخدم"
                value={userForm.username}
                onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                style={{ flex: 1, minWidth: 130 }}
              />
            </div>
            <div className="rf-row">
              <input
                placeholder="كلمة المرور"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                style={{ flex: 1, minWidth: 130 }}
              />
              <select
                value={userForm.role}
                onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value, committee_id: '' }))}
              >
                <option value="servant">خادمة</option>
                <option value="supervisor">مشرفة عامة</option>
              </select>
              {userForm.role === 'servant' ? (
                <select
                  value={userForm.committee_id}
                  onChange={(e) => setUserForm((f) => ({ ...f, committee_id: e.target.value }))}
                >
                  <option value="">بدون لجنة</option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {userErr ? <div style={{ color: 'var(--crimson)', fontSize: 12.5 }}>{userErr}</div> : null}
            <button
              className="add-btn"
              onClick={submitNewUser}
              disabled={!userForm.name.trim() || !userForm.username.trim() || !userForm.password.trim() || userBusy}
              style={{ alignSelf: 'flex-end' }}
            >
              إضافة مستخدمة
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allUsers.map((u) => (
              <div className="comm-card" key={u.id} style={{ flexWrap: 'wrap' }}>
                <div className="avatar av" style={{ background: avBg(u.id) }}>
                  {u.name[0]}
                </div>
                <div>
                  <div className="nm">{u.name}</div>
                  <div className="meta">
                    @{u.username} · {u.title || (u.role === 'supervisor' ? 'مشرفة عامة' : 'بلا لجنة')}
                    {u.status === 'pending' ? (
                      <span className="status-pill pending" style={{ marginInlineStart: 6 }}>
                        معلّقة
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="acts" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {u.id !== user.id ? (
                    <select
                      value={u.role === 'committee_supervisor' ? 'servant' : u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        padding: '7px 9px',
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                        background: '#FCFAF5',
                      }}
                    >
                      <option value="servant">خادمة</option>
                      <option value="supervisor">مشرفة عامة</option>
                    </select>
                  ) : null}
                  {u.id !== user.id && u.role !== 'supervisor' ? (
                    <select
                      value={u.committee_id || ''}
                      onChange={(e) => updateUser(u.id, { committee_id: e.target.value })}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        padding: '7px 9px',
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                        background: '#FCFAF5',
                      }}
                    >
                      <option value="">بدون لجنة</option>
                      {committees.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button className="icon-btn" title="إعادة تعيين كلمة المرور" onClick={() => resetUserPassword(u.id)}>
                    🔑
                  </button>
                  {u.id !== user.id ? (
                    <button className="icon-btn" title="حذف المستخدمة" onClick={() => deleteUser(u.id, u.name)}>
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {taskModal ? (
        <AddTaskModal
          committees={isAdmin ? committees : committees.filter((c) => c.id === user.committee_id)}
          servants={servants.map((s) => ({ id: s.id, name: s.name, committee_id: s.committee_id }))}
          nightId={night.id}
          onClose={() => setTaskModal(false)}
          onAdd={addTask}
        />
      ) : null}
      {commModal ? <AddCommitteeModal committees={committees} onClose={() => setCommModal(false)} onAdd={addCommittee} /> : null}
      {detailCommittee ? (
        <CommitteeDetailModal
          committee={committees.find((c) => c.id === detailCommittee.id) || detailCommittee}
          members={allUsers.filter(
            (u) => u.committee_id === detailCommittee.id && (u.role === 'servant' || u.role === 'committee_supervisor')
          )}
          tasks={tasks.filter((t) => t.committee_id === detailCommittee.id)}
          currentUser={user}
          onClose={() => setDetailCommittee(null)}
          onToggle={toggle}
          onComment={comment}
          onRemoveComment={removeComment}
        />
      ) : null}
    </div>
  );
}
