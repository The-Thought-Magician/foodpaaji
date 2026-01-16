import {
  Users,
  Receipt,
  Package,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StatCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  gradient: string
  delay?: number
}

function StatCard({ title, value, change, trend, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  return (
    <div
      className="stat-card card-hover bg-card rounded-2xl p-6 border border-border"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
          {change}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {value}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  )
}

interface RecentOrderProps {
  id: string
  items: number
  amount: string
  status: 'pending' | 'cooking' | 'ready' | 'delivered'
  time: string
}

function RecentOrder({ id, items, amount, status, time }: RecentOrderProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Pending' },
    cooking: { icon: Utensils, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Cooking' },
    ready: { icon: CheckCircle, color: 'bg-accent/10 text-accent border-accent/20', label: 'Ready' },
    delivered: { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Delivered' },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-semibold text-sm">
          #{id.slice(-3)}
        </div>
        <div>
          <p className="font-medium text-sm">Order #{id}</p>
          <p className="text-xs text-muted-foreground">{items} items • {time}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color} flex items-center gap-1.5`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
        <p className="font-semibold text-sm w-20 text-right">{amount}</p>
      </div>
    </div>
  )
}

export function Dashboard() {
  const stats = [
    { title: 'Today\'s Revenue', value: '₹45,280', change: '+12.5%', trend: 'up' as const, icon: Receipt, gradient: 'gradient-spice' },
    { title: 'Active Orders', value: '24', change: '+3', trend: 'up' as const, icon: Clock, gradient: 'gradient-accent' },
    { title: 'Total Customers', value: '156', change: '+8.2%', trend: 'up' as const, icon: Users, gradient: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Low Stock Items', value: '5', change: '-2', trend: 'down' as const, icon: Package, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600' },
  ]

  const recentOrders: RecentOrderProps[] = [
    { id: 'ORD-2024-001', items: 4, amount: '₹1,280', status: 'cooking', time: '5 min ago' },
    { id: 'ORD-2024-002', items: 2, amount: '₹680', status: 'ready', time: '12 min ago' },
    { id: 'ORD-2024-003', items: 6, amount: '₹2,450', status: 'pending', time: '15 min ago' },
    { id: 'ORD-2024-004', items: 3, amount: '₹920', status: 'delivered', time: '25 min ago' },
    { id: 'ORD-2024-005', items: 5, amount: '₹1,850', status: 'delivered', time: '35 min ago' },
  ]

  const topItems = [
    { name: 'Butter Chicken', orders: 45, revenue: '₹18,900' },
    { name: 'Paneer Tikka', orders: 38, revenue: '₹11,400' },
    { name: 'Biryani Special', orders: 32, revenue: '₹16,000' },
    { name: 'Naan Bread', orders: 28, revenue: '₹1,680' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome back, Admin
          </h2>
          <p className="text-muted-foreground">Here's what's happening at your restaurant today</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gradient-spice text-white shadow-lg shadow-primary/20">
            <Receipt className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} delay={index * 100} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Recent Orders
            </h3>
            <p className="text-sm text-muted-foreground">Latest orders from your restaurant</p>
          </div>
          <div className="p-4 space-y-2">
            {recentOrders.map((order) => (
              <RecentOrder key={order.id} {...order} />
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full">
              View All Orders
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Top Items Today
            </h3>
            <p className="text-sm text-muted-foreground">Best selling items</p>
          </div>
          <div className="p-4 space-y-4">
            {topItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                  index === 0 ? 'gradient-spice text-white' : 'bg-muted text-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                </div>
                <p className="font-semibold text-sm">{item.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
