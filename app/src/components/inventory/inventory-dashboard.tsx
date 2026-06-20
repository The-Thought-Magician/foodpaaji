'use client'

import {
  Package,
  AlertTriangle,
  IndianRupee,
  Truck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  gradient: string
  delay?: number
}

function StatCard({ title, value, change, trend, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  return (
    <div
      className="stat-card card-hover bg-card rounded-2xl p-6 border border-border"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={cn('flex items-center gap-1 text-sm font-medium',
          trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
          {change}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {value}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  )
}

interface StockMovementProps {
  id: string
  item: string
  type: 'in' | 'out'
  quantity: number
  supplier?: string
  time: string
}

function StockMovement({ item, type, quantity, supplier, time }: StockMovementProps) {
  const isIn = type === 'in'

  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={cn('p-2.5 rounded-xl', isIn ? 'bg-accent/10' : 'bg-rose-500/10')}>
          {isIn ? (
            <TrendingUp className="w-4 h-4 text-accent" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm">{item}</p>
          <p className="text-xs text-muted-foreground">{supplier || 'Internal'} • {time}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn(
          'text-sm font-medium',
          isIn ? 'text-accent' : 'text-rose-600'
        )}>
          {isIn ? '+' : '-'}{quantity}
        </span>
      </div>
    </div>
  )
}

interface LowStockAlertProps {
  id: string
  item: string
  currentStock: number
  minStock: number
  unit: string
  category: string
  onRestock: (id: string) => void
}

function LowStockAlert({ id, item, currentStock, minStock, unit, category, onRestock }: LowStockAlertProps) {
  const stockPercentage = (currentStock / minStock) * 100
  const isCritical = stockPercentage < 50

  return (
    <div className="card-hover bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl',
            isCritical ? 'bg-rose-500/10' : 'bg-amber-500/10'
          )}>
            <AlertTriangle className={cn(
              'w-4 h-4',
              isCritical ? 'text-rose-600' : 'text-amber-600'
            )} />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{item}</h4>
            <p className="text-sm text-muted-foreground">{category}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Stock</span>
          <span className={cn(
            'font-medium',
            isCritical ? 'text-rose-600' : 'text-amber-600'
          )}>
            {currentStock} {unit}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Minimum Level</span>
          <span className="font-medium">{minStock} {unit}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isCritical ? 'bg-rose-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.max(5, stockPercentage)}%` }}
          />
        </div>
      </div>

      <Button
        onClick={() => onRestock(id)}
        className={cn(
          'w-full text-white shadow-lg',
          isCritical ? 'bg-rose-500 hover:bg-rose-600' : 'gradient-spice'
        )}
      >
        <Plus className="w-4 h-4 mr-2" />
        Restock Item
      </Button>
    </div>
  )
}

interface InventoryDashboardProps {
  onRestock?: (itemId: string) => void
  onViewAll?: () => void
}

export function InventoryDashboard({ onRestock, onViewAll }: InventoryDashboardProps) {
  const stats = [
    { title: 'Total Items', value: '248', change: '+12', trend: 'up' as const, icon: Package, gradient: 'gradient-spice' },
    { title: 'Low Stock', value: '8', change: '-3', trend: 'down' as const, icon: AlertTriangle, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600' },
    { title: 'Total Value', value: '₹1.2L', change: '+8.5%', trend: 'up' as const, icon: IndianRupee, gradient: 'gradient-accent' },
    { title: 'Suppliers', value: '15', change: '+2', trend: 'up' as const, icon: Truck, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600' },
  ]

  const stockMovements: StockMovementProps[] = [
    { id: '1', item: 'Tomato Puree', type: 'in', quantity: 50, supplier: 'Fresh Farms', time: '10 min ago' },
    { id: '2', item: 'Cooking Oil', type: 'out', quantity: 5, supplier: 'Internal', time: '25 min ago' },
    { id: '3', item: 'Basmati Rice', type: 'in', quantity: 100, supplier: 'Agro Supplies', time: '1 hour ago' },
    { id: '4', item: 'Paneer', type: 'out', quantity: 8, supplier: 'Internal', time: '2 hours ago' },
    { id: '5', item: 'Chicken Breast', type: 'in', quantity: 30, supplier: 'Meat Masters', time: '3 hours ago' },
  ]

  const lowStockAlerts = [
    { id: '1', item: 'Tomato Ketchup', currentStock: 2, minStock: 10, unit: 'bottles', category: 'Condiments' },
    { id: '2', item: 'Butter', currentStock: 3, minStock: 15, unit: 'kg', category: 'Dairy' },
    { id: '3', item: 'Green Chilies', currentStock: 1, minStock: 5, unit: 'kg', category: 'Vegetables' },
    { id: '4', item: 'Ginger Garlic Paste', currentStock: 4, minStock: 8, unit: 'packs', category: 'Condiments' },
  ]

  const handleRestock = (id: string) => {
    onRestock?.(id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Inventory Overview
          </h2>
          <p className="text-muted-foreground">
            Track your stock levels and movements
          </p>
        </div>
        <Button className="gradient-spice text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} delay={index * 100} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Recent Stock Movements
            </h3>
            <p className="text-sm text-muted-foreground">Latest stock in and out transactions</p>
          </div>
          <div className="p-4 space-y-2">
            {stockMovements.map((movement) => (
              <StockMovement key={movement.id} {...movement} />
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full" onClick={onViewAll}>
              View All Movements
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Low Stock Alerts
            </h3>
            <p className="text-sm text-muted-foreground">Items that need restocking</p>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {lowStockAlerts.map((alert) => (
              <LowStockAlert
                key={alert.id}
                {...alert}
                onRestock={handleRestock}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
