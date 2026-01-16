import { Bell, Search, Moon, Sun, LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  sidebarCollapsed?: boolean
}

export function Header({ title = "FoodPaaji" }: HeaderProps) {
  const [dark, setDark] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [dark])

  const notifications = [
    { id: 1, title: 'Low Stock Alert', message: 'Tomato sauce is running low', time: '5m ago', unread: true },
    { id: 2, title: 'New Reservation', message: 'Table 5 reserved for 7 PM', time: '1h ago', unread: true },
    { id: 3, title: 'Order Completed', message: 'Order #1234 delivered', time: '2h ago', unread: false },
  ]

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark(!dark)}
              className="relative"
            >
              {dark ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-xl animate-scale-in">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      {notifications.filter(n => n.unread).length} unread
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          'p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors',
                          notif.unread && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                            notif.unread ? 'bg-primary' : 'bg-transparent'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{notif.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-8 h-8 gradient-spice rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  A
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-xl shadow-xl animate-scale-in">
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
