'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Phone, Mail, MapPin, CreditCard, Edit, Users } from 'lucide-react'

export interface Supplier {
  id: number
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  gstin?: string
  payment_terms?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SupplierFormData {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  gstin: string
  payment_terms: string
}

export const FORM_DEFAULTS: SupplierFormData = {
  name: '', contact_person: '', email: '', phone: '', address: '', gstin: '', payment_terms: '',
}

interface FormProps {
  open: boolean
  isEditing: boolean
  loading: boolean
  initialData: SupplierFormData
  onClose: () => void
  onSubmit: (data: SupplierFormData) => void
}

export function SupplierFormDialog({ open, isEditing, loading, initialData, onClose, onSubmit }: FormProps) {
  const [form, setForm] = useState<SupplierFormData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: keyof SupplierFormData, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Supplier name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
    if (form.phone && !/^[0-9+\-\s()]+$/.test(form.phone)) e.phone = 'Invalid phone number'
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.toUpperCase()))
      e.gstin = 'Invalid GSTIN format'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  const field = (label: string, k: keyof SupplierFormData, opts?: { type?: string; placeholder?: string; maxLength?: number; upper?: boolean }) => (
    <div>
      <Label>{label}</Label>
      <Input type={opts?.type ?? 'text'} value={form[k]} maxLength={opts?.maxLength}
        placeholder={opts?.placeholder} className={errors[k] ? 'border-destructive' : ''}
        onChange={e => set(k, opts?.upper ? e.target.value.toUpperCase() : e.target.value)} />
      {errors[k] && <p className="text-sm text-destructive mt-1">{errors[k]}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Supplier Name *', 'name', { placeholder: 'Enter supplier name' })}
            {field('Contact Person', 'contact_person', { placeholder: 'Contact person name' })}
            {field('Phone Number', 'phone', { placeholder: 'Enter phone number' })}
            {field('Email Address', 'email', { type: 'email', placeholder: 'Enter email address' })}
            {field('GSTIN', 'gstin', { placeholder: '22AAAAA0000A1Z5', maxLength: 15, upper: true })}
            {field('Payment Terms', 'payment_terms', { placeholder: 'e.g., Net 30 days' })}
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={form.address} rows={3} placeholder="Enter complete address"
              onChange={e => set('address', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DetailsProps {
  supplier: Supplier | null
  open: boolean
  onClose: () => void
  onEdit: (s: Supplier) => void
}

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN') : '-'

export function SupplierDetailsDialog({ supplier, open, onClose, onEdit }: DetailsProps) {
  if (!supplier) return null
  const statusClass = supplier.is_active
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-muted text-muted-foreground border-border'
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Supplier Details</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Basic Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{supplier.name}</span></div>
                {supplier.contact_person && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>{supplier.contact_person}</span></div>}
                <Badge className={statusClass}>{supplier.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-2">
                {supplier.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{supplier.phone}</span></div>}
                {supplier.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{supplier.email}</span></div>}
                {supplier.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span className="text-sm">{supplier.address}</span></div>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Business Details</h3>
              <div className="space-y-2">
                {supplier.gstin && <div><span className="text-sm text-muted-foreground">GSTIN:</span><div className="font-mono">{supplier.gstin}</div></div>}
                {supplier.payment_terms && <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{supplier.payment_terms}</span></div>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Record Information</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Created: {fmt(supplier.created_at)}</div>
                <div>Updated: {fmt(supplier.updated_at)}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => { onClose(); onEdit(supplier) }}><Edit className="h-4 w-4 mr-2" />Edit Supplier</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
