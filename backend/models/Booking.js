const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  totalCost: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'returned', 'cancelled'], default: 'confirmed' },
  returnedAt: { type: Date }
}, { timestamps: true });

BookingSchema.virtual('id').get(function(){
  return this._id.toHexString();
});
BookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Booking', BookingSchema);
