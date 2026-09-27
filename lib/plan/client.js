// Browser-side calls for the plan section.
async function request(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      ...opts,
    });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تأكّد من الإنترنت وحاول مرة أخرى.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ غير متوقع');
    err.status = res.status;
    throw err;
  }
  return data;
}

const body = (x) => ({ body: JSON.stringify(x) });

export const planApi = {
  version: () => request('/api/plan/version', { cache: 'no-store' }),
  create: (entity, data) => request(`/api/plan/${entity}`, { method: 'POST', ...body(data) }),
  update: (entity, id, patch) => request(`/api/plan/${entity}/${id}`, { method: 'PATCH', ...body(patch) }),
  remove: (entity, id) => request(`/api/plan/${entity}/${id}`, { method: 'DELETE' }),
  restore: (entity, id) => request(`/api/plan/${entity}/${id}/restore`, { method: 'POST' }),
  history: (entity, id) => request(`/api/plan/${entity}/${id}/history`),
  restoreVersion: (entity, id, change_id) => request(`/api/plan/${entity}/${id}/history`, { method: 'POST', ...body({ change_id }) }),
  trash: () => request('/api/plan/trash'),
  audit: (before) => request('/api/plan/audit' + (before ? `?before=${before}` : '')),
  snapshots: () => request('/api/plan/snapshots'),
  createSnapshot: (note) => request('/api/plan/snapshots', { method: 'POST', ...body({ note }) }),
  restoreSnapshot: (id, password) => request(`/api/plan/snapshots/${id}/restore`, { method: 'POST', ...body({ password, confirm: true }) }),
  importFile: (file, { preview, password } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (preview) fd.append('preview', '1');
    else {
      fd.append('confirm', '1');
      fd.append('password', password || '');
    }
    return request('/api/plan/import', { method: 'POST', body: fd });
  },
};
