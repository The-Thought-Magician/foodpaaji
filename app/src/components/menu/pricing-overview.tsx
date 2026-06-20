'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Calculator, BarChart3, RefreshCw } from 'lucide-react'
import { formatCurrency, type PricingAnalytics } from './pricing-types'

interface Props {
  analytics: PricingAnalytics
  loading: boolean
  onRefresh: () => void
  onOpenCalculator: () => void
  onOpenBulk: () => void
  onSyncCosts: () => void
}

export function PricingOverview({ analytics, loading, onRefresh, onOpenCalculator, onOpenBulk, onSyncCosts }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Pricing Overview</h3>
        <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{analytics.total_items}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.average_price)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics.price_range.min)} – {formatCurrency(analytics.price_range.max)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
            <Calculator className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(analytics.average_cost)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{analytics.average_margin.toFixed(1)}%</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onOpenCalculator} className="w-full justify-start" variant="outline">
              <Calculator className="h-4 w-4 mr-2" />Price Calculator
            </Button>
            <Button onClick={onOpenBulk} className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />Bulk Price Update
            </Button>
            <Button onClick={onSyncCosts} disabled={loading} className="w-full justify-start" variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Cost Prices
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pricing Strategies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Percentage Markup', badge: 'Most Common', desc: 'Apply percentage markup on cost price' },
              { label: 'Fixed Markup', badge: 'Simple', desc: 'Add fixed amount to cost price' },
              { label: 'Value Based', badge: 'Advanced', desc: 'Price based on target profit margin' },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.label}</span>
                  <Badge variant="secondary">{s.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
