'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, UserCircle, Star, TrendingUp, Users } from 'lucide-react'

interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  loyalty_points: number
  total_spent: number
  visit_count: number
}

interface CustomerStats {
  total_customers: number
  total_revenue: number
  avg_spend: number
  total_loyalty_points: number
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats>({ total_customers: 0, total_revenue: 0, avg_spend: 0, total_loyalty_points: 0 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

  const loadCustomers = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Customer[] }>('get_customers', { search: search || null, limit: 100 })
      if (res.success) setCustomers(res.data)
    } catch (e) { console.error(e) }
  }, [search])

  const loadStats = async () => {
    try {
      const res = await invoke<{ success: boolean; data: CustomerStats }>('get_customer_stats')
      if (res.success) setStats(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadCustomers(); loadStats() }, [loadCustomers])

  const openCreate = () => { setEditCustomer(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowForm(true) }
  const openEdit = (c: Customer) => { setEditCustomer(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: '' }); setShowForm(true) }

  const save = async () => {
    try {
      if (editCustomer) {
        await invoke('update_customer', { customerId: editCustomer.id, name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null })
      } else {
        await invoke('create_customer', { request: { name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null } })
      }
      setShowForm(false)
      loadCustomers(); loadStats()
    } catch (e) { console.error(e) }
  }

  const deleteCustomer = async (id: number) => {
    try {
      await invoke('delete_customer', { customerId: id })
      loadCustomers(); loadStats()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: stats.total_customers, icon: Users, format: (v: number) => v.toString() },
          { label: 'Total Revenue', value: stats.total_revenue, icon: TrendingUp, format: (v: number) => `₹${v.toFixed(0)}` },
          { label: 'Avg Spend', value: stats.avg_spend, icon: TrendingUp, format: (v: number) => `₹${v.toFixed(0)}` },
          { label: 'Loyalty Points', value: stats.total_loyalty_points, icon: Star, format: (v: number) => v.toString() },
        ].map(s => (
          <Card key={s.label} className="stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 gradient-spice rounded-lg"><s.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.format(s.value)}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <Card key={c.id} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-accent rounded-full flex items-center justify-center text-white font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.phone || 'No phone'}</p>
                  </div>
                </div>
                <UserCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-center">
                <div className="bg-muted rounded p-2"><p className="font-bold">{c.visit_count}</p><p className="text-muted-foreground">Visits</p></div>
                <div className="bg-muted rounded p-2"><p className="font-bold">₹{c.total_spent.toFixed(0)}</p><p className="text-muted-foreground">Spent</p></div>
                <div className="bg-muted rounded p-2"><p className="font-bold">{c.loyalty_points}</p><p className="text-muted-foreground">Points</p></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)}>Edit</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteCustomer(c.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {customers.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No customers found</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Save Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
