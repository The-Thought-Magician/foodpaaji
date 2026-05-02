# Step 10: Frontend State Management & Integration

## Description
Set up state management, API integration, and client-side caching.

## Duration
2 days

## Detailed Implementation Spec

### 10.1 State Management Setup
- Install: `npm install redux @reduxjs/toolkit react-redux`
- Create Redux store with slices
- Implement actions and reducers
- Set up Redux DevTools for debugging

### 10.2 Redux Store Structure
```
src/store/
├── slices/
│   ├── authSlice.js
│   ├── userSlice.js
│   ├── restaurantSlice.js
│   ├── menuSlice.js
│   ├── cartSlice.js
│   ├── orderSlice.js
│   └── uiSlice.js
├── thunks/
│   ├── authThunks.js
│   ├── restaurantThunks.js
│   ├── orderThunks.js
│   └── userThunks.js
└── store.js
```

### 10.3 API Integration
- Create API client with axios
- Implement request/response interceptors
- Handle authentication tokens
- Implement error handling and retry logic

### 10.4 Client-side Caching
- Implement caching strategy for API responses
- Set cache expiration times
- Invalidate cache on mutations
- Local storage for user preferences

### 10.5 Async State Management
- Use Redux Thunk for async operations
- Handle loading, success, and error states
- Implement optimistic updates where appropriate
- Handle race conditions

## Code Examples

### src/store/slices/authSlice.js
```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: false,
    error: null,
    isAuthenticated: !!localStorage.getItem('accessToken')
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### src/services/apiClient.js
```javascript
import axios from 'axios';
import store from '../store/store';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
});

apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;

        const response = await axios.post('/api/v1/auth/refresh', {
          refreshToken
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### src/store/slices/cartSlice.js
```javascript
import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: JSON.parse(localStorage.getItem('cart')) || [],
    discountCode: null,
    discountAmount: 0
  },
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.items.find(item => item._id === action.payload._id);
      
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity });
      }
      
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item._id !== action.payload);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    updateCartItemQuantity: (state, action) => {
      const item = state.items.find(item => item._id === action.payload.itemId);
      if (item) {
        item.quantity = action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i._id !== item._id);
        }
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    clearCart: (state) => {
      state.items = [];
      state.discountCode = null;
      state.discountAmount = 0;
      localStorage.removeItem('cart');
    },
    applyDiscount: (state, action) => {
      state.discountCode = action.payload.code;
      state.discountAmount = action.payload.amount;
    }
  }
});

export const {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  applyDiscount
} = cartSlice.actions;

export default cartSlice.reducer;
```

### src/store/slices/restaurantSlice.js
```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export const fetchRestaurants = createAsyncThunk(
  'restaurant/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/restaurants', { params: filters });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRestaurantById = createAsyncThunk(
  'restaurant/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/restaurants/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: {
    list: [],
    detail: null,
    loading: false,
    error: null,
    cache: {}
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.detail = action.payload.data;
      });
  }
});

export default restaurantSlice.reducer;
```

### src/store/store.js
```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import restaurantReducer from './slices/restaurantSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    restaurant: restaurantReducer,
    ui: uiReducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;
```

## Acceptance Criteria
- [ ] Redux store is properly configured with all slices
- [ ] Actions and reducers are correctly implemented
- [ ] Async thunks handle loading, success, and error states
- [ ] API client includes authentication token in headers
- [ ] Token refresh mechanism works correctly
- [ ] Request/response interceptors function properly
- [ ] Error handling catches and displays appropriate messages
- [ ] State persists correctly in localStorage
- [ ] Cart state is maintained across page refreshes
- [ ] API responses are cached appropriately
- [ ] Cache is invalidated on mutations
- [ ] Loading states prevent race conditions
- [ ] Optimistic updates work where implemented
