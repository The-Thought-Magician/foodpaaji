'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MenuItemFormData {
  restaurant_id: number
  category_id: number
  name: string
  description: string
  short_description: string
  price: number
  preparation_time: number
  calories: number
  sku: string
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  is_spicy: boolean
  spice_level: number
  is_available: boolean
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

interface Category { id: number; name: string; is_active: boolean }

interface Props {
  open: boolean
  editingId?: number
  initialData: MenuItemFormData
  categories: Category[]
  restaurantId: number
  onClose: () => void
  onSaved: () => void
}

interface Allergen { id: number; allergen_name: string; severity: string; notes?: string }
interface NutritionInfo { serving_size?: string; calories: number; protein: number; carbohydrates: number; fat: number; fiber: number; sugar: number; sodium: number }
interface Variant { id: number; menu_item_id: number; name: string; description?: string; price_modifier: number; sort_order: number; is_active: boolean }
interface ModifierOption { id: number; modifier_id: number; name: string; price_modifier: number }
interface Modifier { id: number; menu_item_id: number; name: string; modifier_type: string; min_selections: number; max_selections: number; options: ModifierOption[] }
const ALLERGEN_PRESETS = ['Gluten', 'Dairy', 'Nuts', 'Peanuts', 'Eggs', 'Soy', 'Fish', 'Shellfish', 'Sesame']
const SEVERITY_OPTS = [['LOW', 'Low'], ['MEDIUM', 'Medium'], ['HIGH', 'High'], ['SEVERE', 'Severe']]
const NUTRITION_DEFAULTS: NutritionInfo = { serving_size: '', calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }

export function MenuItemFormDialog({ open, editingId, initialData, categories, restaurantId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<MenuItemFormData>(initialData)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [allergens, setAllergens] = useState<Allergen[]>([])
  const [nutrition, setNutrition] = useState<NutritionInfo>(NUTRITION_DEFAULTS)
  const [newAllergen, setNewAllergen] = useState({ name: '', severity: 'MEDIUM' })
  const [variants, setVariants] = useState<Variant[]>([])
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [newVariant, setNewVariant] = useState({ name: '', price_modifier: '' })
  const [newModifier, setNewModifier] = useState({ name: '', modifier_type: 'OPTIONAL' })
  const [newOptions, setNewOptions] = useState<Record<number, { name: string; price: string }>>({})
  const MOD_TYPES = [['REQUIRED', 'Required'], ['OPTIONAL', 'Optional'], ['MULTI_SELECT', 'Multi-select']]

  useEffect(() => {
    setForm(initialData)
    setImageFile(null)
    setImagePreview('')
    setExistingImage(null)
    setAllergens([])
    setNutrition(NUTRITION_DEFAULTS)
    if (open && editingId) {
      invoke<{ success: boolean; data?: string }>('get_menu_item_by_id', { itemId: editingId, restaurantId })
        .then(res => {
          const path = (res as unknown as { data?: { image_path?: string } }).data?.image_path
          if (!path) return
          invoke<{ success: boolean; data?: string }>('get_menu_image', { imagePath: path })
            .then(r => setExistingImage(r.success && r.data ? r.data : null))
            .catch(() => {})
        })
        .catch(() => {})
      invoke<{ success: boolean; data?: Allergen[] }>('get_menu_item_allergens', { menuItemId: editingId })
        .then(r => { if (r.success && r.data) setAllergens(r.data) }).catch(() => {})
      invoke<{ success: boolean; data?: NutritionInfo | null }>('get_nutrition_info', { menuItemId: editingId })
        .then(r => { if (r.success && r.data) setNutrition(r.data) }).catch(() => {})
      invoke<{ success: boolean; data?: Variant[] }>('get_menu_item_variants', { menuItemId: editingId })
        .then(r => { if (r.success && r.data) setVariants(r.data) }).catch(() => {})
      invoke<{ success: boolean; data?: Modifier[] }>('get_menu_item_modifiers', { menuItemId: editingId })
        .then(r => { if (r.success && r.data) setModifiers(r.data) }).catch(() => {})
    }
  }, [open, editingId, restaurantId, initialData])

  const update = <K extends keyof MenuItemFormData>(k: K, v: MenuItemFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const uploadImage = async (itemId: number) => {
    if (!imageFile) return
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        await invoke('upload_menu_item_image', {
          request: {
            menu_item_id: itemId, restaurant_id: restaurantId,
            image_data: e.target?.result as string,
            file_name: imageFile.name, compress: true,
            max_width: 800, max_height: 600, quality: 85,
          },
        })
      } catch (err) { console.error(err) }
    }
    reader.readAsDataURL(imageFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await invoke('update_menu_item', { id: editingId, request: form })
        await uploadImage(editingId)
      } else {
        const res = await invoke<{ success: boolean; data?: { id: number } }>('create_menu_item', { request: form })
        if (res.success && res.data) await uploadImage(res.data.id)
      }
      onSaved()
      onClose()
    } catch (err) { console.error(err) }
  }

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const r = new FileReader()
    r.onload = ev => setImagePreview(ev.target?.result as string)
    r.readAsDataURL(file)
  }

  const activeCategories = categories.filter(c => c.is_active)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className={`grid w-full ${editingId ? 'grid-cols-5' : 'grid-cols-3'}`}>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              {editingId && <TabsTrigger value="variants">Variants</TabsTrigger>}
              {editingId && <TabsTrigger value="health">Health</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input value={form.name} required onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id.toString()}
                  onValueChange={(v: string | null) => update('category_id', parseInt(v ?? '0'))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {activeCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Short Description</Label>
                <Input value={form.short_description} placeholder="Brief description for menu display"
                  onChange={e => update('short_description', e.target.value)} />
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea value={form.description} rows={3}
                  placeholder="Detailed description with ingredients, preparation, etc."
                  onChange={e => update('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹)</Label>
                  <Input type="number" step="0.01" min="0" required value={form.price}
                    onChange={e => update('price', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={form.sku} placeholder="Stock keeping unit"
                    onChange={e => update('sku', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div>
                <Label>Item Image</Label>
                {existingImage && !imagePreview && (
                  <div className="mb-2 relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={existingImage} alt="Current" className="w-full h-full object-cover" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2 text-xs h-7"
                      onClick={async () => { if (!editingId) return; await invoke('delete_menu_item_image', { menuItemId: editingId, restaurantId }).catch(console.error); setExistingImage(null) }}>
                      Remove
                    </Button>
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={onImageSelect} />
                {imagePreview && (
                  <div className="mt-2 w-full h-32 bg-muted rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prep Time (min)</Label>
                  <Input type="number" min="0" value={form.preparation_time}
                    onChange={e => update('preparation_time', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Calories</Label>
                  <Input type="number" min="0" value={form.calories}
                    onChange={e => update('calories', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_spicy} onCheckedChange={v => update('is_spicy', v)} />
                  <Label>Spicy</Label>
                </div>
                {form.is_spicy && (
                  <div>
                    <Label>Spice Level (1-5)</Label>
                    <Input type="number" min="1" max="5" value={form.spice_level}
                      onChange={e => update('spice_level', parseInt(e.target.value) || 1)} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([['is_vegetarian', 'Vegetarian'], ['is_vegan', 'Vegan'], ['is_gluten_free', 'Gluten Free']] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Switch checked={form[k]} onCheckedChange={v => update(k, v)} />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order}
                  onChange={e => update('sort_order', parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([['is_active', 'Active'], ['is_available', 'Available'], ['is_featured', 'Featured']] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Switch checked={form[k]} onCheckedChange={v => update(k, v)} />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            {editingId && (
              <TabsContent value="variants" className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Variants <span className="text-xs text-muted-foreground font-normal">(size, portion — adds to base price)</span></h3>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g. Large" value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))} />
                    <Input type="number" step="0.01" placeholder="Price +" className="w-28" value={newVariant.price_modifier}
                      onChange={e => setNewVariant(v => ({ ...v, price_modifier: e.target.value }))} />
                    <Button type="button" size="sm" onClick={async () => {
                      if (!newVariant.name.trim()) return
                      const res = await invoke<{ success: boolean; data?: Variant }>('create_menu_item_variant', {
                        menuItemId: editingId, request: { name: newVariant.name.trim(), price_modifier: parseFloat(newVariant.price_modifier) || 0 }
                      }).catch(() => null)
                      if (res?.success && res.data) { setVariants(v => [...v, res.data!]); setNewVariant({ name: '', price_modifier: '' }) }
                    }}>Add</Button>
                  </div>
                  <div className="space-y-1">
                    {variants.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <span className="font-medium">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{v.price_modifier >= 0 ? '+' : ''}₹{v.price_modifier.toFixed(2)}</span>
                          <button type="button" className="text-destructive hover:text-destructive/80 text-xs" onClick={async () => {
                            await invoke('delete_menu_item_variant', { variantId: v.id }).catch(() => {})
                            setVariants(prev => prev.filter(x => x.id !== v.id))
                          }}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {variants.length === 0 && <p className="text-xs text-muted-foreground">No variants</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Modifiers <span className="text-xs text-muted-foreground font-normal">(add-ons, extras)</span></h3>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g. Extra Toppings" value={newModifier.name} onChange={e => setNewModifier(m => ({ ...m, name: e.target.value }))} />
                    <Select value={newModifier.modifier_type} onValueChange={v => setNewModifier(m => ({ ...m, modifier_type: v ?? 'OPTIONAL' }))}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{MOD_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" size="sm" onClick={async () => {
                      if (!newModifier.name.trim()) return
                      const res = await invoke<{ success: boolean; data?: Modifier }>('create_menu_item_modifier', {
                        menuItemId: editingId, request: { name: newModifier.name.trim(), modifier_type: newModifier.modifier_type }
                      }).catch(() => null)
                      if (res?.success && res.data) { setModifiers(m => [...m, res.data!]); setNewModifier({ name: '', modifier_type: 'OPTIONAL' }) }
                    }}>Add</Button>
                  </div>
                  <div className="space-y-3">
                    {modifiers.map(mod => (
                      <div key={mod.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{mod.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground capitalize">{mod.modifier_type.toLowerCase().replace('_', ' ')}</span>
                          </div>
                          <button type="button" className="text-xs text-destructive" onClick={async () => {
                            await invoke('delete_menu_item_modifier', { modifierId: mod.id }).catch(() => {})
                            setModifiers(prev => prev.filter(x => x.id !== mod.id))
                          }}>Remove</button>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {mod.options.map(opt => (
                            <span key={opt.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted">
                              {opt.name}{opt.price_modifier !== 0 ? ` (+₹${opt.price_modifier})` : ''}
                              <button type="button" className="hover:text-destructive" onClick={async () => {
                                await invoke('delete_modifier_option', { optionId: opt.id }).catch(() => {})
                                setModifiers(prev => prev.map(m => m.id === mod.id ? { ...m, options: m.options.filter(o => o.id !== opt.id) } : m))
                              }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input placeholder="Option name" className="h-7 text-xs"
                            value={newOptions[mod.id]?.name ?? ''} onChange={e => setNewOptions(o => ({ ...o, [mod.id]: { ...(o[mod.id] ?? { name: '', price: '' }), name: e.target.value } }))} />
                          <Input type="number" placeholder="+price" className="h-7 text-xs w-20"
                            value={newOptions[mod.id]?.price ?? ''} onChange={e => setNewOptions(o => ({ ...o, [mod.id]: { ...(o[mod.id] ?? { name: '', price: '' }), price: e.target.value } }))} />
                          <Button type="button" size="sm" className="h-7 text-xs" onClick={async () => {
                            const opt = newOptions[mod.id]
                            if (!opt?.name?.trim()) return
                            const res = await invoke<{ success: boolean; data?: ModifierOption }>('add_modifier_option', {
                              modifierId: mod.id, request: { name: opt.name.trim(), price_modifier: parseFloat(opt.price) || 0 }
                            }).catch(() => null)
                            if (res?.success && res.data) {
                              setModifiers(prev => prev.map(m => m.id === mod.id ? { ...m, options: [...m.options, res.data!] } : m))
                              setNewOptions(o => ({ ...o, [mod.id]: { name: '', price: '' } }))
                            }
                          }}>+</Button>
                        </div>
                      </div>
                    ))}
                    {modifiers.length === 0 && <p className="text-xs text-muted-foreground">No modifiers</p>}
                  </div>
                </div>
              </TabsContent>
            )}

            {editingId && (
              <TabsContent value="health" className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Allergens</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ALLERGEN_PRESETS.map(preset => (
                      <button key={preset} type="button"
                        className="text-xs px-2 py-1 rounded border hover:bg-muted"
                        onClick={() => setNewAllergen(a => ({ ...a, name: preset }))}>
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Allergen name" value={newAllergen.name}
                      onChange={e => setNewAllergen(a => ({ ...a, name: e.target.value }))} />
                    <Select value={newAllergen.severity} onValueChange={v => setNewAllergen(a => ({ ...a, severity: v ?? 'MEDIUM' }))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITY_OPTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" size="sm" onClick={async () => {
                      if (!newAllergen.name.trim()) return
                      const res = await invoke<{ success: boolean; data?: Allergen }>('add_allergen', {
                        menuItemId: editingId, request: { allergen_name: newAllergen.name.trim(), severity: newAllergen.severity }
                      }).catch(() => null)
                      if (res?.success && res.data) { setAllergens(a => [...a, res.data!]); setNewAllergen({ name: '', severity: 'MEDIUM' }) }
                    }}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allergens.map(a => (
                      <span key={a.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                        ${a.severity === 'SEVERE' ? 'bg-red-100 text-red-800' : a.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : a.severity === 'LOW' ? 'bg-yellow-50 text-yellow-700' : 'bg-orange-50 text-orange-700'}`}>
                        {a.allergen_name} · {a.severity.toLowerCase()}
                        <button type="button" className="ml-1 hover:text-destructive" onClick={async () => {
                          await invoke('remove_allergen', { allergenId: a.id }).catch(() => {})
                          setAllergens(prev => prev.filter(x => x.id !== a.id))
                        }}>×</button>
                      </span>
                    ))}
                    {allergens.length === 0 && <p className="text-xs text-muted-foreground">No allergens added</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Nutrition Info (per serving)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Serving Size</Label>
                      <Input placeholder="e.g. 200g" value={nutrition.serving_size ?? ''}
                        onChange={e => setNutrition(n => ({ ...n, serving_size: e.target.value }))} />
                    </div>
                    {(['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium'] as const).map(field => (
                      <div key={field}>
                        <Label className="text-xs capitalize">{field} {field === 'calories' ? '(kcal)' : field === 'sodium' ? '(mg)' : '(g)'}</Label>
                        <Input type="number" min="0" step="0.1" value={nutrition[field]}
                          onChange={e => setNutrition(n => ({ ...n, [field]: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    ))}
                  </div>
                  <Button type="button" size="sm" className="mt-3" onClick={async () => {
                    await invoke('upsert_nutrition_info', { menuItemId: editingId, request: nutrition }).catch(console.error)
                  }}>Save Nutrition</Button>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">{editingId ? 'Update' : 'Create'} Menu Item</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
