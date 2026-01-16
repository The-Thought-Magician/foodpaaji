import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Dashboard } from '@/components/dashboard/dashboard'
import { EmployeeManagement } from '@/pages/employee-management'

function App() {
  const [activeView, setActiveView] = useState<string>('dashboard')

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />
      case 'employees':
        return <EmployeeManagement />
      case 'inventory':
        return <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-muted-foreground">Inventory Management</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      case 'menu':
        return <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-muted-foreground">Menu Management</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      case 'pos':
        return <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-muted-foreground">Point of Sale</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      default:
        return <Dashboard />
    }
  }

  return (
    <AppLayout activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </AppLayout>
  )
}

export default App
