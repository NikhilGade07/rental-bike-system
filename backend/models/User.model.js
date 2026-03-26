/**
 * backend/models/User.model.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose-style User Schema & Model
 *
 * PRODUCTION equivalent:
 *   const mongoose = require('mongoose');
 *   const userSchema = new mongoose.Schema({ ... });
 *   module.exports = mongoose.model('User', userSchema);
 * ─────────────────────────────────────────────────────────────
 */

const UserModel = (() => {
  const db = () => window.BRS.DB.collection('users');

  /** Schema definition (mirrors a Mongoose schema) */
  const schema = {
    _id:       { type: 'String',  required: true },
    name:      { type: 'String',  required: true,  trim: true },
    email:     { type: 'String',  required: true,  unique: true, lowercase: true },
    password:  { type: 'String',  required: true,  minlength: 6 },
    role:      { type: 'String',  enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: 'Date',    default: () => new Date().toISOString() },
  };

  /** Generate a MongoDB-style ObjectId */
  function generateId() {
    const ts  = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const rnd = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    return ts + rnd;   // 20-char hex string (similar to ObjectId)
  }

  /** Validate & create a new document (mimics new Model(data).save()) */
  function create(data) {
    const { name, email, password, role = 'user' } = data;

    // Validation (mirrors Mongoose validators)
    if (!name || name.trim() === '')      throw { status: 400, message: 'Name is required.' };
    if (!email)                            throw { status: 400, message: 'Email is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                           throw { status: 400, message: 'Invalid email format.' };
    if (!password || password.length < 6) throw { status: 400, message: 'Password must be at least 6 characters.' };
    if (!['user','admin'].includes(role)) throw { status: 400, message: 'Invalid role.' };

    // Unique-email check (mimics Mongoose unique index error)
    if (db().findOne({ email: email.toLowerCase().trim() }))
      throw { status: 409, message: 'An account with this email already exists.' };

    const doc = {
      _id:       generateId(),
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      password,                              // In prod: bcrypt.hash(password, 10)
      role,
      createdAt: new Date().toISOString(),
    };

    return db().save(doc);
  }

  /** Find user by email + password (login) */
  function authenticate(email, password) {
    const user = db().findOne({ email: email.toLowerCase().trim() });
    if (!user || user.password !== password)  // In prod: bcrypt.compare(password, user.password)
      throw { status: 401, message: 'Invalid email or password.' };
    return user;
  }

  /** Get initials from name */
  function getInitials(name) {
    return (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  return {
    schema,
    create,
    authenticate,
    getInitials,
    findById:    id   => db().findById(id),
    findByEmail: mail => db().findOne({ email: mail.toLowerCase().trim() }),
    findAll:     ()   => db().find(),
    count:       ()   => db().countDocuments(),
    /** Directly insert (used for seeding) */
    _insert:     doc  => db().save(doc),
  };
})();

window.BRS = window.BRS || {};
window.BRS.UserModel = UserModel;
