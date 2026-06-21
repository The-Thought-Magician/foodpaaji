'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, strategyDescription, type PriceCalculation, type PricingStrategy } from './pricing-types'

interface MenuItem { id: number; name: string }

interface Props {
  open: boolean
  onClose: () => void
  menuItems: MenuItem[]
  restaurantId?: number
  onApplied?: () => void
}

export function PricingCalculatorDialog({ open, onClose, menuItems, restaurantId, onApplied }: Props) {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<PriceCalculation | null>(null)
  const [form, setForm] = useState({
    menu_item_id: 0,
    strategy: 'PercentageMarkup' as PricingStrategy,
    markup_percentage: 50,
    fixed_markup: 5,
    target_margin: 40,
  })

  const update = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const applyPrice = async () => {
    if (!result || !restaurantId) return
    setApplying(true)
    try {
      await invoke('update_menu_item_price', {
        request: {
          menu_item_id: form.menu_item_id,
          restaurant_id: restaurantId,
          new_price: result.suggested_price,
          reason: `Applied via ${form.strategy} calculator`,
        },
      })
      onApplied?.()
      setResult(null)
      onClose()
    } catch (e) { console.error(e) }
    finally { setApplying(false) }
  }

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: PriceCalculation }>('calculate_menu_item_price', { request: form })
      if (res.success && res.data) setResult(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setResult(null); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Price Calculator</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Menu Item</Label>
            <Select value={form.menu_item_id.toString()}
              onValueChange={(v: string | null) => update('menu_item_id', parseInt(v ?? '0'))}>
              <SelectTrigger><SelectValue placeholder="Select menu item" /></SelectTrigger>
              <SelectContent>
                {menuItems.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pricing Strategy</Label>
            <Select value={form.strategy}
              onValueChange={(v: string | null) => update('strategy', v as PricingStrategy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PercentageMarkup">Percentage Markup</SelectItem>
                <SelectItem value="FixedMarkup">Fixed Markup</SelectItem>
                <SelectItem value="CompetitivePricing">Competitive Pricing</SelectItem>
                <SelectItem value="ValueBased">Value Based</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{strategyDescription(form.strategy)}</p>
          </div>
          {form.strategy === 'PercentageMarkup' && (
            <div><Label>Markup %</Label>
              <Input type="number" value={form.markup_percentage}
                onChange={e => update('markup_percentage', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          {form.strategy === 'FixedMarkup' && (
            <div><Label>Fixed Markup (₹)</Label>
              <Input type="number" value={form.fixed_markup}
                onChange={e => update('fixed_markup', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          {form.strategy === 'ValueBased' && (
            <div><Label>Target Margin %</Label>
              <Input type="number" value={form.target_margin}
                onChange={e => update('target_margin', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={calculate} disabled={loading || form.menu_item_id === 0} className="flex-1">
              {loading ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); onClose() }}>Close</Button>
          </div>
          {result && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">{result.item_name}</h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span>Cost Price</span><span>{formatCurrency(result.cost_price)}</span>
                <span>Current Price</span><span>{formatCurrency(result.current_price)}</span>
                <span className="font-medium">Suggested Price</span>
                <span className="font-medium text-green-600">{formatCurrency(result.suggested_price)}</span>
                <span>Profit Margin</span><span>{result.profit_margin.toFixed(1)}%</span>
              </div>
              {restaurantId && (
                <Button onClick={applyPrice} disabled={applying} className="w-full mt-2" size="sm">
                  {applying ? 'Applying...' : `Apply ₹${result.suggested_price.toFixed(2)}`}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
