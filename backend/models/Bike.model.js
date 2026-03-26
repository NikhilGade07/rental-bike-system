/**
 * backend/models/Bike.model.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose-style Bike Schema & Model
 * ─────────────────────────────────────────────────────────────
 */

const BikeModel = (() => {
  const db = () => window.BRS.DB.collection('bikes');

  /** Schema definition */
  const schema = {
    _id:          { type: 'String', required: true },
    name:         { type: 'String', required: true, trim: true },
    type:         { type: 'String', required: true, enum: ['Mountain','Road','City','Electric'] },
    pricePerHour: { type: 'Number', required: true, min: 0.01 },
    features:     { type: 'Array',  default: [] },
    emoji:        { type: 'String', default: '🚲' },
    available:    { type: 'Boolean', default: true },
    createdAt:    { type: 'Date',   default: () => new Date().toISOString() },
  };

  function generateId() {
    const ts  = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const rnd = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    return ts + rnd;
  }

  function _validate(data) {
    const { name, type, pricePerHour } = data;
    if (!name || name.trim() === '')  throw { status: 400, message: 'Bike name is required.' };
    if (!['Mountain','Road','City','Electric'].includes(type))
                                       throw { status: 400, message: 'Type must be Mountain, Road, City, or Electric.' };
    if (!pricePerHour || parseFloat(pricePerHour) < 0.01)
                                       throw { status: 400, message: 'Price must be a positive number.' };
  }

  function create(data) {
    _validate(data);
    const doc = {
      _id:          generateId(),
      name:         data.name.trim(),
      type:         data.type,
      pricePerHour: parseFloat(data.pricePerHour),
      features:     Array.isArray(data.features) ? data.features : [],
      emoji:        data.emoji || '🚲',
      available:    true,
      createdAt:    new Date().toISOString(),
    };
    return db().save(doc);
  }

  function update(id, changes) {
    const bike = db().findById(id);
    if (!bike) throw { status: 404, message: 'Bike not found.' };

    // Only validate if relevant fields are being changed
    const merged = Object.assign({}, bike, changes);
    if (changes.name || changes.type || changes.pricePerHour) _validate(merged);

    if (changes.pricePerHour) merged.pricePerHour = parseFloat(changes.pricePerHour);
    return db().save(merged);
  }

  function remove(id) {
    const bike = db().findById(id);
    if (!bike) throw { status: 404, message: 'Bike not found.' };
    return db().deleteOne(id);
  }

  return {
    schema,
    create,
    update,
    remove,
    findById:      id  => db().findById(id),
    findAll:       ()  => db().find(),
    findAvailable: ()  => db().find({ available: true }),
    count:         ()  => db().countDocuments(),
    countAvailable:()  => db().countDocuments({ available: true }),
    setAvailability: (id, available) => update(id, { available }),
    getPricePerDay: (bike) => bike.pricePerHour * 24,
    /** Directly insert (used for seeding) */
    _insert: doc => db().save(doc),
  };
})();

window.BRS = window.BRS || {};
window.BRS.BikeModel = BikeModel;
