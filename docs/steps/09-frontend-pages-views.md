# Step 9: Frontend Pages & Views

## Description
Implement main application pages, navigation, and user flows.

## Duration
3 days

## Detailed Implementation Spec

### 9.1 Page Structure
```
src/pages/
├── Home.jsx
├── Login.jsx
├── Register.jsx
├── RestaurantList.jsx
├── RestaurantDetail.jsx
├── Menu.jsx
├── Cart.jsx
├── Checkout.jsx
├── OrderConfirmation.jsx
├── OrderTracking.jsx
├── UserProfile.jsx
├── OrderHistory.jsx
├── Reviews.jsx
├── Admin/
│   ├── Dashboard.jsx
│   ├── RestaurantManagement.jsx
│   └── UserManagement.jsx
└── NotFound.jsx
```

### 9.2 Core Pages

#### Home Page
- Hero section with search/filter
- Featured restaurants section
- Cuisine categories
- Call-to-action buttons

#### Restaurant Listing
- Grid/list view toggle
- Filtering by cuisine, price, rating
- Search functionality
- Pagination

#### Restaurant Detail
- Restaurant information
- Menu categories
- Menu items grid
- Ratings and reviews section
- Operating hours

#### Shopping Cart
- Item list with quantity controls
- Subtotal and fee calculations
- Discount code input
- Checkout button

#### Checkout
- Delivery address form
- Payment method selection
- Order summary
- Confirmation

#### Order Tracking
- Current order status
- Live tracking updates
- Delivery estimated time
- Contact restaurant/delivery

### 9.3 Navigation and Routing
- Implement React Router v6
- Protected routes for authenticated users
- Role-based route access
- Proper redirects and error handling

### 9.4 User Flows
- Login → Search → Browse → Cart → Checkout → Track Order
- Restaurant owner: Login → Manage Restaurant → Update Menu → View Orders
- Admin: Login → Dashboard → Manage Users/Restaurants

## Code Examples

### src/pages/Home.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RestaurantGrid from '../components/Restaurant/RestaurantGrid';
import SearchBar from '../components/Common/SearchBar';
import './Home.css';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/v1/restaurants?isApproved=true&limit=6');
        const data = await response.json();
        setFeatured(data.data);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Order Food Online</h1>
          <p>Browse from our favorite restaurants</p>
          <SearchBar />
        </div>
      </section>

      <section className="cuisine-categories">
        <h2>Browse by Cuisine</h2>
        <div className="category-grid">
          {['Italian', 'Chinese', 'Indian', 'Mexican', 'Japanese', 'American'].map(cuisine => (
            <Link key={cuisine} to={`/restaurants?cuisine=${cuisine}`} className="category-card">
              {cuisine}
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <h2>Featured Restaurants</h2>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <RestaurantGrid restaurants={featured} />
        )}
      </section>

      <section className="cta-section">
        <h2>Ready to Order?</h2>
        <Link to="/restaurants" className="btn btn-primary btn-lg">
          Browse All Restaurants
        </Link>
      </section>
    </div>
  );
};

export default Home;
```

### src/pages/RestaurantDetail.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MenuItem from '../components/Menu/MenuItem';
import ReviewList from '../components/Review/ReviewList';
import './RestaurantDetail.css';

const RestaurantDetail = ({ onAddToCart }) => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restaurantRes, menuRes] = await Promise.all([
          fetch(`/api/v1/restaurants/${id}`),
          fetch(`/api/v1/menu-items?restaurantId=${id}`)
        ]);

        const restaurantData = await restaurantRes.json();
        const menuData = await menuRes.json();

        setRestaurant(restaurantData.data);
        setMenu(menuData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!restaurant) return <div className="error">Restaurant not found</div>;

  const categories = ['all', ...new Set(menu.map(item => item.category))];
  const filteredMenu = selectedCategory === 'all' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory);

  return (
    <div className="restaurant-detail">
      <div className="restaurant-header">
        <img src={restaurant.image || '/placeholder.jpg'} alt={restaurant.name} />
        <div className="restaurant-overlay">
          <h1>{restaurant.name}</h1>
          <p className="rating">★ {restaurant.rating} ({restaurant.reviewCount} reviews)</p>
          <p className="cuisines">{restaurant.cuisineTypes.join(' • ')}</p>
          <p className="address">{restaurant.address.street}, {restaurant.address.city}</p>
        </div>
      </div>

      <div className="menu-section">
        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {filteredMenu.map(item => (
            <MenuItem
              key={item._id}
              item={item}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>

      <div className="reviews-section">
        <h2>Reviews</h2>
        <ReviewList restaurantId={id} />
      </div>
    </div>
  );
};

export default RestaurantDetail;
```

### src/pages/Cart.jsx
```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Common/Button';
import './Cart.css';

const Cart = ({ cartItems, onRemoveItem, onUpdateQuantity }) => {
  const navigate = useNavigate();
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const deliveryFee = subtotal > 0 ? 3.99 : 0;
  const total = subtotal + tax + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Add some items to get started</p>
        <Button onClick={() => navigate('/restaurants')}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-items">
        <h2>Cart ({cartItems.length} items)</h2>
        {cartItems.map(item => (
          <div key={item._id} className="cart-item">
            <div className="item-details">
              <h4>{item.name}</h4>
              <p>${item.price.toFixed(2)}</p>
            </div>
            <div className="quantity-control">
              <button onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}>+</button>
            </div>
            <span className="item-total">${(item.price * item.quantity).toFixed(2)}</span>
            <button className="remove-btn" onClick={() => onRemoveItem(item._id)}>×</button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Order Summary</h3>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Tax (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery Fee</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <Button className="checkout-btn" onClick={() => navigate('/checkout')}>
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;
```

### src/App.jsx
```jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Common/Header';
import Footer from './components/Common/Footer';
import Home from './pages/Home';
import RestaurantList from './pages/RestaurantList';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrderTracking from './pages/OrderTracking';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/Auth/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurants" element={<RestaurantList />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<PrivateRoute />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders/:id" element={<OrderTracking />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
```

## Acceptance Criteria
- [ ] All main pages are implemented and accessible
- [ ] Navigation is intuitive and functional
- [ ] User flows are smooth and logical
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] Loading states are displayed appropriately
- [ ] Error messages are clear and helpful
- [ ] Forms validate input before submission
- [ ] Protected routes require authentication
- [ ] Page transitions are smooth without lag
- [ ] All links and buttons work correctly
- [ ] Search and filtering produce expected results
- [ ] Cart persists across page navigation
