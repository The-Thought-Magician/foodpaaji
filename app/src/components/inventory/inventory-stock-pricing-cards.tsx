'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface StockFields {
  minimum_stock: number
  maximum_stock: number
  reorder_point: number
}

interface PricingFields {
  cost_price: number
  selling_price: number
  tax_rate: number
}

interface TrackingFields {
  expiry_tracking: boolean
  batch_tracking: boolean
}

type AllFields = StockFields & PricingFields & TrackingFields

interface Props {
  values: AllFields
  errors: Record<string, string>
  onChange: (field: string, value: number | boolean) => void
}

const numField = (
  label: string,
  field: string,
  value: number,
  error: string | undefined,
  onChange: (f: string, v: number) => void,
  extra?: { step?: string }
) => (
  <div>
    <Label>{label}</Label>
    <Input type="number" step={extra?.step ?? '0.01'} value={value}
      className={error ? 'border-destructive' : ''}
      onChange={e => onChange(field, parseFloat(e.target.value) || 0)} />
    {error && <p className="text-sm text-destructive mt-1">{error}</p>}
  </div>
)

export function InventoryStockPricingCards({ values, errors, onChange }: Props) {
  const margin = values.cost_price > 0 && values.selling_price > values.cost_price
    ? ((values.selling_price - values.cost_price) / values.selling_price * 100).toFixed(1)
    : '0'

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Stock Levels</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {numField('Minimum Stock', 'minimum_stock', values.minimum_stock, errors.minimum_stock, onChange)}
            {numField('Maximum Stock', 'maximum_stock', values.maximum_stock, errors.maximum_stock, onChange)}
            {numField('Reorder Point', 'reorder_point', values.reorder_point, errors.reorder_point, onChange)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {numField('Cost Price (₹)', 'cost_price', values.cost_price, errors.cost_price, onChange)}
            {numField('Selling Price (₹)', 'selling_price', values.selling_price, errors.selling_price, onChange)}
            {numField('Tax Rate (%)', 'tax_rate', values.tax_rate, undefined, onChange)}
            <div>
              <Label>Profit Margin</Label>
              <div className="p-2 bg-muted rounded text-center font-medium mt-2">{margin}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tracking Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="expiry_tracking" checked={values.expiry_tracking}
              onCheckedChange={v => onChange('expiry_tracking', !!v)} />
            <Label htmlFor="expiry_tracking">Enable expiry date tracking</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="batch_tracking" checked={values.batch_tracking}
              onCheckedChange={v => onChange('batch_tracking', !!v)} />
            <Label htmlFor="batch_tracking">Enable batch/lot tracking</Label>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
