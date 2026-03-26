/**
 * backend/routes/booking.routes.js
 * ─────────────────────────────────────────────────────────────
 * Route definitions for /api/bookings/*
 * ─────────────────────────────────────────────────────────────
 */

const BookingRoutes = [
  { method: 'POST',  path: '/api/bookings',              handler: req => window.BRS.BookingController.create(req)         },
  { method: 'GET',   path: '/api/bookings',              handler: req => window.BRS.BookingController.getAll(req)          },
  { method: 'GET',   path: '/api/bookings/admin/stats',  handler: req => window.BRS.BookingController.getAdminStats(req)   },
  { method: 'GET',   path: '/api/bookings/:id',          handler: req => window.BRS.BookingController.getOne(req)          },
  { method: 'PATCH', path: '/api/bookings/:id/return',   handler: req => window.BRS.BookingController.returnBike(req)      },
  { method: 'PATCH', path: '/api/bookings/:id/cancel',   handler: req => window.BRS.BookingController.cancel(req)          },
];

window.BRS = window.BRS || {};
window.BRS.BookingRoutes = BookingRoutes;
