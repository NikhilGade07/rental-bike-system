/**
 * backend/controllers/booking.controller.js
 * ─────────────────────────────────────────────────────────────
 * Booking creation, retrieval, return, and cancellation.
 * ─────────────────────────────────────────────────────────────
 */

const BookingController = (() => {
  const Booking = () => window.BRS.BookingModel;
  const Bike    = () => window.BRS.BikeModel;
  const User    = () => window.BRS.UserModel;
  const Auth    = () => window.BRS.AuthMiddleware;

  /**
   * POST /api/bookings  (protected)
   * Body: { bikeId, unit, duration }
   */
  function create(req) {
    const { user } = Auth().protect(req);
    const { bikeId, unit, duration } = req.body;

    const result = Booking().create({ userId: user._id, bikeId, unit, duration });
    return {
      status: 201,
      data: {
        message: `Booking confirmed! ${result.bike.name} rented for ${duration} ${unit}.`,
        booking: result.booking,
        bike:    result.bike,
      }
    };
  }

  /**
   * GET /api/bookings  (protected – returns current user's bookings)
   * Admin: returns ALL bookings with user & bike populated
   */
  function getAll(req) {
    const { user } = Auth().protect(req);

    let bookings;
    if (user.role === 'admin') {
      // Admin: populate user + bike (simulates mongoose .populate())
      bookings = Booking().findAll()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(bk => ({
          ...bk,
          _user: User().findById(bk.userId),
          _bike: Bike().findById(bk.bikeId),
        }));
    } else {
      bookings = Booking().findByUser(user._id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(bk => ({ ...bk, _bike: Bike().findById(bk.bikeId) }));
    }

    return { status: 200, data: { count: bookings.length, bookings } };
  }

  /**
   * GET /api/bookings/:id  (protected)
   */
  function getOne(req) {
    const { user } = Auth().protect(req);
    const booking  = Booking().findById(req.params.id);

    if (!booking) throw { status: 404, message: 'Booking not found.' };
    if (booking.userId !== user._id && user.role !== 'admin')
      throw { status: 403, message: 'Access denied.' };

    return { status: 200, data: { booking } };
  }

  /**
   * PATCH /api/bookings/:id/return  (protected)
   */
  function returnBike(req) {
    const { user } = Auth().protect(req);
    const booking  = Booking().findById(req.params.id);

    if (!booking) throw { status: 404, message: 'Booking not found.' };
    if (booking.userId !== user._id && user.role !== 'admin')
      throw { status: 403, message: 'Access denied.' };

    const updated = Booking().returnBike(req.params.id);
    return { status: 200, data: { message: 'Bike returned. Thank you!', booking: updated } };
  }

  /**
   * PATCH /api/bookings/:id/cancel  (protected)
   */
  function cancel(req) {
    const { user } = Auth().protect(req);
    const booking  = Booking().findById(req.params.id);

    if (!booking) throw { status: 404, message: 'Booking not found.' };
    if (booking.userId !== user._id && user.role !== 'admin')
      throw { status: 403, message: 'Access denied.' };

    const updated = Booking().cancel(req.params.id);
    return { status: 200, data: { message: 'Booking cancelled.', booking: updated } };
  }

  /**
   * GET /api/bookings/admin/stats  (admin only)
   */
  function getAdminStats(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    return {
      status: 200,
      data: {
        total:    Booking().count(),
        active:   Booking().countActive(),
        revenue:  parseFloat(Booking().totalRevenue().toFixed(2)),
        users:    User().count(),
        bikes:    Bike().count(),
        available:Bike().countAvailable(),
      }
    };
  }

  return { create, getAll, getOne, returnBike, cancel, getAdminStats };
})();

window.BRS = window.BRS || {};
window.BRS.BookingController = BookingController;
