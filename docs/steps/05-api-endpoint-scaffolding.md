# Step 5: API Endpoint Scaffolding

## Description
Create REST API endpoints structure with routing, request/response handling, and error management.

## Duration
2 days

## Detailed Implementation Spec

### 5.1 API Structure
- Create routes in `src/routes/` directory
- Organize by resource: users, restaurants, menu-items, orders, reviews
- Implement RESTful naming conventions
- Version API with `/api/v1/` prefix

### 5.2 Request Validation
- Install: `npm install joi` for schema validation
- Create validators in `src/validators/` directory
- Validate all input parameters before processing
- Return consistent error messages for validation failures

### 5.3 Error Handling
- Implement custom error class for API errors
- Create centralized error handling middleware
- Return consistent JSON error responses with status codes
- Log errors for debugging and monitoring

### 5.4 Response Format
- Standardize response structure with data and meta fields
- Implement pagination for list endpoints
- Add metadata (timestamp, request ID) to responses
- Include proper HTTP status codes

### 5.5 API Documentation
- Install: `npm install swagger-ui-express swagger-jsdoc`
- Create OpenAPI/Swagger documentation
- Document all endpoints with request/response examples
- Expose API docs at `/api/docs`

## Code Examples

### src/routes/index.js
```javascript
const express = require('express');
const authRoutes = require('./auth');
const restaurantRoutes = require('./restaurants');
const menuItemRoutes = require('./menuItems');
const orderRoutes = require('./orders');
const reviewRoutes = require('./reviews');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/orders', authenticateToken, orderRoutes);
router.use('/reviews', authenticateToken, reviewRoutes);

module.exports = router;
```

### src/validators/restaurantValidator.js
```javascript
const joi = require('joi');

const createRestaurantSchema = joi.object({
  name: joi.string().required().min(3).max(255),
  description: joi.string().max(1000),
  phoneNumber: joi.string().pattern(/^\d{10}$/),
  email: joi.string().email(),
  cuisineTypes: joi.array().items(joi.string()),
  address: joi.object({
    street: joi.string().required(),
    city: joi.string().required(),
    zipCode: joi.string().required(),
    country: joi.string().required()
  }).required()
});

const validateCreateRestaurant = (req, res, next) => {
  const { error, value } = createRestaurantSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  req.validatedData = value;
  next();
};

module.exports = { validateCreateRestaurant };
```

### src/middleware/errorHandler.js
```javascript
class APIError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

module.exports = { APIError, errorHandler };
```

### src/routes/restaurants.js
```javascript
const express = require('express');
const Restaurant = require('../models/Restaurant');
const { validateCreateRestaurant } = require('../validators/restaurantValidator');
const { authenticateToken, authorize } = require('../middleware/auth');
const { APIError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, city } = req.query;
    const skip = (page - 1) * limit;
    
    const query = city ? { 'address.city': city } : {};
    const restaurants = await Restaurant.find(query)
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Restaurant.countDocuments(query);
    
    res.json({
      data: restaurants,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      throw new APIError('Restaurant not found', 404);
    }
    res.json({ data: restaurant });
  } catch (error) {
    next(error);
  }
});

router.post('/', 
  authenticateToken, 
  authorize('restaurant'), 
  validateCreateRestaurant,
  async (req, res, next) => {
    try {
      const restaurant = await Restaurant.create({
        ...req.validatedData,
        ownerId: req.user.id
      });
      res.status(201).json({ data: restaurant });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id', 
  authenticateToken, 
  authorize('restaurant'),
  async (req, res, next) => {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant || restaurant.ownerId.toString() !== req.user.id) {
        throw new APIError('Unauthorized', 403);
      }
      
      Object.assign(restaurant, req.body);
      await restaurant.save();
      res.json({ data: restaurant });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

### src/config/swagger.js
```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Foodpaaji API',
      version: '1.0.0',
      description: 'Food ordering platform API'
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
```

## Acceptance Criteria
- [ ] All API routes are defined and documented
- [ ] Request validation middleware is in place and functional
- [ ] Error handling returns consistent JSON error responses
- [ ] HTTP status codes are correct (200, 201, 400, 401, 403, 404, 500)
- [ ] Pagination is implemented for list endpoints
- [ ] Response format is consistent across all endpoints
- [ ] API documentation (Swagger/OpenAPI) is generated and accessible
- [ ] Protected routes require authentication tokens
- [ ] Authorization checks work for role-based access
- [ ] Input validation prevents invalid data entry
- [ ] Error messages are descriptive and helpful
- [ ] All endpoints are tested and functional
