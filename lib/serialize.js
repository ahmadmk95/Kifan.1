export function serializeTask(t, extra = {}) {
  return {
    id: t.id,
    night_id: t.night_id,
    committee_id: t.committee_id,
    assignee_id: t.assignee_id,
    title: t.title,
    time: t.time,
    place: t.place,
    note: t.note || null,
    done: !!t.done,
    created_at: t.created_at,
    ...extra,
  };
}

export function serializeComment(c, authorName) {
  return {
    id: c.id,
    task_id: c.task_id,
    author_id: c.author_id,
    author: authorName,
    text: c.text,
    created_at: c.created_at,
    time: formatTime(c.created_at),
  };
}

export function formatTime(sqliteDatetime) {
  // sqlite datetime('now') is UTC "YYYY-MM-DD HH:MM:SS"
  const d = new Date(sqliteDatetime.replace(' ', 'T') + 'Z');
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  const map = { 0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩' };
  const toAr = (v) => String(v).replace(/[0-9]/g, (d2) => map[d2]);
  return toAr(h + ':' + String(m).padStart(2, '0') + ' ' + ap);
}
