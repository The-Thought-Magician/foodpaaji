'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, BarChart3 } from 'lucide-react'
import { PricingOverview } from './pricing-overview'
import { PricingCalculatorDialog } from './pricing-calculator-dialog'
import { PricingBulkDialog } from './pricing-bulk-dialog'
import type { PricingCategory, PricingAnalytics } from './pricing-types'

interface Props {
  restaurantId: number
  categories: PricingCategory[]
  onPricesChange: () => void
}

const ANALYTICS_DEFAULTS: PricingAnalytics = {
  total_items: 0, average_price: 0, average_cost: 0,
  average_margin: 0, price_range: { min: 0, max: 0 },
}

export default function PricingManagement({ restaurantId, categories, onPricesChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<PricingAnalytics>(ANALYTICS_DEFAULTS)
  const [menuItems, setMenuItems] = useState<Array<{ id: number; name: string }>>([])
  const [showCalc, setShowCalc] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data?: PricingAnalytics }>('get_pricing_analytics', { restaurantId })
      if (res.success && res.data) setAnalytics(res.data)
    } catch (e) { console.error(e) }
  }, [restaurantId])

  const loadMenuItems = useCallback(async () => {
    const all: Array<{ id: number; name: string }> = []
    for (const cat of categories) {
      try {
        const res = await invoke<{ success: boolean; data?: Array<{ id: number; name: string }> }>(
          'get_menu_items_by_category', { restaurantId, categoryId: cat.id }
        )
        if (res.success && res.data) all.push(...res.data)
      } catch (e) { console.error(e) }
    }
    setMenuItems(all)
  }, [restaurantId, categories])

  const syncCostPrices = async () => {
    setLoading(true)
    try {
      await invoke('sync_cost_prices_from_recipes', { restaurantId })
      loadAnalytics()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAnalytics(); loadMenuItems() }, [loadAnalytics, loadMenuItems])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pricing Management</h2>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">Pricing Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PricingOverview
            analytics={analytics} loading={loading}
            onRefresh={loadAnalytics}
            onOpenCalculator={() => setShowCalc(true)}
            onOpenBulk={() => setShowBulk(true)}
            onSyncCosts={syncCostPrices}
          />
        </TabsContent>

        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />Price Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Calculate optimal pricing for individual menu items.
                </p>
                <Button onClick={() => setShowCalc(true)} className="w-full">Open Calculator</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />Bulk Price Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Update prices for multiple items simultaneously.
                </p>
                <Button onClick={() => setShowBulk(true)} className="w-full">Bulk Update</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <PricingCalculatorDialog
        open={showCalc} onClose={() => setShowCalc(false)} menuItems={menuItems}
        restaurantId={restaurantId}
        onApplied={() => { onPricesChange(); loadAnalytics() }}
      />
      <PricingBulkDialog
        open={showBulk} onClose={() => setShowBulk(false)}
        restaurantId={restaurantId} categories={categories}
        onApplied={() => { onPricesChange(); loadAnalytics() }}
      />
    </div>
  )
}
