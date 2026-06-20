'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Users, Receipt, Package, ArrowUpRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardData {
  today_bills: number
  today_revenue: number
  today_collected: number
  active_orders: number
  total_customers: number
  low_stock_count: number
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

  useEffect(() => {
    async function load() {
      try {
        const [summary, bills, orders, customers, alerts] = await Promise.all([
          invoke<{ success: boolean; data: { today_bills: number; today_revenue: number; today_collected: number } }>('get_billing_summary'),
          invoke<{ success: boolean; data: RecentBill[] }>('get_bills', { status: null, limit: 5 }),
          invoke<{ success: boolean; data: { id: number }[] }>('get_orders', { status: 'pending', limit: 50 }),
          invoke<{ success: boolean; data: { total_customers: number } }>('get_customer_stats'),
          invoke<{ success: boolean; data: { total_alerts: number } }>('get_alert_summary', { restaurantId: 1 }).catch(() => ({ success: false, data: { total_alerts: 0 } })),
        ])

        setData({
          today_bills: summary.success ? summary.data.today_bills : 0,
          today_revenue: summary.success ? summary.data.today_revenue : 0,
          today_collected: summary.success ? summary.data.today_collected : 0,
          active_orders: orders.success ? orders.data.length : 0,
          total_customers: customers.success ? customers.data.total_customers : 0,
          low_stock_count: alerts.success ? alerts.data.total_alerts : 0,
        })
        setActiveOrders(orders.success ? orders.data.length : 0)
        if (bills.success) setRecentBills(bills.data)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const stats = data ? [
    { title: "Today's Revenue", value: `₹${data.today_revenue.toFixed(0)}`, icon: Receipt, gradient: 'gradient-spice' },
    { title: 'Active Orders', value: String(activeOrders), icon: Clock, gradient: 'gradient-accent' },
    { title: 'Total Customers', value: String(data.total_customers), icon: Users, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Low Stock Items', value: String(data.low_stock_count), icon: Package, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600' },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.title} className="stat-card card-hover bg-card rounded-2xl p-6 border border-border">
            <div className={`p-3 rounded-xl ${s.gradient} w-fit mb-4`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.title}</p>
          </div>
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
