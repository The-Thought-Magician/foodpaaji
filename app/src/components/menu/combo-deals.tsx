'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Package, IndianRupee, ToggleLeft, ToggleRight } from 'lucide-react'

const RESTAURANT_ID = 1

interface MenuItem { id: number; name: string; price: number; category_id?: number }
interface ComboItem { id: number; menu_item_id: number; item_name: string; item_price: number; quantity: number }
interface ComboDeal { id: number; name: string; description?: string; combo_price: number; original_price: number; savings: number; is_active: boolean; items: ComboItem[] }
interface ItemInput { menu_item_id: number; quantity: number }

export function ComboDeals() {
  const [deals, setDeals] = useState<ComboDeal[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [comboPrice, setComboPrice] = useState('')
  const [items, setItems] = useState<ItemInput[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: ComboDeal[] }>('get_combo_deals').catch(() => null)
    if (res?.success && res.data) setDeals(res.data)
    setLoading(false)
  }, [])

  const loadMenuItems = async () => {
    const res = await invoke<{ success: boolean; data?: MenuItem[] }>('get_menu_items_by_category', { restaurantId: RESTAURANT_ID }).catch(() => null)
    if (res?.success && res.data) setMenuItems(res.data)
  }

  useEffect(() => { load(); loadMenuItems() }, [load])

  const originalTotal = items.reduce((sum, item) => {
    const mi = menuItems.find(m => m.id === item.menu_item_id)
    return sum + (mi?.price ?? 0) * item.quantity
  }, 0)

  const handleCreate = async () => {
    if (!name.trim() || !comboPrice || items.length < 2) return
    await invoke('create_combo_deal', {
      request: { name: name.trim(), description: description.trim() || null, combo_price: parseFloat(comboPrice), items }
    }).catch(console.error)
    setShowCreate(false)
    resetForm()
    load()
  }

  const resetForm = () => { setName(''); setDescription(''); setComboPrice(''); setItems([]) }

  const addItem = () => setItems([...items, { menu_item_id: menuItems[0]?.id ?? 0, quantity: 1 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof ItemInput, value: number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleToggle = async (id: number) => {
    await invoke('toggle_combo_deal', { comboId: id }).catch(console.error)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this combo deal?')) return
    await invoke('delete_combo_deal', { comboId: id }).catch(console.error)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          <h3 className="font-semibold">Combo & Meal Deals</h3>
          <Badge variant="secondary">{deals.length}</Badge>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); if (!menuItems.length) loadMenuItems() }}>
          <Plus className="w-4 h-4 mr-1" />Create Combo
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>}

      {!loading && deals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No combo deals yet. Create one to bundle menu items at a special price.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {deals.map(deal => (
          <div key={deal.id} className={`border rounded-lg p-4 space-y-3 ${deal.is_active ? 'bg-card' : 'bg-muted/50 opacity-70'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{deal.name}</h4>
                {deal.description && <p className="text-xs text-muted-foreground">{deal.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleToggle(deal.id)} title={deal.is_active ? 'Deactivate' : 'Activate'}>
                  {deal.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(deal.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {deal.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.item_name}</span>
                  <span className="text-muted-foreground line-through">₹{(item.item_price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold flex items-center"><IndianRupee className="w-4 h-4" />{deal.combo_price.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground line-through">₹{deal.original_price.toFixed(0)}</span>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                Save ₹{deal.savings.toFixed(0)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); resetForm() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Combo Deal</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div><Label>Combo Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Family Meal Deal" /></div>
            <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items (min 2) *</Label>
                <Button size="sm" variant="outline" className="h-7" onClick={addItem} disabled={menuItems.length === 0}>
                  <Plus className="w-3 h-3 mr-1" />Add Item
                </Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <select className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-background"
                    value={item.menu_item_id} onChange={e => updateItem(i, 'menu_item_id', Number(e.target.value))}>
                    {menuItems.map(mi => (
                      <option key={mi.id} value={mi.id}>{mi.name} (₹{mi.price})</option>
                    ))}
                  </select>
                  <Input type="number" min="1" className="w-16 h-8" value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeItem(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {items.length >= 2 && (
              <div className="border rounded-lg p-3 bg-muted/30 text-sm space-y-1">
                <div className="flex justify-between"><span>Original total</span><span>₹{originalTotal.toFixed(0)}</span></div>
                {comboPrice && (
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Savings</span>
                    <span>₹{(originalTotal - parseFloat(comboPrice)).toFixed(0)} ({((1 - parseFloat(comboPrice) / originalTotal) * 100).toFixed(0)}%)</span>
                  </div>
                )}
              </div>
            )}

            <div><Label>Combo Price (₹) *</Label><Input type="number" min="0" step="0.01" value={comboPrice} onChange={e => setComboPrice(e.target.value)} placeholder={originalTotal > 0 ? `Suggested: ₹${(originalTotal * 0.85).toFixed(0)}` : ''} /></div>

            <Button className="w-full" disabled={!name.trim() || !comboPrice || items.length < 2} onClick={handleCreate}>
              Create Combo Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
