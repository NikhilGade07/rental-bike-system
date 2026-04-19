const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all bikes
router.get('/', async (req, res) => {
  try {
    const bikes = await Bike.find({});
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a bike (Admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const bike = new Bike(req.body);
    const createdBike = await bike.save();
    res.status(201).json(createdBike);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a bike (Admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const bike = await Bike.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    res.json(bike);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a bike (Admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const bike = await Bike.findByIdAndDelete(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    res.json({ message: 'Bike removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
