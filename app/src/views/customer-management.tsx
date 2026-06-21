'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Star, TrendingUp, Users, Download } from 'lucide-react'

interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  loyalty_points: number
  total_spent: number
  visit_count: number
  created_at?: string
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
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'visit_count' | 'loyalty_points'>('name')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [segment, setSegment] = useState<'all' | 'vip' | 'regular' | 'new' | 'loyal'>('all')

  const getSegment = (c: Customer) => {
    if (c.total_spent >= 5000) return 'vip'
    if (c.visit_count >= 5) return 'regular'
    if (c.loyalty_points >= 100) return 'loyal'
    return 'new'
  }
  const SEGMENT_LABEL: Record<string, string> = { vip: 'VIP', regular: 'Regular', loyal: 'Loyal', new: 'New' }
  const SEGMENT_COLOR: Record<string, string> = { vip: 'bg-amber-100 text-amber-800', regular: 'bg-blue-100 text-blue-800', loyal: 'bg-purple-100 text-purple-800', new: 'bg-green-100 text-green-800' }

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

  const openCreate = () => { setEditCustomer(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowForm(true) }
  const openEdit = async (c: Customer) => {
    setEditCustomer(c)
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: '', notes: '' })
    setShowForm(true)
    invoke<{ success: boolean; data: Customer & { address?: string; notes?: string } }>('get_customer', { customerId: c.id })
      .then(r => { if (r.success) setForm(f => ({ ...f, address: r.data.address ?? '', notes: r.data.notes ?? '' })) })
      .catch(() => {})
  }

  const save = async () => {
    try {
      if (editCustomer) {
        await invoke('update_customer', { customerId: editCustomer.id, name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null })
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

  const [viewCustomer, setViewCustomer] = useState<Customer & { address?: string; notes?: string } | null>(null)
  const [customerBills, setCustomerBills] = useState<{ id: number; bill_number: string; total_amount: number; status: string; created_at: string; customer_id?: number }[]>([])
  const [customerFeedback, setCustomerFeedback] = useState<{ id: number; rating: number; comment?: string; created_at: string; bill_number?: string }[]>([])

  const viewProfile = async (id: number) => {
    try {
      const [cr, br, fr] = await Promise.all([
        invoke<{ success: boolean; data: Customer & { address?: string; notes?: string } }>('get_customer', { customerId: id }),
        invoke<{ success: boolean; data: { id: number; bill_number: string; total_amount: number; status: string; created_at: string; customer_id?: number }[] }>('get_bills', { status: null, customerId: id, limit: 20 }),
        invoke<{ success: boolean; data: { id: number; rating: number; comment?: string; created_at: string; bill_number?: string }[] }>('get_customer_feedback', { customerId: id }).catch(() => ({ success: false, data: [] })),
      ])
      if (cr.success && cr.data) setViewCustomer(cr.data)
      if (br.success) setCustomerBills(br.data ?? [])
      if (fr.success) setCustomerFeedback(fr.data ?? [])
    } catch (e) { console.error(e) }
  }

  const [loyaltyTarget, setLoyaltyTarget] = useState<Customer | null>(null)
  const [loyaltyMode, setLoyaltyMode] = useState<'add' | 'redeem'>('add')
  const [loyaltyPoints, setLoyaltyPoints] = useState('')
  const [loyaltyBillAmt, setLoyaltyBillAmt] = useState('')

  const openLoyalty = (c: Customer, mode: 'add' | 'redeem') => {
    setLoyaltyTarget(c); setLoyaltyMode(mode); setLoyaltyPoints(''); setLoyaltyBillAmt('')
  }

  const submitLoyalty = async () => {
    if (!loyaltyTarget) return
    const pts = parseInt(loyaltyPoints) || 0
    if (pts <= 0) return
    try {
      if (loyaltyMode === 'add') {
        await invoke('add_loyalty_points', { customerId: loyaltyTarget.id, points: pts, billAmount: parseFloat(loyaltyBillAmt) || 0 })
      } else {
        await invoke('redeem_loyalty_points', { customerId: loyaltyTarget.id, points: pts })
      }
      setLoyaltyTarget(null)
      loadCustomers(); loadStats()
    } catch (e) { console.error(e) }
  }

  const exportCSV = () => {
    const hdr = 'Name,Phone,Email,Visits,Total Spent,Loyalty Points'
    const rows = customers.map(c => `"${c.name}","${c.phone ?? ''}","${c.email ?? ''}",${c.visit_count},${c.total_spent.toFixed(2)},${c.loyalty_points}`)
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([[hdr, ...rows].join('\n')], { type: 'text/csv' })), download: `customers-${new Date().toISOString().split('T')[0]}.csv` })
    a.click()
  }
  const sorted = [...customers].filter(c => segment === 'all' || getSegment(c) === segment).sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : b[sortBy] - a[sortBy])

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

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['name', 'total_spent', 'visit_count', 'loyalty_points'] as const).map(k => (
            <button key={k} onClick={() => setSortBy(k)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${sortBy === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {k === 'name' ? 'Name' : k === 'total_spent' ? 'Spent' : k === 'visit_count' ? 'Visits' : 'Points'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'vip', 'regular', 'loyal', 'new'] as const).map(s => (
            <button key={s} onClick={() => setSegment(s)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${segment === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{s === 'all' ? 'All' : SEGMENT_LABEL[s]}</button>
          ))}
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={customers.length === 0}><Download className="w-4 h-4 mr-2" />CSV</Button>
        <Button onClick={openCreate} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(c => (
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_COLOR[getSegment(c)]}`}>{SEGMENT_LABEL[getSegment(c)]}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-center">
                <div className="bg-muted rounded p-2"><p className="font-bold">{c.visit_count}</p><p className="text-muted-foreground">Visits</p></div>
                <div className="bg-muted rounded p-2"><p className="font-bold">₹{c.total_spent.toFixed(0)}</p><p className="text-muted-foreground">Spent</p></div>
                <div className="bg-muted rounded p-2"><p className="font-bold">{c.loyalty_points}</p><p className="text-muted-foreground">Points</p></div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => viewProfile(c.id)}>View</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => openLoyalty(c, 'add')}><Star className="w-3 h-3 mr-1" />+Pts</Button>
                <Button variant="outline" size="sm" onClick={() => openLoyalty(c, 'redeem')}>Redeem</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteCustomer(c.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-12">No customers found</p>}
      </div>

      <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Customer Profile</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-12 h-12 gradient-accent rounded-full flex items-center justify-center text-white font-bold text-lg">{viewCustomer.name.charAt(0).toUpperCase()}</div>
                <div><p className="font-semibold text-base">{viewCustomer.name}</p><p className="text-muted-foreground">{viewCustomer.phone || 'No phone'}</p></div>
              </div>
              {viewCustomer.email && <p><span className="text-muted-foreground">Email:</span> {viewCustomer.email}</p>}
              {viewCustomer.address && <p><span className="text-muted-foreground">Address:</span> {viewCustomer.address}</p>}
              {viewCustomer.notes && <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><span className="font-medium text-amber-800">Notes: </span><span className="text-amber-700">{viewCustomer.notes}</span></p>}
              {viewCustomer.created_at && <p className="text-xs text-muted-foreground">Member since {new Date(viewCustomer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
              {customerBills.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Bills</p>
                  <div className="space-y-1">
                    {customerBills.map(b => (
                      <div key={b.id} className="flex justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{b.bill_number}</span>
                        <span>₹{b.total_amount.toFixed(0)}</span>
                        <span className={b.status === 'paid' ? 'text-green-600' : 'text-amber-600'}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-muted rounded p-3"><p className="font-bold text-lg">{viewCustomer.visit_count}</p><p className="text-muted-foreground text-xs">Visits</p></div>
                <div className="bg-muted rounded p-3"><p className="font-bold text-lg">₹{viewCustomer.total_spent.toFixed(0)}</p><p className="text-muted-foreground text-xs">Spent</p></div>
                <div className="bg-muted rounded p-3"><p className="font-bold text-lg">{viewCustomer.loyalty_points}</p><p className="text-muted-foreground text-xs">Points</p></div>
              </div>
              {customerFeedback.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Feedback</p>
                  <div className="space-y-2">
                    {customerFeedback.map(f => (
                      <div key={f.id} className="bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`w-3 h-3 ${n <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />)}
                          {f.bill_number && <span className="text-xs text-muted-foreground ml-1">· {f.bill_number}</span>}
                        </div>
                        {f.comment && <p className="text-xs mt-1 text-foreground">{f.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!loyaltyTarget} onOpenChange={() => setLoyaltyTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{loyaltyMode === 'add' ? 'Add' : 'Redeem'} Loyalty Points — {loyaltyTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current balance: <strong>{loyaltyTarget?.loyalty_points} pts</strong></p>
            <div><Label>Points</Label><Input type="number" min="1" value={loyaltyPoints} onChange={e => setLoyaltyPoints(e.target.value)} /></div>
            {loyaltyMode === 'add' && (
              <div><Label>Bill Amount (₹)</Label><Input type="number" min="0" value={loyaltyBillAmt} onChange={e => setLoyaltyBillAmt(e.target.value)} /></div>
            )}
            <Button className="w-full gradient-spice text-white" onClick={submitLoyalty}>
              {loyaltyMode === 'add' ? 'Add Points' : 'Redeem Points'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes / Preferences</Label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. allergic to peanuts, prefers window seat" className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Save Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
