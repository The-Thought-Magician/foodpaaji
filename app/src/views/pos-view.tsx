'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Minus, Trash2, ShoppingCart, Receipt, Tag, Clock } from 'lucide-react'
import { MenuPicker } from '@/components/pos/menu-picker'
import { CustomerPicker, type Customer } from '@/components/pos/customer-picker'
import { TableStatusBoard } from '@/components/pos/table-status-board'
import { getSettings } from '@/lib/settings'
import { UpiQr } from '@/components/ui/upi-qr'

interface CartItem {
  item_name: string
  quantity: number
  unit_price: number
  menu_item_id?: number
  notes?: string
}
interface Order {
  id: number
  order_number: string
  table_number?: string
  order_type?: string
  status: string
  notes?: string
  created_at: string
  customer_id?: number
}
interface CouponResult { valid: boolean; coupon_id?: number; discount_amount?: number; final_amount?: number; error?: string }
interface PromoResult { valid: boolean; promo_id?: number; discount_type?: string; discount_value?: number; discount_amount?: number; message?: string }

const elapsed = (iso: string) => { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago` }
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  served: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}
export function PosView() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableNumber, setTableNumber] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in')
  const [tables, setTables] = useState<{ id: number; table_number: string; capacity: number }[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<CouponResult | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promo, setPromo] = useState<PromoResult | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showReceipt, setShowReceipt] = useState<{ id: number; content: string; number: string } | null>(null)
  const [orderDetail, setOrderDetail] = useState<{ order_number: string; table_number?: string; status: string; notes?: string; items: { item_name: string; quantity: number; unit_price: number; menu_item_id?: number; notes?: string }[] } | null>(null)
  const viewOrderDetails = async (orderId: number) => { try { const res = await invoke<{ success: boolean; data: typeof orderDetail }>('get_order_details', { orderId }); if (res.success && res.data) setOrderDetail(res.data) } catch (e) { console.error(e) } }
  const [showConvert, setShowConvert] = useState<Order | null>(null)
  const [convertSubtotal, setConvertSubtotal] = useState(0)
  const openConvert = async (order: Order) => {
    setShowConvert(order)
    setConvertSubtotal(0)
    try {
      const res = await invoke<{ success: boolean; data: { items: { quantity: number; unit_price: number }[] } | null }>('get_order_details', { orderId: order.id })
      if (res.success && res.data) {
        setConvertSubtotal(res.data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0))
      }
    } catch (e) { console.error(e) }
  }
  const [taxPercent, setTaxPercent] = useState(() => getSettings().default_tax_percent)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash')
  const [splitPayments, setSplitPayments] = useState<{ method: 'cash' | 'upi' | 'card'; amount: string }[]>([])
  const [splitMode, setSplitMode] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState<boolean | 'tables'>(false)
  const loadOrders = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Order[] }>('get_orders', { status: null, limit: 20 })
      if (res.success) setOrders(res.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    loadOrders()
    const t = setInterval(loadOrders, 30000)
    return () => clearInterval(t)
  }, [loadOrders])
  useEffect(() => { invoke<{ success: boolean; data: typeof tables }>('get_tables', { restaurantId: 1 }).then(r => { if (r.success) setTables(r.data) }).catch(() => {}) }, [])
  const searchCustomers = async (q: string) => {
    setCustomerSearch(q)
    if (!q.trim()) { setCustomerResults([]); return }
    const res = await invoke<{ success: boolean; data?: Customer[] }>('get_customers', { search: q, limit: 5 }).catch(() => null)
    if (res?.success && res.data) setCustomerResults(res.data)
  }
  const addItem = () => setCart([...cart, { item_name: '', quantity: 1, unit_price: 0 }])
  const updateCartItem = (i: number, field: keyof CartItem, value: string | number) => setCart(cart.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  const removeCartItem = (i: number) => setCart(cart.filter((_, idx) => idx !== i))
  const changeQty = (i: number, delta: number) => { const qty = cart[i].quantity + delta; if (qty <= 0) removeCartItem(i); else updateCartItem(i, 'quantity', qty) }

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const couponDiscount = coupon?.valid ? (coupon.discount_amount ?? 0) : 0
  const promoDiscount = promo?.valid ? (promo.discount_amount ?? 0) : 0
  const taxable = subtotal - couponDiscount - promoDiscount
  const validatePromo = async () => { if (!promoCode.trim()) return; try { setPromo(await invoke<PromoResult>('validate_promo_code', { code: promoCode, orderAmount: subtotal })) } catch (e) { console.error(e) } }
  const serviceChargePct = getSettings().service_charge_percent
  const pkgFee = (orderType === 'takeaway' || orderType === 'delivery') ? (getSettings().packaging_fee ?? 0) : 0
  const taxAmt = taxable * taxPercent / 100
  const serviceChargeAmt = taxable * serviceChargePct / 100
  const total = taxable + taxAmt + serviceChargeAmt + pkgFee
  const validateCoupon = async () => { if (!couponCode.trim()) return; try { setCoupon(await invoke<CouponResult>('validate_coupon', { code: couponCode, orderAmount: subtotal })) } catch (e) { console.error(e) } }

  const placeOrder = async () => {
    if (cart.length === 0 || cart.some(i => !i.item_name)) return
    try {
      const stockItems = cart.filter(i => i.menu_item_id).map(i => ({ menu_item_id: i.menu_item_id!, quantity: i.quantity, notes: i.notes ?? null }))
      if (stockItems.length > 0) {
        const sv = await invoke<{ success: boolean; data?: { item_name: string; shortage: number }[] }>('validate_stock_availability', { request: { restaurant_id: 1, order_items: stockItems } }).catch(() => null)
        if (sv?.success && sv.data && sv.data.length > 0) {
          const msg = sv.data.map(s => `${s.item_name} (short ${s.shortage.toFixed(1)})`).join(', ')
          if (!confirm(`Low stock warning: ${msg}. Place order anyway?`)) return
        }
      }
      if (coupon?.valid && coupon.coupon_id) await invoke('apply_coupon', { couponId: coupon.coupon_id })
      if (promo?.valid && promo.promo_id) await invoke('apply_promo', { promoId: promo.promo_id })
      await invoke('create_order', { request: { customer_id: selectedCustomer?.id ?? null, table_number: tableNumber || null, order_type: orderType, items: cart, notes: orderNotes || null } })
      setCart([]); setTableNumber(''); setOrderType('dine_in'); setOrderNotes(''); setCouponCode(''); setCoupon(null); setPromoCode(''); setPromo(null); setSelectedCustomer(null); setCustomerSearch(''); setCustomerResults([]); loadOrders()
    } catch (e) { console.error(e) }
  }

  const updateStatus = async (orderId: number, status: string) => { try { await invoke('update_order_status', { orderId, status }); loadOrders() } catch (e) { console.error(e) } }
  const convertToBill = async () => {
    if (!showConvert) return
    try {
      const [details, res] = await Promise.all([
        invoke<{ success: boolean; data: { items: { item_name: string; quantity: number; unit_price: number; menu_item_id?: number; notes?: string }[] } | null }>('get_order_details', { orderId: showConvert.id }),
        invoke<{ success: boolean; bill_id: number; total_amount: number }>('convert_order_to_bill', { orderId: showConvert.id, discountPercent, taxPercent: taxPercent + serviceChargePct, packagingFee: pkgFee > 0 ? pkgFee : null }),
      ])
      if (res.success) {
        if (splitMode && splitPayments.length > 0) {
          await Promise.all(splitPayments.map(p => invoke('record_payment', { billId: res.bill_id, amount: parseFloat(p.amount) || 0, method: p.method, upiReference: null, upiApp: null }).catch(console.error)))
        } else {
          await invoke('record_payment', { billId: res.bill_id, amount: res.total_amount, method: paymentMethod, upiReference: null, upiApp: null }).catch(console.error)
        }
        const s = getSettings(); const receipt = await invoke<{ success: boolean; data: { receipt_id: number; content: string; receipt_number: string } }>('generate_receipt', { billId: res.bill_id, restaurantName: s.restaurant_name, address: s.address, phone: s.phone, gstin: s.gstin, fssaiNumber: s.fssai_number || null, footer: s.receipt_footer })
        if (receipt.success) setShowReceipt({ id: receipt.data.receipt_id, content: receipt.data.content, number: receipt.data.receipt_number })
        const orderItems = (details.success && details.data?.items || []).filter(i => i.menu_item_id).map(i => ({ menu_item_id: i.menu_item_id!, quantity: i.quantity, notes: i.notes ?? null }))
        if (orderItems.length > 0) await invoke('process_order_completion', { request: { restaurant_id: 1, order_id: showConvert.id, order_items: orderItems, user_id: 1 } }).catch(console.error)
        if (showConvert.customer_id) { if (redeemPoints && selectedCustomer?.loyalty_points) await invoke('redeem_loyalty_points', { customerId: showConvert.customer_id, points: selectedCustomer.loyalty_points, billId: res.bill_id }).catch(console.error); const loyaltyRate = getSettings().loyalty_points_per_100; const pts = Math.floor(res.total_amount * loyaltyRate / 100); if (pts > 0) invoke('add_loyalty_points', { customerId: showConvert.customer_id, points: pts, billAmount: res.total_amount }).catch(console.error) }
        setRedeemPoints(false); setSplitPayments([]); setSplitMode(false); setShowConvert(null); loadOrders()
      }
    } catch (e) { console.error(e) }
  }
  const addFromMenu = (item: { menu_item_id: number; item_name: string; unit_price: number }) => {
    const existing = cart.findIndex(c => c.menu_item_id === item.menu_item_id)
    if (existing >= 0) {
      changeQty(existing, 1)
    } else {
      setCart(prev => [...prev, { ...item, quantity: 1 }])
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-120px)]">
      <div className="flex flex-col overflow-hidden border border-border rounded-xl p-3">
        <h3 className="font-semibold text-sm mb-2">Menu</h3>
        <MenuPicker onAdd={addFromMenu} />
      </div>

      <div className="flex flex-col space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Cart</h3>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Custom</Button>
        </div>

        <CustomerPicker
          selected={selectedCustomer} results={customerResults} search={customerSearch}
          onSearch={searchCustomers}
          onSelect={c => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]) }}
          onClear={() => { setSelectedCustomer(null); setCustomerSearch('') }}
        />
        <div className="flex gap-1 mb-2">
          {(['dine_in', 'takeaway', 'delivery'] as const).map(t => (
            <button key={t} onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${orderType === t ? 'gradient-spice text-white border-transparent' : 'border-border hover:bg-muted'}`}>
              {t === 'dine_in' ? 'Dine-in' : t === 'takeaway' ? 'Takeaway' : 'Delivery'}
            </button>
          ))}
        </div>
        {orderType === 'dine_in' && (tables.length > 0 ? <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={tableNumber} onChange={e => setTableNumber(e.target.value)}><option value="">No table selected</option>{tables.map(t => <option key={t.id} value={t.table_number}>{t.table_number} (cap {t.capacity})</option>)}</select> : <Input placeholder="Table number (e.g. T1)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />)}
        <Input placeholder="Order notes (e.g. no onion, extra spicy)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />

        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.map((item, i) => (
            <Card key={i} className="p-3 space-y-1.5">
              <Input placeholder="Item name" value={item.item_name} onChange={e => updateCartItem(i, 'item_name', e.target.value)} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => changeQty(i, -1)}><Minus className="w-3 h-3" /></Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button variant="outline" size="sm" onClick={() => changeQty(i, 1)}><Plus className="w-3 h-3" /></Button>
                <Input className="flex-1" type="number" placeholder="Price" value={item.unit_price || ''} onChange={e => updateCartItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                <span className="text-sm font-medium w-16 text-right">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                <Button variant="ghost" size="sm" onClick={() => removeCartItem(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
              <Input className="text-xs h-7" placeholder="Item note (e.g. no garlic)" value={item.notes ?? ''} onChange={e => updateCartItem(i, 'notes', e.target.value)} />
            </Card>
          ))}
          {cart.length === 0 && <p className="text-center text-muted-foreground py-8">Cart empty — add items above</p>}
        </div>

        <div className="space-y-3 border-t pt-3">
          <div className="flex gap-2">
            <Input placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
            <Button variant="outline" onClick={validateCoupon}><Tag className="w-4 h-4" /></Button>
          </div>
          {coupon && (
            <p className={`text-sm ${coupon.valid ? 'text-green-600' : 'text-red-500'}`}>
              {coupon.valid ? `Coupon applied — saves ₹${coupon.discount_amount?.toFixed(2)}` : coupon.error}
            </p>
          )}
          <div className="flex gap-2">
            <Input placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
            <Button variant="outline" onClick={validatePromo}><Tag className="w-4 h-4" /></Button>
          </div>
          {promo && (
            <p className={`text-sm ${promo.valid ? 'text-green-600' : 'text-red-500'}`}>
              {promo.valid ? `Promo applied — saves ₹${promo.discount_amount?.toFixed(2)}` : promo.message}
            </p>
          )}
          <div className="flex gap-2">
            <div className="flex-1"><Label className="text-xs">Tax %</Label><Input type="number" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} /></div>
            <div className="flex-1"><Label className="text-xs">Disc %</Label><Input type="number" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>-₹{couponDiscount.toFixed(2)}</span></div>}
            {promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Promo</span><span>-₹{promoDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span>Tax ({taxPercent}%)</span><span>₹{taxAmt.toFixed(2)}</span></div>
            {serviceChargeAmt > 0 && <div className="flex justify-between"><span>Service Charge ({serviceChargePct}%)</span><span>₹{serviceChargeAmt.toFixed(2)}</span></div>}
            {pkgFee > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span>₹{pkgFee.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>
          <Button className="w-full gradient-spice text-white" onClick={placeOrder} disabled={cart.length === 0}>Place Order</Button>
        </div>
      </div>

      <div className="flex flex-col space-y-4 overflow-hidden">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{showAllOrders === 'tables' ? 'Table Status' : showAllOrders ? 'All Orders' : 'Active Orders'}</h3><div className="flex gap-2 text-xs"><button className={`${showAllOrders === 'tables' ? 'text-primary font-medium' : 'text-muted-foreground'} hover:text-foreground`} onClick={() => setShowAllOrders('tables')}>Tables</button><button className={`${showAllOrders !== 'tables' ? 'text-primary font-medium' : 'text-muted-foreground'} hover:text-foreground`} onClick={() => setShowAllOrders(v => v === 'tables' ? false : !v)}>{showAllOrders === true ? 'Active only' : 'Show all'}</button></div></div>
        {showAllOrders === 'tables' && <div className="flex-1 overflow-y-auto"><TableStatusBoard /></div>}
        <div className={`flex-1 overflow-y-auto space-y-2 ${showAllOrders === 'tables' ? 'hidden' : ''}`}>
          {(showAllOrders ? orders : orders.filter(o => o.status !== 'served' && o.status !== 'cancelled')).map(order => (
            <Card key={order.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className={`inline-block text-xs rounded px-1 mr-1 ${order.order_type === 'delivery' ? 'bg-purple-100 text-purple-700' : order.order_type === 'takeaway' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'takeaway' ? 'Takeaway' : 'Dine-in'}
                      </span>
                      {order.table_number && `T${order.table_number} · `}<Clock className="inline w-3 h-3 mb-0.5" /> {elapsed(order.created_at)}
                    </p>
                    {order.notes && <p className="text-xs text-amber-600 mt-0.5">{order.notes}</p>}
                  </div>
                  <Badge className={STATUS_COLOR[order.status] || ''}>{order.status}</Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {order.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'preparing')}>Preparing</Button>}
                  {order.status === 'preparing' && <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'ready')}>Ready</Button>}
                  {order.status === 'ready' && <Button size="sm" className="gradient-spice text-white" onClick={() => openConvert(order)}><Receipt className="w-4 h-4 mr-1" />Bill</Button>}
                  <Button size="sm" variant="ghost" onClick={() => viewOrderDetails(order.id)}>Details</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(order.id, 'cancelled')}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(showAllOrders ? orders : orders.filter(o => o.status !== 'served' && o.status !== 'cancelled')).length === 0 && <p className="text-center text-muted-foreground py-8">No orders</p>}
        </div>
      </div>

      <Dialog open={!!orderDetail} onOpenChange={() => setOrderDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order — {orderDetail?.order_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{orderDetail?.table_number ? `Table ${orderDetail.table_number}` : 'Takeaway'} · {orderDetail?.status}</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {orderDetail?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{item.item_name} × {item.quantity}</span><span>₹{(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          {orderDetail?.items && <div className="flex justify-between font-semibold text-sm border-t pt-2"><span>Total</span><span>₹{orderDetail.items.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(0)}</span></div>}
          {orderDetail?.notes && <p className="text-xs text-muted-foreground">{orderDetail.notes}</p>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!showConvert} onOpenChange={() => setShowConvert(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convert to Bill — {showConvert?.order_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Discount %</Label><Input type="number" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Tax %</Label><Input type="number" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Payment</Label>
                <button type="button" className="text-xs text-primary underline" onClick={() => { setSplitMode(s => !s); setSplitPayments([]) }}>{splitMode ? 'Single payment' : 'Split payment'}</button>
              </div>
              {!splitMode ? (
                <>
                  <div className="flex gap-2">
                    {(['cash', 'upi', 'card'] as const).map(m => <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize ${paymentMethod === m ? 'gradient-spice text-white border-transparent' : 'border-border hover:bg-muted'}`}>{m}</button>)}
                  </div>
                  {paymentMethod === 'upi' && (() => { const s = getSettings(); const taxable = convertSubtotal * (1 - discountPercent / 100); const amt = taxable * (1 + (taxPercent + s.service_charge_percent) / 100) + pkgFee; return s.upi_id ? <div className="flex justify-center pt-2"><UpiQr amount={amt} upiId={s.upi_id} name={s.restaurant_name} note={showConvert?.order_number} size={160} /></div> : null })()}
                </>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const s = getSettings(); const taxable = convertSubtotal * (1 - discountPercent / 100); const total = taxable * (1 + (taxPercent + s.service_charge_percent) / 100) + pkgFee
                    const paid = splitPayments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0)
                    const remaining = Math.max(0, total - paid)
                    return (
                      <>
                        {splitPayments.map((p, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <select className="text-xs border rounded px-2 py-1.5 bg-background capitalize"
                              value={p.method} onChange={e => setSplitPayments(prev => prev.map((x, j) => j === i ? { ...x, method: e.target.value as typeof p.method } : x))}>
                              {['cash', 'upi', 'card'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Input type="number" step="0.01" min="0" placeholder="Amount" className="flex-1 h-8 text-sm"
                              value={p.amount} onChange={e => setSplitPayments(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                            <button type="button" className="text-destructive text-xs px-1" onClick={() => setSplitPayments(prev => prev.filter((_, j) => j !== i))}>×</button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button type="button" className="text-xs text-primary underline" onClick={() => setSplitPayments(p => [...p, { method: 'cash', amount: remaining > 0 ? remaining.toFixed(2) : '' }])}>+ Add method</button>
                          <span className="text-xs text-muted-foreground ml-auto">Paid: ₹{paid.toFixed(0)} · Remaining: ₹{remaining.toFixed(0)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            {selectedCustomer?.loyalty_points ? <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={redeemPoints} onChange={e => setRedeemPoints(e.target.checked)} /><span>Redeem {selectedCustomer.loyalty_points} points (₹{selectedCustomer.loyalty_points} off)</span></label> : null}
            <Button className="w-full gradient-spice text-white" onClick={convertToBill}>Generate Bill & Receipt</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Receipt — {showReceipt?.number}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre overflow-x-auto">{showReceipt?.content}</pre>
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => { if (showReceipt) navigator.clipboard?.writeText(showReceipt.content) }}>Copy</Button>
            <Button className="flex-1" variant="outline" onClick={async () => { if (!showReceipt) return; await invoke('mark_receipt_printed', { receiptId: showReceipt.id }).catch(console.error); window.print() }}>Print</Button>
            <Button className="flex-1 gradient-spice text-white" onClick={() => setShowReceipt(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
