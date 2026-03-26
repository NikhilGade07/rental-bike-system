/**
 * backend/routes/auth.routes.js
 * ─────────────────────────────────────────────────────────────
 * Route definitions for /api/auth/*
 *
 * PRODUCTION equivalent:
 *   const router = require('express').Router();
 *   router.post('/register', authController.register);
 *   router.post('/login',    authController.login);
 *   router.get('/me',        protect, authController.getMe);
 *   router.post('/logout',   authController.logout);
 *   module.exports = router;
 * ─────────────────────────────────────────────────────────────
 */

const AuthRoutes = [
  { method: 'POST', path: '/api/auth/register', handler: req => window.BRS.AuthController.register(req) },
  { method: 'POST', path: '/api/auth/login',    handler: req => window.BRS.AuthController.login(req)    },
  { method: 'GET',  path: '/api/auth/me',        handler: req => window.BRS.AuthController.getMe(req)    },
  { method: 'POST', path: '/api/auth/logout',    handler: req => window.BRS.AuthController.logout(req)   },
];

window.BRS = window.BRS || {};
window.BRS.AuthRoutes = AuthRoutes;
