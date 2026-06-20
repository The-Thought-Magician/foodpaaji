'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator } from 'lucide-react'

export type OperationType = 'PRICE_UPDATE' | 'STOCK_ADJUSTMENT' | 'REORDER_LEVELS' | 'PERCENTAGE_MARKUP'

export interface BulkOperation {
  type: OperationType
  field?: string
  value?: number
  percentage?: number
}

interface Props {
  operation: BulkOperation
  selectedCount: number
  onChange: (op: BulkOperation) => void
  onPreview: () => void
}

export function operationDescription(op: BulkOperation): string {
  switch (op.type) {
    case 'PRICE_UPDATE':
      return `Update ${op.field === 'cost_price' ? 'cost prices' : 'selling prices'} to ₹${op.value ?? 0}`
    case 'STOCK_ADJUSTMENT': {
      const v = op.value ?? 0
      return `${v >= 0 ? 'Increase' : 'Decrease'} stock by ${Math.abs(v)} units`
    }
    case 'REORDER_LEVELS': {
      const f = op.field === 'minimum_stock' ? 'minimum stock' : op.field === 'maximum_stock' ? 'maximum stock' : 'reorder point'
      return `Update ${f} to ${op.value ?? 0}`
    }
    case 'PERCENTAGE_MARKUP':
      return `Apply ${op.percentage ?? 0}% markup to ${op.field === 'cost_price' ? 'cost prices' : 'selling prices'}`
    default:
      return 'Select an operation'
  }
}

export default function BulkOperationForm({ operation, selectedCount, onChange, onPreview }: Props) {
  const set = (patch: Partial<BulkOperation>) => onChange({ ...operation, ...patch })

  return (
    <Card className="lg:col-span-1">
      <CardHeader><CardTitle>Update Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Operation Type</Label>
          <Select value={operation.type} onValueChange={(v: string | null) => onChange({ type: v as OperationType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRICE_UPDATE">Price Update</SelectItem>
              <SelectItem value="STOCK_ADJUSTMENT">Stock Adjustment</SelectItem>
              <SelectItem value="REORDER_LEVELS">Reorder Levels</SelectItem>
              <SelectItem value="PERCENTAGE_MARKUP">Percentage Markup</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {operation.type === 'PRICE_UPDATE' && (<>
          <div>
            <Label>Price Field</Label>
            <Select value={operation.field ?? ''} onValueChange={(v: string | null) => set({ field: v || undefined })}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cost_price">Cost Price</SelectItem>
                <SelectItem value="selling_price">Selling Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>New Price (₹)</Label>
            <Input type="number" step="0.01" value={operation.value ?? ''}
              onChange={e => set({ value: parseFloat(e.target.value) || 0 })} />
          </div>
        </>)}

        {operation.type === 'STOCK_ADJUSTMENT' && (
          <div>
            <Label>Stock Adjustment</Label>
            <Input type="number" step="0.01" placeholder="Positive or negative"
              value={operation.value ?? ''} onChange={e => set({ value: parseFloat(e.target.value) || 0 })} />
          </div>
        )}

        {operation.type === 'REORDER_LEVELS' && (<>
          <div>
            <Label>Level Type</Label>
            <Select value={operation.field ?? ''} onValueChange={(v: string | null) => set({ field: v || undefined })}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minimum_stock">Minimum Stock</SelectItem>
                <SelectItem value="maximum_stock">Maximum Stock</SelectItem>
                <SelectItem value="reorder_point">Reorder Point</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>New Level</Label>
            <Input type="number" step="0.01" value={operation.value ?? ''}
              onChange={e => set({ value: parseFloat(e.target.value) || 0 })} />
          </div>
        </>)}

        {operation.type === 'PERCENTAGE_MARKUP' && (<>
          <div>
            <Label>Price Field</Label>
            <Select value={operation.field ?? ''} onValueChange={(v: string | null) => set({ field: v || undefined })}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cost_price">Cost Price</SelectItem>
                <SelectItem value="selling_price">Selling Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Markup Percentage (%)</Label>
            <Input type="number" step="0.1" placeholder="e.g., 10 for 10% increase"
              value={operation.percentage ?? ''} onChange={e => set({ percentage: parseFloat(e.target.value) || 0 })} />
          </div>
        </>)}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-3">Operation Summary:</div>
          <div className="text-sm font-medium p-3 bg-blue-50 rounded">{operationDescription(operation)}</div>
        </div>

        <Button onClick={onPreview} disabled={selectedCount === 0} className="w-full">
          <Calculator className="h-4 w-4 mr-2" />Preview Changes
        </Button>
      </CardContent>
    </Card>
  )
}
