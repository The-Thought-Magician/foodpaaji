'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator } from 'lucide-react'

interface AvailableUnits {
  weight_units: string[]
  volume_units: string[]
  length_units: string[]
  count_units: string[]
}

interface ConversionResult {
  original_quantity: number
  original_unit: string
  converted_quantity: number
  converted_unit: string
  conversion_factor: number
}

interface Props {
  unitType: string
  baseUnit: string
  conversionFactor: number
  availableUnits: AvailableUnits | null
  errors: Record<string, string>
  onChange: (field: string, value: string | number) => void
}

const getUnits = (type: string, available: AvailableUnits | null): string[] => {
  if (!available) return []
  const map: Record<string, string[]> = {
    weight: available.weight_units,
    volume: available.volume_units,
    length: available.length_units,
    count: available.count_units,
  }
  return map[type] ?? []
}

export function InventoryUnitsCard({ unitType, baseUnit, conversionFactor, availableUnits, errors, onChange }: Props) {
  const [test, setTest] = useState({ quantity: 1, fromUnit: '', toUnit: '' })
  const [result, setResult] = useState<ConversionResult | null>(null)

  const currentUnits = getUnits(unitType, availableUnits)

  const convert = async () => {
    if (!test.fromUnit || !test.toUnit || test.quantity <= 0) return
    try {
      const res = await invoke<{ success: boolean; data?: ConversionResult }>('convert_units', {
        request: { restaurant_id: 1, quantity: test.quantity, from_unit: test.fromUnit, to_unit: test.toUnit },
      })
      if (res.success && res.data) setResult(res.data)
    } catch (e) { console.error(e) }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Units & Conversion</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Unit Type</Label>
            <Select value={unitType} onValueChange={(v: string | null) => {
              if (v) {
                onChange('unit_type', v)
                const units = getUnits(v, availableUnits)
                if (units.length) onChange('base_unit', units[0])
              }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['weight', 'volume', 'length', 'count'].map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Base Unit *</Label>
            <Select value={baseUnit} onValueChange={(v: string | null) => { if (v) onChange('base_unit', v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currentUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.base_unit && <p className="text-sm text-destructive mt-1">{errors.base_unit}</p>}
          </div>
          <div>
            <Label>Conversion Factor</Label>
            <Input type="number" step="0.0001" value={conversionFactor}
              className={errors.conversion_factor ? 'border-destructive' : ''}
              onChange={e => onChange('conversion_factor', parseFloat(e.target.value) || 1)} />
            {errors.conversion_factor && <p className="text-sm text-destructive mt-1">{errors.conversion_factor}</p>}
          </div>
        </div>

        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />Unit Conversion Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input type="number" placeholder="Quantity" value={test.quantity}
                onChange={e => setTest(t => ({ ...t, quantity: parseFloat(e.target.value) || 0 }))} />
              <Select value={test.fromUnit}
                onValueChange={(v: string | null) => setTest(t => ({ ...t, fromUnit: v ?? t.fromUnit }))}>
                <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                <SelectContent>{currentUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={test.toUnit}
                onValueChange={(v: string | null) => setTest(t => ({ ...t, toUnit: v ?? t.toUnit }))}>
                <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                <SelectContent>{currentUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" onClick={convert} variant="outline">Convert</Button>
            </div>
            {result && (
              <div className="p-3 bg-card rounded-lg border text-sm">
                <Badge className="mr-2">{result.original_quantity} {result.original_unit}</Badge>
                = <Badge className="mx-2">{result.converted_quantity} {result.converted_unit}</Badge>
                (Factor: {result.conversion_factor})
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
