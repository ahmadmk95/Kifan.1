/* ====== التطبيق — لجنة النساء · حسينية الأمير ====== */
const { useState, useEffect, useMemo } = React;
const STORE = 'kfn_data_v2';
const SESS = 'kfn_session_v2';
const DUA_FOOTER = 'رحم الله من أحيا أمرنا';

function loadData() {
  try { const raw = localStorage.getItem(STORE); if (raw) return JSON.parse(raw); } catch (e) {}
  const meta = {};
  SEED_TASKS.forEach(t => { meta[t.id] = { done: false, comments: (SEED_COMMENTS[t.id] || []).slice() }; });
  return {
    users: SEED_USERS.map(u => ({ ...u })),
    committees: SEED_COMMITTEES.map(c => ({ ...c })),
    tasks: SEED_TASKS.map(t => ({ ...t })),
    meta,
  };
}

function nowTime() {
  const d = new Date(); let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'م' : 'ص'; h = h % 12 || 12;
  return toAr(h + ':' + String(m).padStart(2, '0') + ' ' + ap);
}

/* ---------------- Auth ---------------- */
function AuthScreen({ users, onLogin, onRegister, initialMode }) {
  const [mode, setMode] = useState(initialMode || 'login');
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const doLogin = () => {
    const u = users.find(x => x.username.trim().toLowerCase() === f.username.trim().toLowerCase());
    if (!u || u.password !== f.password) return setMsg({ t: 'err', x: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    if (u.status === 'pending') return setMsg({ t: 'err', x: 'حسابكِ بانتظار التفعيل من خادمة الحسين' });
    onLogin(u.id);
  };
  const doRegister = () => {
    if (!f.name.trim() || !f.username.trim() || !f.password.trim())
      return setMsg({ t: 'err', x: 'يرجى تعبئة جميع الحقول' });
    if (users.some(x => x.username.trim().toLowerCase() === f.username.trim().toLowerCase()))
      return setMsg({ t: 'err', x: 'اسم المستخدم محجوز، اختاري اسماً آخر' });
    onRegister({ name: f.name.trim(), username: f.username.trim(), password: f.password });
    setMsg({ t: 'ok', x: 'تم إرسال طلبكِ — بانتظار تفعيله من خادمة الحسين' });
    setF({ name: '', username: '', password: '' });
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-logo"><img src="assets/logo.png" alt="شعار الحسينية" /></div>
          <h1>لجنة النساء — متابعة المهام</h1>
          <div className="sub">حسينية الحاج عبدالله الحسين الأمير · كيفان · محرم ١٤٤٨ هـ</div>
        </div>
        <div className="login-body">
          <div className="login-dua"><span>۞</span> اللهم اجعلني عندك وجيهاً بالحسين <span>۞</span></div>
          <div className="auth-tabs" style={{ marginTop: 18 }}>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMsg(null); }}>تسجيل الدخول</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMsg(null); }}>طلب تسجيل</button>
          </div>

          {msg ? <div className={'auth-msg ' + msg.t}>{msg.x}</div> : null}

          <div className="auth-form">
            {mode === 'register' ? (
              <div className="field">
                <label>الاسم الكامل</label>
                <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="مثال: زينب علي" />
              </div>
            ) : null}
            <div className="field">
              <label>اسم المستخدم</label>
              <input value={f.username} onChange={e => set('username', e.target.value)} placeholder="username"
                style={{ direction: 'ltr', textAlign: 'right' }} />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <input type="password" value={f.password} onChange={e => set('password', e.target.value)} placeholder="••••"
                onKeyDown={e => { if (e.key === 'Enter') (mode === 'login' ? doLogin() : doRegister()); }}
                style={{ direction: 'ltr', textAlign: 'right' }} />
            </div>
            <button className="auth-submit" onClick={mode === 'login' ? doLogin : doRegister}>
              {mode === 'login' ? 'دخول' : 'إرسال الطلب'}
            </button>
          </div>

          {mode === 'login'
            ? <div className="login-hint">للتجربة — المشرفة: <b>fatima</b> · خادمة: <b>zahra</b> · كلمة المرور: <b>1234</b></div>
            : <div className="login-hint">سيصلكِ التفعيل بعد مراجعة خادمة الحسين وإسناد لجنتكِ</div>}
        </div>
      </div>
      <div className="footer-dua">{DUA_FOOTER}</div>
    </div>
  );
}

/* ---------------- Top bar ---------------- */
function TopBar({ user, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-in">
        <div className="tb-logo"><img src="assets/logo.png" alt="" /></div>
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
          <button className="logout" onClick={onLogout}>خروج</button>
        </div>
      </div>
      <div className="topbar-strip"></div>
    </div>
  );
}

/* ---------------- Date + nights ---------------- */
function DateRow() {
  return (
    <div className="daterow">
      <div className="date-card">
        <div className="hj ar-num">ليلة ٣ محرم ١٤٤٨ هـ</div>
        <div className="gr ar-num">الموافق ١٨ يونيو ٢٠٢٦</div>
      </div>
      <div className="nights">
        {NIGHTS.map(n => {
          const cls = n.n === ACTIVE_NIGHT ? 'active' : (n.n < ACTIVE_NIGHT ? 'done' : '');
          return (
            <div key={n.n} className={'night ' + cls}>
              <span className="nn ar-num">{n.n === 10 ? '★' : toAr(n.n)}</span>
              {n.n === 10 ? 'عاشوراء' : 'محرم'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Task card ---------------- */
function TaskCard({ task, meta, committee, assignee, currentUser, users, onToggle, onComment, showAssignee }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const comments = meta.comments || [];
  const bgForName = (nm) => avBg((users.find(u => u.name === nm) || {}).id);

  const submit = () => { const v = txt.trim(); if (!v) return; onComment(task.id, v); setTxt(''); };

  return (
    <div className={'task' + (meta.done ? ' done' : '')}>
      <div className="task-main">
        <button className={'check' + (meta.done ? ' on' : '')} onClick={() => onToggle(task.id)} aria-label="إنجاز">
          <CheckMark />
        </button>
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span><Icon.clock /> <span className="ar-num">{task.time}</span></span>
            <span><Icon.pin /> {task.place}</span>
            {showAssignee && assignee ? <span style={{ color: 'var(--maroon-2)', fontWeight: 600 }}>♦ {assignee.name}</span> : null}
          </div>
          {task.note ? <div className="task-note"><Icon.note /> {task.note}</div> : null}
        </div>
        <div className="task-side">
          {committee ? <span className="cat-tag" style={{ background: committee.soft, color: committee.color }}>{committee.name}</span> : null}
          <button className={'cmt-btn' + (comments.length ? ' has' : '')} onClick={() => setOpen(o => !o)}>
            <Icon.chat /> {comments.length ? <span className="ar-num">{toAr(comments.length)}</span> : 'تعليق'}
          </button>
        </div>
      </div>
      {open ? (
        <div className="cmts">
          {comments.length ? comments.map(c => (
            <div className="cmt" key={c.id}>
              <div className="avatar av" style={{ background: bgForName(c.author) }}>{c.author[0]}</div>
              <div className="cmt-bubble">
                <div className="top"><span className="au">{c.author}</span><span className="tm ar-num">{c.time}</span></div>
                <div className="tx">{c.text}</div>
              </div>
            </div>
          )) : <div className="cmt-empty">لا توجد تعليقات بعد — أضيفي ملاحظة أو استفساراً</div>}
          <div className="cmt-form">
            <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="اكتبي تعليقاً..."
              onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            <button onClick={submit} disabled={!txt.trim()}>إرسال</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* group tasks by committee order */
function groupByCommittee(tasks, committees) {
  return committees
    .map(c => ({ committee: c, items: tasks.filter(t => t.committee === c.id) }))
    .filter(g => g.items.length);
}

function CommHead({ committee, items, meta }) {
  const done = items.filter(t => meta[t.id] && meta[t.id].done).length;
  return (
    <div className="cat-head">
      <span className="cat-dot" style={{ background: committee.color }}></span>
      <h4>{committee.name}</h4>
      <span className="count ar-num">{toAr(done)} / {toAr(items.length)}</span>
    </div>
  );
}

/* ---------------- Member view ---------------- */
function MemberView({ user, data, onToggle, onComment }) {
  const { tasks, meta, committees, users } = data;
  const mine = tasks.filter(t => t.assignee === user.id);
  const done = mine.filter(t => meta[t.id] && meta[t.id].done).length;
  const total = mine.length;
  const pct = total ? (done / total) * 100 : 0;
  const groups = groupByCommittee(mine, committees);
  const commById = id => committees.find(c => c.id === id);

  return (
    <div className="main">
      <DateRow />
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
          <div className="stat"><div className="v g ar-num">{toAr(done)}</div><div className="l">منجزة</div></div>
          <div className="stat"><div className="v r ar-num">{toAr(total - done)}</div><div className="l">متبقية</div></div>
          <div className="stat"><div className="v ar-num">{toAr(total)}</div><div className="l">الإجمالي</div></div>
        </div>
      </div>

      {groups.length ? groups.map(g => (
        <div key={g.committee.id}>
          <CommHead committee={g.committee} items={g.items} meta={meta} />
          {g.items.map(t => (
            <TaskCard key={t.id} task={t} meta={meta[t.id]} committee={commById(t.committee)}
              currentUser={user} users={users} onToggle={onToggle} onComment={onComment} />
          ))}
        </div>
      )) : <div className="empty"><div className="ic">🕊️</div>لم تُسند إليكِ مهام بعد — ستظهر هنا فور إضافتها</div>}
    </div>
  );
}

/* ---------------- Supervisor view ---------------- */
function SupervisorView({ user, data, onToggle, onComment, onAddTask, onAddCommittee, onRemoveCommittee, onActivate, onReject, initialTab, tasksComms }) {
  const [tab, setTab] = useState(initialTab || 'overview');
  const [taskModal, setTaskModal] = useState(false);
  const [commModal, setCommModal] = useState(false);
  const { users, committees, tasks, meta } = data;

  const servants = users.filter(u => u.role === 'servant' && u.status === 'active');
  const pending = users.filter(u => u.status === 'pending');
  const commById = id => committees.find(c => c.id === id);
  const userById = id => users.find(u => u.id === id);

  const totalDone = tasks.filter(t => meta[t.id] && meta[t.id].done).length;
  const overall = tasks.length ? (totalDone / tasks.length) * 100 : 0;

  const allComments = [];
  tasks.forEach(t => (meta[t.id]?.comments || []).forEach(c => allComments.push({ ...c, task: t })));

  return (
    <div className="main">
      <DateRow />
      <div className="greet">
        <h2>لوحة المتابعة — {user.name.split(' ')[0]}</h2>
        <p>متابعة أداء اللجان لليلة الثالثة من محرم · {toAr(servants.length)} خادمات · {toAr(committees.length)} لجان</p>
      </div>

      <div className="toolbar">
        <div className="tabs" style={{ overflowX: 'auto' }}>
          <button className={'tab' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>نظرة عامة</button>
          <button className={'tab' + (tab === 'tasks' ? ' active' : '')} onClick={() => setTab('tasks')}>المهام</button>
          <button className={'tab' + (tab === 'committees' ? ' active' : '')} onClick={() => setTab('committees')}>اللجان</button>
          <button className={'tab' + (tab === 'requests' ? ' active' : '')} onClick={() => setTab('requests')}>
            الطلبات{pending.length ? <span className="badge-n ar-num">{toAr(pending.length)}</span> : null}
          </button>
          <button className={'tab' + (tab === 'comments' ? ' active' : '')} onClick={() => setTab('comments')}>التعليقات</button>
        </div>
        {tab === 'tasks' ? <button className="add-btn" onClick={() => setTaskModal(true)}><Icon.plus /> إضافة مهمة</button> : null}
        {tab === 'committees' ? <button className="add-btn" onClick={() => setCommModal(true)}><Icon.plus /> إضافة لجنة</button> : null}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="summary">
            <ProgressRing value={overall} />
            <div className="summary-txt">
              <h3>إنجاز اللجان العام</h3>
              <p>أُنجزت {toAr(totalDone)} مهمة من أصل {toAr(tasks.length)}</p>
            </div>
            <div className="summary-stats">
              <div className="stat"><div className="v g ar-num">{toAr(totalDone)}</div><div className="l">منجزة</div></div>
              <div className="stat"><div className="v r ar-num">{toAr(tasks.length - totalDone)}</div><div className="l">متبقية</div></div>
            </div>
          </div>
          <div className="cat-head"><h4>الخادمات</h4></div>
          <div className="members-grid">
            {servants.map(m => {
              const mine = tasks.filter(t => t.assignee === m.id);
              const d = mine.filter(t => meta[t.id] && meta[t.id].done).length;
              const p = mine.length ? Math.round((d / mine.length) * 100) : 0;
              return (
                <div className="mcard" key={m.id}>
                  <div className="mcard-top">
                    <Avatar member={m} className="av" />
                    <div>
                      <div className="nm">{m.name}</div>
                      <div className="tt">{m.title}</div>
                    </div>
                    <span className="mcard-pct ar-num" style={{ marginInlineStart: 'auto' }}>{toAr(p)}٪</span>
                  </div>
                  <div className="mbar"><i style={{ width: p + '%' }}></i></div>
                  <div className="mcard-foot">
                    <span className="done ar-num">✓ {toAr(d)} منجزة</span>
                    <span className="rem ar-num">{toAr(mine.length - d)} متبقية</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === 'tasks' ? (
        tasks.length ? groupByCommittee(tasks, committees).filter(g => !tasksComms || tasksComms.includes(g.committee.id)).map(g => (
          <div key={g.committee.id}>
            <CommHead committee={g.committee} items={g.items} meta={meta} />
            {g.items.map(t => (
              <TaskCard key={t.id} task={t} meta={meta[t.id]} committee={g.committee}
                assignee={userById(t.assignee)} currentUser={user} users={users}
                onToggle={onToggle} onComment={onComment} showAssignee />
            ))}
          </div>
        )) : <div className="empty"><div className="ic">📋</div>لا مهام بعد — أضيفي مهمة جديدة</div>
      ) : null}

      {tab === 'committees' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 640 }}>
          {committees.map(c => {
            const memCount = servants.filter(s => s.committee === c.id).length;
            const taskCount = tasks.filter(t => t.committee === c.id).length;
            return (
              <div className="comm-card" key={c.id}>
                <span className="comm-swatch" style={{ background: c.color }}></span>
                <div>
                  <div className="nm">{c.name}</div>
                  <div className="meta ar-num">{toAr(memCount)} خادمات · {toAr(taskCount)} مهام</div>
                </div>
                <div className="acts">
                  <button className="icon-btn" title="حذف اللجنة" onClick={() => {
                    if (window.confirm('حذف لجنة «' + c.name + '»؟ ستُحذف مهامها وتُلغى إسناد خادماتها.')) onRemoveCommittee(c.id);
                  }}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'requests' ? (
        pending.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 700 }}>
            {pending.map(p => <RequestCard key={p.id} user={p} committees={committees} onActivate={onActivate} onReject={onReject} />)}
          </div>
        ) : <div className="empty"><div className="ic">✅</div>لا طلبات تسجيل معلّقة حالياً</div>
      ) : null}

      {tab === 'comments' ? (
        allComments.length ? (
          <div className="feed">
            {allComments.map(c => (
              <div className="feed-item" key={c.id}>
                <div className="avatar av" style={{ background: avBg((users.find(u => u.name === c.author) || {}).id) }}>{c.author[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="fi-top">
                    <span className="au">{c.author}</span>
                    <span className="ctx">على مهمة: {c.task.title}</span>
                  </div>
                  <div className="tx">{c.text}</div>
                  <div className="tm ar-num">{c.time}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty"><div className="ic">💬</div>لا توجد تعليقات حتى الآن</div>
      ) : null}

      {taskModal ? <AddTaskModal committees={committees} servants={servants}
        onClose={() => setTaskModal(false)} onAdd={t => { onAddTask(t); setTaskModal(false); setTab('tasks'); }} /> : null}
      {commModal ? <AddCommitteeModal committees={committees}
        onClose={() => setCommModal(false)} onAdd={c => { onAddCommittee(c); setCommModal(false); setTab('committees'); }} /> : null}
    </div>
  );
}

/* ---------------- Request card ---------------- */
function RequestCard({ user, committees, onActivate, onReject }) {
  const [comm, setComm] = useState('');
  return (
    <div className="req-card">
      <Avatar member={user} className="av" />
      <div className="req-info">
        <div className="nm">{user.name}</div>
        <div className="un" style={{ direction: 'ltr', textAlign: 'right' }}>@{user.username}</div>
      </div>
      <span className="status-pill pending" style={{ marginInlineStart: 8 }}>بانتظار التفعيل</span>
      <div className="req-acts">
        <select value={comm} onChange={e => setComm(e.target.value)}>
          <option value="">اختاري اللجنة…</option>
          {committees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn-ok" disabled={!comm} onClick={() => onActivate(user.id, comm)}>تفعيل وإسناد</button>
        <button className="btn-reject" onClick={() => { if (window.confirm('رفض طلب ' + user.name + '؟')) onReject(user.id); }}>رفض</button>
      </div>
    </div>
  );
}

/* ---------------- Add task modal ---------------- */
function AddTaskModal({ committees, servants, onClose, onAdd, embedded }) {
  const [f, setF] = useState({ title: '', committee: committees[0] ? committees[0].id : '', assignee: '', time: '', place: '', note: '' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const inComm = servants.filter(s => s.committee === f.committee);
  const valid = f.title.trim() && f.time.trim() && f.place.trim() && f.assignee;
  const ov = embedded ? { position: 'static', background: 'none', backdropFilter: 'none', padding: 0, display: 'block', animation: 'none' } : undefined;
  return (
    <div className="overlay" style={ov} onClick={embedded ? undefined : onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>إضافة مهمة يومية</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="field"><label>عنوان المهمة</label>
            <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="مثال: تجهيز قسم النذور" autoFocus /></div>
          <div className="field-row">
            <div className="field"><label>اللجنة</label>
              <select value={f.committee} onChange={e => { set('committee', e.target.value); set('assignee', ''); }}>
                {committees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="field"><label>الخادمة</label>
              <select value={f.assignee} onChange={e => set('assignee', e.target.value)}>
                <option value="">اختاري…</option>
                {inComm.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>
          </div>
          {!inComm.length ? <div style={{ fontSize: 12.5, color: 'var(--crimson)', marginTop: -6, marginBottom: 12 }}>لا خادمات في هذه اللجنة بعد — فعّلي حساباً وأسنديه إليها</div> : null}
          <div className="field-row">
            <div className="field"><label>الوقت</label><input value={f.time} onChange={e => set('time', e.target.value)} placeholder="٧:٠٠ م" /></div>
            <div className="field"><label>المكان</label><input value={f.place} onChange={e => set('place', e.target.value)} placeholder="الصالة" /></div>
          </div>
          <div className="field"><label>ملاحظة (اختياري)</label>
            <input value={f.note} onChange={e => set('note', e.target.value)} placeholder="تفاصيل إضافية…" /></div>
          <div className="modal-foot">
            <button className="btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .45 }} onClick={() => onAdd(f)}>إضافة المهمة</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add committee modal ---------------- */
function AddCommitteeModal({ committees, onClose, onAdd, embedded }) {
  const used = committees.map(c => c.color);
  const choices = COMMITTEE_PALETTE.filter(p => !used.includes(p.color)).concat(COMMITTEE_PALETTE);
  const [name, setName] = useState('');
  const [pi, setPi] = useState(0);
  const pal = choices[pi] || COMMITTEE_PALETTE[0];
  const valid = name.trim();
  const ov = embedded ? { position: 'static', background: 'none', backdropFilter: 'none', padding: 0, display: 'block', animation: 'none' } : undefined;
  return (
    <div className="overlay" style={ov} onClick={embedded ? undefined : onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>إضافة لجنة جديدة</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="field"><label>اسم اللجنة</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: لجنة الأطفال" autoFocus /></div>
          <div className="field"><label>اللون المميّز</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {COMMITTEE_PALETTE.map((p, i) => (
                <button key={i} onClick={() => setPi(choices.indexOf(p) >= 0 ? choices.indexOf(p) : 0)}
                  style={{ width: 34, height: 34, borderRadius: 9, background: p.color, border: pal.color === p.color ? '3px solid var(--ink)' : '2px solid #fff', boxShadow: 'var(--shadow-sm)' }} />
              ))}
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .45 }}
              onClick={() => onAdd({ name: name.trim(), color: pal.color, soft: pal.soft })}>إضافة اللجنة</button>
            <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Root ---------------- */
function App() {
  const [data, setData] = useState(loadData);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESS) || '');

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (sessionId) localStorage.setItem(SESS, sessionId); else localStorage.setItem(SESS, ''); }, [sessionId]);

  const user = data.users.find(u => u.id === sessionId && u.status === 'active');

  const toggle = id => setData(d => ({ ...d, meta: { ...d.meta, [id]: { ...d.meta[id], done: !d.meta[id].done } } }));
  const comment = (id, text) => setData(d => {
    const c = { id: 'c' + Date.now(), author: user.name, text, time: nowTime() };
    return { ...d, meta: { ...d.meta, [id]: { ...d.meta[id], comments: [...(d.meta[id].comments || []), c] } } };
  });
  const addTask = f => setData(d => {
    const id = 'x' + Date.now();
    const t = { id, committee: f.committee, assignee: f.assignee, title: f.title.trim(), time: f.time.trim(), place: f.place.trim(), note: f.note.trim() || undefined };
    return { ...d, tasks: [...d.tasks, t], meta: { ...d.meta, [id]: { done: false, comments: [] } } };
  });
  const addCommittee = c => setData(d => ({ ...d, committees: [...d.committees, { id: 'comm' + Date.now(), ...c }] }));
  const removeCommittee = id => setData(d => {
    const removedTaskIds = d.tasks.filter(t => t.committee === id).map(t => t.id);
    const meta = { ...d.meta }; removedTaskIds.forEach(tid => delete meta[tid]);
    return {
      ...d,
      committees: d.committees.filter(c => c.id !== id),
      tasks: d.tasks.filter(t => t.committee !== id),
      users: d.users.map(u => u.committee === id ? { ...u, committee: null, status: 'pending', title: '' } : u),
      meta,
    };
  });
  const register = form => setData(d => ({
    ...d,
    users: [...d.users, { id: 'u' + Date.now(), name: form.name, username: form.username, password: form.password, role: 'servant', title: '', committee: null, status: 'pending', initials: form.name.trim()[0] }],
  }));
  const activate = (userId, committeeId) => setData(d => {
    const comm = d.committees.find(c => c.id === committeeId);
    return { ...d, users: d.users.map(u => u.id === userId ? { ...u, status: 'active', committee: committeeId, title: 'خادمة ' + (comm ? comm.name : '') } : u) };
  });
  const reject = userId => setData(d => ({ ...d, users: d.users.filter(u => u.id !== userId) }));

  if (!user) return <AuthScreen users={data.users} onLogin={setSessionId} onRegister={register} />;

  return (
    <div className="app">
      <TopBar user={user} onLogout={() => setSessionId('')} />
      {user.role === 'supervisor'
        ? <SupervisorView user={user} data={data} onToggle={toggle} onComment={comment}
            onAddTask={addTask} onAddCommittee={addCommittee} onRemoveCommittee={removeCommittee}
            onActivate={activate} onReject={reject} />
        : <MemberView user={user} data={data} onToggle={toggle} onComment={comment} />}
      <div className="footer-dua">{DUA_FOOTER}</div>
    </div>
  );
}

window.KFN = { App, AuthScreen, MemberView, SupervisorView, AddTaskModal, AddCommitteeModal, RequestCard, TopBar, DateRow, TaskCard, loadData, nowTime };
if (!window.__KFN_PRINT__) {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}
