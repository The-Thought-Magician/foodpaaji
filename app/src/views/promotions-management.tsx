'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Tag, Megaphone, ToggleLeft, ToggleRight, Ticket } from 'lucide-react'
import { CouponManagement } from '@/components/promotions/coupon-management'

interface Promotion {
  id: number
  title: string
  description?: string
  promo_code?: string
  discount_type: string
  discount_value: number
  min_order_amount: number
  usage_count: number
  usage_limit?: number
  start_date: string
  end_date: string
  is_active: number
}

interface Announcement {
  id: number
  title: string
  body: string
  target: string
  priority: string
  is_active: number
  expires_at?: string
  created_at: string
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
}

export function PromotionsManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [promoForm, setPromoForm] = useState({ title: '', description: '', promo_code: '', discount_type: 'percent', discount_value: '10', min_order_amount: '0', max_discount_amount: '', usage_limit: '', start_date: '', end_date: '' })
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', target: 'all', priority: 'normal', expires_at: '' })

  const loadPromotions = async () => {
    try {
      const res = await invoke<{ success: boolean; data: Promotion[] }>('get_promotions', { activeOnly: false })
      if (res.success) setPromotions(res.data)
    } catch (e) { console.error(e) }
  }

  const loadAnnouncements = async () => {
    try {
      const res = await invoke<{ success: boolean; data: Announcement[] }>('get_announcements', { activeOnly: false })
      if (res.success) setAnnouncements(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadPromotions(); loadAnnouncements() }, [])

  const savePromo = async () => {
    try {
      await invoke('create_promotion', {
        request: {
          title: promoForm.title,
          description: promoForm.description || null,
          promo_code: promoForm.promo_code || null,
          discount_type: promoForm.discount_type,
          discount_value: parseFloat(promoForm.discount_value),
          min_order_amount: parseFloat(promoForm.min_order_amount),
          max_discount_amount: promoForm.max_discount_amount ? parseFloat(promoForm.max_discount_amount) : null,
          usage_limit: promoForm.usage_limit ? parseInt(promoForm.usage_limit) : null,
          start_date: promoForm.start_date,
          end_date: promoForm.end_date,
        }
      })
      setShowPromoForm(false)
      loadPromotions()
    } catch (e) { console.error(e) }
  }

  const saveAnnouncement = async () => {
    try {
      await invoke('create_announcement', {
        request: {
          title: announcementForm.title,
          body: announcementForm.body,
          target: announcementForm.target,
          priority: announcementForm.priority,
          expires_at: announcementForm.expires_at || null,
        }
      })
      setShowAnnouncementForm(false)
      loadAnnouncements()
    } catch (e) { console.error(e) }
  }

  const togglePromo = async (id: number) => {
    try { await invoke('toggle_promotion', { promoId: id }); loadPromotions() } catch (e) { console.error(e) }
  }

  const dismissAnnouncement = async (id: number) => {
    try { await invoke('dismiss_announcement', { announcementId: id }); loadAnnouncements() } catch (e) { console.error(e) }
  }

  return (
    <Tabs defaultValue="promotions">
      <TabsList>
        <TabsTrigger value="promotions"><Tag className="w-4 h-4 mr-2" />Promotions</TabsTrigger>
        <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-2" />Announcements</TabsTrigger>
        <TabsTrigger value="coupons"><Ticket className="w-4 h-4 mr-2" />Coupons</TabsTrigger>
      </TabsList>

      <TabsContent value="promotions" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowPromoForm(true)} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />New Promotion</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map(p => (
            <Card key={p.id} className={p.is_active ? 'card-hover' : 'opacity-60'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    {p.promo_code && <Badge variant="outline" className="mt-1 font-mono">{p.promo_code}</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => togglePromo(p.id)}>
                    {p.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{p.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Discount: </span><span className="font-medium">{p.discount_value}{p.discount_type === 'percent' ? '%' : '₹'} off</span></div>
                  <div><span className="text-muted-foreground">Min order: </span><span className="font-medium">₹{p.min_order_amount}</span></div>
                  <div><span className="text-muted-foreground">Used: </span><span className="font-medium">{p.usage_count}{p.usage_limit ? `/${p.usage_limit}` : ''}</span></div>
                  <div><span className="text-muted-foreground">Valid: </span><span className="font-medium">{p.start_date} – {p.end_date}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
          {promotions.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-12">No promotions yet</p>}
        </div>
      </TabsContent>

      <TabsContent value="announcements" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowAnnouncementForm(true)} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />New Announcement</Button>
        </div>
        <div className="space-y-3">
          {announcements.map(a => (
            <Card key={a.id} className={a.is_active ? '' : 'opacity-50'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{a.title}</p>
                      <Badge className={PRIORITY_COLOR[a.priority] || ''}>{a.priority}</Badge>
                      <Badge variant="outline">{a.target}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                    {a.expires_at && <p className="text-xs text-muted-foreground mt-1">Expires: {a.expires_at}</p>}
                  </div>
                  {a.is_active ? (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => dismissAnnouncement(a.id)}>Dismiss</Button>
                  ) : <Badge variant="outline">Dismissed</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
          {announcements.length === 0 && <p className="text-center text-muted-foreground py-12">No announcements yet</p>}
        </div>
      </TabsContent>

      <TabsContent value="coupons" className="mt-4">
        <CouponManagement />
      </TabsContent>

      <Dialog open={showPromoForm} onOpenChange={setShowPromoForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={promoForm.title} onChange={e => setPromoForm({ ...promoForm, title: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} /></div>
            <div><Label>Promo Code</Label><Input value={promoForm.promo_code} onChange={e => setPromoForm({ ...promoForm, promo_code: e.target.value })} placeholder="e.g. SAVE20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={promoForm.discount_type} onValueChange={(v: string | null) => setPromoForm({ ...promoForm, discount_type: v ?? 'percent' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="bogo">BOGO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Order (₹)</Label><Input type="number" value={promoForm.min_order_amount} onChange={e => setPromoForm({ ...promoForm, min_order_amount: e.target.value })} /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" value={promoForm.max_discount_amount} onChange={e => setPromoForm({ ...promoForm, max_discount_amount: e.target.value })} /></div>
            </div>
            <div><Label>Usage Limit</Label><Input type="number" value={promoForm.usage_limit} onChange={e => setPromoForm({ ...promoForm, usage_limit: e.target.value })} placeholder="Leave blank for unlimited" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={promoForm.start_date} onChange={e => setPromoForm({ ...promoForm, start_date: e.target.value })} /></div>
              <div><Label>End Date *</Label><Input type="date" value={promoForm.end_date} onChange={e => setPromoForm({ ...promoForm, end_date: e.target.value })} /></div>
            </div>
            <Button className="w-full gradient-spice text-white" onClick={savePromo}>Create Promotion</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnnouncementForm} onOpenChange={setShowAnnouncementForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} /></div>
            <div><Label>Body *</Label><Input value={announcementForm.body} onChange={e => setAnnouncementForm({ ...announcementForm, body: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target</Label>
                <Select value={announcementForm.target} onValueChange={(v: string | null) => setAnnouncementForm({ ...announcementForm, target: v ?? 'all' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={announcementForm.priority} onValueChange={(v: string | null) => setAnnouncementForm({ ...announcementForm, priority: v ?? 'normal' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'normal', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Expires At</Label><Input type="datetime-local" value={announcementForm.expires_at} onChange={e => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })} /></div>
            <Button className="w-full gradient-spice text-white" onClick={saveAnnouncement}>Post Announcement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
