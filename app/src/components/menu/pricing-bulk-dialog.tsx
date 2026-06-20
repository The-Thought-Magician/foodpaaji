'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, type BulkPriceUpdateResult, type PricingCategory, type PricingStrategy } from './pricing-types'

interface Props {
  open: boolean
  onClose: () => void
  restaurantId: number
  categories: PricingCategory[]
  onApplied: () => void
}

export function PricingBulkDialog({ open, onClose, restaurantId, categories, onApplied }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkPriceUpdateResult | null>(null)
  const [form, setForm] = useState({
    category_ids: [] as number[],
    strategy: 'PercentageMarkup' as PricingStrategy,
    markup_percentage: 50,
    apply_changes: false,
  })

  const update = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const run = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: BulkPriceUpdateResult }>('bulk_calculate_prices', {
        request: { restaurant_id: restaurantId, ...form },
      })
      if (res.success && res.data) {
        setResult(res.data)
        if (form.apply_changes) onApplied()
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setResult(null); onClose() } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Price Update</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Categories</Label>
            <Select onValueChange={(v: string | null) => {
              const ids = v === 'all' ? categories.map(c => c.id) : [parseInt(v ?? '0')]
              update('category_ids', ids)
            }}>
              <SelectTrigger><SelectValue placeholder="Select categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Strategy</Label>
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
          </div>
          {form.strategy === 'PercentageMarkup' && (
            <div><Label>Markup %</Label>
              <Input type="number" value={form.markup_percentage}
                onChange={e => update('markup_percentage', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.apply_changes}
              onChange={e => update('apply_changes', e.target.checked)} />
            <span className="text-sm">Apply changes immediately</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={run} disabled={loading || form.category_ids.length === 0} className="flex-1">
              {loading ? 'Processing...' : form.apply_changes ? 'Update Prices' : 'Preview Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); onClose() }}>Close</Button>
          </div>
          {result && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Results</h4>
                <Badge variant={result.updated_items > 0 ? 'default' : 'secondary'}>
                  {result.updated_items}/{result.total_items} Updated
                </Badge>
              </div>
              <div className="text-sm flex justify-between">
                <span>Revenue Impact:</span>
                <span className={result.total_revenue_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(Math.abs(result.total_revenue_impact))}
                  {result.total_revenue_impact > 0 ? ' increase' : ' decrease'}
                </span>
              </div>
              {result.calculations.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {result.calculations.slice(0, 10).map(c => (
                    <div key={c.menu_item_id} className="flex justify-between items-center py-1 border-b border-border">
                      <span className="truncate flex-1">{c.item_name}</span>
                      <span className="ml-2">{formatCurrency(c.current_price)} → <span className="text-green-600">{formatCurrency(c.suggested_price)}</span></span>
                    </div>
                  ))}
                  {result.calculations.length > 10 && (
                    <p className="text-center text-muted-foreground py-1">+{result.calculations.length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
