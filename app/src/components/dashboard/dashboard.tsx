'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Users, Receipt, Package, ArrowUpRight, Clock, CalendarCheck, X, Megaphone, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardData {
  today_bills: number
  today_revenue: number
  today_collected: number
  active_orders: number
  total_customers: number
  low_stock_count: number
  today_reservations: number
}

interface Announcement {
  id: number
  title: string
  body: string
  priority: string
}

interface RecentBill {
  id: number
  bill_number: string
  table_number?: string
  total_amount: number
  status: string
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentBills, setRecentBills] = useState<RecentBill[]>([])
  const [activeOrders, setActiveOrders] = useState<number>(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [summary, bills, orders, customers, alerts, reservations, anns] = await Promise.all([
          invoke<{ success: boolean; data: { today_bills: number; today_revenue: number; today_collected: number } }>('get_billing_summary'),
          invoke<{ success: boolean; data: RecentBill[] }>('get_bills', { status: null, limit: 5 }),
          invoke<{ success: boolean; data: { id: number }[] }>('get_orders', { status: 'pending', limit: 50 }),
          invoke<{ success: boolean; data: { total_customers: number } }>('get_customer_stats'),
          invoke<{ success: boolean; data: { total_alerts: number } }>('get_alert_summary', { restaurantId: 1 }).catch(() => ({ success: false, data: { total_alerts: 0 } })),
          invoke<{ success: boolean; data: { id: number }[] }>('get_reservations', { date: today, status: null }).catch(() => ({ success: false, data: [] })),
          invoke<{ success: boolean; data: Announcement[] }>('get_announcements', { activeOnly: true }).catch(() => ({ success: false, data: [] })),
        ])

        setData({
          today_bills: summary.success ? summary.data.today_bills : 0,
          today_revenue: summary.success ? summary.data.today_revenue : 0,
          today_collected: summary.success ? summary.data.today_collected : 0,
          active_orders: orders.success ? orders.data.length : 0,
          total_customers: customers.success ? customers.data.total_customers : 0,
          low_stock_count: alerts.success ? alerts.data.total_alerts : 0,
          today_reservations: reservations.success ? reservations.data.length : 0,
        })
        setActiveOrders(orders.success ? orders.data.length : 0)
        if (bills.success) setRecentBills(bills.data)
        if (anns.success) setAnnouncements(anns.data)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const PRIORITY_STYLE: Record<string, string> = {
    urgent: 'bg-red-50 border-red-300 text-red-800',
    high: 'bg-amber-50 border-amber-300 text-amber-800',
    normal: 'bg-blue-50 border-blue-300 text-blue-800',
  }

  const dismissAnn = async (id: number) => {
    await invoke('dismiss_announcement', { announcementId: id }).catch(console.error)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const stats = data ? [
    { title: "Today's Bills", value: String(data.today_bills), icon: Receipt, gradient: 'gradient-spice', href: '/billing' },
    { title: "Today's Billed", value: `₹${data.today_revenue.toFixed(0)}`, icon: IndianRupee, gradient: 'bg-gradient-to-br from-green-500 to-green-600', href: '/billing' },
    { title: "Today's Collected", value: `₹${data.today_collected.toFixed(0)}`, icon: IndianRupee, gradient: 'bg-gradient-to-br from-emerald-600 to-emerald-700', href: '/billing' },
    { title: 'Active Orders', value: String(activeOrders), icon: Clock, gradient: 'gradient-accent', href: '/pos' },
    { title: 'Total Customers', value: String(data.total_customers), icon: Users, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600', href: '/customers' },
    { title: 'Low Stock Items', value: String(data.low_stock_count), icon: Package, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600', href: '/inventory' },
    { title: "Today's Reservations", value: String(data.today_reservations), icon: CalendarCheck, gradient: 'bg-gradient-to-br from-teal-500 to-teal-600', href: '/reservations' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Dashboard</h2>
          <p className="text-muted-foreground">{"Today's overview"}</p>
        </div>
        <Link href="/pos">
          <Button className="gradient-spice text-white"><Receipt className="w-4 h-4 mr-2" />New Order</Button>
        </Link>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.normal}`}>
              <Megaphone className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.title}</p>
                {a.body && <p className="text-xs mt-0.5 opacity-80">{a.body}</p>}
              </div>
              <button onClick={() => dismissAnn(a.id)} className="shrink-0 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.title} href={s.href}>
            <div className="stat-card card-hover bg-card rounded-2xl p-6 border border-border cursor-pointer">
              <div className={`p-3 rounded-xl ${s.gradient} w-fit mb-4`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.title}</p>
            </div>
          </Link>
        ))}
        {!data && [1,2,3,4].map(i => (
          <div key={i} className="bg-card rounded-2xl p-6 border border-border animate-pulse h-32" />
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Recent Bills</h3>
            <p className="text-sm text-muted-foreground">Latest billing activity</p>
          </div>
          <Link href="/billing">
            <Button variant="outline" size="sm"><ArrowUpRight className="w-4 h-4 mr-1" />View All</Button>
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentBills.map(bill => (
            <div key={bill.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium text-sm">{bill.bill_number}</p>
                <p className="text-xs text-muted-foreground">{bill.table_number ? `Table ${bill.table_number}` : 'Takeaway'} · {new Date(bill.created_at).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[bill.status] || ''}`}>{bill.status}</span>
                <span className="font-semibold text-sm">₹{bill.total_amount.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {recentBills.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No bills today</p>
          )}
        </div>
      </div>
    </div>
  )
}
