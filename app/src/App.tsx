import { MainLayout } from '@/components/layout/main-layout'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

function App() {
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
            <Button className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Manage Employees</span>
            </Button>
            <Button variant="outline">
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default App
