/**
 * ============================================================
 *  ONLINE BIKE RENTAL SYSTEM – script.js
 *  OOP-based JavaScript (Java-style class architecture)
 *  All data persisted via LocalStorage
 * ============================================================
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   DATA MODELS  (Java-style OOP with ES6 Classes)
═══════════════════════════════════════════════════════════════ */

/** Represents a registered User */
class User {
  constructor({ id, name, email, password, role = 'user', createdAt = new Date().toISOString() }) {
    this.id        = id || User.generateId();
    this.name      = name;
    this.email     = email.toLowerCase().trim();
    this.password  = password;           // stored as-is (educational demo)
    this.role      = role;               // 'user' | 'admin'
    this.createdAt = createdAt;
  }

  static generateId() { return 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

  getInitials() {
    return this.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }
}

/** Represents a Bike in the fleet */
class Bike {
  constructor({ id, name, type, pricePerHour, features = [], emoji = '🚲', available = true, createdAt = new Date().toISOString() }) {
    this.id           = id || Bike.generateId();
    this.name         = name;
    this.type         = type;           // Mountain | Road | City | Electric
    this.pricePerHour = parseFloat(pricePerHour);
    this.features     = features;       // ['Helmet', 'GPS', ...]
    this.emoji        = emoji;
    this.available    = available;
    this.createdAt    = createdAt;
  }

  static generateId() { return 'bik_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

  getPricePerDay() { return this.pricePerHour * 24; }
}

/** Represents a Booking / Rental record */
class Booking {
  /**
   * @param {object} opts
   * @param {string} opts.userId
   * @param {string} opts.bikeId
   * @param {string} opts.unit      - 'hours' | 'days'
   * @param {number} opts.duration
   */
  constructor({ id, userId, bikeId, unit, duration, totalCost, status = 'confirmed',
                createdAt = new Date().toISOString(), returnedAt = null }) {
    this.id         = id || Booking.generateId();
    this.userId     = userId;
    this.bikeId     = bikeId;
    this.unit       = unit;
    this.duration   = parseInt(duration, 10);
    this.totalCost  = parseFloat(totalCost);
    this.status     = status;           // 'confirmed' | 'returned' | 'cancelled'
    this.createdAt  = createdAt;
    this.returnedAt = returnedAt;
  }

  static generateId() { return 'bkg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
}

/* ═══════════════════════════════════════════════════════════════
   REPOSITORY LAYER  (LocalStorage CRUD – simulates a DB/backend)
═══════════════════════════════════════════════════════════════ */

class LocalStorageRepository {
  constructor(key) { this.key = key; }

  _read()          { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
  _write(data)     { localStorage.setItem(this.key, JSON.stringify(data)); }

  findAll()        { return this._read(); }
  findById(id)     { return this._read().find(r => r.id === id) || null; }
  findBy(pred)     { return this._read().filter(pred); }

  save(record) {
    const items  = this._read();
    const idx    = items.findIndex(r => r.id === record.id);
    if (idx >= 0) items[idx] = record;
    else          items.push(record);
    this._write(items);
    return record;
  }

  delete(id) {
    const items = this._read().filter(r => r.id !== id);
    this._write(items);
  }

  count() { return this._read().length; }
  countBy(pred) { return this._read().filter(pred).length; }
}

/* ═══════════════════════════════════════════════════════════════
   SERVICE LAYER  (Business logic, simulates Java @Service classes)
═══════════════════════════════════════════════════════════════ */

class UserService {
  constructor(repo) { this.repo = repo; }

  register({ name, email, password }) {
    if (!name || !email || !password) throw new Error('All fields are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format.');
    if (this.repo.findBy(u => u.email === email.toLowerCase().trim()).length > 0)
      throw new Error('An account with this email already exists.');

    const user = new User({ name: name.trim(), email, password });
    this.repo.save(user);
    return user;
  }

  login({ email, password }) {
    const match = this.repo.findBy(u =>
      u.email === email.toLowerCase().trim() && u.password === password
    );
    if (match.length === 0) throw new Error('Invalid email or password.');
    return match[0];
  }

  getById(id) { return this.repo.findById(id); }
  getAll()    { return this.repo.findAll(); }
}

class BikeService {
  constructor(repo) { this.repo = repo; }

  getAll()       { return this.repo.findAll().map(b => Object.assign(new Bike({}), b)); }
  getAvailable() { return this.getAll().filter(b => b.available); }
  getById(id)    { const r = this.repo.findById(id); return r ? Object.assign(new Bike({}), r) : null; }

  add({ name, type, pricePerHour, features, emoji }) {
    if (!name || !type || !pricePerHour) throw new Error('Name, type and price are required.');
    const bike = new Bike({ name: name.trim(), type, pricePerHour, features, emoji });
    this.repo.save(bike);
    return bike;
  }

  update(id, changes) {
    const bike = this.repo.findById(id);
    if (!bike) throw new Error('Bike not found.');
    const updated = Object.assign({}, bike, changes);
    this.repo.save(updated);
    return updated;
  }

  delete(id) {
    const bike = this.repo.findById(id);
    if (!bike) throw new Error('Bike not found.');
    this.repo.delete(id);
  }

  setAvailability(id, available) { return this.update(id, { available }); }

  count()          { return this.repo.count(); }
  countAvailable() { return this.repo.countBy(b => b.available); }
}

class BookingService {
  constructor(bookingRepo, bikeService) {
    this.repo        = bookingRepo;
    this.bikeService = bikeService;
  }

  /**
   * Creates a booking and marks the bike as rented.
   */
  book({ userId, bikeId, unit, duration }) {
    const bike = this.bikeService.getById(bikeId);
    if (!bike)           throw new Error('Bike not found.');
    if (!bike.available) throw new Error('This bike is currently not available.');
    if (!duration || duration < 1) throw new Error('Duration must be at least 1.');

    const durationNum  = parseInt(duration, 10);
    const totalCost    = unit === 'days'
      ? bike.pricePerHour * 24 * durationNum
      : bike.pricePerHour * durationNum;

    const booking = new Booking({ userId, bikeId, unit, duration: durationNum, totalCost });
    this.repo.save(booking);
    this.bikeService.setAvailability(bikeId, false);
    return { booking, bike };
  }

  returnBike(bookingId) {
    const booking = this.repo.findById(bookingId);
    if (!booking) throw new Error('Booking not found.');
    const updated = Object.assign({}, booking, { status: 'returned', returnedAt: new Date().toISOString() });
    this.repo.save(updated);
    this.bikeService.setAvailability(booking.bikeId, true);
    return updated;
  }

  cancelBooking(bookingId) {
    const booking = this.repo.findById(bookingId);
    if (!booking) throw new Error('Booking not found.');
    const updated = Object.assign({}, booking, { status: 'cancelled' });
    this.repo.save(updated);
    if (booking.status === 'confirmed') this.bikeService.setAvailability(booking.bikeId, true);
    return updated;
  }

  getByUser(userId) { return this.repo.findBy(b => b.userId === userId); }
  getAll()          { return this.repo.findAll(); }

  totalRevenue() {
    return this.repo.findBy(b => b.status !== 'cancelled')
                    .reduce((s, b) => s + b.totalCost, 0);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SEED DATA  (pre-populate bikes & admin account on first run)
═══════════════════════════════════════════════════════════════ */

function seedData(userService, bikeService) {
  // Admin account
  if (userService.repo.findBy(u => u.role === 'admin').length === 0) {
    userService.repo.save(new User({
      name: 'Admin', email: 'admin@bikerental.com', password: 'admin123', role: 'admin'
    }));
  }

  // Demo bikes
  if (bikeService.count() === 0) {
    const bikes = [
      { name: 'Trailblazer X9',   type: 'Mountain', pricePerHour: 5.50,  emoji: '🚵', features: ['Suspension', 'Disc Brakes', 'Helmet'] },
      { name: 'SpeedPro 700C',    type: 'Road',     pricePerHour: 4.00,  emoji: '🚴', features: ['Lightweight', 'Clipless Pedals'] },
      { name: 'CityGlide 3S',     type: 'City',     pricePerHour: 3.00,  emoji: '🚲', features: ['Basket', 'Fender', 'Bell', 'Lock'] },
      { name: 'VoltRide e-500',   type: 'Electric', pricePerHour: 8.00,  emoji: '⚡', features: ['500W Motor', 'GPS', 'USB Charge', 'Helmet'] },
      { name: 'GravelKing Pro',   type: 'Mountain', pricePerHour: 6.00,  emoji: '🚵', features: ['Tubeless', 'Dropper Post', 'GPS'] },
      { name: 'UrbanFlow Classic', type: 'City',    pricePerHour: 2.50,  emoji: '🚲', features: ['7-Speed', 'Fender', 'Lights', 'Lock'] },
    ];
    bikes.forEach(b => bikeService.add(b));
  }
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════════════════════════════ */

class Toast {
  static _icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  static show(type, title, msg, duration = 4000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${Toast._icons[type] || 'ℹ'}</div>
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

    // sync nav active state
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === id);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   SESSION MANAGER  (holds logged-in user)
═══════════════════════════════════════════════════════════════ */

class Session {
  static KEY = 'brs_session';

  static save(user) { localStorage.setItem(Session.KEY, JSON.stringify(user)); }
  static get()      { return JSON.parse(localStorage.getItem(Session.KEY) || 'null'); }
  static clear()    { localStorage.removeItem(Session.KEY); }
}

/* ═══════════════════════════════════════════════════════════════
   UI CONTROLLER  (the main application controller)
═══════════════════════════════════════════════════════════════ */

class AppController {
  constructor() {
    /* ── repos ─ */
    this.userRepo    = new LocalStorageRepository('brs_users');
    this.bikeRepo    = new LocalStorageRepository('brs_bikes');
    this.bookingRepo = new LocalStorageRepository('brs_bookings');

    /* ── services ─ */
    this.userService    = new UserService(this.userRepo);
    this.bikeService    = new BikeService(this.bikeRepo);
    this.bookingService = new BookingService(this.bookingRepo, this.bikeService);

    /* ── router & session ─ */
    this.router  = new Router();
    this.session = null;          // current user object

    /* ── state ─ */
    this.searchQuery  = '';
    this.filterType   = 'all';
    this.editingBike  = null;     // for admin edit mode

    /* ── bootstrap ─ */
    seedData(this.userService, this.bikeService);
    this._initDOM();
    this._bindGlobal();

    /* ── check remembered session ─ */
    const saved = Session.get();
    if (saved) {
      this.session = saved;
      this._onLoggedIn();
    } else {
      this._showAuth();
    }
  }

  /* ──────────────────────────────────────────────── */
  /*  DOM INITIALISATION                              */
  /* ──────────────────────────────────────────────── */

  _initDOM() {
    ['page-auth', 'page-home', 'page-bikes', 'page-bookings', 'page-profile', 'page-admin'].forEach(id => {
      this.router.register(id, document.getElementById(id));
    });
  }

  _bindGlobal() {
    /* ── Auth tabs ─ */
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.form;
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
      });
    });

    /* ── Login form ─ */
    document.getElementById('form-login').addEventListener('submit', e => {
      e.preventDefault();
      try {
        const email    = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const user     = this.userService.login({ email, password });
        this.session   = user;
        Session.save(user);
        this._onLoggedIn();
        Toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      } catch (err) {
        Toast.error('Login Failed', err.message);
      }
    });

    /* ── Register form ─ */
    document.getElementById('form-register').addEventListener('submit', e => {
      e.preventDefault();
      try {
        const name     = document.getElementById('reg-name').value;
        const email    = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm  = document.getElementById('reg-confirm').value;
        if (password !== confirm) throw new Error('Passwords do not match.');
        this.userService.register({ name, email, password });
        Toast.success('Account Created!', 'You can now log in.');
        document.getElementById('form-register').reset();
        // switch to login tab
        document.querySelector('[data-form="form-login"]').click();
      } catch (err) {
        Toast.error('Registration Failed', err.message);
      }
    });

    /* ── Logout ─ */
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => {
        Session.clear();
        this.session = null;
        this._showAuth();
        Toast.info('Signed Out', 'See you soon!');
      });
    });

    /* ── Nav links ─ */
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const page = a.dataset.nav;
        if (page !== 'page-auth' && !this.session) { this._showAuth(); return; }
        this._navigate(page);
      });
    });

    /* ── Bike search ─ */
    document.getElementById('bike-search').addEventListener('input', e => {
      this.searchQuery = e.target.value.toLowerCase();
      this._renderBikes();
    });

    document.getElementById('bike-filter').addEventListener('change', e => {
      this.filterType = e.target.value;
      this._renderBikes();
    });

    /* ── Admin: add/edit bike form ─ */
    document.getElementById('form-admin-bike').addEventListener('submit', e => {
      e.preventDefault();
      this._submitAdminBikeForm();
    });

    /* ── Admin: cancel edit ─ */
    document.getElementById('btn-cancel-bike-edit').addEventListener('click', () => {
      this._resetAdminBikeForm();
    });

    /* ── Booking form (inside modal) ─ */
    document.getElementById('form-booking').addEventListener('submit', e => {
      e.preventDefault();
      this._submitBooking();
    });

    /* ── Booking: recalculate cost on input ─ */
    ['booking-unit', 'booking-duration'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this._updateBookingCost());
      document.getElementById(id).addEventListener('input',  () => this._updateBookingCost());
    });

    /* ── Close modal on overlay click ─ */
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this._closeModal();
    });
    document.getElementById('modal-close').addEventListener('click', () => this._closeModal());

    /* ── CTA hero button ─ */
    document.getElementById('btn-browse-bikes').addEventListener('click', () => {
      if (this.session) this._navigate('page-bikes');
      else this._showAuth();
    });

    /* ── Admin tab switching ─ */
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        if (target === 'admin-tab-bookings') this._renderAdminBookings();
        if (target === 'admin-tab-users')    this._renderAdminUsers();
      });
    });
  }

  /* ──────────────────────────────────────────────── */
  /*  SESSION / AUTH                                  */
  /* ──────────────────────────────────────────────── */

  _showAuth() { this.router.navigate('page-auth'); this._updateNavbar(); }

  _onLoggedIn() {
    this._updateNavbar();
    this._navigate('page-home');
    this._updateStats();
  }

  _updateNavbar() {
    const loggedIn  = !!this.session;
    const isAdmin   = this.session?.role === 'admin';

    el('navbar-guest').classList.toggle('hidden', loggedIn);
    el('navbar-user').classList.toggle('hidden', !loggedIn);
    el('nav-admin-link').classList.toggle('hidden', !isAdmin);

    if (loggedIn) {
      el('nav-user-name').textContent   = this.session.name.split(' ')[0];
      el('nav-user-avatar').textContent = new User(this.session).getInitials();
    }
  }

  /* ──────────────────────────────────────────────── */
  /*  NAVIGATION                                      */
  /* ──────────────────────────────────────────────── */

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
  /*  HOME PAGE                                       */
  /* ──────────────────────────────────────────────── */

  _renderHome() {
    this._updateStats();
  }

  _updateStats() {
    q('[data-stat="total-bikes"]',     v => v.textContent = this.bikeService.count());
    q('[data-stat="avail-bikes"]',     v => v.textContent = this.bikeService.countAvailable());
    q('[data-stat="total-bookings"]',  v => v.textContent = this.bookingService.repo.count());
    q('[data-stat="total-users"]',     v => v.textContent = this.userService.repo.count());
  }

  /* ──────────────────────────────────────────────── */
  /*  BIKES PAGE                                      */
  /* ──────────────────────────────────────────────── */

  _renderBikes() {
    let bikes = this.bikeService.getAll();

    // search filter
    if (this.searchQuery) {
      bikes = bikes.filter(b =>
        b.name.toLowerCase().includes(this.searchQuery) ||
        b.type.toLowerCase().includes(this.searchQuery)
      );
    }

    // type filter
    if (this.filterType !== 'all') {
      bikes = bikes.filter(b => b.type.toLowerCase() === this.filterType.toLowerCase());
    }

    const grid = el('bikes-grid');
    if (bikes.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No bikes found</h3>
        <p>Try adjusting your search or filter.</p>
      </div>`;
      return;
    }

    grid.innerHTML = bikes.map(bike => this._bikeCardHTML(bike)).join('');

    // attach book buttons
    grid.querySelectorAll('[data-action="book-bike"]').forEach(btn => {
      btn.addEventListener('click', () => this._openBookingModal(btn.dataset.bikeId));
    });
  }

  _bikeCardHTML(bike) {
    const statusBadge = bike.available
      ? `<span class="badge badge-available">● Available</span>`
      : `<span class="badge badge-rented">● Rented</span>`;

    const featureTags = bike.features.slice(0, 3).map(f =>
      `<span class="bike-feature-tag">${f}</span>`).join('');

    const bookBtn = bike.available
      ? `<button class="btn btn-primary btn-sm" data-action="book-bike" data-bike-id="${bike.id}">Book Now</button>`
      : `<button class="btn btn-ghost btn-sm" disabled>Unavailable</button>`;

    return `
      <div class="bike-card">
        <div class="bike-img">
          <span class="bike-emoji">${bike.emoji}</span>
        </div>
        <div class="bike-body">
          <div class="bike-header">
            <div>
              <div class="bike-name">${bike.name}</div>
              <div class="bike-type">${bike.type} Bike</div>
            </div>
            <div class="bike-price">
              <div class="price-value">$${bike.pricePerHour.toFixed(2)}</div>
              <div class="price-unit">/ hour</div>
            </div>
          </div>
          <div class="bike-features">${featureTags}</div>
          <div class="bike-footer">
            ${statusBadge}
            ${bookBtn}
          </div>
        </div>
      </div>`;
  }

  /* ──────────────────────────────────────────────── */
  /*  BOOKING MODAL                                   */
  /* ──────────────────────────────────────────────── */

  _currentBike = null;

  _openBookingModal(bikeId) {
    if (!this.session) { this._showAuth(); return; }
    const bike = this.bikeService.getById(bikeId);
    if (!bike) { Toast.error('Error', 'Bike not found.'); return; }
    if (!bike.available) { Toast.warning('Unavailable', 'This bike is already rented.'); return; }

    this._currentBike = bike;

    el('modal-bike-emoji').textContent = bike.emoji;
    el('modal-bike-name').textContent  = bike.name;
    el('modal-bike-type').textContent  = `${bike.type} Bike`;
    el('modal-bike-price').textContent = `$${bike.pricePerHour}/hr  ·  $${bike.getPricePerDay().toFixed(2)}/day`;
    el('modal-title').textContent      = 'Book This Bike';

    // reset form
    document.getElementById('form-booking').reset();
    this._updateBookingCost();
    this._openModal();
  }

  _updateBookingCost() {
    if (!this._currentBike) return;
    const unit     = document.getElementById('booking-unit').value;
    const duration = parseInt(document.getElementById('booking-duration').value, 10) || 0;
    const rate     = unit === 'days' ? this._currentBike.pricePerHour * 24 : this._currentBike.pricePerHour;
    const total    = rate * duration;

    el('cost-rate').textContent     = `$${rate.toFixed(2)}`;
    el('cost-duration').textContent = `${duration} ${unit}`;
    el('cost-total').textContent    = `$${total.toFixed(2)}`;
  }

  _submitBooking() {
    if (!this.session || !this._currentBike) return;
    try {
      const unit     = document.getElementById('booking-unit').value;
      const duration = document.getElementById('booking-duration').value;
      const { booking, bike } = this.bookingService.book({
        userId: this.session.id,
        bikeId: this._currentBike.id,
        unit, duration
      });
      this._closeModal();
      this._currentBike = null;
      Toast.success('Booking Confirmed! 🎉', `${bike.name} booked for ${duration} ${unit}. Total: $${booking.totalCost.toFixed(2)}`);
      this._renderBikes();
      this._updateStats();
    } catch (err) {
      Toast.error('Booking Failed', err.message);
    }
  }

  /* ──────────────────────────────────────────────── */
  /*  BOOKINGS HISTORY PAGE                           */
  /* ──────────────────────────────────────────────── */

  _renderBookings() {
    const tbody = el('bookings-tbody');
    const bookings = this.bookingService.getByUser(this.session.id)
                         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (bookings.length === 0) {
      el('bookings-empty').classList.remove('hidden');
      el('bookings-table-wrap').classList.add('hidden');
      return;
    }

    el('bookings-empty').classList.add('hidden');
    el('bookings-table-wrap').classList.remove('hidden');

    tbody.innerHTML = bookings.map(bk => {
      const bike       = this.bikeService.getById(bk.bikeId);
      const bikeName   = bike ? bike.name : 'Unknown Bike';
      const bikeEmoji  = bike ? bike.emoji : '🚲';
      const date       = new Date(bk.createdAt).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
      const statusBadge= this._statusBadge(bk.status);
      const canReturn  = bk.status === 'confirmed';
      const canCancel  = bk.status === 'confirmed';
      return `
        <tr>
          <td>
            <div class="booking-bike-info">
              <div class="booking-bike-icon">${bikeEmoji}</div>
              <div>
                <div style="font-weight:600">${bikeName}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${bk.id.slice(0,12)}</div>
              </div>
            </div>
          </td>
          <td>${bk.duration} ${bk.unit}</td>
          <td class="text-success" style="font-weight:700">$${bk.totalCost.toFixed(2)}</td>
          <td>${date}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="d-flex gap-1 flex-wrap">
              ${canReturn ? `<button class="btn btn-success btn-sm" onclick="app._returnBike('${bk.id}')">Return</button>` : ''}
              ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="app._cancelBooking('${bk.id}')">Cancel</button>` : ''}
              ${!canReturn && !canCancel ? '<span style="color:var(--text-muted);font-size:0.82rem">—</span>' : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  _returnBike(bookingId) {
    if (!confirm('Mark this bike as returned?')) return;
    try {
      this.bookingService.returnBike(bookingId);
      Toast.success('Bike Returned', 'Thank you for using our service!');
      this._renderBookings();
      this._updateStats();
    } catch (err) { Toast.error('Error', err.message); }
  }

  _cancelBooking(bookingId) {
    if (!confirm('Cancel this booking?')) return;
    try {
      this.bookingService.cancelBooking(bookingId);
      Toast.info('Booking Cancelled');
      this._renderBookings();
      this._updateStats();
    } catch (err) { Toast.error('Error', err.message); }
  }

  _statusBadge(status) {
    const map = { confirmed: 'badge-confirmed', returned: 'badge-available', cancelled: 'badge-rented' };
    return `<span class="badge ${map[status] || ''}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
  }

  /* ──────────────────────────────────────────────── */
  /*  PROFILE PAGE                                    */
  /* ──────────────────────────────────────────────── */

  _renderProfile() {
    if (!this.session) return;
    const user = this.userService.getById(this.session.id) || this.session;
    const initials = new User(user).getInitials();
    const bookings = this.bookingService.getByUser(user.id);
    const spent    = bookings.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+b.totalCost,0);

    el('profile-avatar').textContent   = initials;
    el('profile-name').textContent     = user.name;
    el('profile-email').textContent    = user.email;
    el('profile-role').textContent     = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    el('profile-role').className       = `role-badge ${user.role}`;
    el('profile-joined').textContent   = new Date(user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long'});
    el('profile-bookings').textContent = bookings.length;
    el('profile-spent').textContent    = `$${spent.toFixed(2)}`;
    el('profile-active').textContent   = bookings.filter(b=>b.status==='confirmed').length;
  }

  /* ──────────────────────────────────────────────── */
  /*  ADMIN DASHBOARD                                 */
  /* ──────────────────────────────────────────────── */

  _renderAdmin() {
    // stats
    const allBikes    = this.bikeService.count();
    const availBikes  = this.bikeService.countAvailable();
    const allBookings = this.bookingService.repo.count();
    const revenue     = this.bookingService.totalRevenue();
    const activeBook  = this.bookingService.repo.countBy(b => b.status === 'confirmed');

    el('adm-stat-bikes').textContent    = allBikes;
    el('adm-stat-avail').textContent    = availBikes;
    el('adm-stat-bookings').textContent = allBookings;
    el('adm-stat-revenue').textContent  = `$${revenue.toFixed(2)}`;
    el('adm-stat-active').textContent   = activeBook;
    el('adm-stat-users').textContent    = this.userService.repo.count();

    this._renderAdminBikes();
  }

  _renderAdminBikes() {
    const bikes = this.bikeService.getAll();
    const tbody = el('admin-bikes-tbody');

    if (bikes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No bikes yet. Add one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = bikes.map(bike => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="booking-bike-icon">${bike.emoji}</div>
            <div>
              <div style="font-weight:600">${bike.name}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${bike.type}</div>
            </div>
          </div>
        </td>
        <td>$${bike.pricePerHour.toFixed(2)}/hr</td>
        <td>${bike.available
          ? '<span class="badge badge-available">Available</span>'
          : '<span class="badge badge-rented">Rented</span>'}</td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-ghost btn-sm" onclick="app._adminEditBike('${bike.id}')">Edit</button>
            <button class="btn btn-sm" style="background:rgba(108,99,255,0.15);color:var(--primary-light);border:1px solid rgba(108,99,255,0.3)"
              onclick="app._adminToggleAvail('${bike.id}', ${!bike.available})">
              ${bike.available ? 'Mark Rented' : 'Mark Free'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="app._adminDeleteBike('${bike.id}')">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }

  _adminEditBike(bikeId) {
    const bike = this.bikeService.getById(bikeId);
    if (!bike) return;
    this.editingBike = bikeId;

    el('admin-form-title').textContent    = 'Edit Bike';
    el('admin-bike-name').value           = bike.name;
    el('admin-bike-type').value           = bike.type;
    el('admin-bike-price').value          = bike.pricePerHour;
    el('admin-bike-features').value       = bike.features.join(', ');
    el('admin-bike-emoji').value          = bike.emoji;
    el('btn-cancel-bike-edit').classList.remove('hidden');

    // scroll to form
    document.getElementById('admin-bike-form-section').scrollIntoView({ behavior: 'smooth' });
  }

  _adminToggleAvail(bikeId, available) {
    try {
      this.bikeService.setAvailability(bikeId, available);
      Toast.info('Updated', `Bike marked as ${available ? 'available' : 'rented'}.`);
      this._renderAdminBikes();
      this._renderAdmin();
    } catch (err) { Toast.error('Error', err.message); }
  }

  _adminDeleteBike(bikeId) {
    if (!confirm('Delete this bike? This cannot be undone.')) return;
    try {
      this.bikeService.delete(bikeId);
      Toast.success('Deleted', 'Bike removed successfully.');
      this._renderAdmin();
    } catch (err) { Toast.error('Error', err.message); }
  }

  _submitAdminBikeForm() {
    try {
      const name         = el('admin-bike-name').value;
      const type         = el('admin-bike-type').value;
      const pricePerHour = el('admin-bike-price').value;
      const features     = el('admin-bike-features').value.split(',').map(f => f.trim()).filter(Boolean);
      const emoji        = el('admin-bike-emoji').value.trim() || '🚲';

      if (this.editingBike) {
        this.bikeService.update(this.editingBike, { name, type, pricePerHour, features, emoji });
        Toast.success('Updated', 'Bike details saved.');
      } else {
        this.bikeService.add({ name, type, pricePerHour, features, emoji });
        Toast.success('Bike Added! 🚲', `${name} is now in the fleet.`);
      }
      this._resetAdminBikeForm();
      this._renderAdmin();
    } catch (err) {
      Toast.error('Error', err.message);
    }
  }

  _resetAdminBikeForm() {
    this.editingBike = null;
    document.getElementById('form-admin-bike').reset();
    el('admin-form-title').textContent = 'Add New Bike';
    el('btn-cancel-bike-edit').classList.add('hidden');
  }

  _renderAdminBookings() {
    const bookings = this.bookingService.getAll()
                         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = el('admin-bookings-tbody');

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No bookings yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(bk => {
      const bike = this.bikeService.getById(bk.bikeId);
      const user = this.userService.getById(bk.userId);
      const date = new Date(bk.createdAt).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'});
      return `
        <tr>
          <td style="font-family:monospace;font-size:0.8rem">${bk.id.slice(0,14)}</td>
          <td>${user ? user.name : 'Unknown'}</td>
          <td>${bike ? bike.emoji + ' ' + bike.name : 'Unknown'}</td>
          <td>${bk.duration} ${bk.unit}</td>
          <td class="text-success" style="font-weight:700">$${bk.totalCost.toFixed(2)}</td>
          <td>${date}</td>
          <td>${this._statusBadge(bk.status)}</td>
        </tr>`;
    }).join('');
  }

  _renderAdminUsers() {
    const users = this.userService.getAll();
    const tbody = el('admin-users-tbody');

    tbody.innerHTML = users.map(u => {
      const bkCount = this.bookingService.getByUser(u.id).length;
      const joined  = new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',year:'numeric'});
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="nav-user-badge" style="padding:0;width:34px;height:34px;justify-content:center">
                <div class="avatar">${new User(u).getInitials()}</div>
              </div>
              <div>
                <div style="font-weight:600">${u.name}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${u.email}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="role-badge ${u.role}">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span>
          </td>
          <td>${bkCount}</td>
          <td>${joined}</td>
        </tr>`;
    }).join('');
  }

  /* ──────────────────────────────────────────────── */
  /*  MODAL HELPERS                                   */
  /* ──────────────────────────────────────────────── */

  _openModal()  { el('modal-overlay').classList.add('open'); }
  _closeModal() { el('modal-overlay').classList.remove('open'); this._currentBike = null; }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/** shorthand getElementById */
function el(id) { return document.getElementById(id); }

/** querySelector + callback */
function q(selector, cb) {
  document.querySelectorAll(selector).forEach(cb);
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AppController();
});
