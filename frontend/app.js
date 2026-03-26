/**
 * frontend/app.js
 * ─────────────────────────────────────────────────────────────
 * Main UI Controller – calls the Java Spring Boot backend
 * via async/await fetch (through api-client.js)
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

class AppController {
  constructor() {
    this._currentBike   = null;
    this._editingBikeId = null;
    this._searchQuery   = '';
    this._filterType    = 'all';
  }

  async init() {
    const { Router, Session, Toast } = window.BRS;

    ['page-auth','page-home','page-bikes','page-bookings','page-profile','page-admin']
      .forEach(id => Router.register(id));

    this._bindAuth();
    this._bindNav();
    this._bindBikes();
    this._bindBookingModal();
    this._bindAdmin();

    // Restore session
    const user = Session.get();
    if (user && window.BRS.API.getToken()) {
      this._onLoggedIn(user, false);
    } else {
      Session.clear();
      Router.navigate('page-auth');
      this._updateNavbar(null);
    }
  }

  /* ─── AUTH ───────────────────────────────────────────────── */

  _bindAuth() {
    // Tab switcher
    $$('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(btn.dataset.form).classList.remove('hidden');
      });
    });

    // Login
    $('form-login').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter;
      btn.disabled = true;
      try {
        const res  = await window.BRS.API.auth.login($('login-email').value, $('login-password').value);
        window.BRS.Session.save(res.user);
        this._onLoggedIn(res.user, true);
      } catch (err) {
        window.BRS.Toast.error('Login Failed', err.message);
      } finally { btn.disabled = false; }
    });

    // Register
    $('form-register').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter;
      btn.disabled = true;
      try {
        const res = await window.BRS.API.auth.register(
          $('reg-name').value, $('reg-email').value,
          $('reg-password').value, $('reg-confirm').value
        );
        window.BRS.Session.save(res.user);
        window.BRS.Toast.success('Account Created!', 'You are now signed in.');
        this._onLoggedIn(res.user, true);
      } catch (err) {
        // Handle validation field errors
        const msg = err.data
          ? Object.values(err.data).join(' · ')
          : err.message;
        window.BRS.Toast.error('Registration Failed', msg);
      } finally { btn.disabled = false; }
    });

    // Logout (delegated)
    document.addEventListener('click', e => {
      if (e.target.closest('[data-action="logout"]')) {
        window.BRS.API.auth.logout();
        window.BRS.Session.clear();
        window.BRS.Router.navigate('page-auth');
        this._updateNavbar(null);
        window.BRS.Toast.info('Signed Out', 'See you soon!');
      }
    });
  }

  _onLoggedIn(user, showToast) {
    this._updateNavbar(user);
    this._navigate('page-home');
    if (showToast) window.BRS.Toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
  }

  /* ─── NAVBAR ─────────────────────────────────────────────── */

  _updateNavbar(user) {
    $('navbar-guest').classList.toggle('hidden', !!user);
    $('navbar-user').classList.toggle('hidden',  !user);
    $('nav-admin-link').classList.toggle('hidden', user?.role !== 'admin');
    if (user) {
      $('nav-user-name').textContent   = user.name.split(' ')[0];
      $('nav-user-avatar').textContent = (user.initials || user.name).slice(0, 2).toUpperCase();
    }
  }

  _bindNav() {
    $$('[data-page-link]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this._navigate(el.dataset.pageLink);
      });
    });
    $('btn-browse-bikes').addEventListener('click', () => {
      window.BRS.Session.isLoggedIn() ? this._navigate('page-bikes') : window.BRS.Router.navigate('page-auth');
    });
    $('btn-go-bookings').addEventListener('click', () => this._navigate('page-bookings'));
  }

  _navigate(page) {
    if (!window.BRS.Session.isLoggedIn() && page !== 'page-auth') {
      window.BRS.Router.navigate('page-auth');
      return;
    }
    if (page === 'page-admin' && !window.BRS.Session.isAdmin()) {
      window.BRS.Toast.error('Access Denied', 'Admins only.');
      return;
    }
    window.BRS.Router.navigate(page, () => {
      switch (page) {
        case 'page-home':     this._renderHome();     break;
        case 'page-bikes':    this._renderBikes();    break;
        case 'page-bookings': this._renderBookings(); break;
        case 'page-profile':  this._renderProfile();  break;
        case 'page-admin':    this._renderAdmin();    break;
      }
    });
  }

  /* ─── HOME ───────────────────────────────────────────────── */

  async _renderHome() {
    try {
      const stats = await window.BRS.API.bookings.getAdminStats();
      document.querySelectorAll('[data-stat="total-bikes"]').forEach(el => el.textContent = stats.totalBikes || 0);
      document.querySelectorAll('[data-stat="avail-bikes"]').forEach(el => el.textContent = stats.availableBikes || 0);
      document.querySelectorAll('[data-stat="total-bookings"]').forEach(el => el.textContent = stats.totalBookings || 0);
      document.querySelectorAll('[data-stat="total-users"]').forEach(el => el.textContent = stats.totalUsers || 0);
    } catch (_) { /* non-admin sees 0s */ }
  }

  /* ─── BIKES ──────────────────────────────────────────────── */

  _bindBikes() {
    $('bike-search').addEventListener('input', e => {
      this._searchQuery = e.target.value.toLowerCase();
      this._renderBikes();
    });
    $('bike-filter').addEventListener('change', e => {
      this._filterType = e.target.value;
      this._renderBikes();
    });
  }

  async _renderBikes() {
    const grid = $('bikes-grid');
    grid.innerHTML = `<div class="loader" style="grid-column:1/-1"><div class="spinner"></div> Loading bikes…</div>`;
    try {
      const params = {};
      if (this._filterType !== 'all') params.type = this._filterType;
      let bikes = await window.BRS.API.bikes.getAll(params);

      if (this._searchQuery)
        bikes = bikes.filter(b => b.name.toLowerCase().includes(this._searchQuery) ||
                                  b.type.toLowerCase().includes(this._searchQuery));

      if (!bikes.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3>No bikes found</h3><p>Try adjusting your search or filter.</p>
        </div>`;
        return;
      }

      grid.innerHTML = bikes.map(b => this._bikeCardHTML(b)).join('');
      grid.querySelectorAll('[data-action="book-bike"]').forEach(btn => {
        btn.addEventListener('click', () => this._openBookingModal(btn.dataset.bikeId));
      });
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Could not load bikes</h3>
        <p>${err.message}</p>
      </div>`;
    }
  }

  _bikeCardHTML(bike) {
    const available = bike.available;
    const statusBadge = available
      ? `<span class="badge badge-available">● Available</span>`
      : `<span class="badge badge-rented">● Rented</span>`;
    const features = (bike.features || []).slice(0, 3).map(f => `<span class="bike-feature-tag">${f}</span>`).join('');
    const bookBtn  = available
      ? `<button class="btn btn-primary btn-sm" data-action="book-bike" data-bike-id="${bike.id}">Book Now</button>`
      : `<button class="btn btn-ghost btn-sm" disabled>Unavailable</button>`;
    return `
      <div class="bike-card">
        <div class="bike-img"><span class="bike-emoji">${bike.emoji || '🚲'}</span></div>
        <div class="bike-body">
          <div class="bike-header">
            <div>
              <div class="bike-name">${bike.name}</div>
              <div class="bike-type">${bike.type} Bike</div>
            </div>
            <div class="bike-price">
              <div class="price-value">${window.BRS.fmtCurrency(bike.pricePerHour)}</div>
              <div class="price-unit">/ hour</div>
            </div>
          </div>
          <div class="bike-features">${features}</div>
          <div class="bike-footer">${statusBadge}${bookBtn}</div>
        </div>
      </div>`;
  }

  /* ─── BOOKING MODAL ──────────────────────────────────────── */

  _bindBookingModal() {
    $('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) this._closeModal(); });
    $('modal-close').addEventListener('click', () => this._closeModal());
    ['booking-unit','booking-duration'].forEach(id => {
      $(id).addEventListener('change', () => this._updateCost());
      $(id).addEventListener('input',  () => this._updateCost());
    });
    $('form-booking').addEventListener('submit', async e => { e.preventDefault(); await this._submitBooking(e.submitter); });
  }

  async _openBookingModal(bikeId) {
    if (!window.BRS.Session.isLoggedIn()) { window.BRS.Router.navigate('page-auth'); return; }
    try {
      const bike = await window.BRS.API.bikes.getOne(bikeId);
      if (!bike.available) { window.BRS.Toast.warning('Unavailable', 'This bike is already rented.'); return; }
      this._currentBike = bike;
      $('modal-bike-emoji').textContent = bike.emoji || '🚲';
      $('modal-bike-name').textContent  = bike.name;
      $('modal-bike-type').textContent  = `${bike.type} Bike`;
      $('modal-bike-price').textContent = `${window.BRS.fmtCurrency(bike.pricePerHour)}/hr · ${window.BRS.fmtCurrency(bike.pricePerHour * 24)}/day`;
      $('modal-title').textContent      = 'Book This Bike';
      $('form-booking').reset();
      this._updateCost();
      $('modal-overlay').classList.add('open');
    } catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  _updateCost() {
    if (!this._currentBike) return;
    const unit     = $('booking-unit').value;
    const duration = parseInt($('booking-duration').value, 10) || 0;
    const rate     = unit === 'days' ? this._currentBike.pricePerHour * 24 : this._currentBike.pricePerHour;
    $('cost-rate').textContent     = window.BRS.fmtCurrency(rate);
    $('cost-duration').textContent = `${duration} ${unit}`;
    $('cost-total').textContent    = window.BRS.fmtCurrency(rate * duration);
  }

  async _submitBooking(btn) {
    if (!this._currentBike) return;
    if (btn) btn.disabled = true;
    try {
      const unit     = $('booking-unit').value;
      const duration = parseInt($('booking-duration').value);
      const res      = await window.BRS.API.bookings.create(this._currentBike.id, unit, duration);
      this._closeModal();
      window.BRS.Toast.success('Booking Confirmed! 🎉', res.message);
      this._renderBikes();
      this._renderHome();
    } catch (err) {
      window.BRS.Toast.error('Booking Failed', err.message);
    } finally { if (btn) btn.disabled = false; }
  }

  _closeModal() { $('modal-overlay').classList.remove('open'); this._currentBike = null; }

  /* ─── MY BOOKINGS ────────────────────────────────────────── */

  async _renderBookings() {
    const empty = $('bookings-empty');
    const wrap  = $('bookings-table-wrap');
    const tbody = $('bookings-tbody');

    empty.classList.add('hidden');
    wrap.classList.add('hidden');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem"><div class="spinner" style="margin:auto"></div></td></tr>`;
    wrap.classList.remove('hidden');

    try {
      const bookings = await window.BRS.API.bookings.getMine();
      if (!bookings.length) {
        wrap.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }

      tbody.innerHTML = bookings.map(bk => {
        const canAct = bk.status === 'CONFIRMED';
        return `<tr>
          <td>
            <div class="booking-bike-info">
              <div class="booking-bike-icon">${bk.bikeEmoji || '🚲'}</div>
              <div>
                <div style="font-weight:600">${bk.bikeName || 'Bike'}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${bk.id.slice(0,12)}…</div>
              </div>
            </div>
          </td>
          <td>${bk.duration} ${bk.unit}</td>
          <td class="text-success" style="font-weight:700">${window.BRS.fmtCurrency(bk.totalCost)}</td>
          <td>${window.BRS.fmtDate(bk.createdAt)}</td>
          <td>${window.BRS.statusBadge(bk.status)}</td>
          <td>
            <div class="d-flex gap-1 flex-wrap">
              ${canAct ? `<button class="btn btn-success btn-sm" onclick="window.app._returnBike('${bk.id}')">Return</button>` : ''}
              ${canAct ? `<button class="btn btn-danger btn-sm" onclick="window.app._cancelBooking('${bk.id}')">Cancel</button>` : ''}
              ${!canAct ? '<span style="color:var(--text-muted);font-size:0.82rem">—</span>' : ''}
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:1rem">${err.message}</td></tr>`;
    }
  }

  async _returnBike(id) {
    if (!confirm('Mark this bike as returned?')) return;
    try { const res = await window.BRS.API.bookings.returnBike(id); window.BRS.Toast.success('Bike Returned', res.message); this._renderBookings(); this._renderHome(); }
    catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  async _cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;
    try { await window.BRS.API.bookings.cancel(id); window.BRS.Toast.info('Booking Cancelled'); this._renderBookings(); this._renderHome(); }
    catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  /* ─── PROFILE ────────────────────────────────────────────── */

  async _renderProfile() {
    try {
      const { user, stats } = await window.BRS.API.auth.getMe();
      $('profile-avatar').textContent   = (user.initials || user.name).slice(0, 2).toUpperCase();
      $('profile-name').textContent     = user.name;
      $('profile-email').textContent    = user.email;
      $('profile-role').textContent     = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      $('profile-role').className       = `role-badge ${user.role}`;
      $('profile-joined').textContent   = user.createdAt ? window.BRS.fmtDate(user.createdAt) : '—';
      $('profile-bookings').textContent = stats.totalBookings;
      $('profile-spent').textContent    = window.BRS.fmtCurrency(stats.totalSpent);
      $('profile-active').textContent   = stats.activeBookings;
    } catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  /* ─── ADMIN ──────────────────────────────────────────────── */

  _bindAdmin() {
    $$('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        $(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'admin-tab-bookings') this._renderAdminBookings();
        if (btn.dataset.tab === 'admin-tab-users')    this._renderAdminUsers();
      });
    });
    $('form-admin-bike').addEventListener('submit', async e => { e.preventDefault(); await this._submitAdminBike(e.submitter); });
    $('btn-cancel-bike-edit').addEventListener('click', () => this._resetAdminBikeForm());
  }

  async _renderAdmin() {
    try {
      const stats = await window.BRS.API.bookings.getAdminStats();
      $('adm-stat-bikes').textContent    = stats.totalBikes    || 0;
      $('adm-stat-avail').textContent    = stats.availableBikes || 0;
      $('adm-stat-bookings').textContent = stats.totalBookings  || 0;
      $('adm-stat-revenue').textContent  = window.BRS.fmtCurrency(stats.revenue || 0);
      $('adm-stat-active').textContent   = stats.activeBookings || 0;
      $('adm-stat-users').textContent    = stats.totalUsers     || 0;
      await this._renderAdminBikes();
    } catch (err) { window.BRS.Toast.error('Admin Error', err.message); }
  }

  async _renderAdminBikes() {
    const tbody = $('admin-bikes-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem"><div class="spinner" style="margin:auto"></div></td></tr>`;
    try {
      const bikes = await window.BRS.API.bikes.getAll();
      if (!bikes.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">No bikes yet. Add one!</td></tr>`;
        return;
      }
      tbody.innerHTML = bikes.map(bike => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div class="booking-bike-icon">${bike.emoji}</div>
            <div><div style="font-weight:600">${bike.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${bike.type}</div></div>
          </div></td>
          <td>${window.BRS.fmtCurrency(bike.pricePerHour)}/hr</td>
          <td>${bike.available ? '<span class="badge badge-available">Available</span>' : '<span class="badge badge-rented">Rented</span>'}</td>
          <td><div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-ghost btn-sm" onclick="window.app._adminEditBike('${bike.id}')">Edit</button>
            <button class="btn btn-sm" style="background:rgba(108,99,255,0.15);color:var(--primary-light);border:1px solid rgba(108,99,255,0.3)"
              onclick="window.app._adminToggleAvail('${bike.id}', ${!bike.available})">
              ${bike.available ? 'Mark Rented' : 'Mark Free'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.app._adminDeleteBike('${bike.id}')">Delete</button>
          </div></td>
        </tr>`).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);padding:1rem">${err.message}</td></tr>`; }
  }

  async _adminEditBike(id) {
    try {
      const bike = await window.BRS.API.bikes.getOne(id);
      this._editingBikeId = id;
      $('admin-form-title').textContent  = 'Edit Bike';
      $('admin-bike-name').value         = bike.name;
      $('admin-bike-type').value         = bike.type;
      $('admin-bike-price').value        = bike.pricePerHour;
      $('admin-bike-features').value     = (bike.features || []).join(', ');
      $('admin-bike-emoji').value        = bike.emoji || '';
      $('btn-cancel-bike-edit').classList.remove('hidden');
      $('admin-bike-form-section').scrollIntoView({ behavior: 'smooth' });
    } catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  async _adminToggleAvail(id, available) {
    try {
      await window.BRS.API.bikes.setAvailability(id, available);
      window.BRS.Toast.info('Updated', `Bike marked as ${available ? 'available' : 'rented'}.`);
      await this._renderAdmin();
    } catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  async _adminDeleteBike(id) {
    if (!confirm('Delete this bike permanently?')) return;
    try {
      await window.BRS.API.bikes.remove(id);
      window.BRS.Toast.success('Deleted', 'Bike removed from the fleet.');
      await this._renderAdmin();
    } catch (err) { window.BRS.Toast.error('Error', err.message); }
  }

  async _submitAdminBike(btn) {
    if (btn) btn.disabled = true;
    try {
      const data = {
        name:         $('admin-bike-name').value,
        type:         $('admin-bike-type').value,
        pricePerHour: parseFloat($('admin-bike-price').value),
        features:     $('admin-bike-features').value.split(',').map(f => f.trim()).filter(Boolean),
        emoji:        $('admin-bike-emoji').value.trim() || '🚲',
      };
      if (this._editingBikeId) {
        await window.BRS.API.bikes.update(this._editingBikeId, data);
        window.BRS.Toast.success('Bike Updated', 'Changes saved.');
      } else {
        await window.BRS.API.bikes.create(data);
        window.BRS.Toast.success('Bike Added! 🚲', `${data.name} is now in the fleet.`);
      }
      this._resetAdminBikeForm();
      await this._renderAdmin();
    } catch (err) {
      const msg = err.data ? Object.values(err.data).join(' · ') : err.message;
      window.BRS.Toast.error('Error', msg);
    } finally { if (btn) btn.disabled = false; }
  }

  _resetAdminBikeForm() {
    this._editingBikeId = null;
    $('form-admin-bike').reset();
    $('admin-form-title').textContent = 'Add New Bike';
    $('btn-cancel-bike-edit').classList.add('hidden');
  }

  async _renderAdminBookings() {
    const tbody = $('admin-bookings-tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem"><div class="spinner" style="margin:auto"></div></td></tr>`;
    try {
      const bookings = await window.BRS.API.bookings.getAll();
      tbody.innerHTML = !bookings.length
        ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No bookings yet.</td></tr>`
        : bookings.map(bk => `<tr>
          <td style="font-family:monospace;font-size:0.8rem">${bk.id.slice(0,14)}…</td>
          <td>${bk.userName || 'Unknown'}</td>
          <td>${(bk.bikeEmoji || '🚲') + ' ' + (bk.bikeName || 'Unknown')}</td>
          <td>${bk.duration} ${bk.unit}</td>
          <td class="text-success" style="font-weight:700">${window.BRS.fmtCurrency(bk.totalCost)}</td>
          <td>${window.BRS.fmtDate(bk.createdAt)}</td>
          <td>${window.BRS.statusBadge(bk.status)}</td>
        </tr>`).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger);padding:1rem">${err.message}</td></tr>`; }
  }

  async _renderAdminUsers() {
    const tbody = $('admin-users-tbody');
    try {
      const users = await window.BRS.API.auth.getUsers();
      tbody.innerHTML = users.map(u => `<tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div class="nav-user-badge" style="padding:0;width:34px;height:34px;justify-content:center;display:inline-flex">
            <div class="avatar">${(u.initials || u.name).slice(0,2).toUpperCase()}</div>
          </div>
          <div><div style="font-weight:600">${u.name}</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">${u.email}</div></div>
        </div></td>
        <td><span class="role-badge ${u.role}">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
        <td>—</td>
        <td>${u.createdAt ? window.BRS.fmtDate(u.createdAt) : '—'}</td>
      </tr>`).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);padding:1rem">${err.message}</td></tr>`; }
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function $(id)   { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

/* ── Boot ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new AppController();
  await window.app.init();
});
