'use client'

import { Utensils, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/types/menu'

interface StatCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  gradient: string
}

export function StatCard({ title, value, change, trend, icon: Icon, gradient }: StatCardProps) {
  return (
    <div className="stat-card card-hover bg-card rounded-2xl p-6 border border-border">
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
      <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  starters: 'gradient-spice',
  main_course: 'gradient-accent',
  mains: 'gradient-accent',
  desserts: 'bg-gradient-to-br from-pink-500 to-rose-500',
  beverages: 'bg-gradient-to-br from-cyan-500 to-blue-500',
  breads: 'bg-gradient-to-br from-amber-500 to-orange-500',
  rice: 'bg-gradient-to-br from-yellow-500 to-amber-500',
}

export function DashboardCategoryCard({ category }: { category: MenuCategory }) {
  const key = category.name.toLowerCase().replace(/[^a-z]/g, '_')
  const gradient = CATEGORY_COLORS[key] ?? 'gradient-spice'
  return (
    <div className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${gradient}`}>
          <Utensils className="w-4 h-4 text-white" />
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          category.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
        }`}>{category.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <h4 className="font-semibold text-foreground mb-1">{category.name}</h4>
      <p className="text-sm text-muted-foreground">{category.item_count ?? 0} items</p>
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${gradient} rounded-full`}
          style={{ width: `${Math.min(100, ((category.item_count ?? 0) / 20) * 100)}%` }} />
      </div>
    </div>
  )
}

export function FeaturedItemRow({ item }: { item: MenuItem }) {
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
          {item.is_vegetarian && <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-500/30" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">₹{item.price}</p>
        <span className={`inline-flex items-center gap-1 text-xs ${item.is_available ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          {item.is_available ? 'Available' : 'Sold Out'}
        </span>
      </div>
    </div>
  )
}
