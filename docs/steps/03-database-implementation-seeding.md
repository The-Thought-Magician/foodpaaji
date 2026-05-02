# Step 3: Database Implementation & Seeding

## Description
Implement database layer, create seed data, and establish connection pooling.

## Duration
2 days

## Detailed Implementation Spec

### 3.1 Database Connection Setup
- Create `src/config/database.js` with connection configuration
- Implement connection pooling for performance
- Handle connection errors and timeouts gracefully
- Support development, testing, and production environments

### 3.2 ORM Model Implementation
- Create model files in `src/models/` directory
- Implement User, Restaurant, MenuItem, Order, and Review models
- Add model methods for common operations
- Implement data validation at ORM layer

### 3.3 Seed Data Generation
- Create `src/seeders/` directory
- Implement seed files for all models
- Generate realistic sample data (users, restaurants, menu items, orders)
- Create helper utilities for data generation

### 3.4 Connection Testing
- Implement health check queries
- Create test scripts to verify connection stability
- Document connection parameters and troubleshooting

## Code Examples

### src/config/database.js (MongoDB)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodpaaji';
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### src/models/User.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true, 
    required: true, 
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  accountType: { 
    type: String, 
    enum: ['customer', 'restaurant', 'admin'], 
    default: 'customer' 
  },
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: String
  },
  phone: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### src/models/Restaurant.js
```javascript
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: String,
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  phoneNumber: String,
  email: String,
  cuisineTypes: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
```

### src/seeders/seed.js
```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodpaaji');
    
    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});

    // Create sample users
    const users = await User.create([
      {
        email: 'customer1@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        accountType: 'customer'
      },
      {
        email: 'restaurant1@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        accountType: 'restaurant'
      }
    ]);

    // Create sample restaurants
    const restaurant = await Restaurant.create({
      name: 'Pizza Paradise',
      description: 'Authentic Italian pizza',
      ownerId: users[1]._id,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        zipCode: '94102',
        country: 'USA'
      },
      cuisineTypes: ['Italian', 'Pizza'],
      isApproved: true
    });

    // Create sample menu items
    await MenuItem.create([
      {
        restaurantId: restaurant._id,
        name: 'Margherita Pizza',
        price: 12.99,
        category: 'Pizza',
        availability: true
      },
      {
        restaurantId: restaurant._id,
        name: 'Caesar Salad',
        price: 8.99,
        category: 'Salad',
        availability: true
      }
    ]);

    console.log('Database seeded successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
```

## Acceptance Criteria
- [ ] Database connection is established and tested successfully
- [ ] Connection pooling is configured with appropriate min/max sizes
- [ ] All ORM models are created and functional
- [ ] Model methods for CRUD operations work correctly
- [ ] Seed data script creates realistic sample data
- [ ] Database backups and recovery procedures are documented
- [ ] Connection timeouts and error handling are implemented
- [ ] Models include proper validation and constraints
- [ ] Relationships between models are correctly established
- [ ] Health check query returns expected results
