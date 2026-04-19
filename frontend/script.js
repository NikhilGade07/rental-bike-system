/**
 * ============================================================
 *  ONLINE BIKE RENTAL SYSTEM – script.js
 *  Connected to Node.js/MongoDB Backend via REST API
 * ============================================================
 */

'use strict';

const API_URL = 'https://rental-bike-system-production.up.railway.app/api';

/* ═══════════════════════════════════════════════════════════════
   SESSION MANAGER
═══════════════════════════════════════════════════════════════ */

class Session {
  static KEY = 'brs_session';

  static save(data) { localStorage.setItem(Session.KEY, JSON.stringify(data)); }
  static get()      { return JSON.parse(localStorage.getItem(Session.KEY) || 'null'); }
  static clear()    { localStorage.removeItem(Session.KEY); }
  static getToken() { const s = this.get(); return s ? s.token : null; }
  static getUser()  { const s = this.get(); return s ? s.user : null; }
}

/* ═══════════════════════════════════════════════════════════════
   API CLIENT
═══════════════════════════════════════════════════════════════ */

class ApiClient {
  static async request(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = Session.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_URL}${endpoint}`, config);
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      
      if (!res.ok) {
        throw new Error((data && data.message) ? data.message : `API Error ${res.status}`);
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not reach the server. Is it running?');
      }
      throw err;
    }
  }

  static get(e)       { return this.request(e, 'GET'); }
  static post(e, b)   { return this.request(e, 'POST', b); }
  static put(e, b={}) { return this.request(e, 'PUT', b); }
  static delete(e)    { return this.request(e, 'DELETE'); }
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
═══════════════════════════════════════════════════════════════ */

class UserService {
  static async register(data) {
    if (!data.name || !data.email || !data.password) throw new Error('All fields are required.');
    if (data.password.length < 6) throw new Error('Password must be at least 6 characters.');
    return ApiClient.post('/auth/register', data);
  }
  static login(data) { return ApiClient.post('/auth/login', data); }
  static getAll()    { return ApiClient.get('/users'); }
}

class BikeService {
  static getAll()             { return ApiClient.get('/bikes'); }
  static add(data)            { return ApiClient.post('/bikes', data); }
  static update(id, data)     { return ApiClient.put(`/bikes/${id}`, data); }
  static delete(id)           { return ApiClient.delete(`/bikes/${id}`); }
}

class BookingService {
  static book(data)           { return ApiClient.post('/bookings', data); }
  static getMy()              { return ApiClient.get('/bookings/my'); }
  static getAll()             { return ApiClient.get('/bookings'); }
  static cancelBooking(id)    { return ApiClient.put(`/bookings/${id}/cancel`); }
  static returnBike(id)       { return ApiClient.put(`/bookings/${id}/return`); }
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════════════════════════════ */

class Toast {
  static show(type, title, msg, duration = 4000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }

  static success(title, msg) { Toast.show('success', title, msg); }
  static error(title, msg)   { Toast.show('error',   title, msg); }
  static info(title, msg)    { Toast.show('info',    title, msg); }
  static warning(title, msg) { Toast.show('warning', title, msg); }
}

/* ═══════════════════════════════════════════════════════════════
   ROUTER  (simple single-page state machine)
═══════════════════════════════════════════════════════════════ */

class Router {
  constructor() {
    this.currentPage = null;
    this.pages = {};
  }
  register(id, el) { this.pages[id] = el; }
  navigate(id) {
    if (this.currentPage) this.pages[this.currentPage]?.classList.remove('active');
    if (this.pages[id])   this.pages[id].classList.add('active');
    this.currentPage = id;

    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === id);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function el(id) { return document.getElementById(id); }
function q(selector, cb) { document.querySelectorAll(selector).forEach(cb); }
function fmtCurrency(amount) {
  const n = parseFloat(amount);
  return `₹${isNaN(n) ? '0.00' : n.toFixed(2)}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function toLocalISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function statusBadge(status) {
  const map = { confirmed: 'badge-confirmed', returned: 'badge-available', cancelled: 'badge-rented' };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return `<span class="badge ${map[status] || 'badge-ghost'}">${label}</span>`;
}
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
function getBikeImage(bike) {
  if (bike.imageUrl) return bike.imageUrl;
  const map = {
    'Mountain': 'images/mountain_bike.png',
    'Road':     'images/road_bike.png',
    'City':     'images/city_bike.png',
    'Electric': 'images/electric_bike.png'
  };
  return map[bike.type] || 'images/city_bike.png';
}

/* ═══════════════════════════════════════════════════════════════
   UI CONTROLLER
═══════════════════════════════════════════════════════════════ */

class AppController {
  constructor() {
    this.router  = new Router();
    this.session = null;

    this.searchQuery  = '';
    this.filterType   = 'all';
    this.editingBike  = null;
    this._currentBike = null;

    this._initDOM();
    this._bindGlobal();

    const saved = Session.get();
    if (saved && saved.token) {
      this.session = saved.user;
      this._onLoggedIn();
    } else {
      this._showAuth();
    }
  }

  _initDOM() {
    ['page-auth', 'page-home', 'page-bikes', 'page-bookings', 'page-profile', 'page-admin'].forEach(id => {
      this.router.register(id, document.getElementById(id));
    });
  }

  _bindGlobal() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.form;
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
      });
    });

    // Login
    el('form-login').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const email    = el('login-email').value;
        const password = el('login-password').value;
        const res      = await UserService.login({ email, password });
        Session.save(res);
        this.session = res.user;
        this._onLoggedIn();
        Toast.success(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`);
      } catch (err) { Toast.error('Login Failed', err.message); }
    });

    // Register
    el('form-register').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const name     = el('reg-name').value;
        const email    = el('reg-email').value;
        const password = el('reg-password').value;
        const confirm  = el('reg-confirm').value;
        if (password !== confirm) throw new Error('Passwords do not match.');
        await UserService.register({ name, email, password });
        Toast.success('Account Created!', 'You can now log in.');
        el('form-register').reset();
        document.querySelector('[data-form="form-login"]').click();
      } catch (err) { Toast.error('Registration Failed', err.message); }
    });

    // Logout
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Session.clear();
        this.session = null;
        this._showAuth();
        Toast.info('Signed Out', 'See you soon!');
      });
    });

    // Navigation
    document.querySelectorAll('[data-nav], [data-page-link]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const page = a.dataset.nav || a.dataset.pageLink;
        if (page !== 'page-auth' && !this.session) { this._showAuth(); return; }
        this._navigate(page);
      });
    });

    // Filter & Search
    el('bike-search').addEventListener('input', e => { this.searchQuery = e.target.value.toLowerCase(); this._renderBikes(); });
    el('bike-filter').addEventListener('change', e => { this.filterType = e.target.value; this._renderBikes(); });

    // Admin Forms
    el('form-admin-bike').addEventListener('submit', e => { e.preventDefault(); this._submitAdminBikeForm(); });
    el('btn-cancel-bike-edit').addEventListener('click', () => this._resetAdminBikeForm());

    // Bookings
    el('form-booking').addEventListener('submit', e => { e.preventDefault(); this._submitBooking(); });
    ['booking-start', 'booking-end'].forEach(id => {
      el(id).addEventListener('change', () => this._updateBookingCost());
      el(id).addEventListener('input',  () => this._updateBookingCost());
    });

    // Modals
    el('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) this._closeModal(); });
    el('modal-close').addEventListener('click', () => this._closeModal());

    // CTA
    el('btn-browse-bikes').addEventListener('click', () => this.session ? this._navigate('page-bikes') : this._showAuth());
    el('btn-go-bookings').addEventListener('click', () => this.session ? this._navigate('page-bookings') : this._showAuth());

    // Admin Tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        el(target).classList.add('active');
        if (target === 'admin-tab-bookings') this._renderAdminBookings();
        if (target === 'admin-tab-users')    this._renderAdminUsers();
      });
    });
  }

  _showAuth() { this.router.navigate('page-auth'); this._updateNavbar(); }

  _onLoggedIn() {
    this._updateNavbar();
    this._navigate('page-home');
  }

  _updateNavbar() {
    const loggedIn  = !!this.session;
    const isAdmin   = this.session?.role === 'admin';

    el('navbar-guest').classList.toggle('hidden', loggedIn);
    el('navbar-user').classList.toggle('hidden', !loggedIn);
    el('nav-admin-link').classList.toggle('hidden', !isAdmin);

    if (loggedIn) {
      el('nav-user-name').textContent   = this.session.name.split(' ')[0];
      el('nav-user-avatar').textContent = getInitials(this.session.name);
    }
  }

  _navigate(page) {
    this.router.navigate(page);
    switch (page) {
      case 'page-home':     this._renderHome();     break;
      case 'page-bikes':    this._renderBikes();    break;
      case 'page-bookings': this._renderBookings(); break;
      case 'page-profile':  this._renderProfile();  break;
      case 'page-admin':
        if (this.session?.role !== 'admin') { Toast.error('Access Denied', 'Admins only.'); this._navigate('page-home'); return; }
        this._renderAdmin(); break;
    }
  }

  /* ──────────────────────────────────────────────── */
  /*  PAGES CONTROLLERS                               */
  /* ──────────────────────────────────────────────── */

  async _renderHome() {
    try {
      const bikes = await BikeService.getAll();
      q('[data-stat="total-bikes"]', v => v.textContent = bikes.length);
      q('[data-stat="avail-bikes"]', v => v.textContent = bikes.filter(b => b.available).length);
      
      const bookings = this.session?.role === 'admin' ? await BookingService.getAll() : await BookingService.getMy();
      q('[data-stat="total-bookings"]', v => v.textContent = bookings.length);
      
      if(this.session?.role === 'admin') {
         const users = await UserService.getAll();
         q('[data-stat="total-users"]', v => v.textContent = users.length);
      }
    } catch (err) {
      console.warn('Dashboard stats load error (ignoring)', err);
    }
  }

  async _renderBikes() {
    const grid = el('bikes-grid');
    if (!this._cachedBikes) {
       grid.innerHTML = `<div class="loader" style="grid-column:1/-1"><div class="spinner"></div> Loading bikes…</div>`;
    }
    
    try {
      let bikes = await BikeService.getAll();
      this._cachedBikes = bikes;

      if (this.searchQuery) {
        bikes = bikes.filter(b => b.name.toLowerCase().includes(this.searchQuery) || b.type.toLowerCase().includes(this.searchQuery));
      }
      if (this.filterType !== 'all') {
        bikes = bikes.filter(b => b.type.toLowerCase() === this.filterType.toLowerCase());
      }

      if (bikes.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div><h3>No bikes found</h3><p>Try adjusting your search or filter.</p></div>`;
        return;
      }

      grid.innerHTML = bikes.map(bike => {
        const featureTags = bike.features.slice(0, 3).map(f => `<span class="bike-feature-tag">${f}</span>`).join('');
        const statusBadgeLabel = bike.available ? '<span class="badge badge-available">● Available</span>' : '<span class="badge badge-rented">● Rented</span>';
        const bookBtn = bike.available 
             ? `<button class="btn btn-primary btn-sm" data-action="book-bike" data-bike-id="${bike._id || bike.id}">Book Now</button>`
             : `<button class="btn btn-ghost btn-sm" disabled>Unavailable</button>`;

        return `
          <div class="bike-card">
            <div class="bike-img" style="background: url('${getBikeImage(bike)}') center/cover no-repeat; height: 200px;"></div>
            <div class="bike-body">
              <div class="bike-header">
                <div>
                  <div class="bike-name">${bike.name}</div>
                  <div class="bike-type">${bike.type} Bike</div>
                </div>
                <div class="bike-price">
                  <div class="price-value">${fmtCurrency(bike.pricePerHour)}</div>
                  <div class="price-unit">/ hour</div>
                </div>
              </div>
              <div class="bike-features">${featureTags}</div>
              <div class="bike-footer">
                ${statusBadgeLabel}
                ${bookBtn}
              </div>
            </div>
          </div>`;
      }).join('');

      grid.querySelectorAll('[data-action="book-bike"]').forEach(btn => {
        btn.addEventListener('click', () => this._openBookingModal(btn.dataset.bikeId));
      });
    } catch(err) {
       grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Error Loading Bikes</h3><p>${err.message}</p></div>`;
    }
  }

  async _openBookingModal(bikeId) {
    if (!this.session) { this._showAuth(); return; }
    try {
      const bikes = await BikeService.getAll();
      const bike = bikes.find(b => b.id === bikeId || b._id === bikeId);
      
      if (!bike) { Toast.error('Error', 'Bike not found.'); return; }
      if (!bike.available) { Toast.warning('Unavailable', 'This bike is already rented.'); return; }

      this._currentBike = bike;
      el('modal-bike-img').src           = getBikeImage(bike);
      el('modal-bike-name').textContent  = bike.name;
      el('modal-bike-type').textContent  = `${bike.type} Bike`;
      el('modal-bike-price').textContent = `${fmtCurrency(bike.pricePerHour)}/hr`;
      el('modal-title').textContent      = 'Book This Bike';

      const now   = new Date();
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      el('booking-start').value = toLocalISO(now);
      el('booking-end').value   = toLocalISO(later);

      this._updateBookingCost();
      this._openModal();
    } catch(err) {
      Toast.error('Error', err.message);
    }
  }

  _updateBookingCost() {
    if (!this._currentBike) return;
    const start = new Date(el('booking-start').value);
    const end   = new Date(el('booking-end').value);

    if (isNaN(start) || isNaN(end) || end <= start) {
      el('cost-rate').textContent     = fmtCurrency(this._currentBike.pricePerHour);
      el('cost-duration').textContent = 'Invalid range';
      el('cost-total').textContent    = fmtCurrency(0);
      return;
    }

    const hours = (end - start) / (1000 * 60 * 60);
    const displayDuration = hours >= 24 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hours`;

    el('cost-rate').textContent     = fmtCurrency(this._currentBike.pricePerHour);
    el('cost-duration').textContent = displayDuration;
    el('cost-total').textContent    = fmtCurrency(this._currentBike.pricePerHour * hours);
  }

  async _submitBooking() {
    if (!this.session || !this._currentBike) return;
    
    const startTime = el('booking-start').value;
    const endTime   = el('booking-end').value;
    const start = new Date(startTime);
    const end   = new Date(endTime);

    if (isNaN(start) || isNaN(end) || end <= start) {
      Toast.error('Invalid Dates', 'Return time must be after pick-up time.');
      return;
    }

    try {
      const res = await BookingService.book({
        bikeId: this._currentBike.id || this._currentBike._id,
        startTime, endTime
      });
      this._closeModal();
      
      const hours = (new Date(res.booking.endTime) - new Date(res.booking.startTime)) / (1000 * 60 * 60);
      const durationText = hours >= 24 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hours`;

      Toast.success('Booking Confirmed! 🎉', `${res.bike.name} booked for ${durationText}. Total: ${fmtCurrency(res.booking.totalCost)}`);
      this._renderBikes();
    } catch (err) { Toast.error('Booking Failed', err.message); }
  }

  async _renderBookings() {
    const tbody = el('bookings-tbody');
    try {
      const bookings = await BookingService.getMy();
      
      if (bookings.length === 0) {
        el('bookings-empty').classList.remove('hidden');
        el('bookings-table-wrap').classList.add('hidden');
        return;
      }

      el('bookings-empty').classList.add('hidden');
      el('bookings-table-wrap').classList.remove('hidden');

      tbody.innerHTML = bookings.map(bk => {
        const bike = bk.bikeId; 
        const bikeName = bike ? bike.name : 'Unknown Bike';
        const hours = bk.startTime && bk.endTime ? ((new Date(bk.endTime) - new Date(bk.startTime)) / 36e5).toFixed(1) : '—';
        const durationText = hours !== '—' ? `${hours} hr${hours == 1 ? '' : 's'}` : '—';
        const canAct = bk.status === 'confirmed';
        
        return `
          <tr>
            <td>
              <div class="booking-bike-info">
                <div class="booking-bike-icon" style="background:#f0f0f0;overflow:hidden">
                  <img src="${bike ? getBikeImage(bike) : 'images/city_bike.png'}" alt="${bikeName}" style="width:100%;height:100%;object-fit:cover" />
                </div>
                <div>
                  <div style="font-weight:600">${bikeName}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted)">${bk.id.slice(0,12)}…</div>
                </div>
              </div>
            </td>
            <td>${durationText}</td>
            <td class="text-success" style="font-weight:700">${fmtCurrency(bk.totalCost)}</td>
            <td>
              <div style="font-size:0.82rem">From: ${fmtDateTime(bk.startTime)}</div>
              <div style="font-size:0.82rem">To: ${fmtDateTime(bk.endTime)}</div>
            </td>
            <td>${statusBadge(bk.status)}</td>
            <td>
              <div class="d-flex gap-1 flex-wrap">
                ${canAct ? `<button class="btn btn-success btn-sm" onclick="app._returnBike('${bk._id}')">Return</button>` : ''}
                ${canAct ? `<button class="btn btn-danger btn-sm" onclick="app._cancelBooking('${bk._id}')">Cancel</button>` : ''}
                ${!canAct ? '<span style="color:var(--text-muted);font-size:0.82rem">—</span>' : ''}
              </div>
            </td>
          </tr>`;
      }).join('');
    } catch(err) { Toast.error('Error loading bookings', err.message); }
  }

  async _returnBike(bookingId) {
    if (!confirm('Mark this bike as returned?')) return;
    try {
      await BookingService.returnBike(bookingId);
      Toast.success('Bike Returned', 'Thank you for using our service!');
      this._renderBookings();
    } catch (err) { Toast.error('Error', err.message); }
  }

  async _cancelBooking(bookingId) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await BookingService.cancelBooking(bookingId);
      Toast.info('Booking Cancelled');
      this._renderBookings();
    } catch (err) { Toast.error('Error', err.message); }
  }

  async _renderProfile() {
    if (!this.session) return;
    try {
      const bookings = await BookingService.getMy();
      const spent = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalCost, 0);

      el('profile-avatar').textContent   = getInitials(this.session.name);
      el('profile-name').textContent     = this.session.name;
      el('profile-email').textContent    = this.session.email;
      el('profile-role').textContent     = this.session.role.charAt(0).toUpperCase() + this.session.role.slice(1);
      el('profile-role').className       = `role-badge ${this.session.role}`;
      // Note: Backend might not return user creation date securely without fetching /me. Use local stub.
      el('profile-joined').textContent   = 'Member';
      el('profile-bookings').textContent = bookings.length;
      el('profile-spent').textContent    = fmtCurrency(spent);
      el('profile-active').textContent   = bookings.filter(b => b.status === 'confirmed').length;
    } catch(err) {}
  }

  async _renderAdmin() {
    try {
      const bikes = await BikeService.getAll();
      const bookings = await BookingService.getAll();
      const users = await UserService.getAll();
      
      const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalCost, 0);
      const activeBook = bookings.filter(b => b.status === 'confirmed').length;

      el('adm-stat-bikes').textContent    = bikes.length;
      el('adm-stat-avail').textContent    = bikes.filter(b => b.available).length;
      el('adm-stat-bookings').textContent = bookings.length;
      el('adm-stat-revenue').textContent  = fmtCurrency(revenue);
      el('adm-stat-active').textContent   = activeBook;
      el('adm-stat-users').textContent    = users.length;

      this._renderAdminBikes(bikes);
    } catch(err) { Toast.error('Error', err.message); }
  }

  _renderAdminBikes(bikes) {
    const tbody = el('admin-bikes-tbody');
    if (!bikes || bikes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">No bikes yet. Add one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = bikes.map(bike => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="booking-bike-icon" style="background:#eee;overflow:hidden">
              <img src="${getBikeImage(bike)}" alt="${bike.name}" style="width:100%;height:100%;object-fit:cover" />
            </div>
            <div>
              <div style="font-weight:600">${bike.name}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${bike.type}</div>
            </div>
          </div>
        </td>
        <td>${fmtCurrency(bike.pricePerHour)}/hr</td>
        <td>${bike.available ? '<span class="badge badge-available">Available</span>' : '<span class="badge badge-rented">Rented</span>'}</td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-ghost btn-sm" onclick="app._adminEditBike('${bike._id}')">Edit</button>
            <button class="btn btn-sm" style="background:rgba(108,99,255,0.15);color:var(--primary-light);border:1px solid rgba(108,99,255,0.3)"
              onclick="app._adminToggleAvail('${bike._id}', ${!bike.available})">
              ${bike.available ? 'Mark Rented' : 'Mark Free'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="app._adminDeleteBike('${bike._id}')">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }

  async _adminEditBike(bikeId) {
    try {
      const bikes = await BikeService.getAll();
      const bike = bikes.find(b => b.id === bikeId || b._id === bikeId);
      if (!bike) return;
      
      this.editingBike = bikeId;
      el('admin-form-title').innerHTML   = '<i class="fa-solid fa-pen-to-square" style="color:var(--primary-light)"></i> Edit Bike';
      el('admin-bike-name').value        = bike.name;
      el('admin-bike-type').value        = bike.type;
      el('admin-bike-price').value       = bike.pricePerHour;
      el('admin-bike-features').value    = bike.features.join(', ');
      el('admin-bike-image').value       = bike.imageUrl || '';
      el('btn-cancel-bike-edit').classList.remove('hidden');

      document.getElementById('admin-bike-form-section').scrollIntoView({ behavior: 'smooth' });
    } catch(err) {}
  }

  async _adminToggleAvail(bikeId, available) {
    try {
      await BikeService.update(bikeId, { available });
      Toast.info('Updated', `Bike marked as ${available ? 'available' : 'rented'}.`);
      this._renderAdmin();
    } catch (err) { Toast.error('Error', err.message); }
  }

  async _adminDeleteBike(bikeId) {
    if (!confirm('Delete this bike? This cannot be undone.')) return;
    try {
      await BikeService.delete(bikeId);
      Toast.success('Deleted', 'Bike removed successfully.');
      this._renderAdmin();
    } catch (err) { Toast.error('Error', err.message); }
  }

  async _submitAdminBikeForm() {
    try {
      const name         = el('admin-bike-name').value;
      const type         = el('admin-bike-type').value;
      const pricePerHour = el('admin-bike-price').value;
      const features     = el('admin-bike-features').value.split(',').map(f => f.trim()).filter(Boolean);
      const imageUrl     = el('admin-bike-image').value.trim() || '';

      if (this.editingBike) {
        await BikeService.update(this.editingBike, { name, type, pricePerHour: parseFloat(pricePerHour), features, imageUrl });
        Toast.success('Updated', 'Bike details saved.');
      } else {
        await BikeService.add({ name, type, pricePerHour, features, imageUrl });
        Toast.success('Bike Added! 🚲', `${name} is now in the fleet.`);
      }
      this._resetAdminBikeForm();
      this._renderAdmin();
    } catch (err) { Toast.error('Error', err.message); }
  }

  _resetAdminBikeForm() {
    this.editingBike = null;
    document.getElementById('form-admin-bike').reset();
    el('admin-form-title').innerHTML = '<i class="fa-solid fa-plus-circle" style="color:var(--primary-light)"></i> Add New Bike';
    el('btn-cancel-bike-edit').classList.add('hidden');
  }

  async _renderAdminBookings() {
    const tbody = el('admin-bookings-tbody');
    try {
      const bookings = await BookingService.getAll();
      if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No bookings yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = bookings.map(bk => {
        const bike = bk.bikeId;
        const user = bk.userId;
        const hours = bk.startTime && bk.endTime ? ((new Date(bk.endTime) - new Date(bk.startTime)) / 36e5).toFixed(1) : '—';
        return `
          <tr>
            <td style="font-family:monospace;font-size:0.8rem">${bk._id.slice(0,14)}…</td>
            <td>${user ? user.name : 'Unknown'}</td>
            <td>${bike ? bike.name : 'Unknown'}</td>
            <td>${hours !== '—' ? hours + ' hr' : '—'}</td>
            <td class="text-success" style="font-weight:700">${fmtCurrency(bk.totalCost)}</td>
            <td>
              <div style="font-size:0.78rem">${fmtDateTime(bk.startTime)}</div>
              <div style="font-size:0.78rem;opacity:0.6">${fmtDateTime(bk.endTime)}</div>
            </td>
            <td>${statusBadge(bk.status)}</td>
          </tr>`;
      }).join('');
    } catch(err) { Toast.error('Failed to load bookings', err.message); }
  }

  async _renderAdminUsers() {
    const tbody = el('admin-users-tbody');
    try {
      const users = await UserService.getAll();
      // To get bookings per user, we need all bookings. Usually backend provides a count or admin can fetch all
      const bookings = await BookingService.getAll();
      
      tbody.innerHTML = users.map(u => {
        const bkCount = bookings.filter(b => (b.userId?._id || b.userId) === u._id).length;
        const joined  = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="nav-user-badge" style="padding:0;width:34px;height:34px;justify-content:center">
                  <div class="avatar">${getInitials(u.name)}</div>
                </div>
                <div>
                  <div style="font-weight:600">${u.name}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted)">${u.email}</div>
                </div>
              </div>
            </td>
            <td><span class="role-badge ${u.role}">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
            <td>${bkCount}</td>
            <td>${joined}</td>
          </tr>`;
      }).join('');
    } catch(err) { Toast.error('Error loading users', err.message); }
  }

  _openModal()  { el('modal-overlay').classList.add('open'); }
  _closeModal() { el('modal-overlay').classList.remove('open'); this._currentBike = null; }
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AppController();
});
