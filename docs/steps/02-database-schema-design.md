# Step 2: Database Schema Design

## Description
Design and implement database schema, create migrations, and set up ORM models.

## Duration
2 days

## Detailed Implementation Spec

### 2.1 Database Technology Selection
- Use MongoDB for NoSQL flexibility or PostgreSQL for relational structure
- Install appropriate driver: `npm install mongoose` (MongoDB) or `npm install pg sequelize` (PostgreSQL)
- Set up database configuration in `src/config/database.js`

### 2.2 Core Collections/Tables Design

#### Users Collection/Table
- userId (UUID, primary key)
- email (string, unique, indexed)
- password (hashed string)
- firstName (string)
- lastName (string)
- phone (string, optional)
- address (object/JSONB)
- accountType (enum: customer, restaurant, admin)
- createdAt (timestamp)
- updatedAt (timestamp)
- isActive (boolean)

#### Restaurants Collection/Table
- restaurantId (UUID, primary key)
- name (string, indexed)
- description (text)
- ownerId (foreign key to users)
- address (object/JSONB)
- phoneNumber (string)
- email (string)
- cuisineTypes (array)
- rating (decimal)
- reviewCount (integer)
- isApproved (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)

#### Menu Items Collection/Table
- itemId (UUID, primary key)
- restaurantId (foreign key to restaurants)
- name (string, indexed)
- description (text)
- price (decimal)
- category (string)
- availability (boolean)
- prepTime (integer, minutes)
- image (string, URL)
- dietary (array)
- createdAt (timestamp)
- updatedAt (timestamp)

#### Orders Collection/Table
- orderId (UUID, primary key)
- customerId (foreign key to users)
- restaurantId (foreign key to restaurants)
- items (array of objects with itemId, quantity, price)
- totalPrice (decimal)
- status (enum: pending, confirmed, preparing, ready, delivered, cancelled)
- deliveryAddress (object/JSONB)
- notes (text)
- createdAt (timestamp)
- completedAt (timestamp, nullable)

#### Reviews Collection/Table
- reviewId (UUID, primary key)
- orderId (foreign key to orders)
- userId (foreign key to users)
- restaurantId (foreign key to restaurants)
- rating (integer, 1-5)
- comment (text)
- photos (array of URLs)
- createdAt (timestamp)

### 2.3 Indexes and Relationships
- Create indexes on frequently queried fields (email, restaurantId, customerId, status)
- Define relationships: one-to-many (restaurants to items), many-to-one (orders to users/restaurants)
- Add constraints for data integrity

### 2.4 Migration Files
- Create migrations directory: `src/migrations/`
- Create migration files with timestamps: `001-create-users.js`, `002-create-restaurants.js`, etc.
- Include up() and down() functions for rollback capability

## Code Examples

### MongoDB Schema (Mongoose)
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  accountType: { type: String, enum: ['customer', 'restaurant', 'admin'], default: 'customer' },
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});
```

### PostgreSQL Schema (SQL)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  account_type VARCHAR(20) DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  INDEX email_idx (email)
);

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  address JSONB,
  rating DECIMAL(3, 2),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX name_idx (name),
  INDEX owner_idx (owner_id)
);
```

## Acceptance Criteria
- [ ] Database schema is designed and documented
- [ ] All necessary collections/tables are created and tested
- [ ] Primary and foreign key relationships are properly defined
- [ ] Indexes are created on frequently queried fields
- [ ] Constraints ensure referential integrity
- [ ] Migration files are created with version control
- [ ] Rollback procedures are tested and functional
- [ ] Schema diagram or documentation exists
- [ ] Data types and field validations are appropriate
- [ ] ORM models match database schema
