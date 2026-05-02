# Step 11: Security Hardening

## Description
Implement security measures, input sanitization, CORS, rate limiting, and compliance requirements.

## Duration
2 days

## Detailed Implementation Spec

### 11.1 Input Validation and Sanitization
- Validate all user inputs on both client and server
- Use joi/yup for schema validation
- Sanitize HTML inputs to prevent XSS
- Install: `npm install xss helmet express-rate-limit`

### 11.2 CORS Configuration
- Configure CORS to allow only trusted origins
- Set appropriate headers and methods
- Handle preflight requests properly

### 11.3 Rate Limiting
- Implement rate limiting on API endpoints
- Protect authentication endpoints specifically
- Use sliding window algorithm
- Return appropriate 429 responses

### 11.4 Security Headers
- Implement Content Security Policy (CSP)
- Add X-Frame-Options header
- Configure X-Content-Type-Options
- Set Strict-Transport-Security

### 11.5 SQL/NoSQL Injection Prevention
- Use parameterized queries
- Validate query parameters
- Implement query escaping

### 11.6 Authentication Security
- Hash passwords with bcryptjs
- Use secure JWT signing
- Implement token expiration
- Secure refresh token rotation

### 11.7 HTTPS and Encryption
- Force HTTPS in production
- Implement SSL/TLS certificates
- Encrypt sensitive data at rest

## Code Examples

### src/middleware/security.js
```javascript
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xss = require('xss');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.example.com']
    }
  },
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

const corsConfig = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = JSON.parse(JSON.stringify(req.body), (key, value) => {
      if (typeof value === 'string') {
        return xss(value);
      }
      return value;
    });
  }

  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  corsConfig,
  loginLimiter,
  apiLimiter,
  sanitizeInput
};
```

### src/config/security.js
```javascript
const mongoSanitize = require('express-mongo-sanitize');

const securityConfig = (app) => {
  app.use(mongoSanitize());
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
};

module.exports = securityConfig;
```

### src/middleware/requestValidation.js
```javascript
const { query, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[!@#$%^&*]/.test(password);
};

module.exports = {
  validateRequest,
  validatePagination,
  validateEmail,
  validatePassword
};
```

### src/index.js (Updated)
```javascript
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const {
  securityHeaders,
  corsConfig,
  apiLimiter,
  sanitizeInput
} = require('./middleware/security');
const securityConfig = require('./config/security');

const app = express();

connectDB();

app.use(securityHeaders);
app.use(corsConfig);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));
app.use(sanitizeInput);
app.use(apiLimiter);

securityConfig(app);

const routes = require('./routes');
app.use('/api/v1', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});
```

### Frontend Security (src/config/security.js)
```javascript
export const setSecurityHeaders = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
  }
};

export const getSafeString = (input) => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

export const validateFileUpload = (file, maxSize = 5000000) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File size exceeds maximum limit of 5MB');
  }
  
  return true;
};

export const encodeURIComponent = (str) => {
  return window.encodeURIComponent(str);
};
```

## Acceptance Criteria
- [ ] All inputs are validated and sanitized
- [ ] XSS protection is implemented
- [ ] CORS is properly configured
- [ ] Rate limiting prevents abuse
- [ ] Security headers are set correctly
- [ ] Password validation enforces strong requirements
- [ ] Passwords are hashed before storage
- [ ] JWT tokens have appropriate expiration
- [ ] HTTPS is enforced in production
- [ ] No sensitive data is exposed in error messages
- [ ] SQL/NoSQL injection is prevented
- [ ] CSRF tokens are implemented for state-changing operations
- [ ] File uploads are validated and sanitized
- [ ] API keys are not exposed in client-side code
