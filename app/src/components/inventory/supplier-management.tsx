'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building2, Phone, Mail, MapPin, CreditCard, Plus, Edit, Eye, Search, Users, Download, Trash2 } from 'lucide-react'
import { SupplierFormDialog, SupplierDetailsDialog, FORM_DEFAULTS, type Supplier, type SupplierFormData } from './supplier-dialogs'

const RESTAURANT_ID = 1

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>(FORM_DEFAULTS)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: Supplier[] }>('get_suppliers', { restaurantId: RESTAURANT_ID })
      if (res.success && res.data) setSuppliers(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').includes(search)
  )

  const openAdd = () => { setFormData(FORM_DEFAULTS); setIsEditing(false); setSelected(null); setShowForm(true) }

  const openEdit = (s: Supplier) => {
    setFormData({ name: s.name, contact_person: s.contact_person ?? '', email: s.email ?? '',
      phone: s.phone ?? '', address: s.address ?? '', gstin: s.gstin ?? '', payment_terms: s.payment_terms ?? '' })
    setSelected(s); setIsEditing(true); setShowForm(true)
  }

  const handleSubmit = async (data: SupplierFormData) => {
    setLoading(true)
    try {
      const request = {
        restaurant_id: RESTAURANT_ID,
        name: data.name.trim(),
        contact_person: data.contact_person.trim() || undefined,
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        address: data.address.trim() || undefined,
        gstin: data.gstin.trim().toUpperCase() || undefined,
        payment_terms: data.payment_terms.trim() || undefined,
      }
      const cmd = isEditing && selected ? 'update_supplier' : 'create_supplier'
      const args = isEditing && selected ? { supplierId: selected.id, request } : { request }
      const res = await invoke<{ success: boolean }>(cmd, args)
      if (res.success) { setShowForm(false); load() }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Remove supplier "${s.name}"?`)) return
    try {
      await invoke('delete_supplier', { supplierId: s.id })
      load()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => {
            const rows = ['Name,Contact,Email,Phone,Address,GSTIN,Payment Terms', ...filtered.map(s => `"${s.name}","${s.contact_person ?? ''}","${s.email ?? ''}","${s.phone ?? ''}","${s.address ?? ''}","${s.gstin ?? ''}","${s.payment_terms ?? ''}"`)]
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: `suppliers-${new Date().toISOString().split('T')[0]}.csv` })
            a.click()
          }}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add New Supplier</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers Directory</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search by name, contact, email, or phone..."
                value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Badge variant="secondary">{filtered.length} suppliers</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />{s.name}
                        </div>
                        {s.contact_person && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Users className="h-3 w-3" />{s.contact_person}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {s.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{s.phone}</div>}
                          {s.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" />{s.email}</div>}
                          {s.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" /><span className="max-w-32 truncate">{s.address}</span></div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {s.gstin && <div><span className="text-muted-foreground">GSTIN:</span> {s.gstin}</div>}
                          {s.payment_terms && <div className="flex items-center gap-2"><CreditCard className="h-3 w-3 text-muted-foreground" /><span className="max-w-24 truncate">{s.payment_terms}</span></div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={s.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-muted text-muted-foreground'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelected(s); setShowDetails(true) }}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        {search ? 'No suppliers found' : 'No suppliers added yet'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierFormDialog open={showForm} isEditing={isEditing} loading={loading}
        initialData={formData} onClose={() => setShowForm(false)} onSubmit={handleSubmit} />

      <SupplierDetailsDialog supplier={selected} open={showDetails}
        onClose={() => setShowDetails(false)} onEdit={openEdit} />
    </div>
  )
}
