const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Serve static files from current directory
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB Connected');
    seedData();
}).catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bikes', require('./routes/bikes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Seed Defaults
const User = require('./models/User');
const Bike = require('./models/Bike');

const seedData = async () => {
  try {
    let adminUser = await User.findOne({ email: 'admin@bikerental.in' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Admin',
        email: 'admin@bikerental.in',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default Admin Created');
    }
    
    const count = await Bike.countDocuments();
    if (count === 0) {
      const bikes = [
        { name: 'Trailblazer X9',    type: 'Mountain', pricePerHour: 550,   features: ['Suspension', 'Disc Brakes', 'Helmet'] },
        { name: 'SpeedPro 700C',     type: 'Road',     pricePerHour: 400,   features: ['Lightweight', 'Clipless Pedals'] },
        { name: 'CityGlide 3S',      type: 'City',     pricePerHour: 300,   features: ['Basket', 'Fender', 'Bell', 'Lock'] },
        { name: 'VoltRide e-500',    type: 'Electric', pricePerHour: 800,   features: ['500W Motor', 'GPS', 'USB Charge', 'Helmet'] },
        { name: 'GravelKing Pro',    type: 'Mountain', pricePerHour: 600,   features: ['Tubeless', 'Dropper Post', 'GPS'] },
        { name: 'UrbanFlow Classic', type: 'City',     pricePerHour: 250,   features: ['7-Speed', 'Fender', 'Lights', 'Lock'] },
      ];
      await Bike.insertMany(bikes);
      console.log('Default Bikes Created');
    }
  } catch (err) {
    console.error('Seed Error:', err);
  }
};
