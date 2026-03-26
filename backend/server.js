/**
 * backend/server.js
 * ─────────────────────────────────────────────────────────────
 * Express-like Application Server
 *
 * Registers all routes and dispatches requests to controllers.
 * Also handles DB connection, seeding, and CORS headers (simulated).
 *
 * PRODUCTION equivalent:
 *   const express = require('express');
 *   const app = express();
 *   app.use(cors({ origin: process.env.FRONTEND_URL }));
 *   app.use(express.json());
 *   app.use('/api/auth',     require('./routes/auth.routes'));
 *   app.use('/api/bikes',    require('./routes/bike.routes'));
 *   app.use('/api/bookings', require('./routes/booking.routes'));
 *   app.listen(process.env.PORT || 5000, () => console.log('Server running'));
 * ─────────────────────────────────────────────────────────────
 */

const Server = (() => {
  const PORT = 5000;   // would be used in real Express
  let _booted = false;

  /** All registered routes (merged from route files) */
  let _routes = [];

  /** ── Simulated middleware stack ───────────────────────────── */

  /** Global error handler (mimics Express error middleware) */
  function _errorHandler(err) {
    const status  = err.status  || 500;
    const message = err.message || 'Internal Server Error';
    console.error(`[Server] ❌ ${status}: ${message}`);
    return { status, data: { error: message } };
  }

  /** Route matcher with :param support */
  function _matchRoute(method, url) {
    // Strip query string
    const [pathname]  = url.split('?');
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    const query       = {};
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    for (const route of _routes) {
      if (route.method !== method.toUpperCase()) continue;

      // Convert :param pattern to regex
      const paramNames = [];
      const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
      const regex = new RegExp(`^${pattern}$`);
      const match = pathname.match(regex);

      if (match) {
        const params = {};
        paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        return { route, params, query };
      }
    }
    return null;
  }

  /** ── Public dispatch API (called by api-client.js) ────────── */

  /**
   * dispatch(method, url, body, headers)
   * Simulates an HTTP request/response cycle.
   * Returns: { status: number, data: object }
   */
  function dispatch(method, url, body = {}, headers = {}) {
    if (!_booted) {
      console.warn('[Server] ⚠️  Server not booted. Call Server.boot() first.');
    }

    console.log(`[Server] → ${method.toUpperCase()} ${url}`);

    const matched = _matchRoute(method, url);
    if (!matched) {
      return _errorHandler({ status: 404, message: `Route not found: ${method} ${url}` });
    }

    // Build simulated req object (mirrors Express req)
    const req = {
      method:  method.toUpperCase(),
      url,
      params:  matched.params,
      query:   matched.query,
      body,
      headers: { authorization: headers.authorization || window.BRS.AuthMiddleware.getToken() || '' },
    };

    try {
      const response = matched.route.handler(req);
      console.log(`[Server] ← ${response.status} OK`);
      return response;
    } catch (err) {
      return _errorHandler(err);
    }
  }

  /** ── Seeder ────────────────────────────────────────────────── */

  function _seed() {
    const User    = window.BRS.UserModel;
    const Bike    = window.BRS.BikeModel;

    // Admin account
    if (!User.findByEmail('admin@bikerental.com')) {
      User._insert({
        _id:       'admin000000000000000000',
        name:      'Admin',
        email:     'admin@bikerental.com',
        password:  'admin123',
        role:      'admin',
        createdAt: new Date().toISOString(),
      });
      console.log('[Seed] 👤 Admin account created → admin@bikerental.com / admin123');
    }

    // Demo bikes
    if (Bike.count() === 0) {
      const bikes = [
        { name:'Trailblazer X9',    type:'Mountain', pricePerHour:5.50, emoji:'🚵', features:['Suspension','Disc Brakes','Helmet'] },
        { name:'SpeedPro 700C',     type:'Road',     pricePerHour:4.00, emoji:'🚴', features:['Lightweight','Clipless Pedals'] },
        { name:'CityGlide 3S',      type:'City',     pricePerHour:3.00, emoji:'🚲', features:['Basket','Fender','Bell','Lock'] },
        { name:'VoltRide e-500',    type:'Electric', pricePerHour:8.00, emoji:'⚡', features:['500W Motor','GPS','USB Charge','Helmet'] },
        { name:'GravelKing Pro',    type:'Mountain', pricePerHour:6.00, emoji:'🚵', features:['Tubeless','Dropper Post','GPS'] },
        { name:'UrbanFlow Classic', type:'City',     pricePerHour:2.50, emoji:'🚲', features:['7-Speed','Fender','Lights','Lock'] },
      ];
      bikes.forEach(b => Bike.create(b));
      console.log(`[Seed] 🚲 ${bikes.length} demo bikes created.`);
    }
  }

  /** ── Boot ─────────────────────────────────────────────────── */

  async function boot() {
    if (_booted) return;

    console.log('[Server] 🚀 Starting Bike Rental API Server...');
    console.log(`[Server]    PORT : ${PORT}`);
    console.log('[Server]    ENV  : browser (LocalStorage mock mode)');

    // Connect DB
    await window.BRS.DB.connect();

    // Register all routes
    _routes = [
      ...window.BRS.AuthRoutes,
      ...window.BRS.BikeRoutes,
      ...window.BRS.BookingRoutes,
    ];
    console.log(`[Server] 📋 Registered ${_routes.length} routes.`);

    // Seed initial data
    _seed();

    _booted = true;
    console.log('[Server] ✅ Server ready.');
  }

  return { boot, dispatch };
})();

window.BRS = window.BRS || {};
window.BRS.Server = Server;
