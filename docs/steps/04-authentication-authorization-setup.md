# Step 4: Authentication & Authorization Setup

## Description
Implement user authentication system, session management, and authorization middleware.

## Duration
2 days

## Detailed Implementation Spec

### 4.1 Authentication Strategy
- Implement JWT (JSON Web Tokens) for stateless authentication
- Install: `npm install jsonwebtoken bcryptjs`
- Support both access tokens (short-lived) and refresh tokens (long-lived)
- Create authentication middleware for protected routes

### 4.2 Password Security
- Hash passwords using bcryptjs with 10 salt rounds
- Never store plain passwords in database
- Implement password validation (minimum length, complexity)
- Add forgot password functionality with secure token generation

### 4.3 Session Management
- Create JWT tokens on successful login
- Implement token refresh mechanism
- Set appropriate token expiration times (15-30 min for access, 7 days for refresh)
- Implement logout by token blacklisting

### 4.4 Authorization Layers
- Implement role-based access control (RBAC)
- Support roles: customer, restaurant, admin
- Create middleware for role verification
- Implement permission-based access on API routes

### 4.5 Security Best Practices
- Implement HTTPS enforcement
- Add password change functionality
- Implement login attempt limiting
- Add two-factor authentication (2FA) option

## Code Examples

### src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.accountType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorize };
```

### src/services/authService.js
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }

    const accessToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        accountType: user.accountType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        accountType: user.accountType
      }
    };
  }

  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await User.create({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      accountType: userData.accountType || 'customer'
    });

    return {
      id: user._id,
      email: user.email,
      accountType: user.accountType
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      const newAccessToken = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          accountType: user.accountType 
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);
    if (!(await user.comparePassword(oldPassword))) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();
    return { message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
```

### src/routes/auth.js
```javascript
const express = require('express');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

### .env Configuration
```
JWT_SECRET=your-secret-key-here-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-here-change-in-production
PASSWORD_MIN_LENGTH=8
```

## Acceptance Criteria
- [ ] User login/logout functionality works correctly
- [ ] Session tokens are properly generated and validated
- [ ] JWT tokens include user ID, email, and account type
- [ ] Access tokens expire after 15 minutes
- [ ] Refresh tokens are valid for 7 days
- [ ] Role-based access control is implemented and functional
- [ ] Password hashing uses bcryptjs with 10 salt rounds
- [ ] Password validation enforces minimum length and complexity
- [ ] Authorization middleware correctly restricts access by role
- [ ] Protected routes return 401 or 403 for invalid/missing tokens
- [ ] Password change functionality works securely
- [ ] Login endpoints validate input and return appropriate error messages
