'use client'

import { Bell, Search, Moon, Sun, LogOut, User, ChevronDown, AlertTriangle, Megaphone, Languages } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { invoke } from '@tauri-apps/api/core'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/billing': 'Billing',
  '/pos': 'Point of Sale',
  '/employees': 'Employee Management',
  '/customers': 'Customer Management',
  '/inventory': 'Inventory Management',
  '/menu': 'Menu Management',
  '/reservations': 'Table Reservations',
  '/promotions': 'Promotions & Offers',
  '/reports': 'Reports',
  '/kitchen': 'Kitchen Display',
  '/settings': 'Settings',
}

interface Alert { id: number; item_name: string; current_stock: number; unit: string }
interface Announcement { id: number; title: string; message: string; created_at: string }

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'mr', label: 'मराठी' },
]

export function Header() {
  const pathname = usePathname()
  const { locale, setLocale } = useI18n()
  const title = pageTitles[pathname] ?? 'FoodPaaji'
  const [dark, setDark] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { setDark(true); document.documentElement.classList.add('dark') }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const loadNotifications = useCallback(async () => {
    try {
      const [ar, anr] = await Promise.all([
        invoke<{ success: boolean; data?: { alerts: Alert[] } }>('get_low_stock_alerts', { request: { restaurant_id: 1, is_acknowledged: false, page: 1, limit: 10 } }).catch(() => null),
        invoke<{ success: boolean; data?: Announcement[] }>('get_announcements', { activeOnly: true }).catch(() => null),
      ])
      if (ar?.success && ar.data?.alerts) setAlerts(ar.data.alerts.slice(0, 5))
      if (anr?.success && anr.data) setAnnouncements(anr.data.slice(0, 3))
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { void loadNotifications() }, [loadNotifications])

  const unreadCount = alerts.length + announcements.length

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
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowLang(!showLang)} className="relative">
                <Languages className="w-5 h-5" />
              </Button>
              {showLang && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                  {LOCALES.map(l => (
                    <button key={l.code} onClick={() => { setLocale(l.code); setShowLang(false) }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${locale === l.code ? 'font-bold text-primary' : ''}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={toggleDark} className="relative">
              {dark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) void loadNotifications() }}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full border-2 border-card text-[10px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-xl z-50">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <span className="text-xs text-muted-foreground">{unreadCount} active</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 && announcements.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
                    ) : (
                      <>
                        {alerts.map(a => (
                          <div key={`alert-${a.id}`} className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Low Stock: {a.item_name}</p>
                                <p className="text-xs text-muted-foreground">{a.current_stock} {a.unit} remaining</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {announcements.map(a => (
                          <div key={`ann-${a.id}`} className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <Megaphone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{a.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
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
                <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-xl shadow-xl z-50">
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
