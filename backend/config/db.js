/**
 * backend/config/db.js
 * ─────────────────────────────────────────────────────────────
 * MongoDB Connection Configuration
 *
 * PRODUCTION:
 *   const mongoose = require('mongoose');
 *   mongoose.connect(process.env.MONGODB_URI, options);
 *
 * CURRENT (Browser Mock):
 *   localStorage is used as the data store, mimicking MongoDB
 *   collections. Each model maps to a named localStorage key.
 * ─────────────────────────────────────────────────────────────
 */

const DB = (() => {
  /** MongoDB URI that would be used in production */
  const MONGO_URI = 'mongodb://localhost:27017/bike_rental_db';

  /** Mongoose-equivalent connection options */
  const MONGO_OPTIONS = {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
    maxPoolSize:        10,
  };

  /** localStorage collection keys (equivalent to MongoDB collections) */
  const COLLECTIONS = {
    users:    'brs_db_users',
    bikes:    'brs_db_bikes',
    bookings: 'brs_db_bookings',
    tokens:   'brs_db_tokens',
  };

  let _connected = false;

  /**
   * Simulates mongoose.connect()
   * In production this would open a real MongoDB connection.
   */
  function connect() {
    return new Promise((resolve) => {
      setTimeout(() => {
        _connected = true;
        console.log('[DB] 📦 MongoDB URI        :', MONGO_URI);
        console.log('[DB] ⚙️  Connection options :', JSON.stringify(MONGO_OPTIONS));
        console.log('[DB] ✅ Connected (LocalStorage mock is active)');
        resolve({ uri: MONGO_URI, status: 'connected' });
      }, 50);
    });
  }

  function isConnected() { return _connected; }

  /**
   * Low-level collection API – simulates MongoDB collection driver.
   * All data is stored/retrieved from localStorage.
   */
  function collection(name) {
    const key = COLLECTIONS[name];
    if (!key) throw new Error(`[DB] Unknown collection: "${name}"`);

    return {
      /** READ all documents */
      find(query = {}) {
        let docs = JSON.parse(localStorage.getItem(key) || '[]');
        // Simple field-equality filter (mimics mongo {field:value})
        for (const [field, value] of Object.entries(query)) {
          docs = docs.filter(doc => doc[field] === value);
        }
        return docs;
      },

      /** READ one document */
      findOne(query = {}) {
        return this.find(query)[0] || null;
      },

      /** READ by _id */
      findById(id) {
        return this.findOne({ _id: id });
      },

      /** INSERT or UPDATE (upsert by _id) */
      save(doc) {
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        const idx   = items.findIndex(d => d._id === doc._id);
        if (idx >= 0) items[idx] = doc;
        else          items.push(doc);
        localStorage.setItem(key, JSON.stringify(items));
        return doc;
      },

      /** DELETE by _id */
      deleteOne(id) {
        const items = JSON.parse(localStorage.getItem(key) || '[]')
                          .filter(d => d._id !== id);
        localStorage.setItem(key, JSON.stringify(items));
        return { deletedCount: 1 };
      },

      /** COUNT documents (with optional query) */
      countDocuments(query = {}) {
        return this.find(query).length;
      },

      /** AGGREGATE-style sum (mimics $sum) */
      aggregate_sum(field, query = {}) {
        return this.find(query).reduce((acc, doc) => acc + (doc[field] || 0), 0);
      },
    };
  }

  return { connect, isConnected, collection, COLLECTIONS };
})();

// attach to global namespace
window.BRS = window.BRS || {};
window.BRS.DB = DB;
