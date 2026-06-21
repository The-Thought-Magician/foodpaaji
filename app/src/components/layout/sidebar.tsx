'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { invoke } from '@tauri-apps/api/core'
import { getSettings } from '@/lib/settings'
import {
  LayoutDashboard,
  Users,
  Package,
  Utensils,
  Receipt,
  Calendar,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  UserCircle,
  FileText,
  ChefHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { id: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/billing', label: 'Billing', icon: FileText },
  { id: '/pos', label: 'Point of Sale', icon: Receipt },
  { id: '/kitchen', label: 'Kitchen Display', icon: ChefHat },
  { id: '/employees', label: 'Employees', icon: Users },
  { id: '/customers', label: 'Customers', icon: UserCircle },
  { id: '/inventory', label: 'Inventory', icon: Package },
  { id: '/menu', label: 'Menu', icon: Utensils },
  { id: '/reservations', label: 'Reservations', icon: Calendar },
  { id: '/promotions', label: 'Promotions', icon: Megaphone },
  { id: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [restaurantName, setRestaurantName] = useState('FoodPaaji')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { setRestaurantName(getSettings().restaurant_name || 'FoodPaaji') }, [])
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      invoke<{ success: boolean; data: { total_alerts: number } }>('get_alert_summary', { restaurantId: 1 })
        .then(r => { if (r.success) setLowStockCount(r.data.total_alerts) }).catch(() => {})
      invoke<{ success: boolean; data: { id: number }[] }>('get_orders', { status: 'pending', limit: 99 })
        .then(r => { if (r.success) setPendingOrders(r.data.length) }).catch(() => {})
    }
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center w-full' : '')}>
          <div className="relative">
            <div className="w-10 h-10 gradient-spice rounded-xl flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-card" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg text-foreground">FoodPaaji</h1>
              <p className="text-xs text-muted-foreground">Restaurant Manager</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.id || (item.id !== '/' && pathname.startsWith(item.id))

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.id)}
              className={cn(
                'sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-primary active'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed ? 'justify-center' : ''
              )}
              style={{ animationDelay: `${index * 50}ms`, opacity: 0, animation: 'slide-in-left 0.3s ease-out forwards' }}
            >
              <div className={cn(
                'p-2 rounded-lg transition-all duration-200',
                isActive ? 'gradient-spice shadow-md' : 'bg-muted'
              )}>
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : '')} />
              </div>
              {!collapsed && <span className="animate-fade-in flex-1">{item.label}</span>}
              {!collapsed && item.id === '/inventory' && lowStockCount > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">{lowStockCount}</span>
              )}
              {!collapsed && item.id === '/pos' && pendingOrders > 0 && (
                <span className="ml-auto text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">{pendingOrders}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-muted/50', collapsed ? 'justify-center' : '')}>
          <div className="w-9 h-9 gradient-accent rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {restaurantName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{restaurantName}</p>
              <p className="text-xs text-muted-foreground">Restaurant Manager</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
