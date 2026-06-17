'use client';

import { useState } from 'react';
import { CheckMark, Icon } from './Shared';
import { avBg, toAr } from '@/lib/palette';

export default function TaskCard({ task, committee, assignee, currentUser, onToggle, onComment, onRemoveComment, onRemoveTask, onEditTask, showAssignee, hideCheck }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const comments = task.comments || [];

  const submit = async () => {
    const v = txt.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await onComment(task.id, v);
      setTxt('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={'task' + (task.done ? ' done' : '')}>
      <div className="task-main">
        {!hideCheck && (
          <button className={'check' + (task.done ? ' on' : '')} onClick={() => onToggle(task.id, !task.done)} aria-label="إنجاز">
            <CheckMark />
          </button>
        )}
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span>
              <Icon.clock /> <span className="ar-num">{task.time}</span>
            </span>
            <span>
              <Icon.pin /> {task.place}
            </span>
            {showAssignee && assignee && assignee.name ? (
              <span style={{ color: 'var(--maroon-2)', fontWeight: 600 }}>♦ {assignee.name}</span>
            ) : showAssignee && task.claimors && task.claimors.length ? (
              <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>📌 {task.claimors.join('، ')}</span>
            ) : null}
          </div>
          {task.note ? (
            <div className="task-note">
              <Icon.note /> {task.note}
            </div>
          ) : null}
        </div>
        <div className="task-side">
          {committee ? (
            <span className="cat-tag" style={{ background: committee.soft, color: committee.color }}>
              {committee.name}
            </span>
          ) : null}
          <button className={'cmt-btn' + (comments.length ? ' has' : '')} onClick={() => setOpen((o) => !o)}>
            <Icon.chat /> {comments.length ? <span className="ar-num">{toAr(comments.length)}</span> : 'تعليق'}
          </button>
          {onEditTask ? (
            <button className="icon-btn" title="تعديل المهمة" onClick={() => onEditTask(task)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          ) : null}
          {onRemoveTask ? (
            <button
              className="icon-btn"
              title="حذف المهمة"
              onClick={() => {
                if (window.confirm('حذف مهمة «' + task.title + '»؟')) onRemoveTask(task.id);
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="cmts">
          {comments.length ? (
            comments.map((c) => {
              const canDelete = onRemoveComment && currentUser && (currentUser.role === 'supervisor' || currentUser.id === c.author_id);
              return (
                <div className="cmt" key={c.id}>
                  <div className="avatar av" style={{ background: avBg(c.author_id) }}>
                    {c.author[0]}
                  </div>
                  <div className="cmt-bubble">
                    <div className="top">
                      <span className="au">{c.author}</span>
                      <span className="tm ar-num">{c.time}</span>
                      {canDelete ? (
                        <button
                          className="x"
                          style={{ marginInlineStart: 'auto', fontSize: 15, color: 'var(--muted)' }}
                          title="حذف التعليق"
                          onClick={() => {
                            if (window.confirm('حذف هذا التعليق؟')) onRemoveComment(task.id, c.id);
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <div className="tx">{c.text}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="cmt-empty">لا توجد تعليقات بعد — أضيفي ملاحظة أو استفساراً</div>
          )}
          <div className="cmt-form">
            <input
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="اكتبي تعليقاً..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
            <button onClick={submit} disabled={!txt.trim() || busy}>
              إرسال
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function groupByCommittee(tasks, committees) {
  return committees
    .map((c) => ({ committee: c, items: tasks.filter((t) => t.committee_id === c.id) }))
    .filter((g) => g.items.length);
}

export function CommHead({ committee, items }) {
  const done = items.filter((t) => t.done).length;
  return (
    <div className="cat-head">
      <span className="cat-dot" style={{ background: committee.color }}></span>
      <h4>{committee.name}</h4>
      <span className="count ar-num">
        {toAr(done)} / {toAr(items.length)}
      </span>
    </div>
  );
}
