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
  users: () => request('/api/users'),
  addUser: (payload) => request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ password }) }),

  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/uploads', { method: 'POST', body: fd });
  },

  // Inventory (ثلاجة + دار الجيل); `store` selects the section.
  recipes: () => request('/api/recipes'),
  extractRecipe: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    // Abort rather than hang if the connection stalls (weak mobile signal, or
    // the server restarting mid-request during a deploy).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75_000);
    let res;
    try {
      res = await fetch('/api/recipes/extract', { method: 'POST', body: fd, signal: ctrl.signal });
    } catch (e) {
      // fetch() rejects on network failures — surface something readable
      // instead of the browser's raw "Failed to fetch".
      throw new Error(
        e?.name === 'AbortError'
          ? 'استغرقت القراءة وقتاً طويلاً. جرّب صورة أوضح أو أصغر.'
          : 'تعذّر الاتصال بالخادم. تأكّد من الإنترنت وحاول مرة أخرى (قد يكون الموقع يُحدَّث الآن).'
      );
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'تعذّرت قراءة الصورة');
    return data;
  },
  recipe: (id) => request(`/api/recipes/${id}`),
  addRecipe: (payload) => request('/api/recipes', { method: 'POST', body: JSON.stringify(payload) }),
  updateRecipe: (id, payload) => request(`/api/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeRecipe: (id) => request(`/api/recipes/${id}`, { method: 'DELETE' }),
  fridge: (store) => request('/api/fridge' + (store ? '?store=' + encodeURIComponent(store) : '')),
  fridgeItem: (id) => request(`/api/fridge/${id}`),
  addFridgeItem: (payload) => request('/api/fridge', { method: 'POST', body: JSON.stringify(payload) }),
  updateFridgeItem: (id, payload) => request(`/api/fridge/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  removeFridgeItem: (id) => request(`/api/fridge/${id}`, { method: 'DELETE' }),
  addFridgeMovement: (id, payload) => request(`/api/fridge/${id}/movements`, { method: 'POST', body: JSON.stringify(payload) }),
  addFridgeUnit: (name, store) => request('/api/fridge/units', { method: 'POST', body: JSON.stringify({ name, store }) }),
  removeFridgeUnit: (id) => request(`/api/fridge/units/${id}`, { method: 'DELETE' }),

  // Orders against الثلاجة items (طلبات)
  orders: () => request('/api/orders'),
  addOrder: (payload) => request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrder: (id, payload) => request(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};
