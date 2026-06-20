'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Minus, Trash2, ShoppingCart, Receipt, Tag } from 'lucide-react'
import { MenuPicker } from '@/components/pos/menu-picker'
import { getSettings } from '@/lib/settings'

interface CartItem {
  item_name: string
  quantity: number
  unit_price: number
  menu_item_id?: number
}

interface Order {
  id: number
  order_number: string
  table_number?: string
  status: string
  created_at: string
}

interface CouponResult {
  valid: boolean
  coupon_id?: number
  discount_amount?: number
  final_amount?: number
  error?: string
}

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
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<CouponResult | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [showReceipt, setShowReceipt] = useState<{ id: number; content: string; number: string } | null>(null)
  const [orderDetail, setOrderDetail] = useState<{ order_number: string; table_number?: string; status: string; notes?: string; items: { item_name: string; quantity: number; unit_price: number }[] } | null>(null)

  const viewOrderDetails = async (orderId: number) => {
    try {
      const res = await invoke<{ success: boolean; data: typeof orderDetail }>('get_order_details', { orderId })
      if (res.success && res.data) setOrderDetail(res.data)
    } catch (e) { console.error(e) }
  }
  const [showConvert, setShowConvert] = useState<Order | null>(null)
  const [taxPercent, setTaxPercent] = useState(() => getSettings().default_tax_percent)
  const [discountPercent, setDiscountPercent] = useState(0)

  const loadOrders = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Order[] }>('get_orders', { status: null, limit: 20 })
      if (res.success) setOrders(res.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const addItem = () => setCart([...cart, { item_name: '', quantity: 1, unit_price: 0 }])

  const updateCartItem = (i: number, field: keyof CartItem, value: string | number) => {
    setCart(cart.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const removeCartItem = (i: number) => setCart(cart.filter((_, idx) => idx !== i))

  const changeQty = (i: number, delta: number) => {
    const qty = cart[i].quantity + delta
    if (qty <= 0) removeCartItem(i)
    else updateCartItem(i, 'quantity', qty)
  }

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const couponDiscount = coupon?.valid ? (coupon.discount_amount ?? 0) : 0
  const taxable = subtotal - couponDiscount
  const taxAmt = taxable * taxPercent / 100
  const total = taxable + taxAmt

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      const res = await invoke<CouponResult>('validate_coupon', { code: couponCode, orderAmount: subtotal })
      setCoupon(res)
    } catch (e) { console.error(e) }
  }

  const placeOrder = async () => {
    if (cart.length === 0 || cart.some(i => !i.item_name)) return
    try {
      if (coupon?.valid && coupon.coupon_id) {
        await invoke('apply_coupon', { couponId: coupon.coupon_id })
      }
      await invoke('create_order', {
        request: { customer_id: null, table_number: tableNumber || null, items: cart, notes: null }
      })
      setCart([])
      setTableNumber('')
      setCouponCode('')
      setCoupon(null)
      loadOrders()
    } catch (e) { console.error(e) }
  }

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await invoke('update_order_status', { orderId, status })
      loadOrders()
    } catch (e) { console.error(e) }
  }

  const convertToBill = async () => {
    if (!showConvert) return
    try {
      const details = await invoke<{ success: boolean; data: { items: { item_name: string; quantity: number; unit_price: number; menu_item_id?: number }[] } | null }>('get_order_details', { orderId: showConvert.id })
      const res = await invoke<{ success: boolean; bill_id: number }>('convert_order_to_bill', {
        orderId: showConvert.id, discountPercent, taxPercent
      })
      if (res.success) {
        const receipt = await invoke<{ success: boolean; data: { receipt_id: number; content: string; receipt_number: string } }>('generate_receipt', { billId: res.bill_id })
        if (receipt.success) setShowReceipt({ id: receipt.data.receipt_id, content: receipt.data.content, number: receipt.data.receipt_number })
        const orderItems = (details.success && details.data?.items || []).filter(i => i.menu_item_id).map(i => ({ menu_item_id: i.menu_item_id!, quantity: i.quantity, notes: null }))
        if (orderItems.length > 0) await invoke('process_order_completion', { request: { restaurant_id: 1, order_id: showConvert.id, order_items: orderItems, user_id: 1 } }).catch(console.error)
        setShowConvert(null)
        loadOrders()
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

        <Input placeholder="Table number (e.g. T1)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />

        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.map((item, i) => (
            <Card key={i} className="p-3">
              <div className="space-y-2">
                <Input placeholder="Item name" value={item.item_name} onChange={e => updateCartItem(i, 'item_name', e.target.value)} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => changeQty(i, -1)}><Minus className="w-3 h-3" /></Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button variant="outline" size="sm" onClick={() => changeQty(i, 1)}><Plus className="w-3 h-3" /></Button>
                  <Input className="flex-1" type="number" placeholder="Price" value={item.unit_price || ''} onChange={e => updateCartItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  <span className="text-sm font-medium w-16 text-right">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeCartItem(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
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
            <div className="flex-1"><Label className="text-xs">Tax %</Label><Input type="number" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} /></div>
            <div className="flex-1"><Label className="text-xs">Disc %</Label><Input type="number" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>-₹{couponDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span>Tax ({taxPercent}%)</span><span>₹{taxAmt.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>
          <Button className="w-full gradient-spice text-white" onClick={placeOrder} disabled={cart.length === 0}>Place Order</Button>
        </div>
      </div>

      <div className="flex flex-col space-y-4 overflow-hidden">
        <h3 className="font-semibold">Active Orders</h3>
        <div className="flex-1 overflow-y-auto space-y-2">
          {orders.filter(o => o.status !== 'served' && o.status !== 'cancelled').map(order => (
            <Card key={order.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.table_number ? `Table ${order.table_number}` : 'Takeaway'}</p>
                  </div>
                  <Badge className={STATUS_COLOR[order.status] || ''}>{order.status}</Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {order.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'preparing')}>Preparing</Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'ready')}>Ready</Button>
                  )}
                  {order.status === 'ready' && (
                    <Button size="sm" className="gradient-spice text-white" onClick={() => setShowConvert(order)}>
                      <Receipt className="w-4 h-4 mr-1" />Bill
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => viewOrderDetails(order.id)}>Details</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(order.id, 'cancelled')}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {orders.filter(o => o.status !== 'served' && o.status !== 'cancelled').length === 0 && (
            <p className="text-center text-muted-foreground py-8">No active orders</p>
          )}
        </div>
      </div>

      <Dialog open={!!orderDetail} onOpenChange={() => setOrderDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order — {orderDetail?.order_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{orderDetail?.table_number ? `Table ${orderDetail.table_number}` : 'Takeaway'} · {orderDetail?.status}</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {orderDetail?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{item.item_name} × {item.quantity}</span>
                <span>₹{(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          {orderDetail?.items && (
            <div className="flex justify-between font-semibold text-sm border-t pt-2">
              <span>Total</span>
              <span>₹{orderDetail.items.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(0)}</span>
            </div>
          )}
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
            <Button className="flex-1" variant="outline" onClick={async () => {
              if (!showReceipt) return
              await invoke('mark_receipt_printed', { receiptId: showReceipt.id }).catch(console.error)
              window.print()
            }}>Print</Button>
            <Button className="flex-1 gradient-spice text-white" onClick={() => setShowReceipt(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
