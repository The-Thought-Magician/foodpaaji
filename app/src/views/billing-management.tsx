'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, IndianRupee, Receipt, TrendingUp, Eye } from 'lucide-react'

interface Bill {
  id: number
  bill_number: string
  table_number?: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  status: string
  created_at: string
}

interface BillItem {
  item_name: string
  quantity: number
  unit_price: number
  discount_amount: number
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-yellow-100 text-yellow-700',
}

export function BillingManagement() {
  const [bills, setBills] = useState<Bill[]>([])
  const [summary, setSummary] = useState({ today_bills: 0, today_revenue: 0, today_collected: 0 })
  const [showNewBill, setShowNewBill] = useState(false)
  const [showPayment, setShowPayment] = useState<Bill | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [items, setItems] = useState<BillItem[]>([{ item_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }])
  const [tableNumber, setTableNumber] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(5)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [upiRef, setUpiRef] = useState('')

  const loadBills = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Bill[] }>('get_bills', { status: filterStatus, limit: 50 })
      if (res.success) setBills(res.data)
    } catch (e) { console.error(e) }
  }, [filterStatus])

  const loadSummary = async () => {
    try {
      const res = await invoke<{ success: boolean; data: typeof summary }>('get_billing_summary')
      if (res.success) setSummary(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadBills(); loadSummary() }, [loadBills])

  const addItem = () => setItems([...items, { item_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }])
  const updateItem = (i: number, field: keyof BillItem, value: string | number) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  const subtotal = items.reduce((s, i) => s + (i.unit_price * i.quantity) - i.discount_amount, 0)
  const discountAmt = subtotal * discountPercent / 100
  const taxAmt = (subtotal - discountAmt) * taxPercent / 100
  const total = subtotal - discountAmt + taxAmt

  const createBill = async () => {
    try {
      await invoke('create_bill', {
        request: { customer_id: null, table_number: tableNumber || null, items, discount_percent: discountPercent, tax_percent: taxPercent, notes: null }
      })
      setShowNewBill(false)
      setItems([{ item_name: '', quantity: 1, unit_price: 0, discount_amount: 0 }])
      setTableNumber('')
      loadBills(); loadSummary()
    } catch (e) { console.error(e) }
  }

  const recordPayment = async () => {
    if (!showPayment) return
    try {
      await invoke('record_payment', { billId: showPayment.id, amount: parseFloat(payAmount), method: payMethod, upiReference: upiRef || null, upiApp: null })
      setShowPayment(null)
      loadBills(); loadSummary()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today's Bills", value: summary.today_bills, icon: FileText, format: (v: number) => v.toString() },
          { label: "Today's Revenue", value: summary.today_revenue, icon: IndianRupee, format: (v: number) => `₹${v.toFixed(0)}` },
          { label: "Collected", value: summary.today_collected, icon: TrendingUp, format: (v: number) => `₹${v.toFixed(0)}` },
        ].map(s => (
          <Card key={s.label} className="stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 gradient-spice rounded-lg"><s.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.format(s.value)}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'open', 'paid', 'cancelled'].map(s => (
            <Button key={s} variant={filterStatus === (s === 'all' ? null : s) ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterStatus(s === 'all' ? null : s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowNewBill(true)} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />New Bill</Button>
      </div>

      <div className="space-y-2">
        {bills.map(bill => (
          <Card key={bill.id} className="card-hover">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{bill.bill_number}</p>
                  <p className="text-sm text-muted-foreground">{bill.table_number ? `Table ${bill.table_number}` : 'Takeaway'} · {new Date(bill.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">₹{bill.total_amount.toFixed(2)}</span>
                <Badge className={STATUS_COLOR[bill.status] || ''}>{bill.status}</Badge>
                {bill.status === 'open' && (
                  <Button size="sm" onClick={() => { setShowPayment(bill); setPayAmount(bill.total_amount.toFixed(2)) }}>
                    <Eye className="w-4 h-4 mr-1" />Pay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {bills.length === 0 && <p className="text-center text-muted-foreground py-12">No bills found</p>}
      </div>

      <Dialog open={showNewBill} onOpenChange={setShowNewBill}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Table Number</Label><Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g. T1" /></div>
            <div className="space-y-2">
              <Label>Items</Label>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4" placeholder="Item name" value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                  <Input className="col-span-3" type="number" placeholder="Price" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  <Input className="col-span-2" type="number" placeholder="Disc" value={item.discount_amount} onChange={e => updateItem(i, 'discount_amount', parseFloat(e.target.value) || 0)} />
                  <Button variant="ghost" size="sm" className="col-span-1" onClick={() => removeItem(i)}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Discount %</Label><Input type="number" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Tax %</Label><Input type="number" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-₹{discountAmt.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax ({taxPercent}%)</span><span>₹{taxAmt.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>
            <Button className="w-full gradient-spice text-white" onClick={createBill}>Create Bill</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {showPayment?.bill_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-lg font-bold">Total: ₹{showPayment?.total_amount.toFixed(2)}</p>
            <div><Label>Amount</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={(v: string | null) => setPayMethod(v ?? 'cash')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash', 'upi', 'card', 'wallet', 'credit'].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {payMethod === 'upi' && <div><Label>UPI Reference</Label><Input value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="Transaction ID" /></div>}
            <Button className="w-full gradient-spice text-white" onClick={recordPayment}>Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
