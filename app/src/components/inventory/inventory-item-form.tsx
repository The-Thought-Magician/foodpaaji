'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, X } from 'lucide-react'
import { InventoryUnitsCard } from './inventory-units-card'
import { InventoryStockPricingCards } from './inventory-stock-pricing-cards'

interface InventoryCategory { id: number; name: string }
interface Supplier { id: number; name: string }
interface AvailableUnits {
  weight_units: string[]; volume_units: string[]
  length_units: string[]; count_units: string[]
}

export interface InventoryItemFormData {
  name: string; description: string; sku: string; barcode: string
  category_id: number | null; supplier_id: number | null
  unit_type: string; base_unit: string; conversion_factor: number
  minimum_stock: number; maximum_stock: number; reorder_point: number
  cost_price: number; selling_price: number; tax_rate: number
  expiry_tracking: boolean; batch_tracking: boolean; location: string
}

const DEFAULTS: InventoryItemFormData = {
  name: '', description: '', sku: '', barcode: '',
  category_id: null, supplier_id: null,
  unit_type: 'weight', base_unit: 'kg', conversion_factor: 1,
  minimum_stock: 0, maximum_stock: 0, reorder_point: 0,
  cost_price: 0, selling_price: 0, tax_rate: 0,
  expiry_tracking: false, batch_tracking: false, location: '',
}

interface Props {
  initialData?: Partial<InventoryItemFormData>
  onSubmit: (data: InventoryItemFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

export default function InventoryItemForm({ initialData, onSubmit, onCancel, isEditing = false }: Props) {
  const [form, setForm] = useState<InventoryItemFormData>({ ...DEFAULTS, ...initialData })
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [availableUnits, setAvailableUnits] = useState<AvailableUnits | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      invoke<{ success: boolean; data?: InventoryCategory[] }>('get_inventory_categories', { restaurantId: 1 }),
      invoke<{ success: boolean; data?: Supplier[] }>('get_suppliers', { restaurantId: 1 }),
      invoke<{ success: boolean; data?: AvailableUnits }>('get_available_units'),
    ]).then(([cats, sups, units]) => {
      if (cats.success && cats.data) setCategories(cats.data)
      if (sups.success && sups.data) setSuppliers(sups.data)
      if (units.success && units.data) setAvailableUnits(units.data)
    }).catch(console.error)
  }, [])

  const set = (field: string, value: string | number | boolean | null) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Item name is required'
    if (!form.base_unit.trim()) e.base_unit = 'Base unit is required'
    if (form.conversion_factor <= 0) e.conversion_factor = 'Must be greater than 0'
    if (form.cost_price < 0) e.cost_price = 'Cannot be negative'
    if (form.selling_price < 0) e.selling_price = 'Cannot be negative'
    if (form.minimum_stock < 0) e.minimum_stock = 'Cannot be negative'
    if (form.maximum_stock < form.minimum_stock) e.maximum_stock = 'Must exceed minimum'
    if (form.reorder_point < 0) e.reorder_point = 'Cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try { await onSubmit(form) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{isEditing ? 'Edit Inventory Item' : 'Add New Inventory Item'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Item Name *</Label>
              <Input value={form.name} placeholder="Enter item name"
                className={errors.name ? 'border-destructive' : ''}
                onChange={e => set('name', e.target.value)} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} placeholder="Enter SKU" onChange={e => set('sku', e.target.value)} />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} placeholder="Enter barcode" onChange={e => set('barcode', e.target.value)} />
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input value={form.location} placeholder="e.g., Shelf A1, Freezer 2"
                onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} rows={3} placeholder="Enter item description"
              onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id?.toString() ?? ''}
                onValueChange={(v: string | null) => set('category_id', v ? parseInt(v) : null)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id?.toString() ?? ''}
                onValueChange={(v: string | null) => set('supplier_id', v ? parseInt(v) : null)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <InventoryUnitsCard
        unitType={form.unit_type} baseUnit={form.base_unit}
        conversionFactor={form.conversion_factor} availableUnits={availableUnits}
        errors={errors} onChange={set}
      />

      <InventoryStockPricingCards
        values={form} errors={errors}
        onChange={(field, value) => set(field, value)}
      />

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
