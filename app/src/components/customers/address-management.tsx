'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Plus, Trash2, Star } from 'lucide-react'

interface Address {
  id: number; customer_id: number; label: string
  address_line: string; locality: string | null; city: string | null
  pincode: string | null; landmark: string | null; is_default: boolean
}

export function AddressManagement({ customerId, customerName, open, onClose }: {
  customerId: number; customerName: string; open: boolean; onClose: () => void
}) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: 'Home', address_line: '', locality: '', city: '', pincode: '', landmark: '' })

  const load = async () => {
    const res = await invoke<{ success: boolean; data: Address[] }>('get_customer_addresses', { customerId }).catch(() => null)
    if (res?.success) setAddresses(res.data)
  }

  useEffect(() => { if (open) load() }, [open, customerId])

  const save = async () => {
    if (!form.address_line.trim()) return
    await invoke('add_customer_address', {
      customerId, label: form.label, addressLine: form.address_line.trim(),
      locality: form.locality || null, city: form.city || null,
      pincode: form.pincode || null, landmark: form.landmark || null,
      isDefault: addresses.length === 0,
    }).catch(console.error)
    setShowForm(false)
    setForm({ label: 'Home', address_line: '', locality: '', city: '', pincode: '', landmark: '' })
    load()
  }

  const remove = async (id: number) => {
    await invoke('delete_customer_address', { id }).catch(console.error)
    load()
  }

  const makeDefault = async (id: number) => {
    await invoke('set_default_address', { id, customerId }).catch(console.error)
    load()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4" />Addresses: {customerName}</DialogTitle>
        </DialogHeader>

        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Add Address
        </Button>

        {addresses.length === 0 && !showForm && <p className="text-sm text-muted-foreground text-center py-4">No addresses saved</p>}

        <div className="space-y-2">
          {addresses.map(a => (
            <div key={a.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{a.label}</Badge>
                  {a.is_default && <Badge className="text-xs bg-amber-100 text-amber-700">Default</Badge>}
                </div>
                <div className="flex gap-1">
                  {!a.is_default && <button onClick={() => makeDefault(a.id)} className="text-muted-foreground hover:text-amber-500"><Star className="w-4 h-4" /></button>}
                  <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm">{a.address_line}</p>
              <p className="text-xs text-muted-foreground">
                {[a.locality, a.city, a.pincode].filter(Boolean).join(', ')}
              </p>
              {a.landmark && <p className="text-xs text-muted-foreground">Near: {a.landmark}</p>}
            </div>
          ))}
        </div>

        {showForm && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Pincode</Label><Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Address *</Label><Input value={form.address_line} onChange={e => setForm({ ...form, address_line: e.target.value })} className="h-8 text-sm" placeholder="Flat, Building, Street" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Locality</Label><Input value={form.locality} onChange={e => setForm({ ...form, locality: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Landmark</Label><Input value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} className="h-8 text-sm" placeholder="Near..." /></div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gradient-spice text-white" onClick={save}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
