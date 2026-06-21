'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Star, TrendingUp, Users, Download, Merge, Award, ShoppingBag, DollarSign } from 'lucide-react'
import { CustomerOrderHistory } from '@/components/customers/order-history'
import { CustomerProfitability } from '@/components/customers/profitability'

interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  loyalty_points: number
  total_spent: number
  visit_count: number
  created_at?: string
  segment?: string
  days_since_visit?: number | null
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
  const [segment, setSegment] = useState<'all' | 'vip' | 'loyal' | 'regular' | 'new' | 'at_risk'>('all')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [loyaltyData, setLoyaltyData] = useState<{
    total_earned: number; total_redeemed: number; active_members: number; total_transactions: number
    outstanding_points: number; members_with_points: number
    top_earners: { id: number; name: string; loyalty_points: number; total_spent: number }[]
    monthly_trend: { month: string; earned: number; redeemed: number }[]
  } | null>(null)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Customer | null>(null)
  const [mergeSource, setMergeSource] = useState<Customer | null>(null)
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState<{ id: number; name: string } | null>(null)
  const [showProfitability, setShowProfitability] = useState(false)
  const [analytics, setAnalytics] = useState<{
    top_spenders: { id: number; name: string; phone?: string; total_spent: number; visit_count: number; avg_order_value: number }[]
    returning_customers: number; at_risk_customers: number; retention_rate: number; churn_rate: number
    ltv_distribution: { zero: number; low_under_500: number; mid_500_2000: number; high_2000_10000: number; vip_over_10000: number }
    monthly_acquisition: { month: string; new_customers: number }[]
  } | null>(null)

  const loadLoyaltyAnalytics = async () => {
    const res = await invoke<{ success: boolean; data: typeof loyaltyData }>('get_loyalty_analytics', { days: 30 }).catch(() => null)
    if (res?.success && res.data) setLoyaltyData(res.data)
  }

  const loadAnalytics = async () => {
    const res = await invoke<{ success: boolean; data: typeof analytics }>('get_customer_analytics').catch(() => null)
    if (res?.success && res.data) setAnalytics(res.data)
  }

  const handleMerge = async () => {
    if (!mergeTarget || !mergeSource) return
    if (!window.confirm(`Merge "${mergeSource.name}" into "${mergeTarget.name}"? This will move all orders, bills, and loyalty points to "${mergeTarget.name}" and delete "${mergeSource.name}". This cannot be undone.`)) return
    try {
      await invoke('merge_customers', { targetId: mergeTarget.id, sourceId: mergeSource.id })
      setShowMerge(false); setMergeTarget(null); setMergeSource(null)
      loadCustomers()
    } catch (e) { console.error(e) }
  }

  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({})

  const getSegment = (c: Customer) => c.segment ?? (c.total_spent >= 10000 ? 'vip' : c.total_spent >= 5000 || c.visit_count >= 6 ? 'loyal' : c.visit_count >= 2 ? 'regular' : 'new')
  const SEGMENT_LABEL: Record<string, string> = { vip: 'VIP', loyal: 'Loyal', regular: 'Regular', new: 'New', at_risk: 'At Risk' }
  const SEGMENT_COLOR: Record<string, string> = { vip: 'bg-amber-100 text-amber-800', loyal: 'bg-purple-100 text-purple-800', regular: 'bg-blue-100 text-blue-800', new: 'bg-green-100 text-green-800', at_risk: 'bg-red-100 text-red-700' }

  const loadCustomers = useCallback(async () => {
    try {
      if (!search) {
        const res = await invoke<{ success: boolean; data: Customer[]; counts: Record<string, number> }>('get_customer_segments')
        if (res.success) { setCustomers(res.data); setSegmentCounts(res.counts ?? {}) }
      } else {
        const res = await invoke<{ success: boolean; data: Customer[] }>('get_customers', { search, limit: 100 })
        if (res.success) setCustomers(res.data)
      }
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
  const [loyaltyHistory, setLoyaltyHistory] = useState<{ id: number; type: string; points: number; bill_amount?: number; note?: string; created_at: string }[]>([])

  const viewProfile = async (id: number) => {
    try {
      const [cr, br, fr, lr] = await Promise.all([
        invoke<{ success: boolean; data: Customer & { address?: string; notes?: string } }>('get_customer', { customerId: id }),
        invoke<{ success: boolean; data: { id: number; bill_number: string; total_amount: number; status: string; created_at: string; customer_id?: number }[] }>('get_bills', { status: null, customerId: id, limit: 20 }),
        invoke<{ success: boolean; data: { id: number; rating: number; comment?: string; created_at: string; bill_number?: string }[] }>('get_customer_feedback', { customerId: id }).catch(() => ({ success: false, data: [] })),
        invoke<{ success: boolean; data: { id: number; type: string; points: number; bill_amount?: number; note?: string; created_at: string }[] }>('get_loyalty_transactions', { customerId: id }).catch(() => ({ success: false, data: [] })),
      ])
      if (cr.success && cr.data) setViewCustomer(cr.data)
      if (br.success) setCustomerBills(br.data ?? [])
      if (fr.success) setCustomerFeedback(fr.data ?? [])
      if (lr.success) setLoyaltyHistory(lr.data ?? [])
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
  const sorted = [...customers].filter(c => segment === 'all' || getSegment(c) === segment).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)).sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : b[sortBy] - a[sortBy])

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

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={showAnalytics ? 'default' : 'outline'} onClick={() => { setShowAnalytics(s => !s); if (!analytics) loadAnalytics() }}>
          <TrendingUp className="w-4 h-4 mr-1" />Analytics
        </Button>
        <Button size="sm" variant={showLoyalty ? 'default' : 'outline'} onClick={() => { setShowLoyalty(s => !s); if (!loyaltyData) loadLoyaltyAnalytics() }}>
          <Award className="w-4 h-4 mr-1" />Loyalty
        </Button>
        <Button size="sm" variant={showProfitability ? 'default' : 'outline'} onClick={() => setShowProfitability(s => !s)}>
          <DollarSign className="w-4 h-4 mr-1" />Profitability
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowMerge(true)}>
          <Merge className="w-4 h-4 mr-1" />Merge Duplicates
        </Button>
      </div>

      {showProfitability && <CustomerProfitability />}

      {showLoyalty && loyaltyData && (
        <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2"><Award className="w-4 h-4" />Loyalty Program (30 days)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Points Earned', loyaltyData.total_earned.toLocaleString()],
              ['Points Redeemed', loyaltyData.total_redeemed.toLocaleString()],
              ['Active Members', loyaltyData.active_members.toString()],
              ['Outstanding', loyaltyData.outstanding_points.toLocaleString() + ' pts'],
            ].map(([label, val]) => (
              <div key={label} className="border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{val}</p>
              </div>
            ))}
          </div>
          {loyaltyData.top_earners.length > 0 && (
            <div className="border rounded-lg p-3 bg-card">
              <p className="text-sm font-medium mb-2">Top Point Holders</p>
              {loyaltyData.top_earners.map(e => (
                <div key={e.id} className="flex justify-between text-sm py-1">
                  <span>{e.name}</span>
                  <span className="font-medium">{e.loyalty_points.toLocaleString()} pts · ₹{e.total_spent.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          {loyaltyData.monthly_trend.length > 0 && (
            <div className="border rounded-lg p-3 bg-card">
              <p className="text-sm font-medium mb-2">Monthly Trend</p>
              {loyaltyData.monthly_trend.map(m => (
                <div key={m.month} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span className="text-green-600">+{m.earned}</span>
                  <span className="text-red-500">-{m.redeemed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAnalytics && analytics && (
        <div className="space-y-4 p-4 border rounded-xl bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Retention Rate', value: `${analytics.retention_rate}%`, sub: `${analytics.returning_customers} returning` },
              { label: 'Churn Risk', value: `${analytics.churn_rate}%`, sub: `${analytics.at_risk_customers} at risk (30d)` },
              { label: 'LTV ≥₹2000', value: (analytics.ltv_distribution.high_2000_10000 + analytics.ltv_distribution.vip_over_10000).toString(), sub: 'high-value customers' },
              { label: 'VIP (≥₹10k)', value: analytics.ltv_distribution.vip_over_10000.toString(), sub: 'total spent >₹10,000' },
            ].map(m => (
              <div key={m.label} className="bg-card rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">LTV Distribution</p>
              <div className="space-y-1.5">
                {[
                  { label: 'No spend', count: analytics.ltv_distribution.zero, color: 'bg-gray-300' },
                  { label: '< ₹500', count: analytics.ltv_distribution.low_under_500, color: 'bg-blue-300' },
                  { label: '₹500–₹2000', count: analytics.ltv_distribution.mid_500_2000, color: 'bg-green-400' },
                  { label: '₹2k–₹10k', count: analytics.ltv_distribution.high_2000_10000, color: 'bg-amber-400' },
                  { label: '> ₹10k', count: analytics.ltv_distribution.vip_over_10000, color: 'bg-purple-500' },
                ].map(b => {
                  const total = Object.values(analytics.ltv_distribution).reduce((a, v) => a + v, 0)
                  return (
                    <div key={b.label} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-muted-foreground shrink-0">{b.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${b.color}`} style={{ width: total > 0 ? `${(b.count / total * 100).toFixed(0)}%` : '0%' }} /></div>
                      <span className="w-6 text-right text-muted-foreground">{b.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Top Spenders</p>
              <div className="space-y-1">
                {analytics.top_spenders.slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 font-medium truncate">{c.name}</span>
                    <span className="text-muted-foreground">{c.visit_count}v</span>
                    <span className="font-semibold text-green-700">₹{c.total_spent.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex gap-1 flex-wrap">
          {(['all', 'vip', 'loyal', 'regular', 'new', 'at_risk'] as const).map(s => {
            const count = s === 'all' ? customers.length : (segmentCounts[s] ?? 0)
            return (
              <button key={s} onClick={() => setSegment(s)} className={`text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${segment === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {s === 'all' ? 'All' : SEGMENT_LABEL[s]}
                {count > 0 && <span className={`text-[10px] font-semibold px-1 rounded-full ${segment === s ? 'bg-white/20' : 'bg-muted'}`}>{count}</span>}
              </button>
            )
          })}
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
              {c.days_since_visit != null && (
                <p className={`text-xs mt-2 ${c.days_since_visit > 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  Last visit: {c.days_since_visit === 0 ? 'today' : `${c.days_since_visit}d ago`}
                </p>
              )}
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => viewProfile(c.id)}>View</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(c)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => openLoyalty(c, 'add')}><Star className="w-3 h-3 mr-1" />+Pts</Button>
                <Button variant="outline" size="sm" onClick={() => openLoyalty(c, 'redeem')}>Redeem</Button>
                <Button variant="outline" size="sm" onClick={() => setOrderHistoryCustomer({ id: c.id, name: c.name })}><ShoppingBag className="w-3 h-3 mr-1" />Orders</Button>
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
              {loyaltyHistory.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Loyalty History</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {loyaltyHistory.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'earn' || tx.type === 'manual_add' ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="capitalize text-muted-foreground">{tx.type.replace('_', ' ')}</span>
                          {tx.bill_amount != null && <span className="text-muted-foreground">· ₹{tx.bill_amount.toFixed(0)}</span>}
                          {tx.note && <span className="text-muted-foreground">· {tx.note}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${tx.type === 'earn' || tx.type === 'manual_add' ? 'text-green-600' : 'text-red-500'}`}>
                            {tx.type === 'earn' || tx.type === 'manual_add' ? '+' : '-'}{tx.points}
                          </span>
                          <span className="text-muted-foreground">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      <Dialog open={showMerge} onOpenChange={v => { if (!v) { setShowMerge(false); setMergeTarget(null); setMergeSource(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Merge Duplicate Customers</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select two customers to merge. All orders, bills, and loyalty points from the source will be moved to the target.</p>
            <div>
              <Label>Keep (Target)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={mergeTarget?.id ?? ''} onChange={e => setMergeTarget(customers.find(c => c.id === Number(e.target.value)) ?? null)}>
                <option value="">Select customer to keep...</option>
                {customers.filter(c => c.id !== mergeSource?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Merge &amp; Delete (Source)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={mergeSource?.id ?? ''} onChange={e => setMergeSource(customers.find(c => c.id === Number(e.target.value)) ?? null)}>
                <option value="">Select customer to merge away...</option>
                {customers.filter(c => c.id !== mergeTarget?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            </div>
            {mergeTarget && mergeSource && (
              <div className="border rounded-lg p-3 bg-muted/30 text-sm space-y-1">
                <p><strong>{mergeSource.name}</strong> → <strong>{mergeTarget.name}</strong></p>
                <p className="text-muted-foreground">Points: {mergeSource.loyalty_points ?? 0} will be added to {mergeTarget.loyalty_points ?? 0}</p>
                <p className="text-muted-foreground">Visits: {mergeSource.visit_count ?? 0} + {mergeTarget.visit_count ?? 0}</p>
              </div>
            )}
            <Button className="w-full" disabled={!mergeTarget || !mergeSource} onClick={handleMerge}>
              Merge Customers
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {orderHistoryCustomer && (
        <CustomerOrderHistory
          customerId={orderHistoryCustomer.id}
          customerName={orderHistoryCustomer.name}
          open={true}
          onClose={() => setOrderHistoryCustomer(null)}
        />
      )}
    </div>
  )
}
