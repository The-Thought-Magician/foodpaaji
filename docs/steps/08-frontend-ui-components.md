# Step 8: Frontend UI Components

## Description
Build reusable UI components, design system, and component library.

## Duration
2 days

## Detailed Implementation Spec

### 8.1 Project Setup
- Create React app: `npx create-react-app frontend` or use Vite
- Install UI framework: `npm install @mui/material @emotion/react @emotion/styled`
- Set up TailwindCSS or styled-components for styling
- Create component directory structure

### 8.2 Component Architecture
```
src/components/
├── Common/
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Card.jsx
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── Navigation.jsx
├── Auth/
│   ├── LoginForm.jsx
│   ├── RegisterForm.jsx
│   └── AuthGuard.jsx
├── Restaurant/
│   ├── RestaurantCard.jsx
│   ├── RestaurantGrid.jsx
│   ├── RestaurantDetail.jsx
│   └── RestaurantSearch.jsx
├── Menu/
│   ├── MenuItem.jsx
│   ├── MenuGrid.jsx
│   └── MenuCategory.jsx
├── Order/
│   ├── Cart.jsx
│   ├── CheckoutForm.jsx
│   └── OrderTracking.jsx
└── Review/
    ├── ReviewForm.jsx
    └── ReviewList.jsx
```

### 8.3 Design System
- Define color palette, typography, spacing
- Create CSS variables for theming
- Implement dark/light mode support
- Ensure accessibility (WCAG 2.1)

### 8.4 Reusable Components
- Common UI elements (buttons, inputs, cards)
- Form components with validation
- Modal dialogs
- Loading and error states
- Toast notifications

## Code Examples

### src/components/Common/Button.jsx
```jsx
import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick,
  className = '',
  ...props 
}) => {
  const classes = `btn btn-${variant} btn-${size} ${className}`;
  
  return (
    <button 
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
```

### src/components/Common/Button.css
```css
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #ff6b35;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #ff5520;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3);
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### src/components/Restaurant/RestaurantCard.jsx
```jsx
import React from 'react';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant, onClick }) => {
  const { name, description, rating, reviewCount, cuisineTypes, address } = restaurant;

  return (
    <div className="restaurant-card" onClick={onClick}>
      <div className="restaurant-image">
        <img 
          src={restaurant.image || '/placeholder-restaurant.jpg'} 
          alt={name}
        />
        <div className="rating-badge">
          <span className="stars">★ {rating || 'N/A'}</span>
          <span className="reviews">({reviewCount})</span>
        </div>
      </div>
      
      <div className="restaurant-info">
        <h3 className="restaurant-name">{name}</h3>
        <p className="cuisine-types">
          {cuisineTypes.join(' • ')}
        </p>
        <p className="description">{description}</p>
        <p className="address">{address?.city}, {address?.zipCode}</p>
      </div>
    </div>
  );
};

export default RestaurantCard;
```

### src/components/Restaurant/RestaurantCard.css
```css
.restaurant-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.restaurant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.restaurant-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.restaurant-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rating-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.restaurant-info {
  padding: 16px;
}

.restaurant-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #333;
}

.cuisine-types {
  font-size: 0.875rem;
  color: #ff6b35;
  margin: 0 0 8px 0;
}

.description {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.address {
  font-size: 0.75rem;
  color: #999;
  margin: 0;
}
```

### src/components/Menu/MenuItem.jsx
```jsx
import React, { useState } from 'react';
import Button from '../Common/Button';
import './MenuItem.css';

const MenuItem = ({ item, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    onAddToCart({ ...item, quantity });
    setQuantity(1);
  };

  return (
    <div className="menu-item">
      <div className="menu-item-image">
        <img src={item.image || '/placeholder-food.jpg'} alt={item.name} />
      </div>
      
      <div className="menu-item-content">
        <h4 className="item-name">{item.name}</h4>
        <p className="item-description">{item.description}</p>
        
        <div className="item-footer">
          <span className="item-price">${item.price.toFixed(2)}</span>
          
          <div className="quantity-control">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
            <input type="number" value={quantity} readOnly />
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleAddToCart}
            disabled={!item.availability}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;
```

## Acceptance Criteria
- [ ] All core components are created and functional
- [ ] Component library is documented with Storybook
- [ ] Styling is consistent across all components
- [ ] Accessibility standards (WCAG 2.1) are met
- [ ] Responsive design works on all device sizes
- [ ] Dark/light mode switching works
- [ ] All components accept proper props and handle them correctly
- [ ] Loading and error states are implemented
- [ ] Form components include validation
- [ ] Color palette is applied consistently
- [ ] Typography is well-defined and used correctly
- [ ] All interactive elements have proper focus states
