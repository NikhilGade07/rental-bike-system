/**
 * backend/controllers/bike.controller.js
 * ─────────────────────────────────────────────────────────────
 * CRUD operations for the Bike resource.
 * ─────────────────────────────────────────────────────────────
 */

const BikeController = (() => {
  const Bike = () => window.BRS.BikeModel;
  const Auth = () => window.BRS.AuthMiddleware;

  /**
   * GET /api/bikes
   * Public – returns all bikes (optionally filtered by ?type= or ?available=true)
   */
  function getAll(req) {
    let bikes = Bike().findAll();

    // Query-string filters (simulates Express req.query)
    const { type, available } = req.query || {};
    if (type)                bikes = bikes.filter(b => b.type.toLowerCase() === type.toLowerCase());
    if (available === 'true') bikes = bikes.filter(b => b.available);

    return { status: 200, data: { count: bikes.length, bikes } };
  }

  /**
   * GET /api/bikes/:id
   * Public
   */
  function getOne(req) {
    const bike = Bike().findById(req.params.id);
    if (!bike) throw { status: 404, message: 'Bike not found.' };
    return { status: 200, data: { bike } };
  }

  /**
   * POST /api/bikes  (admin only)
   * Body: { name, type, pricePerHour, features[], emoji }
   */
  function create(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    const bike = Bike().create(req.body);
    return { status: 201, data: { message: 'Bike created.', bike } };
  }

  /**
   * PUT /api/bikes/:id  (admin only)
   * Body: partial bike fields to update
   */
  function update(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    const bike = Bike().update(req.params.id, req.body);
    return { status: 200, data: { message: 'Bike updated.', bike } };
  }

  /**
   * DELETE /api/bikes/:id  (admin only)
   */
  function remove(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    Bike().remove(req.params.id);
    return { status: 200, data: { message: 'Bike deleted.' } };
  }

  /**
   * PATCH /api/bikes/:id/availability  (admin only)
   * Body: { available: boolean }
   */
  function setAvailability(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    const bike = Bike().setAvailability(req.params.id, req.body.available);
    return { status: 200, data: { message: 'Availability updated.', bike } };
  }

  /**
   * GET /api/bikes/stats  (admin only)
   */
  function getStats(req) {
    Auth().protect(req);
    Auth().adminOnly(req);
    return {
      status: 200,
      data: {
        total:     Bike().count(),
        available: Bike().countAvailable(),
        rented:    Bike().count() - Bike().countAvailable(),
      }
    };
  }

  return { getAll, getOne, create, update, remove, setAvailability, getStats };
})();

window.BRS = window.BRS || {};
window.BRS.BikeController = BikeController;
