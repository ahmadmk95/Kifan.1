async function request(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ غير متوقع');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('/api/me'),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (name, username, password) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  nights: () => request('/api/nights'),
  activeNight: () => request('/api/nights/active'),
  setActiveNight: (id) => request('/api/nights/active', { method: 'POST', body: JSON.stringify({ id }) }),
  myTasks: (nightId) => request(`/api/my-tasks?night=${nightId}`),
  allTasks: (nightId) => request(`/api/tasks?night=${nightId}`),
  addTask: (payload) => request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  removeTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
  toggleTask: (id, done) => request(`/api/tasks/${id}/done`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  addComment: (id, text) => request(`/api/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  removeComment: (taskId, commentId) => request(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }),
  committees: () => request('/api/committees'),
  addCommittee: (payload) => request('/api/committees', { method: 'POST', body: JSON.stringify(payload) }),
  removeCommittee: (id) => request(`/api/committees/${id}`, { method: 'DELETE' }),
  requests: () => request('/api/requests'),
  activateRequest: (id, committeeId) =>
    request(`/api/requests/${id}/activate`, { method: 'POST', body: JSON.stringify({ committee_id: committeeId }) }),
  rejectRequest: (id) => request(`/api/requests/${id}`, { method: 'DELETE' }),
  overview: (nightId) => request(`/api/overview?night=${nightId}`),
  comments: (nightId) => request(`/api/comments?night=${nightId}`),
};
