# Step 12: Testing & Quality Assurance

## Description
Write unit tests, integration tests, end-to-end tests, and establish test coverage metrics.

## Duration
3 days

## Detailed Implementation Spec

### 12.1 Testing Framework Setup
- Backend: Install `npm install jest supertest --save-dev`
- Frontend: Install `npm install @testing-library/react @testing-library/jest-dom jest`
- Configure Jest for both environments
- Set up test coverage reporting

### 12.2 Unit Tests
- Test individual functions and components
- Mock external dependencies
- Achieve minimum 80% code coverage
- Test both success and failure scenarios

### 12.3 Integration Tests
- Test service layer interactions
- Test API endpoints with actual database
- Test authentication flows
- Use test databases for isolation

### 12.4 End-to-End Tests
- Test complete user workflows
- Verify page navigation
- Test cart and checkout flows
- Use tools like Cypress or Playwright

### 12.5 Performance Testing
- Load testing with artillery
- Monitor API response times
- Database query performance
- Frontend bundle size analysis

## Code Examples

### Backend Unit Tests (tests/unit/authService.test.js)
```javascript
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');

jest.mock('../../src/models/User');

describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        accountType: 'customer',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.login('test@example.com', 'password'))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: '456',
        ...userData
      });

      const result = await authService.register(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
    });

    it('should throw error if email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'existing@example.com' });

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'Password123!'
      })).rejects.toThrow('Email already registered');
    });
  });
});
```

### Backend Integration Tests (tests/integration/orders.test.js)
```javascript
const request = require('supertest');
const app = require('../../src/index');
const Order = require('../../src/models/Order');
const User = require('../../src/models/User');
const Restaurant = require('../../src/models/Restaurant');

describe('Order API Integration Tests', () => {
  let authToken;
  let userId;
  let restaurantId;

  beforeAll(async () => {
    const user = await User.create({
      email: 'customer@test.com',
      password: 'Password123!',
      firstName: 'John',
      accountType: 'customer'
    });
    userId = user._id;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'customer@test.com', password: 'Password123!' });

    authToken = loginRes.body.accessToken;

    const restaurant = await Restaurant.create({
      name: 'Test Restaurant',
      ownerId: userId,
      isApproved: true
    });
    restaurantId = restaurant._id;
  });

  describe('POST /api/v1/orders', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        restaurantId,
        items: [{ itemId: '123', quantity: 2 }],
        deliveryAddress: { street: '123 Main St', city: 'NYC' }
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({ restaurantId, items: [] });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should retrieve user orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
```

### Frontend Component Tests (tests/components/Button.test.jsx)
```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../src/components/Common/Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('should apply correct variant styles', () => {
    const { container } = render(<Button variant="primary">Click</Button>);
    expect(container.firstChild).toHaveClass('btn-primary');
  });
});
```

### Frontend Integration Tests (tests/pages/Cart.test.jsx)
```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import Cart from '../../src/pages/Cart';
import store from '../../src/store/store';

describe('Cart Page', () => {
  const mockCartItems = [
    { _id: '1', name: 'Pizza', price: 12.99, quantity: 2 },
    { _id: '2', name: 'Salad', price: 8.99, quantity: 1 }
  ];

  const mockHandlers = {
    onRemoveItem: jest.fn(),
    onUpdateQuantity: jest.fn()
  };

  it('should display cart items', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Cart cartItems={mockCartItems} {...mockHandlers} />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Salad')).toBeInTheDocument();
  });

  it('should calculate total correctly', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Cart cartItems={mockCartItems} {...mockHandlers} />
        </BrowserRouter>
      </Provider>
    );

    const subtotal = 12.99 * 2 + 8.99 * 1;
    expect(screen.getByText(new RegExp(subtotal.toFixed(2)))).toBeInTheDocument();
  });

  it('should remove item when delete button is clicked', () => {
    const { rerender } = render(
      <Provider store={store}>
        <BrowserRouter>
          <Cart cartItems={mockCartItems} {...mockHandlers} />
        </BrowserRouter>
      </Provider>
    );

    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    expect(mockHandlers.onRemoveItem).toHaveBeenCalledWith('1');
  });

  it('should show empty cart message when no items', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Cart cartItems={[]} {...mockHandlers} />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });
});
```

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Scripts (package.json)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testMatch='**/*.integration.test.js'",
    "test:e2e": "cypress run",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

## Acceptance Criteria
- [ ] Unit test coverage is above 80%
- [ ] All critical business logic is tested
- [ ] Integration tests cover API endpoints
- [ ] End-to-end tests validate user workflows
- [ ] Test suite runs successfully in CI/CD
- [ ] All tests pass before deployment
- [ ] Error scenarios are tested
- [ ] Authentication tests cover success and failure
- [ ] API response codes are verified
- [ ] Database operations are tested with test database
- [ ] Frontend components render correctly
- [ ] User interactions trigger correct handlers
- [ ] Performance benchmarks are established
- [ ] Code coverage reports are generated
