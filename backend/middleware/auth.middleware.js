/**
 * backend/middleware/auth.middleware.js
 * ─────────────────────────────────────────────────────────────
 * JWT-style Authentication Middleware
 *
 * PRODUCTION equivalent:
 *   const jwt = require('jsonwebtoken');
 *   module.exports = (req, res, next) => {
 *     const token = req.headers.authorization?.split(' ')[1];
 *     try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
 *     catch { res.status(401).json({ error: 'Unauthorized' }); }
 *   };
 *
 * CURRENT: Reads token from localStorage token store & resolves user.
 * ─────────────────────────────────────────────────────────────
 */

const AuthMiddleware = (() => {
  const TOKEN_KEY    = 'brs_auth_token';
  const JWT_SECRET   = 'brs_super_secret_key_2024';   // In prod: process.env.JWT_SECRET

  /** ── Token helpers ────────────────────────────────────────── */

  /**
   * Simulates jwt.sign(payload, secret, { expiresIn: '7d' })
   * Encodes payload as base64 with a timestamp.
   */
  function signToken(payload) {
    const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body    = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7*24*60*60*1000 }));
    const sig     = btoa(JWT_SECRET + payload._id);   // simplified signature
    return `${header}.${body}.${sig}`;
  }

  /**
   * Simulates jwt.verify(token, secret)
   * Returns decoded payload or throws if expired/invalid.
   */
  function verifyToken(token) {
    if (!token) throw { status: 401, message: 'No token provided.' };
    try {
      const [, body] = token.split('.');
      const payload  = JSON.parse(atob(body));
      if (Date.now() > payload.exp) throw new Error('Token expired.');
      return payload;
    } catch {
      throw { status: 401, message: 'Invalid or expired token.' };
    }
  }

  /** Persist token to localStorage (simulates HTTP-only cookie / header) */
  function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
  function getToken()       { return localStorage.getItem(TOKEN_KEY); }
  function clearToken()     { localStorage.removeItem(TOKEN_KEY); }

  /** ── Middleware function ───────────────────────────────────── */

  /**
   * Middleware: protect(req)
   * Verifies token and attaches user to req.user.
   * Equivalent to Express middleware calling next() or res.status(401)
   */
  function protect(req = {}) {
    const token = req.headers?.authorization?.replace('Bearer ', '') || getToken();
    const payload = verifyToken(token);

    const user = window.BRS.UserModel.findById(payload._id);
    if (!user) throw { status: 401, message: 'User belonging to this token no longer exists.' };

    req.user = user;
    return req;
  }

  /**
   * Middleware: adminOnly(req)
   * Must be used after protect(). Checks for admin role.
   */
  function adminOnly(req) {
    if (!req.user) throw { status: 401, message: 'Not authenticated.' };
    if (req.user.role !== 'admin') throw { status: 403, message: 'Admin access required.' };
    return req;
  }

  return { signToken, verifyToken, saveToken, getToken, clearToken, protect, adminOnly };
})();

window.BRS = window.BRS || {};
window.BRS.AuthMiddleware = AuthMiddleware;
