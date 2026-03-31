

const API = (() => {
  const BASE_URL   = 'https://rental-bike-system-production.up.railway.app';
  const TOKEN_KEY  = 'brs_auth_token';

  /* ── Token helpers ─────────────────────────────────────── */
  function getToken()        { return localStorage.getItem(TOKEN_KEY); }
  function saveToken(token)  { localStorage.setItem(TOKEN_KEY, token); }
  function clearToken()      { localStorage.removeItem(TOKEN_KEY); }

  /* ── Core fetch wrapper ────────────────────────────────── */
  /**
   * Makes an HTTP request to the Java backend.
   * Returns parsed response data or throws on error.
   */
  async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token   = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const res  = await fetch(`${BASE_URL}${path}`, options);
    const json = await res.json();

    if (!res.ok) {
      // json.message or json.data (validation errors)
      throw { message: json.message || 'Request failed.', status: res.status, data: json.data };
    }

    return json;     // { success, message, data }
  }

  /* ── Auth endpoints ─────────────────────────────────────── */
  const auth = {
    /** POST /api/auth/register */
    async register(name, email, password, confirmPassword) {
      const res = await request('POST', '/api/auth/register', { name, email, password, confirmPassword });
      if (res.data?.token) saveToken(res.data.token);
      return res.data;
    },

    /** POST /api/auth/login */
    async login(email, password) {
      const res = await request('POST', '/api/auth/login', { email, password });
      if (res.data?.token) saveToken(res.data.token);
      return res.data;
    },

    /** GET /api/auth/me */
    async getMe() {
      const res = await request('GET', '/api/auth/me');
      return res.data;
    },

    /** POST /api/auth/logout (client-side only) */
    logout() { clearToken(); },

    /** GET /api/auth/users (admin) */
    async getUsers() {
      const res = await request('GET', '/api/auth/users');
      return res.data;
    },
  };

  /* ── Bike endpoints ─────────────────────────────────────── */
  const bikes = {
    /** GET /api/bikes?type=&available= */
    async getAll(params = {}) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const res = await request('GET', `/api/bikes${qs ? '?' + qs : ''}`);
      return res.data;
    },

    /** GET /api/bikes/{id} */
    async getOne(id) {
      const res = await request('GET', `/api/bikes/${id}`);
      return res.data;
    },

    /** GET /api/bikes/admin/stats */
    async getStats() {
      const res = await request('GET', '/api/bikes/admin/stats');
      return res.data;
    },

    /** POST /api/bikes */
    async create(data) {
      const res = await request('POST', '/api/bikes', data);
      return res.data;
    },

    /** PUT /api/bikes/{id} */
    async update(id, data) {
      const res = await request('PUT', `/api/bikes/${id}`, data);
      return res.data;
    },

    /** DELETE /api/bikes/{id} */
    async remove(id) {
      const res = await request('DELETE', `/api/bikes/${id}`);
      return res.data;
    },

    /** PATCH /api/bikes/{id}/avail */
    async setAvailability(id, available) {
      const res = await request('PATCH', `/api/bikes/${id}/avail`, { available });
      return res.data;
    },
  };

  /* ── Booking endpoints ──────────────────────────────────── */
  const bookings = {
    /** POST /api/bookings */
    async create(bikeId, unit, duration) {
      const res = await request('POST', '/api/bookings', { bikeId, unit, duration });
      return res;     // return full response so we get the message
    },

    /** GET /api/bookings (user's own) */
    async getMine() {
      const res = await request('GET', '/api/bookings');
      return res.data;
    },

    /** GET /api/bookings/admin/all */
    async getAll() {
      const res = await request('GET', '/api/bookings/admin/all');
      return res.data;
    },

    /** GET /api/bookings/admin/stats */
    async getAdminStats() {
      const res = await request('GET', '/api/bookings/admin/stats');
      return res.data;
    },

    /** PATCH /api/bookings/{id}/return */
    async returnBike(id) {
      const res = await request('PATCH', `/api/bookings/${id}/return`);
      return res;
    },

    /** PATCH /api/bookings/{id}/cancel */
    async cancel(id) {
      const res = await request('PATCH', `/api/bookings/${id}/cancel`);
      return res;
    },
  };

  return { auth, bikes, bookings, getToken, saveToken, clearToken, BASE_URL };
})();

window.BRS = window.BRS || {};
window.BRS.API = API;
