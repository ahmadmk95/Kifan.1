'use client';

import { useState } from 'react';
import { CheckMark, Icon } from './Shared';
import { avBg, toAr } from '@/lib/palette';

export default function TaskCard({ task, committee, assignee, onToggle, onComment, showAssignee }) {
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
        <button className={'check' + (task.done ? ' on' : '')} onClick={() => onToggle(task.id, !task.done)} aria-label="إنجاز">
          <CheckMark />
        </button>
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            <span>
              <Icon.clock /> <span className="ar-num">{task.time}</span>
            </span>
            <span>
              <Icon.pin /> {task.place}
            </span>
            {showAssignee && assignee ? (
              <span style={{ color: 'var(--maroon-2)', fontWeight: 600 }}>♦ {assignee.name}</span>
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
        </div>
      </div>
      {open ? (
        <div className="cmts">
          {comments.length ? (
            comments.map((c) => (
              <div className="cmt" key={c.id}>
                <div className="avatar av" style={{ background: avBg(c.author_id) }}>
                  {c.author[0]}
                </div>
                <div className="cmt-bubble">
                  <div className="top">
                    <span className="au">{c.author}</span>
                    <span className="tm ar-num">{c.time}</span>
                  </div>
                  <div className="tx">{c.text}</div>
                </div>
              </div>
            ))
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
