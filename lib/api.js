async function request(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ غير متوقع');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('/api/me'),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (name, phone, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, phone, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  search: (q, scope) => request('/api/search?q=' + encodeURIComponent(q) + (scope ? '&scope=' + scope : '')),
  stats: () => request('/api/stats'),
  committees: () => request('/api/committees'),
  committee: (id) => request(`/api/committees/${id}`),
  addCommittee: (payload) => request('/api/committees', { method: 'POST', body: JSON.stringify(payload) }),
  updateCommittee: (id, payload) => request(`/api/committees/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeCommittee: (id) => request(`/api/committees/${id}`, { method: 'DELETE' }),
  users: () => request('/api/users'),
  addUser: (payload) => request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ password }) }),

  // Accounting
  accounting: () => request('/api/accounting'),
  addTransaction: (payload) => request('/api/accounting/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) => request(`/api/accounting/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeTransaction: (id) => request(`/api/accounting/transactions/${id}`, { method: 'DELETE' }),
  setRates: (payload) => request('/api/accounting/rates', { method: 'PUT', body: JSON.stringify(payload) }),
  addCategory: (name) => request('/api/accounting/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  removeCategory: (id) => request(`/api/accounting/categories/${id}`, { method: 'DELETE' }),
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/uploads', { method: 'POST', body: fd });
  },

  // Fridge (ثلاجة) inventory
  fridge: () => request('/api/fridge'),
  fridgeItem: (id) => request(`/api/fridge/${id}`),
  addFridgeItem: (payload) => request('/api/fridge', { method: 'POST', body: JSON.stringify(payload) }),
  updateFridgeItem: (id, payload) => request(`/api/fridge/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeFridgeItem: (id) => request(`/api/fridge/${id}`, { method: 'DELETE' }),
  addFridgeMovement: (id, payload) => request(`/api/fridge/${id}/movements`, { method: 'POST', body: JSON.stringify(payload) }),
  addFridgeCategory: (name) => request('/api/fridge/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  removeFridgeCategory: (id) => request(`/api/fridge/categories/${id}`, { method: 'DELETE' }),
};
