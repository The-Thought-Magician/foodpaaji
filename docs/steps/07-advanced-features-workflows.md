# Step 7: Advanced Features & Workflows

## Description
Implement complex features, workflows, notifications, and integration points.

## Duration
3 days

## Detailed Implementation Spec

### 7.1 Real-time Notifications
- Install: `npm install socket.io` for real-time updates
- Implement push notifications for order status changes
- Create email notification service
- Add in-app notification system

### 7.2 Rating and Review System
- Implement review creation after order completion
- Calculate restaurant ratings from reviews
- Add review moderation capabilities
- Implement helpful/unhelpful voting

### 7.3 Search and Discovery
- Implement full-text search on restaurants and menu items
- Add filtering by cuisine, price, rating
- Implement geolocation-based search
- Create recommendation engine

### 7.4 Promotion and Discounts
- Implement discount code functionality
- Create seasonal promotion system
- Add coupon management for restaurants
- Calculate final order price with discounts

### 7.5 Admin Dashboard Features
- Implement admin reporting
- Create analytics dashboard
- Add restaurant management tools
- Implement user management interface

### 7.6 Integration Points
- Implement payment gateway integration
- Create external notification services
- Add analytics integrations
- Implement logging and monitoring

## Code Examples

### src/services/notificationService.js
```javascript
const nodemailer = require('nodemailer');
const { EventEmitter } = require('events');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendOrderStatusEmail(user, order, newStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'Your food is being prepared',
      ready: 'Your order is ready for pickup!',
      delivered: 'Your order has been delivered'
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Order ${order._id} - ${statusMessages[newStatus]}`,
      html: `
        <h2>${statusMessages[newStatus]}</h2>
        <p>Order ID: ${order._id}</p>
        <p>Status: ${newStatus}</p>
        <p>Total: $${order.totalPrice}</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendRestaurantOrderAlert(restaurant, order) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: restaurant.email,
      subject: `New Order #${order._id}`,
      html: `
        <h2>New Order Received!</h2>
        <p>Order ID: ${order._id}</p>
        <p>Items: ${order.items.length}</p>
        <p>Total: $${order.totalPrice}</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  emitOrderStatusChange(orderId, newStatus) {
    this.emit('order:status-changed', { orderId, newStatus });
  }
}

module.exports = new NotificationService();
```

### src/services/reviewService.js
```javascript
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const { APIError } = require('../middleware/errorHandler');

class ReviewService {
  async createReview(userId, orderId, rating, comment) {
    if (rating < 1 || rating > 5) {
      throw new APIError('Rating must be between 1 and 5', 400);
    }

    const order = await Order.findById(orderId);
    if (!order || order.customerId.toString() !== userId) {
      throw new APIError('Order not found or unauthorized', 404);
    }

    if (order.status !== 'delivered') {
      throw new APIError('Can only review completed orders', 400);
    }

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      throw new APIError('Review already exists for this order', 400);
    }

    const review = await Review.create({
      orderId,
      userId,
      restaurantId: order.restaurantId,
      rating,
      comment
    });

    await this.updateRestaurantRating(order.restaurantId);
    return review;
  }

  async getRestaurantReviews(restaurantId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const reviews = await Review.find({ restaurantId })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ restaurantId });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateRestaurantRating(restaurantId) {
    const reviews = await Review.find({ restaurantId });
    
    if (reviews.length === 0) {
      await Restaurant.findByIdAndUpdate(restaurantId, {
        rating: 0,
        reviewCount: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length
    });
  }

  async deleteReview(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review || review.userId.toString() !== userId) {
      throw new APIError('Unauthorized', 403);
    }

    await Review.findByIdAndDelete(reviewId);
    await this.updateRestaurantRating(review.restaurantId);
  }
}

module.exports = new ReviewService();
```

### src/services/discountService.js
```javascript
const Discount = require('../models/Discount');
const { APIError } = require('../middleware/errorHandler');

class DiscountService {
  async validateDiscountCode(code) {
    const discount = await Discount.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gte: new Date() }
    });

    if (!discount) {
      throw new APIError('Invalid or expired discount code', 400);
    }

    if (discount.usageCount >= discount.maxUsage) {
      throw new APIError('Discount code usage limit reached', 400);
    }

    return discount;
  }

  async applyDiscount(code, orderTotal) {
    const discount = await this.validateDiscountCode(code);

    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (orderTotal * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value;
    }

    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    return {
      discountAmount,
      finalAmount: orderTotal - discountAmount,
      discountCode: code
    };
  }

  async recordDiscountUsage(code) {
    const discount = await Discount.findOne({ code: code.toUpperCase() });
    if (discount) {
      discount.usageCount += 1;
      await discount.save();
    }
  }

  async createDiscount(data, adminId) {
    const discount = await Discount.create({
      ...data,
      createdBy: adminId
    });
    return discount;
  }
}

module.exports = new DiscountService();
```

### src/integrations/socketIO.js
```javascript
const socketIO = require('socket.io');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('subscribe_order', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

const emitOrderUpdate = (io, orderId, update) => {
  io.to(`order:${orderId}`).emit('order:updated', update);
};

module.exports = { initializeSocket, emitOrderUpdate };
```

## Acceptance Criteria
- [ ] Real-time notifications are sent for order status changes
- [ ] Email notifications are delivered successfully
- [ ] Review system allows users to rate and comment on orders
- [ ] Restaurant ratings are calculated correctly from reviews
- [ ] Search functionality returns relevant results
- [ ] Filtering by cuisine, price, and rating works correctly
- [ ] Discount codes can be applied and validated
- [ ] Discount calculations are accurate
- [ ] Admin dashboard shows key metrics and analytics
- [ ] Payment gateway integration is functional
- [ ] Socket.IO real-time updates work for order tracking
- [ ] Notification preferences can be configured by users
- [ ] Workflow processes complete successfully
