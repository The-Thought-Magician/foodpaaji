# FoodPaaji - Technical Architecture Document
*Implementation Guide for Restaurant Management System*

## Table of Contents
1. [Technology Stack](#1-technology-stack)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Design](#4-database-design)
5. [API Specifications](#5-api-specifications)
6. [Integration Patterns](#6-integration-patterns)
7. [Development Workflow](#7-development-workflow)
8. [Security Implementation](#8-security-implementation)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Performance Optimization](#10-performance-optimization)

## 1. Technology Stack

### 1.1 Finalized Technology Stack

#### Frontend Stack
```typescript
// Core Framework
"next": "^15.0.0",          // Next.js 15 with App Router
"react": "^19.0.0",         // React 19 with concurrent features
"typescript": "^5.6.0",     // TypeScript for type safety

// Styling & UI Components
"tailwindcss": "^4.0.0",    // Tailwind CSS v4 with new features
"@shadcn/ui": "latest",     // shadcn/ui component library
"aceternity-ui": "latest",  // Advanced animations and components
"framer-motion": "^11.0.0", // Animation library

// Icons & Assets
"lucide-react": "^0.446.0", // Primary icon library
"@phosphor-icons/react": "^2.1.7", // Secondary specialized icons

// State Management & Data Fetching
"zustand": "^4.5.0",        // Lightweight state management
"@tanstack/react-query": "^5.0.0", // Server state management
"swr": "^2.2.0",            // Additional data fetching for real-time

// Forms & Validation
"react-hook-form": "^7.48.0", // Form handling
"zod": "^3.22.0",           // Schema validation
"@hookform/resolvers": "^3.3.0", // Form validation integration

// Utilities
"date-fns": "^3.0.0",       // Date manipulation
"lodash": "^4.17.21",       // Utility functions
"clsx": "^2.0.0",           // Conditional classes
"class-variance-authority": "^0.7.0" // Component variants
```

#### Backend Stack
```typescript
// Core Framework
"@nestjs/core": "^10.3.0",     // NestJS framework
"@nestjs/common": "^10.3.0",   // Common NestJS modules
"@nestjs/platform-express": "^10.3.0", // Express adapter

// Database & ORM
"@prisma/client": "^5.7.0",    // Prisma ORM
"prisma": "^5.7.0",            // Prisma CLI
"pg": "^8.11.0",               // PostgreSQL client
"redis": "^4.6.0",             // Redis client

// Authentication & Security
"@nestjs/jwt": "^10.2.0",      // JWT implementation
"@nestjs/passport": "^10.0.0", // Passport.js integration
"bcryptjs": "^2.4.3",          // Password hashing
"helmet": "^7.1.0",            // Security headers

// API & Documentation
"@nestjs/swagger": "^7.1.0",   // API documentation
"class-validator": "^0.14.0",  // Validation decorators
"class-transformer": "^0.5.1", // Object transformation

// Integrations
"axios": "^1.6.0",             // HTTP client
"@nestjs/schedule": "^4.0.0",  // Cron jobs
"@nestjs/event-emitter": "^2.0.0", // Event handling

// Development & Testing
"jest": "^29.7.0",             // Testing framework
"supertest": "^6.3.0",         // HTTP testing
"@nestjs/testing": "^10.3.0"   // NestJS testing utilities
```

### 1.2 Rationale for Technology Choices

#### Next.js 15 with App Router
- **Server Components**: Improved performance with server-side rendering
- **Partial Prerendering (PPR)**: Hybrid static/dynamic rendering
- **Enhanced Caching**: Sophisticated caching strategies
- **TypeScript Integration**: First-class TypeScript support

#### Tailwind CSS v4
- **CSS-in-JS**: New approach with better performance
- **Native CSS Variables**: Better theming support
- **Improved IntelliSense**: Better developer experience
- **Smaller Bundle Size**: Optimized CSS generation

#### NestJS Backend
- **TypeScript Native**: Built with TypeScript from ground up
- **Modular Architecture**: Scalable enterprise-grade structure
- **Decorator Pattern**: Clean, readable code organization
- **Built-in Features**: Guards, interceptors, pipes for common patterns

## 2. Frontend Architecture

### 2.1 Project Structure

```
src/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── analytics/
│   │   ├── billing/
│   │   ├── inventory/
│   │   ├── kitchen/
│   │   ├── menu/
│   │   ├── orders/
│   │   └── settings/
│   ├── pos/                      # POS system routes
│   ├── api/                      # API routes (for client-side operations)
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Global loading UI
│   ├── error.tsx                 # Global error UI
│   └── not-found.tsx            # 404 page
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── custom/                   # Custom components
│   │   ├── charts/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── modals/
│   ├── features/                 # Feature-specific components
│   │   ├── auth/
│   │   ├── pos/
│   │   ├── inventory/
│   │   ├── kitchen/
│   │   └── billing/
│   └── layout/                   # Layout components
│       ├── header.tsx
│       ├── sidebar.tsx
│       └── navigation.tsx
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication utilities
│   ├── api.ts                    # API client configuration
│   ├── utils.ts                  # General utilities
│   ├── validations.ts            # Zod schemas
│   ├── constants.ts              # App constants
│   └── types.ts                  # TypeScript types
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts
│   ├── use-orders.ts
│   ├── use-inventory.ts
│   └── use-offline.ts
├── store/                        # State management
│   ├── auth-store.ts             # Authentication state
│   ├── pos-store.ts              # POS system state
│   ├── inventory-store.ts        # Inventory state
│   └── offline-store.ts          # Offline sync state
├── styles/                       # Additional styles
│   └── components.css            # Component-specific styles
└── config/                       # Configuration files
    ├── database.ts
    ├── integrations.ts
    └── environment.ts
```

### 2.2 Component Architecture

#### 2.2.1 Design System Implementation

```typescript
// components/ui/button.tsx - Enhanced shadcn/ui button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Restaurant-specific variants
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-amber-600 text-white hover:bg-amber-700",
        pos: "bg-orange-500 text-white hover:bg-orange-600 text-lg font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-lg",
        // POS-specific sizes
        pos: "h-16 w-32 text-base font-medium",
        "pos-lg": "h-20 w-40 text-lg font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  animate?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, animate = true, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const buttonContent = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {props.children}
      </Comp>
    )

    if (animate) {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          {buttonContent}
        </motion.div>
      )
    }

    return buttonContent
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

#### 2.2.2 Feature-Specific Components

```typescript
// components/features/pos/order-cart.tsx
interface OrderCartProps {
  items: CartItem[]
  onQuantityChange: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClearCart: () => void
}

export function OrderCart({ items, onQuantityChange, onRemoveItem, onClearCart }: OrderCartProps) {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          Current Order
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearCart}
            disabled={items.length === 0}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex items-center justify-between py-2 border-b"
            >
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">₹{item.price}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <span className="w-8 text-center">{item.quantity}</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
      
      <CardFooter className="flex-col space-y-4">
        <div className="w-full flex justify-between text-lg font-semibold">
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        
        <Button 
          className="w-full" 
          size="lg"
          disabled={items.length === 0}
        >
          Process Payment
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### 2.3 State Management Strategy

#### 2.3.1 Zustand Store Configuration

```typescript
// store/pos-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  modifiers?: Modifier[]
}

interface PosState {
  // State
  currentOrder: CartItem[]
  selectedTable?: string
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  
  // Actions
  addToCart: (item: MenuItem) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void
  setTable: (tableId: string) => void
}

export const usePosStore = create<PosState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentOrder: [],
      orderType: 'dine-in',
      
      // Actions
      addToCart: (item) =>
        set((state) => {
          const existingItem = state.currentOrder.find(cartItem => cartItem.id === item.id)
          
          if (existingItem) {
            existingItem.quantity += 1
          } else {
            state.currentOrder.push({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: 1,
              category: item.category,
            })
          }
        }),
      
      removeFromCart: (itemId) =>
        set((state) => {
          state.currentOrder = state.currentOrder.filter(item => item.id !== itemId)
        }),
      
      updateQuantity: (itemId, quantity) =>
        set((state) => {
          const item = state.currentOrder.find(cartItem => cartItem.id === itemId)
          if (item) {
            item.quantity = Math.max(0, quantity)
          }
        }),
      
      clearCart: () =>
        set((state) => {
          state.currentOrder = []
          state.selectedTable = undefined
        }),
      
      setOrderType: (type) =>
        set((state) => {
          state.orderType = type
        }),
      
      setTable: (tableId) =>
        set((state) => {
          state.selectedTable = tableId
        }),
    })),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        currentOrder: state.currentOrder,
        orderType: state.orderType,
        selectedTable: state.selectedTable
      }),
    }
  )
)
```

#### 2.3.2 Server State Management

```typescript
// hooks/use-orders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders'),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (orderData: CreateOrderInput) => api.post('/orders', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Real-time updates with SWR
export function useRealtimeOrders() {
  return useSWR('/orders/realtime', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
}
```

### 2.4 Offline-First Architecture

#### 2.4.1 Offline Store Implementation

```typescript
// store/offline-store.ts
interface OfflineState {
  isOnline: boolean
  pendingOperations: PendingOperation[]
  lastSync: Date | null
  syncInProgress: boolean
}

interface PendingOperation {
  id: string
  type: 'CREATE_ORDER' | 'UPDATE_INVENTORY' | 'PROCESS_PAYMENT'
  data: any
  timestamp: Date
  retryCount: number
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingOperations: [],
  lastSync: null,
  syncInProgress: false,
  
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) =>
    set((state) => ({
      pendingOperations: [
        ...state.pendingOperations,
        {
          ...operation,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          retryCount: 0,
        }
      ]
    })),
  
  processPendingOperations: async () => {
    const { pendingOperations, isOnline } = get()
    
    if (!isOnline || pendingOperations.length === 0) return
    
    set({ syncInProgress: true })
    
    for (const operation of pendingOperations) {
      try {
        await processOperation(operation)
        set((state) => ({
          pendingOperations: state.pendingOperations.filter(op => op.id !== operation.id)
        }))
      } catch (error) {
        // Handle retry logic
        if (operation.retryCount < 3) {
          set((state) => ({
            pendingOperations: state.pendingOperations.map(op =>
              op.id === operation.id 
                ? { ...op, retryCount: op.retryCount + 1 }
                : op
            )
          }))
        }
      }
    }
    
    set({ syncInProgress: false, lastSync: new Date() })
  },
}))
```

## 3. Backend Architecture

### 3.1 NestJS Application Structure

```
src/
├── app.module.ts                 # Root application module
├── main.ts                       # Application entry point
├── common/                       # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── middleware/
├── config/                       # Configuration
│   ├── database.config.ts
│   ├── auth.config.ts
│   └── integrations.config.ts
├── modules/                      # Feature modules
│   ├── auth/                     # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   └── dto/
│   ├── restaurants/              # Restaurant management
│   ├── orders/                   # Order processing
│   ├── inventory/                # Inventory management
│   ├── menu/                     # Menu management
│   ├── billing/                  # Billing and payments
│   ├── integrations/             # Third-party integrations
│   │   ├── swiggy/
│   │   ├── zomato/
│   │   ├── razorpay/
│   │   └── whatsapp/
│   ├── analytics/                # Business analytics
│   └── notifications/            # Notification system
├── database/                     # Database related
│   ├── migrations/
│   ├── seeds/
│   └── factories/
└── utils/                        # Utility functions
    ├── encryption.ts
    ├── validation.ts
    └── helpers.ts
```

### 3.2 Core Module Implementation

#### 3.2.1 Orders Module

```typescript
// modules/orders/orders.controller.ts
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: AuthenticatedRequest
  ): Promise<Order> {
    return this.ordersService.createOrder(createOrderDto, req.user.restaurantId)
  }
  
  @Get()
  @UseInterceptors(CacheInterceptor)
  async getOrders(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetOrdersQueryDto
  ): Promise<PaginatedOrders> {
    return this.ordersService.getOrders(req.user.restaurantId, query)
  }
  
  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, updateStatusDto.status)
  }
  
  @Get(':id/receipt')
  async generateReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ): Promise<void> {
    const receipt = await this.ordersService.generateReceipt(id)
    res.setHeader('Content-Type', 'application/pdf')
    res.send(receipt)
  }
}

// modules/orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2
  ) {}
  
  async createOrder(dto: CreateOrderDto, restaurantId: string): Promise<Order> {
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          restaurantId,
          customerId: dto.customerId,
          type: dto.type,
          status: OrderStatus.PENDING,
          items: {
            create: dto.items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              modifiers: item.modifiers
            }))
          }
        },
        include: { items: true }
      })
      
      // Update inventory
      for (const item of dto.items) {
        await this.inventoryService.consumeIngredients(
          tx, 
          item.menuItemId, 
          item.quantity
        )
      }
      
      // Generate bill
      await this.billingService.generateBill(tx, newOrder.id)
      
      return newOrder
    })
    
    // Emit event for real-time updates
    this.eventEmitter.emit('order.created', { order, restaurantId })
    
    // Send notifications
    await this.notificationService.notifyKitchen(order)
    
    return order
  }
  
  async getOrders(
    restaurantId: string, 
    query: GetOrdersQueryDto
  ): Promise<PaginatedOrders> {
    const { page = 1, limit = 20, status, startDate, endDate } = query
    
    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(status && { status }),
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    }
    
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: { menuItem: true }
          },
          customer: true,
          bill: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.order.count({ where })
    ])
    
    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}
```

#### 3.2.2 Integration Module Architecture

```typescript
// modules/integrations/base/integration.service.ts
export abstract class BaseIntegrationService {
  protected abstract apiUrl: string
  protected abstract authHeaders: Record<string, string>
  
  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: this.authHeaders,
        data
      })
      
      return response.data
    } catch (error) {
      this.handleApiError(error)
      throw error
    }
  }
  
  protected handleApiError(error: any): void {
    // Common error handling logic
    Logger.error(`Integration API Error: ${error.message}`, error.stack)
  }
  
  abstract syncMenu(restaurantId: string): Promise<void>
  abstract processOrder(order: Order): Promise<void>
  abstract updateOrderStatus(orderId: string, status: string): Promise<void>
}

// modules/integrations/swiggy/swiggy.service.ts
@Injectable()
export class SwiggyService extends BaseIntegrationService {
  protected apiUrl = 'https://partner-api.swiggy.com/v1'
  protected authHeaders = {
    'Authorization': `Bearer ${this.configService.get('SWIGGY_API_KEY')}`,
    'Content-Type': 'application/json'
  }
  
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super()
  }
  
  async syncMenu(restaurantId: string): Promise<void> {
    const menuData = await this.makeRequest<SwiggyMenuResponse>(
      'GET',
      `/restaurants/${restaurantId}/menu`
    )
    
    // Transform and sync menu data
    await this.prisma.$transaction(async (tx) => {
      for (const item of menuData.items) {
        await tx.menuItem.upsert({
          where: {
            externalId_source: {
              externalId: item.id,
              source: 'SWIGGY'
            }
          },
          update: {
            price: item.price,
            available: item.availability
          },
          create: {
            restaurantId,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            externalId: item.id,
            source: 'SWIGGY'
          }
        })
      }
    })
  }
  
  async processOrder(order: Order): Promise<void> {
    const swiggyOrder = await this.makeRequest<SwiggyOrderResponse>(
      'POST',
      '/orders',
      this.transformOrderForSwiggy(order)
    )
    
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        externalId: swiggyOrder.order_id,
        externalStatus: swiggyOrder.status
      }
    })
  }
  
  @Cron('*/5 * * * *') // Every 5 minutes
  async syncOrderStatuses(): Promise<void> {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        source: 'SWIGGY',
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING] }
      }
    })
    
    for (const order of pendingOrders) {
      if (order.externalId) {
        const swiggyStatus = await this.getOrderStatus(order.externalId)
        const internalStatus = this.mapSwiggyStatusToInternal(swiggyStatus)
        
        if (internalStatus !== order.status) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: internalStatus }
          })
        }
      }
    }
  }
}
```

## 4. Database Design

### 4.1 Prisma Schema Design

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Core Models
model Restaurant {
  id                String              @id @default(cuid())
  name              String
  slug              String              @unique
  email             String              @unique
  phone             String
  address           Json
  settings          Json                @default("{}")
  subscription      SubscriptionTier
  isActive          Boolean             @default(true)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Relations
  users             User[]
  menuCategories    MenuCategory[]
  menuItems         MenuItem[]
  orders            Order[]
  customers         Customer[]
  tables            Table[]
  inventory         InventoryItem[]
  suppliers         Supplier[]
  bills             Bill[]
  
  @@map("restaurants")
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  phone        String?    @unique
  passwordHash String
  firstName    String
  lastName     String
  role         UserRole
  permissions  String[]
  isActive     Boolean    @default(true)
  lastLogin    DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  orders       Order[]    @relation("CreatedBy")
  
  @@map("users")
}

// Menu Management
model MenuCategory {
  id           String     @id @default(cuid())
  name         String
  nameHi       String?    // Hindi translation
  nameBn       String?    // Bengali translation
  description  String?
  sortOrder    Int        @default(0)
  isActive     Boolean    @default(true)
  image        String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  menuItems    MenuItem[]
  
  @@unique([restaurantId, name])
  @@map("menu_categories")
}

model MenuItem {
  id                String         @id @default(cuid())
  name              String
  nameHi            String?        // Hindi translation
  nameBn            String?        // Bengali translation
  description       String?
  price             Decimal        @db.Decimal(10, 2)
  costPrice         Decimal?       @db.Decimal(10, 2)
  isVegetarian      Boolean        @default(false)
  isVegan           Boolean        @default(false)
  isGlutenFree      Boolean        @default(false)
  isSpicy           Boolean        @default(false)
  spiceLevel        Int?           @default(0) // 0-5 scale
  preparationTime   Int?           // in minutes
  calories          Int?
  isAvailable       Boolean        @default(true)
  image             String?
  tags              String[]
  allergens         String[]
  
  // External integration fields
  externalId        String?        // For Swiggy/Zomato
  source            IntegrationSource?
  
  sortOrder         Int            @default(0)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  restaurantId      String
  restaurant        Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  categoryId        String
  category          MenuCategory   @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  // Relations
  orderItems        OrderItem[]
  recipe            Recipe?
  modifierGroups    ModifierGroup[]
  
  @@unique([restaurantId, externalId, source])
  @@map("menu_items")
}

// Order Management
model Order {
  id                String        @id @default(cuid())
  orderNumber       String        @unique
  type              OrderType
  status            OrderStatus
  source            IntegrationSource @default(INTERNAL)
  externalId        String?       // Swiggy/Zomato order ID
  externalStatus    String?
  
  // Customer information
  customerName      String?
  customerPhone     String?
  customerEmail     String?
  
  // Delivery information (for delivery orders)
  deliveryAddress   Json?
  deliveryFee       Decimal?      @db.Decimal(8, 2)
  deliveryTime      DateTime?
  
  // Timing
  placedAt          DateTime      @default(now())
  confirmedAt       DateTime?
  preparingAt       DateTime?
  readyAt           DateTime?
  completedAt       DateTime?
  cancelledAt       DateTime?
  
  // Pricing
  subtotal          Decimal       @db.Decimal(10, 2)
  taxAmount         Decimal       @db.Decimal(10, 2)
  discountAmount    Decimal       @db.Decimal(10, 2) @default(0)
  totalAmount       Decimal       @db.Decimal(10, 2)
  
  specialInstructions String?
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  restaurantId      String
  restaurant        Restaurant    @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  customerId        String?
  customer          Customer?     @relation(fields: [customerId], references: [id])
  
  tableId           String?
  table             Table?        @relation(fields: [tableId], references: [id])
  
  createdById       String
  createdBy         User          @relation("CreatedBy", fields: [createdById], references: [id])
  
  // Relations
  items             OrderItem[]
  bill              Bill?
  payments          Payment[]
  
  @@map("orders")
}

model OrderItem {
  id                String        @id @default(cuid())
  quantity          Int
  unitPrice         Decimal       @db.Decimal(10, 2)
  totalPrice        Decimal       @db.Decimal(10, 2)
  specialInstructions String?
  modifiers         Json          @default("[]") // Array of applied modifiers
  
  orderId           String
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  menuItemId        String
  menuItem          MenuItem      @relation(fields: [menuItemId], references: [id])
  
  @@map("order_items")
}

// Inventory Management
model InventoryItem {
  id                String         @id @default(cuid())
  name              String
  nameHi            String?
  nameBn            String?
  category          InventoryCategory
  unit              InventoryUnit
  currentStock      Decimal        @db.Decimal(10, 3)
  minStockLevel     Decimal        @db.Decimal(10, 3)
  maxStockLevel     Decimal?       @db.Decimal(10, 3)
  reorderPoint      Decimal        @db.Decimal(10, 3)
  costPerUnit       Decimal        @db.Decimal(10, 2)
  supplier          String?
  expiryDate        DateTime?
  location          String?        // Storage location
  barcode           String?
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  restaurantId      String
  restaurant        Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  // Relations
  recipeIngredients RecipeIngredient[]
  stockMovements    StockMovement[]
  
  @@unique([restaurantId, name])
  @@map("inventory_items")
}

model Recipe {
  id                String             @id @default(cuid())
  servingSize       Int                @default(1)
  preparationTime   Int                // in minutes
  cookingTime       Int                // in minutes
  instructions      String?
  notes             String?
  
  menuItemId        String             @unique
  menuItem          MenuItem           @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  
  ingredients       RecipeIngredient[]
  
  @@map("recipes")
}

model RecipeIngredient {
  id                String         @id @default(cuid())
  quantity          Decimal        @db.Decimal(10, 3)
  unit              InventoryUnit
  notes             String?
  
  recipeId          String
  recipe            Recipe         @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  
  inventoryItemId   String
  inventoryItem     InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  
  @@unique([recipeId, inventoryItemId])
  @@map("recipe_ingredients")
}

// Billing & Payments
model Bill {
  id                String         @id @default(cuid())
  billNumber        String         @unique
  subtotal          Decimal        @db.Decimal(10, 2)
  
  // Tax breakdown (GST)
  cgstRate          Decimal        @db.Decimal(5, 2) @default(0)
  cgstAmount        Decimal        @db.Decimal(10, 2) @default(0)
  sgstRate          Decimal        @db.Decimal(5, 2) @default(0)
  sgstAmount        Decimal        @db.Decimal(10, 2) @default(0)
  igstRate          Decimal        @db.Decimal(5, 2) @default(0)
  igstAmount        Decimal        @db.Decimal(10, 2) @default(0)
  
  serviceChargeRate Decimal?       @db.Decimal(5, 2)
  serviceCharge     Decimal        @db.Decimal(10, 2) @default(0)
  packagingCharge   Decimal        @db.Decimal(10, 2) @default(0)
  deliveryCharge    Decimal        @db.Decimal(10, 2) @default(0)
  discountAmount    Decimal        @db.Decimal(10, 2) @default(0)
  
  totalAmount       Decimal        @db.Decimal(10, 2)
  paidAmount        Decimal        @db.Decimal(10, 2) @default(0)
  balanceAmount     Decimal        @db.Decimal(10, 2) @default(0)
  
  status            BillStatus     @default(UNPAID)
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  orderId           String         @unique
  order             Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  restaurantId      String
  restaurant        Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  payments          Payment[]
  
  @@map("bills")
}

model Payment {
  id                String         @id @default(cuid())
  amount            Decimal        @db.Decimal(10, 2)
  method            PaymentMethod
  status            PaymentStatus  @default(PENDING)
  
  // Payment gateway details
  gatewayId         String?        // Razorpay/other gateway transaction ID
  gatewayResponse   Json?          // Full gateway response
  
  // UPI specific
  upiTransactionId  String?
  upiRef            String?
  
  processedAt       DateTime?
  createdAt         DateTime       @default(now())
  
  billId            String
  bill              Bill           @relation(fields: [billId], references: [id], onDelete: Cascade)
  
  orderId           String
  order             Order          @relation(fields: [orderId], references: [id])
  
  @@map("payments")
}

// Customer Management
model Customer {
  id                String         @id @default(cuid())
  firstName         String
  lastName          String?
  email             String?
  phone             String
  dateOfBirth       DateTime?
  anniversary       DateTime?
  
  // Address
  addresses         Json           @default("[]")
  
  // Loyalty
  loyaltyPoints     Int            @default(0)
  totalSpent        Decimal        @db.Decimal(12, 2) @default(0)
  visitCount        Int            @default(0)
  lastVisit         DateTime?
  
  // Preferences
  preferences       Json           @default("{}") // Food preferences, allergies, etc.
  
  // Marketing
  marketingConsent  Boolean        @default(false)
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  restaurantId      String
  restaurant        Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  
  orders            Order[]
  
  @@unique([restaurantId, phone])
  @@map("customers")
}

// Enums
enum UserRole {
  SUPER_ADMIN
  RESTAURANT_OWNER
  MANAGER
  CASHIER
  KITCHEN_STAFF
  WAITER
}

enum SubscriptionTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum OrderType {
  DINE_IN
  TAKEAWAY
  DELIVERY
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  COMPLETED
  CANCELLED
}

enum IntegrationSource {
  INTERNAL
  SWIGGY
  ZOMATO
  WHATSAPP
}

enum InventoryCategory {
  VEGETABLES
  FRUITS
  GRAINS
  SPICES
  DAIRY
  MEAT
  SEAFOOD
  BEVERAGES
  PACKAGING
  CLEANING
  OTHER
}

enum InventoryUnit {
  KG
  GRAM
  LITER
  ML
  PIECE
  PACKET
  BOX
  CAN
}

enum BillStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  WALLET
  BANK_TRANSFER
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}
```

### 4.2 Database Optimization Strategies

#### 4.2.1 Indexing Strategy

```sql
-- High-performance indexes for frequent queries
CREATE INDEX CONCURRENTLY idx_orders_restaurant_status ON orders(restaurant_id, status) WHERE status IN ('PENDING', 'CONFIRMED', 'PREPARING');
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX CONCURRENTLY idx_menu_items_category ON menu_items(category_id, is_available);
CREATE INDEX CONCURRENTLY idx_inventory_stock_level ON inventory_items(restaurant_id) WHERE current_stock <= min_stock_level;

-- Composite indexes for analytics queries
CREATE INDEX CONCURRENTLY idx_bills_restaurant_date ON bills(restaurant_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_payments_method_status ON payments(method, status, created_at);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_menu_items_search ON menu_items USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX CONCURRENTLY idx_customers_search ON customers USING GIN(to_tsvector('english', first_name || ' ' || last_name || ' ' || phone));
```

#### 4.2.2 Database Functions for Business Logic

```sql
-- Function to calculate order total with taxes
CREATE OR REPLACE FUNCTION calculate_order_total(order_id UUID)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, total_amount DECIMAL) AS $$
DECLARE
  order_subtotal DECIMAL;
  gst_rate DECIMAL := 0.05; -- 5% GST for food items
  service_charge_rate DECIMAL := 0.10; -- 10% service charge
BEGIN
  SELECT SUM(total_price) INTO order_subtotal
  FROM order_items 
  WHERE order_items.order_id = $1;
  
  -- Calculate tax (GST)
  tax_amount := order_subtotal * gst_rate;
  
  -- Add service charge for dine-in orders
  IF EXISTS(SELECT 1 FROM orders WHERE id = $1 AND type = 'DINE_IN') THEN
    tax_amount := tax_amount + (order_subtotal * service_charge_rate);
  END IF;
  
  total_amount := order_subtotal + tax_amount;
  
  RETURN QUERY SELECT order_subtotal, tax_amount, total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory on order completion
CREATE OR REPLACE FUNCTION update_inventory_on_order(order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  recipe RECORD;
  ingredient RECORD;
BEGIN
  -- Loop through order items
  FOR item IN 
    SELECT oi.menu_item_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = $1
  LOOP
    -- Check if menu item has a recipe
    SELECT * INTO recipe FROM recipes WHERE menu_item_id = item.menu_item_id;
    
    IF FOUND THEN
      -- Update inventory for each ingredient
      FOR ingredient IN
        SELECT ri.inventory_item_id, ri.quantity * item.quantity AS total_quantity
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = recipe.id
      LOOP
        UPDATE inventory_items
        SET current_stock = current_stock - ingredient.total_quantity,
            updated_at = NOW()
        WHERE id = ingredient.inventory_item_id;
        
        -- Log stock movement
        INSERT INTO stock_movements (
          inventory_item_id,
          type,
          quantity,
          reference_type,
          reference_id,
          created_at
        ) VALUES (
          ingredient.inventory_item_id,
          'CONSUMPTION',
          -ingredient.total_quantity,
          'ORDER',
          $1,
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## 5. API Specifications

### 5.1 RESTful API Design

#### 5.1.1 API Versioning and Standards

```typescript
// Base API configuration
const API_BASE_URL = '/api/v1'
const API_ROUTES = {
  auth: '/auth',
  restaurants: '/restaurants',
  orders: '/orders',
  menu: '/menu',
  inventory: '/inventory',
  billing: '/billing',
  customers: '/customers',
  integrations: '/integrations',
  analytics: '/analytics'
} as const

// Standard API response format
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// Standard error responses
enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR'
}
```

#### 5.1.2 Orders API Implementation

```typescript
// DTOs for Orders API
export class CreateOrderDto {
  @IsEnum(OrderType)
  @ApiProperty({ enum: OrderType })
  type: OrderType

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false })
  customerId?: string

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false })
  tableId?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ required: false })
  specialInstructions?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  @ApiProperty({ required: false })
  deliveryInfo?: DeliveryInfoDto
}

export class OrderItemDto {
  @IsUUID()
  @ApiProperty()
  menuItemId: string

  @IsInt()
  @Min(1)
  @Max(50)
  @ApiProperty()
  quantity: number

  @IsDecimal({ decimal_digits: '2' })
  @ApiProperty()
  unitPrice: number

  @IsOptional()
  @IsArray()
  @ApiProperty({ required: false })
  modifiers?: ModifierDto[]

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiProperty({ required: false })
  specialInstructions?: string
}

// API endpoints with OpenAPI documentation
@Controller('orders')
@ApiTags('Orders')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ 
    status: 201, 
    description: 'Order created successfully',
    type: OrderResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid order data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order items',
          details: [
            { field: 'items.0.quantity', message: 'Quantity must be at least 1' }
          ]
        }
      }
    }
  })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<OrderResponseDto>> {
    try {
      const order = await this.ordersService.createOrder(
        createOrderDto, 
        req.user.restaurantId
      )
      
      return {
        success: true,
        data: order,
        message: 'Order created successfully'
      }
    } catch (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: error.message
        }
      })
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get orders with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'type', required: false, enum: OrderType })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'endDate', required: false, type: String, format: 'date-time' })
  @ApiResponse({ 
    status: 200, 
    description: 'Orders retrieved successfully',
    type: PaginatedOrdersResponseDto 
  })
  async getOrders(
    @Query() query: GetOrdersQueryDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<PaginatedOrdersResponseDto>> {
    const orders = await this.ordersService.getOrders(req.user.restaurantId, query)
    
    return {
      success: true,
      data: orders.data,
      meta: orders.meta
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<OrderResponseDto>> {
    const order = await this.ordersService.getOrderById(id, req.user.restaurantId)
    
    if (!order) {
      throw new NotFoundException({
        success: false,
        error: {
          code: ApiErrorCode.NOT_FOUND,
          message: 'Order not found'
        }
      })
    }
    
    return {
      success: true,
      data: order
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @Roles(UserRole.MANAGER, UserRole.KITCHEN_STAFF)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<OrderResponseDto>> {
    const order = await this.ordersService.updateOrderStatus(
      id, 
      updateStatusDto.status,
      req.user.restaurantId
    )
    
    return {
      success: true,
      data: order,
      message: `Order status updated to ${updateStatusDto.status}`
    }
  }
}
```

### 5.2 GraphQL Implementation for Complex Queries

```typescript
// GraphQL schemas for complex dashboard queries
@ObjectType()
export class OrderAnalytics {
  @Field()
  totalOrders: number

  @Field(() => Float)
  totalRevenue: number

  @Field(() => Float)
  averageOrderValue: number

  @Field(() => [PopularItem])
  popularItems: PopularItem[]

  @Field(() => [HourlyStats])
  hourlyStats: HourlyStats[]
}

@ObjectType()
export class PopularItem {
  @Field()
  menuItemId: string

  @Field()
  name: string

  @Field()
  quantitySold: number

  @Field(() => Float)
  revenue: number
}

@Resolver()
export class AnalyticsResolver {
  constructor(private analyticsService: AnalyticsService) {}

  @Query(() => OrderAnalytics)
  @UseGuards(GqlAuthGuard)
  async orderAnalytics(
    @Args('restaurantId') restaurantId: string,
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
    @Context() context: GqlContext
  ): Promise<OrderAnalytics> {
    return this.analyticsService.getOrderAnalytics(
      restaurantId, 
      startDate, 
      endDate
    )
  }

  @Query(() => DashboardData)
  @UseGuards(GqlAuthGuard)
  async dashboardData(
    @Args('restaurantId') restaurantId: string,
    @Context() context: GqlContext
  ): Promise<DashboardData> {
    // Complex query that fetches multiple data sources
    return this.analyticsService.getDashboardData(restaurantId)
  }
}

// GraphQL query example
const DASHBOARD_QUERY = gql`
  query DashboardData($restaurantId: ID!) {
    restaurant(id: $restaurantId) {
      name
      todayOrders(limit: 10) {
        id
        orderNumber
        status
        totalAmount
        customer {
          firstName
          lastName
        }
        items {
          menuItem {
            name
          }
          quantity
        }
      }
      
      analytics(period: TODAY) {
        totalOrders
        totalRevenue
        averageOrderValue
        popularItems(limit: 5) {
          name
          quantitySold
          revenue
        }
      }
      
      inventory {
        lowStockItems(limit: 10) {
          name
          currentStock
          minStockLevel
        }
      }
      
      activeIntegrations {
        swiggy {
          isConnected
          pendingOrders
        }
        zomato {
          isConnected
          pendingOrders
        }
      }
    }
  }
`
```

## 6. Integration Patterns

### 6.1 Event-Driven Architecture

```typescript
// Event definitions
export enum SystemEvents {
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  PAYMENT_PROCESSED = 'payment.processed',
  INVENTORY_LOW = 'inventory.low',
  MENU_UPDATED = 'menu.updated',
  INTEGRATION_SYNC = 'integration.sync'
}

// Event payload interfaces
export interface OrderCreatedEvent {
  orderId: string
  restaurantId: string
  order: Order
  source: IntegrationSource
}

export interface InventoryLowEvent {
  restaurantId: string
  itemId: string
  itemName: string
  currentStock: number
  minLevel: number
}

// Event handlers
@Injectable()
export class OrderEventHandler {
  constructor(
    private readonly kitchenService: KitchenService,
    private readonly notificationService: NotificationService,
    private readonly integrationService: IntegrationService
  ) {}

  @OnEvent(SystemEvents.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Send to kitchen display
    await this.kitchenService.addToQueue(event.order)
    
    // Send customer notification
    if (event.order.customer) {
      await this.notificationService.sendOrderConfirmation(
        event.order.customer.phone,
        event.order
      )
    }
    
    // Sync with external platforms
    if (event.source === IntegrationSource.INTERNAL) {
      await this.integrationService.syncOrderToAggregators(event.order)
    }
  }

  @OnEvent(SystemEvents.INVENTORY_LOW)
  async handleLowInventory(event: InventoryLowEvent): Promise<void> {
    await this.notificationService.sendLowStockAlert(
      event.restaurantId,
      event
    )
  }
}
```

### 6.2 Webhook System for Real-time Integrations

```typescript
// Webhook controller for external integrations
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly swiggyService: SwiggyService,
    private readonly zomatoService: ZomatoService
  ) {}

  @Post('swiggy')
  @UseGuards(SwiggyWebhookGuard) // Validates Swiggy webhook signature
  async handleSwiggyWebhook(
    @Body() payload: SwiggyWebhookPayload,
    @Headers('x-swiggy-signature') signature: string
  ): Promise<{ status: string }> {
    await this.webhookService.processWebhook('swiggy', payload, signature)
    
    switch (payload.event_type) {
      case 'order_placed':
        await this.swiggyService.processIncomingOrder(payload.data)
        break
      case 'order_cancelled':
        await this.swiggyService.cancelOrder(payload.data.order_id)
        break
      case 'payment_completed':
        await this.swiggyService.confirmPayment(payload.data)
        break
    }
    
    return { status: 'processed' }
  }

  @Post('razorpay')
  @UseGuards(RazorpayWebhookGuard)
  async handleRazorpayWebhook(
    @Body() payload: RazorpayWebhookPayload
  ): Promise<{ status: string }> {
    switch (payload.event) {
      case 'payment.captured':
        await this.processPaymentCapture(payload.payload.payment.entity)
        break
      case 'payment.failed':
        await this.processPaymentFailure(payload.payload.payment.entity)
        break
    }
    
    return { status: 'ok' }
  }

  private async processPaymentCapture(payment: any): Promise<void> {
    await this.prisma.payment.update({
      where: { gatewayId: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        processedAt: new Date(),
        gatewayResponse: payment
      }
    })
    
    // Update bill status
    const bill = await this.prisma.bill.findFirst({
      where: {
        payments: {
          some: { gatewayId: payment.id }
        }
      }
    })
    
    if (bill) {
      await this.updateBillStatus(bill.id)
    }
  }
}
```

## 7. Development Workflow

### 7.1 Project Setup and Configuration

```typescript
// next.config.js - Next.js 15 configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true, // Partial Prerendering
    reactCompiler: true, // React 19 compiler
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config) => {
    // Bundle analyzer for production builds
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    return config
  }
}

module.exports = nextConfig

// tailwind.config.ts - Tailwind CSS v4 configuration
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Restaurant-specific colors
        vegetarian: "hsl(142, 76%, 36%)", // Green
        nonvegetarian: "hsl(0, 84%, 60%)", // Red
        spicy: "hsl(25, 95%, 53%)", // Orange
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-in-out",
        "slide-up": "slide-up 0.3s ease-out",
        "bounce-subtle": "bounce-subtle 2s infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0%)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### 7.2 Development Scripts and Automation

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "format": "prettier --write .",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

### 7.3 Testing Strategy

```typescript
// Jest configuration - jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)

// Example unit test - components/features/pos/order-cart.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderCart } from './order-cart'
import { CartItem } from '@/lib/types'

const mockItems: CartItem[] = [
  {
    id: '1',
    name: 'Butter Chicken',
    price: 299,
    quantity: 2,
    category: 'main-course'
  },
  {
    id: '2',
    name: 'Naan',
    price: 45,
    quantity: 4,
    category: 'bread'
  }
]

describe('OrderCart', () => {
  const mockProps = {
    items: mockItems,
    onQuantityChange: jest.fn(),
    onRemoveItem: jest.fn(),
    onClearCart: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders cart items correctly', () => {
    render(<OrderCart {...mockProps} />)
    
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument()
    expect(screen.getByText('Naan')).toBeInTheDocument()
    expect(screen.getByText('₹778.00')).toBeInTheDocument() // Total
  })

  it('calls onQuantityChange when quantity is modified', () => {
    render(<OrderCart {...mockProps} />)
    
    const increaseButton = screen.getAllByRole('button', { name: /plus/i })[0]
    fireEvent.click(increaseButton)
    
    expect(mockProps.onQuantityChange).toHaveBeenCalledWith('1', 3)
  })

  it('disables process payment when cart is empty', () => {
    render(<OrderCart {...mockProps} items={[]} />)
    
    const paymentButton = screen.getByRole('button', { name: /process payment/i })
    expect(paymentButton).toBeDisabled()
  })
})

// Integration test example
describe('Orders API Integration', () => {
  it('should create order and update inventory', async () => {
    const orderData = {
      type: OrderType.DINE_IN,
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 2,
          unitPrice: 299
        }
      ]
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${validToken}`)
      .send(orderData)
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe(OrderStatus.PENDING)

    // Verify inventory was updated
    const updatedInventory = await prisma.inventoryItem.findMany({
      where: { restaurantId: testRestaurant.id }
    })
    
    // Assert inventory consumption
    expect(updatedInventory.length).toBeGreaterThan(0)
  })
})
```

### 7.4 Code Quality and Standards

```typescript
// ESLint configuration - .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off"
  },
  "overrides": [
    {
      "files": ["**/*.test.{js,jsx,ts,tsx}"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
}

// Prettier configuration - .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}

// Husky pre-commit hooks - .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run type-check
npm run test -- --passWithNoTests
```

## 8. Security Implementation

### 8.1 Authentication and Authorization

```typescript
// JWT strategy implementation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub)
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive')
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      permissions: user.permissions
    }
  }
}

// Role-based access control guard
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    return requiredRoles.some((role) => user.role === role)
  }
}

// Permission-based guard for granular access
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler()
    )

    if (!requiredPermission) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    return user.permissions.includes(requiredPermission)
  }
}

// Usage in controllers
@Controller('inventory')
@UseGuards(JwtAuthGuard, RoleGuard)
export class InventoryController {
  @Get()
  @Roles(UserRole.MANAGER, UserRole.RESTAURANT_OWNER)
  async getInventory() {
    // Only managers and owners can view inventory
  }

  @Post()
  @RequirePermission('inventory.create')
  async addInventoryItem() {
    // Requires specific permission
  }
}
```

### 8.2 Data Protection and Encryption

```typescript
// Data encryption service
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16
  private readonly saltLength = 64
  private readonly tagLength = 16

  constructor(private configService: ConfigService) {}

  encrypt(text: string): string {
    const salt = crypto.randomBytes(this.saltLength)
    const key = crypto.pbkdf2Sync(
      this.configService.get('ENCRYPTION_KEY'),
      salt,
      100000,
      this.keyLength,
      'sha256'
    )
    
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipher(this.algorithm, key)
    cipher.setAAD(salt)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  }

  decrypt(encryptedData: string): string {
    const [saltHex, ivHex, tagHex, encrypted] = encryptedData.split(':')
    
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    
    const key = crypto.pbkdf2Sync(
      this.configService.get('ENCRYPTION_KEY'),
      salt,
      100000,
      this.keyLength,
      'sha256'
    )
    
    const decipher = crypto.createDecipher(this.algorithm, key)
    decipher.setAAD(salt)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}

// PII data handling
@Injectable()
export class PIIService {
  constructor(private encryptionService: EncryptionService) {}

  async hashSensitiveData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(12)
    return bcrypt.hash(data, salt)
  }

  async encryptCustomerData(customerData: any): Promise<any> {
    return {
      ...customerData,
      phone: this.encryptionService.encrypt(customerData.phone),
      email: customerData.email ? this.encryptionService.encrypt(customerData.email) : null,
      address: customerData.address ? this.encryptionService.encrypt(JSON.stringify(customerData.address)) : null
    }
  }
}
```

### 8.3 API Security Measures

```typescript
// Rate limiting configuration
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Use IP address and user ID for authenticated requests
    return req.user ? `${req.ip}-${req.user.id}` : req.ip
  }

  protected generateKey(context: ExecutionContext, tracker: string): string {
    const request = context.switchToHttp().getRequest()
    const route = request.route?.path || request.url
    return `${tracker}-${route}`
  }
}

// Request validation and sanitization
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value
    }

    // Sanitize input data
    const sanitizedValue = this.sanitizeInput(value)
    
    const object = plainToClass(metatype, sanitizedValue)
    const errors = await validate(object)
    
    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: this.formatErrors(errors)
        }
      })
    }
    
    return object
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      // XSS protection - strip dangerous tags
      return validator.escape(value.trim())
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {}
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeInput(val)
      }
      return sanitized
    }
    
    return value
  }
}

// Security headers middleware
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
}
```

## 9. Deployment Strategy

### 9.1 Docker Configuration

```dockerfile
# Dockerfile for Next.js frontend
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Builder
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Dockerfile for NestJS backend
FROM node:20-alpine AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./

EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
```

### 9.2 Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: foodpaaji
      POSTGRES_USER: foodpaaji_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U foodpaaji_user -d foodpaaji"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://foodpaaji_user:secure_password@postgres:5432/foodpaaji
      REDIS_URL: redis://:redis_password@redis:6379
      JWT_SECRET: your-jwt-secret-here
      RAZORPAY_KEY_ID: your-razorpay-key
      RAZORPAY_KEY_SECRET: your-razorpay-secret
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3001:3001"
    volumes:
      - ./src:/usr/src/app/src
      - ./prisma:/usr/src/app/prisma

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./public:/app/public

volumes:
  postgres_data:
  redis_data:
```

### 9.3 Production Deployment with AWS ECS

```yaml
# AWS CloudFormation template for ECS deployment
AWSTemplateFormatVersion: '2010-09-09'
Description: 'FoodPaaji Restaurant Management System Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]

Resources:
  # VPC and Networking
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-foodpaaji-vpc'

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub '${Environment}-foodpaaji-cluster'
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT

  # RDS PostgreSQL Database
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '${Environment}-foodpaaji-db'
      DBInstanceClass: db.t3.medium
      Engine: postgres
      EngineVersion: '16.1'
      MasterUsername: foodpaaji_admin
      MasterUserPassword: !Ref DatabasePassword
      AllocatedStorage: 100
      StorageType: gp3
      StorageEncrypted: true
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      BackupRetentionPeriod: 7
      MultiAZ: !If [IsProduction, true, false]

  # ElastiCache Redis
  RedisSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for Redis cluster
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  RedisCluster:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupId: !Sub '${Environment}-foodpaaji-redis'
      Description: Redis cluster for FoodPaaji
      NodeType: cache.t3.micro
      Engine: redis
      EngineVersion: '7.0'
      NumCacheClusters: !If [IsProduction, 2, 1]
      Port: 6379
      CacheSubnetGroupName: !Ref RedisSubnetGroup
      SecurityGroupIds:
        - !Ref RedisSecurityGroup

  # ECS Task Definition
  BackendTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub '${Environment}-foodpaaji-backend'
      Cpu: 512
      Memory: 1024
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !Ref ECSExecutionRole
      TaskRoleArn: !Ref ECSTaskRole
      ContainerDefinitions:
        - Name: backend
          Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/foodpaaji-backend:latest'
          PortMappings:
            - ContainerPort: 3001
              Protocol: tcp
          Environment:
            - Name: NODE_ENV
              Value: !Ref Environment
            - Name: DATABASE_URL
              Value: !Sub 'postgresql://foodpaaji_admin:${DatabasePassword}@${Database.Endpoint.Address}:5432/foodpaaji'
            - Name: REDIS_URL
              Value: !Sub 'redis://${RedisCluster.PrimaryEndPoint.Address}:6379'
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref CloudWatchLogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: backend

  # ECS Service
  BackendService:
    Type: AWS::ECS::Service
    DependsOn: LoadBalancerListener
    Properties:
      ServiceName: !Sub '${Environment}-foodpaaji-backend'
      Cluster: !Ref ECSCluster
      LaunchType: FARGATE
      DesiredCount: !If [IsProduction, 3, 1]
      TaskDefinition: !Ref BackendTaskDefinition
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref ECSSecurityGroup
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
          AssignPublicIp: DISABLED
      LoadBalancers:
        - ContainerName: backend
          ContainerPort: 3001
          TargetGroupArn: !Ref TargetGroup

Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Outputs:
  LoadBalancerDNS:
    Description: DNS name of the load balancer
    Value: !GetAtt LoadBalancer.DNSName
  DatabaseEndpoint:
    Description: RDS instance endpoint
    Value: !GetAtt Database.Endpoint.Address
```

## 10. Performance Optimization

### 10.1 Frontend Performance Optimization

```typescript
// Next.js performance optimizations
// app/layout.tsx - Root layout with performance optimizations
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Font display optimization
  preload: true
})

export const metadata: Metadata = {
  title: {
    template: '%s | FoodPaaji',
    default: 'FoodPaaji - Restaurant Management System'
  },
  description: 'Complete restaurant management solution for Indian restaurants',
  keywords: ['restaurant', 'management', 'POS', 'India', 'billing'],
}

// Component lazy loading with Suspense
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const AnalyticsChart = lazy(() => import('@/components/features/analytics/analytics-chart'))
const InventoryTable = lazy(() => import('@/components/features/inventory/inventory-table'))

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Suspense fallback={<Skeleton className="h-[400px]" />}>
        <AnalyticsChart />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-[400px]" />}>
        <InventoryTable />
      </Suspense>
    </div>
  )
}

// Image optimization for menu items
import Image from 'next/image'

export function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <Card>
      <div className="relative aspect-square">
        <Image
          src={item.image || '/placeholder-food.jpg'}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover rounded-t-lg"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
      </div>
      <CardContent>
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-muted-foreground">₹{item.price}</p>
      </CardContent>
    </Card>
  )
}
```

### 10.2 Backend Performance Optimization

```typescript
// Database query optimization
@Injectable()
export class OptimizedOrdersService {
  constructor(private prisma: PrismaService) {}

  // Optimized query with proper includes and pagination
  async getOrdersWithAnalytics(
    restaurantId: string,
    query: GetOrdersQueryDto
  ): Promise<PaginatedOrdersResponseDto> {
    const { page = 1, limit = 20, status, startDate, endDate } = query

    // Use database-level aggregation for better performance
    const [orders, analytics] = await Promise.all([
      // Main orders query with optimized includes
      this.prisma.order.findMany({
        where: {
          restaurantId,
          ...(status && { status }),
          ...(startDate && endDate && {
            createdAt: { gte: startDate, lte: endDate }
          })
        },
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              menuItem: {
                select: { id: true, name: true, image: true }
              }
            }
          },
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true }
          },
          _count: { select: { items: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),

      // Aggregated analytics in single query
      this.prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true }
      })
    ])

    return {
      data: orders,
      meta: {
        page,
        limit,
        total: analytics._count.id,
        totalPages: Math.ceil(analytics._count.id / limit)
      },
      analytics: {
        totalOrders: analytics._count.id,
        totalRevenue: analytics._sum.totalAmount || 0,
        averageOrderValue: analytics._avg.totalAmount || 0
      }
    }
  }

  // Bulk operations for better performance
  async bulkUpdateOrderStatuses(
    updates: Array<{ id: string; status: OrderStatus }>
  ): Promise<void> {
    const transaction = updates.map(({ id, status }) =>
      this.prisma.order.update({
        where: { id },
        data: { status, updatedAt: new Date() }
      })
    )

    await this.prisma.$transaction(transaction)
  }
}

// Caching strategy implementation
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get(key)
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl: number = 300 // 5 minutes default
  ): Promise<void> {
    await this.cacheManager.set(key, value, ttl * 1000)
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.cacheManager.store.keys(`*${pattern}*`)
    await Promise.all(keys.map(key => this.cacheManager.del(key)))
  }

  // Cache decorator for methods
  @Cache('menu-items', 600) // 10 minutes
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      include: { category: true }
    })
  }
}

// Connection pooling and database optimization
export const databaseConfig = {
  // Connection pooling
  connection: {
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    }
  },

  // Query optimization
  query: {
    timeout: 20000,
    maxRows: 1000
  }
}
```

### 10.3 Real-time Performance Monitoring

```typescript
// Performance monitoring middleware
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const method = request.method
    const url = request.url
    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now
        
        // Log slow requests
        if (duration > 1000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} - ${duration}ms`
          )
        }

        // Send metrics to monitoring service
        this.sendMetrics({
          method,
          url,
          duration,
          timestamp: new Date()
        })
      })
    )
  }

  private sendMetrics(metrics: RequestMetrics): void {
    // Send to your monitoring service (DataDog, New Relic, etc.)
    // This could be done asynchronously to avoid blocking
  }
}

// Health check endpoint for monitoring
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: Redis
  ) {}

  @Get()
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices()
    ])

    const [database, redis, external] = checks.map(check => 
      check.status === 'fulfilled' ? check.value : { status: 'error', error: check.reason }
    )

    return {
      status: this.getOverallStatus([database, redis, external]),
      timestamp: new Date(),
      checks: {
        database,
        redis,
        external
      }
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'healthy' }
    } catch (error) {
      return { status: 'unhealthy', error: error.message }
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    try {
      await this.redis.ping()
      return { status: 'healthy' }
    } catch (error) {
      return { status: 'unhealthy', error: error.message }
    }
  }
}
```

---

## Conclusion

This Technical Architecture document provides a comprehensive foundation for implementing the FoodPaaji restaurant management system. The architecture leverages modern technologies while addressing the specific needs of the Indian restaurant market.

### Key Technical Advantages:

1. **Modern Stack**: Next.js 15, NestJS, and TypeScript for robust development
2. **Offline-First**: Ensures reliability in challenging connectivity environments
3. **Scalable Architecture**: Microservices design supporting growth from single restaurant to enterprise
4. **India-Specific Integrations**: Built-in support for UPI, GST, and food aggregators
5. **Performance Optimized**: Comprehensive caching, database optimization, and monitoring

### Next Steps:

1. **Environment Setup**: Configure development environment with Docker
2. **Database Schema**: Implement Prisma schema and migrations
3. **Authentication System**: Build JWT-based authentication with role management
4. **Core Modules**: Develop POS, inventory, and billing modules
5. **Integration Layer**: Implement Swiggy/Zomato and payment gateway integrations
6. **Testing Strategy**: Comprehensive unit, integration, and e2e testing
7. **Deployment Pipeline**: CI/CD setup with automated testing and deployment

This architecture provides the foundation for building a world-class restaurant management system that can compete effectively in the Indian market while maintaining the flexibility to expand globally.

*Ready to transform how Indian restaurants operate in the digital age.*