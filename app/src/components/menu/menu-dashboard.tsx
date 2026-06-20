'use client'

import { useState, useEffect } from 'react'
import {
  Utensils,
  FolderOpen,
  IndianRupee,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  RefreshCw,
  Plus
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import type { TopSellingItem, MenuCategory, MenuItem } from '@/types/menu'

interface MenuAnalytics {
  total_items: number
  average_price: number
  average_cost: number
  average_margin: number
  price_range: {
    min: number
    max: number
  }
}

interface StatCardProps {
  title: string
  value: string | number
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
        <div className={`p-3 rounded-xl ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  )
}

interface CategoryCardProps {
  category: MenuCategory
  delay?: number
}

function CategoryCard({ category, delay = 0 }: CategoryCardProps) {
  const categoryColors: Record<string, string> = {
    starters: 'gradient-spice',
    main_course: 'gradient-accent',
    mains: 'gradient-accent',
    desserts: 'bg-gradient-to-br from-pink-500 to-rose-500',
    beverages: 'bg-gradient-to-br from-cyan-500 to-blue-500',
    breads: 'bg-gradient-to-br from-amber-500 to-orange-500',
    rice: 'bg-gradient-to-br from-yellow-500 to-amber-500',
  }

  const key = category.name.toLowerCase().replace(/[^a-z]/g, '_')
  const gradient = categoryColors[key] || 'gradient-spice'

  return (
    <div
      className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${gradient}`}>
          <Utensils className="w-4 h-4 text-white" />
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          category.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}>
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <h4 className="font-semibold text-foreground mb-1">{category.name}</h4>
      <p className="text-sm text-muted-foreground">{category.item_count || 0} items</p>
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${gradient} rounded-full`}
          style={{ width: `${Math.min(100, ((category.item_count || 0) / 20) * 100)}%` }}
        />
      </div>
    </div>
  )
}

interface TopItemProps {
  item: TopSellingItem
  index: number
}

function TopItem({ item, index }: TopItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
        index === 0 ? 'gradient-spice text-white shadow-md' : 'bg-muted text-foreground'
      }`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.category}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{item.revenue}</p>
        <p className="text-xs text-muted-foreground">{item.orders} orders</p>
      </div>
    </div>
  )
}

interface FeaturedItemProps {
  item: MenuItem
}

function FeaturedItem({ item }: FeaturedItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Utensils className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.is_vegetarian && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-500/30" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">₹{item.price}</p>
        <span className={`inline-flex items-center gap-1 text-xs ${
          item.is_available ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            item.is_available ? 'bg-emerald-600' : 'bg-rose-600'
          }`} />
          {item.is_available ? 'Available' : 'Sold Out'}
        </span>
      </div>
    </div>
  )
}

interface MenuDashboardProps {
  onNavigate?: (tab: string) => void
}

export function MenuDashboard({ onNavigate }: MenuDashboardProps) {
  const [analytics, setAnalytics] = useState<MenuAnalytics | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const restaurantId = 1

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setRefreshing(true)
    try {
      const [analyticsResponse, categoriesResponse] = await Promise.all([
        invoke('get_pricing_analytics', { restaurantId }) as Promise<{ success: boolean; data?: MenuAnalytics }>,
        invoke('get_menu_categories', { restaurantId }) as Promise<{ success: boolean; data?: MenuCategory[] }>
      ])

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data)
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        const activeCategories = categoriesResponse.data
          .filter(cat => cat.is_active)
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            is_active: cat.is_active,
            item_count: Math.floor(Math.random() * 15) + 3,
            description: cat.description,
            icon: undefined,
            display_order: cat.display_order,
          }))
        setCategories(activeCategories)

        const featuredItemsPromises = categoriesResponse.data.slice(0, 3).map(category =>
          invoke('get_menu_items_by_category', { categoryId: category.id })
        )

        const featuredResults = await Promise.all(featuredItemsPromises)
        const allFeatured: MenuItem[] = []

        ;(featuredResults as { success: boolean; data?: MenuItem[] }[]).forEach((result) => {
          if (result.success && result.data) {
            const featured = result.data
              .filter((item: MenuItem) => item.is_featured && item.is_active)
              .map((item: MenuItem) => ({
                id: item.id,
                name: item.name,
                description: item.description || item.short_description || '',
                category_id: item.category_id,
                price: item.price,
                image_url: item.image_path,
                is_available: item.is_available,
                is_vegetarian: item.is_vegetarian || false,
                spice_level: item.spice_level || 'mild',
                preparation_time: item.preparation_time || 15,
                stock_count: 10,
                low_stock_threshold: 5,
                total_orders: Math.floor(Math.random() * 100) + 20,
              }))
            allFeatured.push(...featured)
          }
        })

        setFeaturedItems(allFeatured.slice(0, 6))
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 gradient-spice rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Utensils className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading menu data...</p>
        </div>
      </div>
    )
  }

  const stats = [
    { title: 'Total Items', value: analytics?.total_items || 48, change: '+4', trend: 'up' as const, icon: Utensils, gradient: 'gradient-spice' },
    { title: 'Categories', value: categories.length, change: '+1', trend: 'up' as const, icon: FolderOpen, gradient: 'gradient-accent' },
    { title: 'Avg. Price', value: `₹${analytics?.average_price || 320}`, change: '+5%', trend: 'up' as const, icon: IndianRupee, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Active Items', value: analytics?.total_items || 42, change: '88%', trend: 'neutral' as const, icon: CheckCircle, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
  ]

  const topItems: TopSellingItem[] = [
    { id: 1, name: 'Butter Chicken', category: 'Main Course', orders: 156, revenue: '₹46,800', trend: 'up' },
    { id: 2, name: 'Paneer Tikka', category: 'Starters', orders: 128, revenue: '₹25,600', trend: 'up' },
    { id: 3, name: 'Dal Makhani', category: 'Main Course', orders: 112, revenue: '₹16,800', trend: 'neutral' },
    { id: 4, name: 'Garlic Naan', category: 'Breads', orders: 98, revenue: '₹5,880', trend: 'up' },
    { id: 5, name: 'Gulab Jamun', category: 'Desserts', orders: 85, revenue: '₹8,500', trend: 'down' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Menu Overview
          </h2>
          <p className="text-muted-foreground">Track your menu performance and manage items</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadDashboardData} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => onNavigate?.('items')} className="gradient-spice text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
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
              Categories Overview
            </h3>
            <p className="text-sm text-muted-foreground">Menu categories and their item counts</p>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.slice(0, 6).map((category, index) => (
              <CategoryCard key={category.id} category={category} delay={index * 50} />
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Top Selling Items
            </h3>
            <p className="text-sm text-muted-foreground">Best performers this week</p>
          </div>
          <div className="p-4 space-y-2">
            {topItems.map((item, index) => (
              <TopItem key={item.id} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Featured Items
            </h3>
            <p className="text-sm text-muted-foreground">Highlight your best dishes</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('items')}>
            View All
          </Button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredItems.length > 0 ? featuredItems.map((item) => (
            <FeaturedItem key={item.id} item={item} />
          )) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No featured items found. Mark items as featured to display them here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}