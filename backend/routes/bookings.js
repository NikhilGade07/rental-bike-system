const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const { protect, admin } = require('../middleware/authMiddleware');

// Create booking
router.post('/', protect, async (req, res) => {
  try {
    const { bikeId, startTime, endTime } = req.body;
    const bike = await Bike.findById(bikeId);
    if (!bike || !bike.available) return res.status(400).json({ message: 'Bike not available' });

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end - start) / (1000 * 60 * 60);
    const totalCost = bike.pricePerHour * hours;

    const booking = new Booking({
      userId: req.user.id,
      bikeId,
      startTime,
      endTime,
      totalCost
    });

    await booking.save();
    
    // Mark bike unavailable
    bike.available = false;
    await bike.save();

    const populated = await Booking.findById(booking._id);
    res.status(201).json({ booking: populated, bike });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).populate('bikeId').populate('userId', 'name email').sort('-createdAt');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all bookings (Admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate('bikeId').populate('userId', 'name email').sort('-createdAt');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel booking (User)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    booking.status = 'cancelled';
    await booking.save();

    // Mark bike available
    const bike = await Bike.findById(booking.bikeId._id || booking.bikeId);
    if (bike) {
      bike.available = true;
      await bike.save();
    }
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Return bike
router.put('/:id/return', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    booking.status = 'returned';
    booking.returnedAt = new Date();
    await booking.save();

    const bike = await Bike.findById(booking.bikeId._id || booking.bikeId);
    if (bike) {
      bike.available = true;
      await bike.save();
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
