# Step 13: Performance Optimization

## Description
Optimize database queries, API response times, frontend loading, and implement caching strategies.

## Duration
2 days

## Detailed Implementation Spec

### 13.1 Database Query Optimization
- Analyze slow queries with database profiler
- Create appropriate indexes
- Use query optimization techniques
- Implement pagination to limit result sets
- Use projections to select only needed fields

### 13.2 Backend Caching
- Install: `npm install redis`
- Implement Redis caching layer
- Cache frequently accessed data
- Set appropriate TTLs
- Invalidate cache on updates

### 13.3 API Response Optimization
- Implement response compression (gzip)
- Use pagination for list endpoints
- Implement cursor-based pagination for large datasets
- Add field selection to reduce payload size

### 13.4 Frontend Optimization
- Code splitting and lazy loading
- Tree shaking to remove unused code
- Image optimization and responsive images
- Minification and compression
- CDN usage for static assets

### 13.5 Database Indexing Strategy
- Index on frequently filtered fields
- Composite indexes for multi-field queries
- Analyze query execution plans
- Monitor index performance

### 13.6 Monitoring and Metrics
- Implement APM (Application Performance Monitoring)
- Monitor API response times
- Track database performance
- Set up performance alerts

## Code Examples

### Database Indexing (MongoDB)
```javascript
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  'address.city': { type: String, index: true },
  rating: { type: Number, index: true },
  createdAt: { type: Date, index: true }
});

restaurantSchema.index({ ownerId: 1, createdAt: -1 });
restaurantSchema.index({ 'address.city': 1, rating: -1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
```

### Redis Caching Service (src/services/cacheService.js)
```javascript
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.setex).bind(client);
const delAsync = promisify(client.del).bind(client);

class CacheService {
  async get(key) {
    try {
      const data = await getAsync(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = 3600) {
    try {
      await setAsync(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key) {
    try {
      await delAsync(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await new Promise((resolve, reject) => {
        client.keys(pattern, (err, keys) => {
          if (err) reject(err);
          else resolve(keys);
        });
      });

      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.delete(key)));
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

module.exports = new CacheService();
```

### Optimized Restaurant Query (src/services/restaurantService.js)
```javascript
const Restaurant = require('../models/Restaurant');
const cacheService = require('./cacheService');

class RestaurantService {
  async searchRestaurants(filters, page = 1, limit = 10) {
    const cacheKey = `restaurants:${JSON.stringify(filters)}:${page}:${limit}`;
    
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;
    const query = { isApproved: true };

    if (filters.city) query['address.city'] = filters.city;
    if (filters.cuisineType) query.cuisineTypes = filters.cuisineType;
    if (filters.minRating) query.rating = { $gte: filters.minRating };

    const restaurants = await Restaurant.find(query)
      .select('name description rating reviewCount cuisineTypes address -_v')
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Restaurant.countDocuments(query);

    const result = {
      data: restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    await cacheService.set(cacheKey, result, 3600);
    return result;
  }

  async invalidateRestaurantCache(restaurantId) {
    await cacheService.invalidatePattern('restaurants:*');
  }
}

module.exports = new RestaurantService();
```

### Frontend Code Splitting (src/App.jsx)
```jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const RestaurantList = lazy(() => import('./pages/RestaurantList'));
const RestaurantDetail = lazy(() => import('./pages/RestaurantDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

const LoadingSpinner = () => <div className="loading">Loading...</div>;

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurants" element={<RestaurantList />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
```

### Image Optimization Utility (src/utils/imageOptimization.js)
```javascript
export const getOptimizedImageUrl = (url, width, height, quality = 80) => {
  if (!url) return '/placeholder.jpg';
  
  const params = new URLSearchParams({
    w: width,
    h: height,
    q: quality,
    fit: 'crop'
  });

  return `${url}?${params.toString()}`;
};

export const generateResponsiveImages = (url) => {
  return {
    mobile: getOptimizedImageUrl(url, 300, 200),
    tablet: getOptimizedImageUrl(url, 600, 400),
    desktop: getOptimizedImageUrl(url, 1200, 800)
  };
};
```

### Frontend Component with Lazy Loading (src/components/Restaurant/RestaurantImage.jsx)
```jsx
import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageOptimization';
import './RestaurantImage.css';

const RestaurantImage = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <picture className="restaurant-image">
      <source
        media="(max-width: 768px)"
        srcSet={getOptimizedImageUrl(src, 300, 200)}
      />
      <source
        media="(max-width: 1200px)"
        srcSet={getOptimizedImageUrl(src, 600, 400)}
      />
      <img
        src={getOptimizedImageUrl(src, 1200, 800)}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={isLoaded ? 'loaded' : ''}
      />
    </picture>
  );
};

export default RestaurantImage;
```

### Compression Middleware (src/index.js)
```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
```

### Build Configuration (webpack or Vite optimization)
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'redux': ['redux', '@reduxjs/toolkit', 'react-redux']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
};
```

## Acceptance Criteria
- [ ] Database queries are optimized and indexed
- [ ] API response times are under 200ms (95th percentile)
- [ ] Frontend bundle size is optimized (under 250KB gzip)
- [ ] Caching strategies are implemented and effective
- [ ] Redis caching reduces database load
- [ ] Image optimization reduces bandwidth
- [ ] Code splitting improves initial load time
- [ ] Pagination prevents large dataset transfers
- [ ] Compression middleware is enabled
- [ ] Database connection pooling is optimized
- [ ] N+1 query problems are eliminated
- [ ] Performance metrics are monitored
- [ ] Lighthouse score is above 80
- [ ] Time to Interactive (TTI) is under 3 seconds
