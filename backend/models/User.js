const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

UserSchema.virtual('id').get(function(){
  return this._id.toHexString();
});
UserSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
