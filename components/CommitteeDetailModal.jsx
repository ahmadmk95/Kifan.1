'use client';

import { Avatar } from './Shared';
import { toAr, avBg } from '@/lib/palette';
import TaskCard from './TaskCard';

export default function CommitteeDetailModal({ committee, members, tasks, currentUser, onClose, onToggle, onComment, onRemoveComment }) {
  const supervisor = members.find((m) => m.id === committee.supervisor_id);
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <h3>
            <span className="cat-dot" style={{ background: committee.color, display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginInlineEnd: 8 }}></span>
            لجنة {committee.name}
          </h3>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>مشرفة اللجنة</label>
            <div>{supervisor ? supervisor.name : 'بدون مشرفة لجنة'}</div>
          </div>

          <div className="cat-head" style={{ marginTop: 4 }}>
            <h4>
              الخادمات <span className="ar-num">({toAr(members.length)})</span>
            </h4>
          </div>
          {members.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar av" style={{ background: avBg(m.id) }}>
                    {m.name[0]}
                  </div>
                  <div>
                    <div className="nm">{m.name}</div>
                    <div className="meta">{m.title}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ic">🕊️</div>لا خادمات في هذه اللجنة بعد
            </div>
          )}

          <div className="cat-head">
            <h4>
              المهام <span className="ar-num">({toAr(done)}/{toAr(tasks.length)})</span>
            </h4>
          </div>
          {tasks.length ? (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                committee={committee}
                assignee={members.find((m) => m.id === t.assignee_id) || { name: '' }}
                currentUser={currentUser}
                onToggle={onToggle}
                onComment={onComment}
                onRemoveComment={onRemoveComment}
                showAssignee
              />
            ))
          ) : (
            <div className="empty">
              <div className="ic">📋</div>لا مهام لهذه اللجنة في هذه الليلة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
