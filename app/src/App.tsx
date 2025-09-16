import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Users, Database } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { EmployeeManagement } from '@/pages/employee-management'

function App() {
  const [view, setView] = useState<'home' | 'employees'>('home')

  if (view === 'employees') {
    return <EmployeeManagement />
  }

  return (
    <MainLayout>
      <Header title="FoodPaaji - Restaurant Management" />
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-bold text-center">
            Welcome to FoodPaaji
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl">
            Complete restaurant management system designed for Indian restaurants
          </p>
          <div className="flex space-x-4">
            <Button className="flex items-center space-x-2" onClick={() => setView('employees')}>
              <Users className="h-4 w-4" />
              <span>Manage Employees</span>
            </Button>
            <Button variant="outline">
              View Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await invoke('seed_sample_data')
                  // eslint-disable-next-line no-alert
                  alert('Seeded sample data')
                } catch (e) {
                  // eslint-disable-next-line no-alert
                  alert('Seeding failed: ' + (e as any)?.toString?.())
                }
              }}
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Seed Data</span>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default App
