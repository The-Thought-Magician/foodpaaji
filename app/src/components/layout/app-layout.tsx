import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
  activeView: string
  onViewChange: (view: string) => void
  showSidebar?: boolean
}

export function AppLayout({
  children,
  activeView,
  onViewChange,
  showSidebar = true
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <Sidebar
          activeView={activeView}
          onViewChange={onViewChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getViewTitle(activeView)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function getViewTitle(view: string): string {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    employees: 'Employee Management',
    inventory: 'Inventory Management',
    menu: 'Menu Management',
    reservations: 'Table Reservations',
    promotions: 'Promotions & Offers',
    settings: 'Settings'
  }
  return titles[view] || 'FoodPaaji'
}
