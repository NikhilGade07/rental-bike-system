const mongoose = require('mongoose');

const BikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Mountain', 'Road', 'City', 'Electric'], required: true },
  pricePerHour: { type: Number, required: true },
  features: [{ type: String }],
  imageUrl: { type: String, default: '' },
  available: { type: Boolean, default: true }
}, { timestamps: true });

BikeSchema.virtual('id').get(function(){
  return this._id.toHexString();
});
BikeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Bike', BikeSchema);
