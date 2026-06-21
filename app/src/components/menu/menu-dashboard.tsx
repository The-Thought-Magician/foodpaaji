'use client'

import { useState, useEffect } from 'react'
import { Utensils, FolderOpen, IndianRupee, CheckCircle, RefreshCw, Plus, Star } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import type { MenuCategory, MenuItem } from '@/types/menu'
import { StatCard, DashboardCategoryCard, FeaturedItemRow } from './menu-dashboard-cards'

interface PopularItem { item_name: string; menu_item_id: number; order_count: number; total_qty: number; total_revenue: number }

interface MenuAnalytics {
  total_items: number
  average_price: number
  average_cost: number
  average_margin: number
  price_range: { min: number; max: number }
}

interface Props {
  onNavigate?: (tab: string) => void
}

const RESTAURANT_ID = 1

export function MenuDashboard({ onNavigate }: Props) {
  const [analytics, setAnalytics] = useState<MenuAnalytics | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([])
  const [popular, setPopular] = useState<PopularItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try {
      const [analyticsRes, categoriesRes, popRes] = await Promise.all([
        invoke<{ success: boolean; data?: MenuAnalytics }>('get_pricing_analytics', { restaurantId: RESTAURANT_ID }),
        invoke<{ success: boolean; data?: MenuCategory[] }>('get_menu_categories', { restaurantId: RESTAURANT_ID }),
        invoke<{ success: boolean; data?: PopularItem[] }>('get_popular_menu_items', { limit: 5 }),
      ])
      if (popRes.success && popRes.data) setPopular(popRes.data)

      if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data)

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data.filter(c => c.is_active))

        const itemResults = await Promise.all(
          categoriesRes.data.slice(0, 3).map(cat =>
            invoke<{ success: boolean; data?: MenuItem[] }>(
              'get_menu_items_by_category', { restaurantId: RESTAURANT_ID, categoryId: cat.id }
            )
          )
        )
        const featured = itemResults
          .flatMap(r => (r.success && r.data) ? r.data.filter(i => i.is_featured && i.is_active) : [])
          .slice(0, 6)
        setFeaturedItems(featured)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

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
    { title: 'Total Items', value: analytics?.total_items ?? 0, change: '', trend: 'neutral' as const, icon: Utensils, gradient: 'gradient-spice' },
    { title: 'Categories', value: categories.length, change: '', trend: 'neutral' as const, icon: FolderOpen, gradient: 'gradient-accent' },
    { title: 'Avg. Price', value: `₹${Math.round(analytics?.average_price ?? 0)}`, change: '', trend: 'neutral' as const, icon: IndianRupee, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Avg. Margin', value: `${Math.round(analytics?.average_margin ?? 0)}%`, change: '', trend: 'neutral' as const, icon: CheckCircle, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Menu Overview</h2>
          <p className="text-muted-foreground">Track your menu performance and manage items</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={load} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button onClick={() => onNavigate?.('items')} className="gradient-spice text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Categories Overview</h3>
          <p className="text-sm text-muted-foreground">Active menu categories</p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.slice(0, 6).map(cat => <DashboardCategoryCard key={cat.id} category={cat} />)}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Featured Items</h3>
            <p className="text-sm text-muted-foreground">Highlight your best dishes</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('items')}>View All</Button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredItems.length > 0 ? featuredItems.map(item => <FeaturedItemRow key={item.id} item={item} />) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No featured items found. Mark items as featured to display them here.</p>
            </div>
          )}
        </div>
      </div>

      {popular.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border"><h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Top Selling Items</h3><p className="text-sm text-muted-foreground">Ranked by units sold from bills</p></div>
          <div className="divide-y divide-border">
            {popular.map((item, i) => (
              <div key={item.menu_item_id} className="px-6 py-3 flex items-center gap-4">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 font-medium">{item.item_name}</span>
                <span className="text-sm text-muted-foreground">{item.total_qty} sold</span>
                <span className="text-sm font-semibold">₹{item.total_revenue.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
