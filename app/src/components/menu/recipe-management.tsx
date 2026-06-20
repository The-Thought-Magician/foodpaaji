'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Save, ChefHat } from 'lucide-react'

interface MenuItem { id: number; name: string; category_id: number }
interface InventoryItem { id: number; name: string; unit: string }
interface Ingredient { inventory_item_id: number; quantity: number; unit: string; cost_per_unit?: number | null }
interface SavedIngredient { id?: number; menu_item_id: number; inventory_item_id: number; quantity_required: number; unit: string; cost_per_unit?: number | null }

const RESTAURANT_ID = 1

export default function RecipeManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    invoke<{ success: boolean; data?: MenuItem[] }>('get_menu_items_by_category', { categoryId: null, restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success && r.data) setMenuItems(r.data) })
      .catch(console.error)
    invoke<{ success: boolean; data?: InventoryItem[] }>('get_inventory_items', { restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success && r.data) setInventoryItems(r.data) })
      .catch(console.error)
  }, [])

  const loadRecipe = useCallback(async (itemId: number) => {
    try {
      const res = await invoke<{ success: boolean; data?: SavedIngredient[] }>('get_menu_recipe', { menuItemId: itemId })
      if (res.success && res.data) {
        setIngredients(res.data.map((i: SavedIngredient) => ({ inventory_item_id: i.inventory_item_id, quantity: i.quantity_required, unit: i.unit, cost_per_unit: i.cost_per_unit })))
      } else {
        setIngredients([])
      }
    } catch { setIngredients([]) }
  }, [])

  const onSelectItem = (val: string | null) => {
    if (!val) return
    const id = parseInt(val)
    setSelectedItem(id)
    loadRecipe(id)
  }

  const addIngredient = () => {
    setIngredients(prev => [...prev, { inventory_item_id: 0, quantity: 1, unit: 'g' }])
  }

  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const updateIngredient = (idx: number, field: keyof Ingredient, value: string | number) => {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing))
  }

  const saveRecipe = async () => {
    if (!selectedItem) return
    const valid = ingredients.filter(i => i.inventory_item_id > 0 && i.quantity > 0)
    setSaving(true)
    try {
      await invoke('create_menu_recipe', {
        request: { restaurant_id: RESTAURANT_ID, menu_item_id: selectedItem, ingredients: valid.map(i => ({ inventory_item_id: i.inventory_item_id, quantity: i.quantity, unit: i.unit })) }
      })
      setMsg('Recipe saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (e) { setMsg(`Error: ${e}`); setTimeout(() => setMsg(''), 3000) }
    finally { setSaving(false) }
  }

  const selectedMenuItem = menuItems.find(m => m.id === selectedItem)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="w-6 h-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-bold">Recipe Management</h2>
          <p className="text-sm text-muted-foreground">Link inventory ingredients to menu items</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>Select Menu Item</Label>
            <Select onValueChange={onSelectItem} value={selectedItem?.toString() ?? ''}>
              <SelectTrigger><SelectValue placeholder="Choose a menu item..." /></SelectTrigger>
              <SelectContent>
                {menuItems.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedItem && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recipe for {selectedMenuItem?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select value={ing.inventory_item_id ? ing.inventory_item_id.toString() : ''} onValueChange={(v: string | null) => {
                  if (!v) return
                  const inv = inventoryItems.find(i => i.id === parseInt(v))
                  updateIngredient(idx, 'inventory_item_id', parseInt(v))
                  if (inv) updateIngredient(idx, 'unit', inv.unit)
                }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step="0.01" value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-24" placeholder="Qty" />
                <Input value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)} className="w-20" placeholder="Unit" />
                <Button variant="ghost" size="sm" onClick={() => removeIngredient(idx)} className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={addIngredient}><Plus className="w-4 h-4 mr-1" />Add Ingredient</Button>
              <Button className="gradient-spice text-white" size="sm" onClick={saveRecipe} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save Recipe'}
              </Button>
              {msg && <span className={`text-sm font-medium ${msg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedItem && (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a menu item to view or edit its recipe</p>
        </div>
      )}
    </div>
  )
}
