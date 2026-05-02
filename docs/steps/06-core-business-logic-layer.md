# Step 6: Core Business Logic Layer

## Description
Implement primary business logic, data processing, and service layer functionality.

## Duration
3 days

## Detailed Implementation Spec

### 6.1 Service Layer Architecture
- Create services in `src/services/` directory
- Separate business logic from route handlers
- Implement service methods for each major operation
- Create reusable utility functions

### 6.2 Core Features Implementation

#### Restaurant Management Service
- Create restaurant service with CRUD operations
- Implement restaurant approval workflow
- Add search and filtering functionality
- Handle restaurant metrics (rating, review count)

#### Menu Management Service
- Create menu item service
- Implement inventory/availability tracking
- Add menu categorization
- Handle menu item pricing and modifiers

#### Order Processing Service
- Implement complete order lifecycle
- Track order status transitions
- Calculate order totals and fees
- Handle order cancellations and refunds

#### User Service
- Implement user profile management
- Handle user preferences
- Manage user account settings
- Track user activity

### 6.3 Business Rule Enforcement
- Validate business constraints before operations
- Implement inventory checks for orders
- Enforce restaurant approval before allowing orders
- Apply business logic for pricing and discounts

### 6.4 Data Processing
- Implement data aggregation functions
- Create reporting functions
- Add export functionality
- Implement caching for frequently accessed data

## Code Examples

### src/services/restaurantService.js
```javascript
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { APIError } = require('../middleware/errorHandler');

class RestaurantService {
  async createRestaurant(data) {
    const restaurant = await Restaurant.create(data);
    return restaurant;
  }

  async getRestaurantById(id) {
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      throw new APIError('Restaurant not found', 404);
    }
    return restaurant;
  }

  async searchRestaurants(filters) {
    const { city, cuisineType, minRating, isApproved = true } = filters;
    const query = { isApproved };
    
    if (city) query['address.city'] = city;
    if (cuisineType) query.cuisineTypes = cuisineType;
    if (minRating) query.rating = { $gte: minRating };

    return Restaurant.find(query);
  }

  async approveRestaurant(restaurantId, adminId) {
    const restaurant = await this.getRestaurantById(restaurantId);
    restaurant.isApproved = true;
    restaurant.approvedAt = new Date();
    await restaurant.save();
    return restaurant;
  }

  async updateRestaurant(restaurantId, ownerId, data) {
    const restaurant = await this.getRestaurantById(restaurantId);
    
    if (restaurant.ownerId.toString() !== ownerId) {
      throw new APIError('Unauthorized', 403);
    }

    Object.assign(restaurant, data);
    await restaurant.save();
    return restaurant;
  }

  async getRestaurantStats(restaurantId) {
    const restaurant = await this.getRestaurantById(restaurantId);
    const menuItemCount = await MenuItem.countDocuments({ restaurantId });
    
    return {
      totalMenuItems: menuItemCount,
      rating: restaurant.rating,
      reviewCount: restaurant.reviewCount,
      isApproved: restaurant.isApproved
    };
  }
}

module.exports = new RestaurantService();
```

### src/services/orderService.js
```javascript
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { APIError } = require('../middleware/errorHandler');

class OrderService {
  async createOrder(userId, restaurantId, items, deliveryAddress) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isApproved) {
      throw new APIError('Restaurant not available', 400);
    }

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.itemId);
      
      if (!menuItem || !menuItem.availability) {
        throw new APIError(`Item ${item.itemId} is not available`, 400);
      }

      const itemTotal = menuItem.price * item.quantity;
      totalPrice += itemTotal;
      
      orderItems.push({
        itemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: itemTotal
      });
    }

    const deliveryFee = totalPrice * 0.05;
    const grandTotal = totalPrice + deliveryFee;

    const order = await Order.create({
      customerId: userId,
      restaurantId,
      items: orderItems,
      subtotal: totalPrice,
      deliveryFee,
      totalPrice: grandTotal,
      deliveryAddress,
      status: 'pending'
    });

    return order;
  }

  async getOrderById(orderId, userId) {
    const order = await Order.findById(orderId)
      .populate('restaurantId')
      .populate('customerId');
    
    if (!order) {
      throw new APIError('Order not found', 404);
    }

    if (order.customerId._id.toString() !== userId) {
      throw new APIError('Unauthorized', 403);
    }

    return order;
  }

  async updateOrderStatus(orderId, newStatus, ownerId) {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new APIError('Invalid status', 400);
    }

    const order = await Order.findById(orderId).populate('restaurantId');
    
    if (order.restaurantId.ownerId.toString() !== ownerId) {
      throw new APIError('Unauthorized', 403);
    }

    order.status = newStatus;
    if (newStatus === 'delivered') {
      order.completedAt = new Date();
    }
    
    await order.save();
    return order;
  }

  async getUserOrders(userId, filters = {}) {
    const { status, limit = 10, page = 1 } = filters;
    const skip = (page - 1) * limit;
    
    const query = { customerId: userId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('restaurantId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async cancelOrder(orderId, userId) {
    const order = await Order.findById(orderId);
    
    if (order.customerId.toString() !== userId) {
      throw new APIError('Unauthorized', 403);
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new APIError('Order cannot be cancelled', 400);
    }

    order.status = 'cancelled';
    await order.save();
    return order;
  }
}

module.exports = new OrderService();
```

### src/services/menuItemService.js
```javascript
const MenuItem = require('../models/MenuItem');
const { APIError } = require('../middleware/errorHandler');

class MenuItemService {
  async createMenuItem(restaurantId, data) {
    const menuItem = await MenuItem.create({
      ...data,
      restaurantId
    });
    return menuItem;
  }

  async getMenuByRestaurant(restaurantId, category = null) {
    const query = { restaurantId };
    if (category) query.category = category;
    
    return MenuItem.find(query).sort({ category: 1, name: 1 });
  }

  async updateMenuItemAvailability(itemId, availability) {
    const menuItem = await MenuItem.findByIdAndUpdate(
      itemId,
      { availability },
      { new: true }
    );
    return menuItem;
  }

  async updateMenuItemPrice(itemId, newPrice) {
    if (newPrice < 0) {
      throw new APIError('Price cannot be negative', 400);
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      itemId,
      { price: newPrice },
      { new: true }
    );
    return menuItem;
  }
}

module.exports = new MenuItemService();
```

## Acceptance Criteria
- [ ] Service layer is properly organized and structured
- [ ] Core business logic is separated from route handlers
- [ ] All CRUD operations are implemented
- [ ] Business rules are enforced (inventory, approvals, etc.)
- [ ] Data validation is comprehensive at service level
- [ ] Error handling with meaningful error messages
- [ ] Order lifecycle management works correctly
- [ ] Status transitions are validated
- [ ] Calculations (totals, fees) are accurate
- [ ] Search and filtering functions work properly
- [ ] Authorization checks are in place
- [ ] Complex operations are atomic where needed
