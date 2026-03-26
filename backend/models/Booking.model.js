/**
 * backend/models/Booking.model.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose-style Booking Schema & Model
 * ─────────────────────────────────────────────────────────────
 */

const BookingModel = (() => {
  const db   = () => window.BRS.DB.collection('bookings');
  const Bike = () => window.BRS.BikeModel;

  /** Schema */
  const schema = {
    _id:        { type: 'String', required: true },
    userId:     { type: 'String', required: true, ref: 'User' },
    bikeId:     { type: 'String', required: true, ref: 'Bike' },
    unit:       { type: 'String', required: true, enum: ['hours', 'days'] },
    duration:   { type: 'Number', required: true, min: 1 },
    totalCost:  { type: 'Number', required: true },
    status:     { type: 'String', enum: ['confirmed','returned','cancelled'], default: 'confirmed' },
    createdAt:  { type: 'Date',   default: () => new Date().toISOString() },
    returnedAt: { type: 'Date',   default: null },
  };

  function generateId() {
    const ts  = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const rnd = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    return ts + rnd;
  }

  /**
   * Create a new booking.
   * Also sets the bike's available flag to false (atomic-style).
   */
  function create({ userId, bikeId, unit, duration }) {
    if (!userId)                throw { status: 400, message: 'userId is required.' };
    if (!bikeId)                throw { status: 400, message: 'bikeId is required.' };
    if (!['hours','days'].includes(unit)) throw { status: 400, message: 'unit must be hours or days.' };

    const dur = parseInt(duration, 10);
    if (!dur || dur < 1)        throw { status: 400, message: 'Duration must be at least 1.' };

    const bike = Bike().findById(bikeId);
    if (!bike)                  throw { status: 404, message: 'Bike not found.' };
    if (!bike.available)        throw { status: 409, message: 'Bike is currently not available.' };

    const rate      = unit === 'days' ? bike.pricePerHour * 24 : bike.pricePerHour;
    const totalCost = parseFloat((rate * dur).toFixed(2));

    const doc = {
      _id:        generateId(),
      userId,
      bikeId,
      unit,
      duration:   dur,
      totalCost,
      status:     'confirmed',
      createdAt:  new Date().toISOString(),
      returnedAt: null,
    };

    db().save(doc);
    Bike().setAvailability(bikeId, false);   // mark bike as rented

    return { booking: doc, bike };
  }

  /** Mark booking as returned → frees the bike */
  function returnBike(bookingId) {
    const booking = db().findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found.' };
    if (booking.status !== 'confirmed') throw { status: 400, message: 'Booking is not active.' };

    const updated = Object.assign({}, booking, {
      status:     'returned',
      returnedAt: new Date().toISOString(),
    });
    db().save(updated);
    Bike().setAvailability(booking.bikeId, true);
    return updated;
  }

  /** Cancel booking → frees bike if was confirmed */
  function cancel(bookingId) {
    const booking = db().findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found.' };
    if (booking.status === 'cancelled') throw { status: 400, message: 'Already cancelled.' };

    const updated = Object.assign({}, booking, { status: 'cancelled' });
    db().save(updated);
    if (booking.status === 'confirmed') Bike().setAvailability(booking.bikeId, true);
    return updated;
  }

  /** Total revenue (excluding cancelled) */
  function totalRevenue() {
    return db().find().filter(b => b.status !== 'cancelled')
               .reduce((s, b) => s + b.totalCost, 0);
  }

  return {
    schema,
    create,
    returnBike,
    cancel,
    totalRevenue,
    findById:     id     => db().findById(id),
    findAll:      ()     => db().find(),
    findByUser:   userId => db().find({ userId }),
    count:        ()     => db().countDocuments(),
    countActive:  ()     => db().countDocuments({ status: 'confirmed' }),
    countBy:      query  => db().countDocuments(query),
  };
})();

window.BRS = window.BRS || {};
window.BRS.BookingModel = BookingModel;
