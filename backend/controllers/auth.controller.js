/**
 * backend/controllers/auth.controller.js
 * ─────────────────────────────────────────────────────────────
 * Handles user registration, login, and profile retrieval.
 *
 * PRODUCTION equivalent (Express):
 *   exports.register = async (req, res) => { ... res.status(201).json(...) }
 *   exports.login    = async (req, res) => { ... res.json({ token }) }
 *
 * Each function receives a `req`-like object and returns a response object.
 * ─────────────────────────────────────────────────────────────
 */

const AuthController = (() => {
  const User = () => window.BRS.UserModel;
  const Auth = () => window.BRS.AuthMiddleware;

  /**
   * POST /api/auth/register
   * Body: { name, email, password, confirmPassword }
   */
  function register(req) {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      throw { status: 400, message: 'Passwords do not match.' };

    const user = User().create({ name, email, password, role: 'user' });

    // Issue token immediately after registration
    const token = Auth().signToken({ _id: user._id, role: user.role });
    Auth().saveToken(token);

    return {
      status: 201,
      data: {
        message: 'Account created successfully.',
        token,
        user: _sanitize(user),
      }
    };
  }

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  function login(req) {
    const { email, password } = req.body;
    const user  = User().authenticate(email, password);
    const token = Auth().signToken({ _id: user._id, role: user.role });
    Auth().saveToken(token);

    return {
      status: 200,
      data: {
        message: 'Login successful.',
        token,
        user: _sanitize(user),
      }
    };
  }

  /**
   * GET /api/auth/me  (protected)
   * Returns the currently logged-in user's profile.
   */
  function getMe(req) {
    const { user } = Auth().protect(req);
    const bookings = window.BRS.BookingModel.findByUser(user._id);
    const spent    = bookings.filter(b => b.status !== 'cancelled')
                             .reduce((s, b) => s + b.totalCost, 0);
    return {
      status: 200,
      data: {
        user:     _sanitize(user),
        stats: {
          totalBookings:  bookings.length,
          activeBookings: bookings.filter(b => b.status === 'confirmed').length,
          totalSpent:     parseFloat(spent.toFixed(2)),
        }
      }
    };
  }

  /**
   * POST /api/auth/logout
   */
  function logout() {
    Auth().clearToken();
    return { status: 200, data: { message: 'Logged out successfully.' } };
  }

  /** Strip sensitive fields before sending to client (like mongoose .toJSON({ virtuals:true })) */
  function _sanitize(user) {
    const { password, ...safe } = user;    // eslint-disable-line no-unused-vars
    safe.initials = User().getInitials(user.name);
    return safe;
  }

  return { register, login, getMe, logout };
})();

window.BRS = window.BRS || {};
window.BRS.AuthController = AuthController;
