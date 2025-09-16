import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Clock, 
  Calendar, 
  Settings, 
  LogOut, 
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import type { Employee } from '@/types/employee'

interface EmployeeDashboardProps {
  employee: Employee
  onLogout: () => void
  onChangePassword: () => void
  onViewProfile: () => void
}

interface EmployeeStats {
  totalShifts: number
  hoursWorked: number
  lastLogin: string
  profileCompletion: number
}

export function EmployeeDashboard({ 
  employee, 
  onLogout, 
  onChangePassword,
  onViewProfile 
}: EmployeeDashboardProps) {
  const [stats, setStats] = useState<EmployeeStats>({
    totalShifts: 0,
    hoursWorked: 0,
    lastLogin: '',
    profileCompletion: 85
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadEmployeeStats()
  }, [employee.id])

  const loadEmployeeStats = async () => {
    // This would normally fetch real stats from the backend
    setStats({
      totalShifts: 42,
      hoursWorked: 168,
      lastLogin: employee.last_login || new Date().toISOString(),
      profileCompletion: calculateProfileCompletion()
    })
  }

  const calculateProfileCompletion = (): number => {
    let completion = 0
    const fields = [
      employee.name,
      employee.email,
      employee.phone,
      employee.role,
      employee.department,
      employee.address,
      employee.emergencyContact
    ]
    
    fields.forEach(field => {
      if (field && field.trim() !== '') completion += 14.3
    })
    
    return Math.round(completion)
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      'MANAGER': 'bg-purple-100 text-purple-800',
      'CHEF': 'bg-orange-100 text-orange-800',
      'WAITER': 'bg-blue-100 text-blue-800',
      'CASHIER': 'bg-green-100 text-green-800',
      'SOUS_CHEF': 'bg-red-100 text-red-800',
      'BARTENDER': 'bg-yellow-100 text-yellow-800',
      'CLEANER': 'bg-gray-100 text-gray-800',
      'DELIVERY': 'bg-indigo-100 text-indigo-800'
    }
    return colors[role.toUpperCase()] || 'bg-gray-100 text-gray-800'
  }

  const getProfileCompletionColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {employee.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            {formatDate(currentTime)} • {formatTime(currentTime)}
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} className="flex items-center space-x-2">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Employee Profile</h2>
              <Button variant="outline" size="sm" onClick={onViewProfile}>
                <User className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
                  {employee.role.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium capitalize">{employee.department}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined Date</p>
                <p className="font-medium">
                  {new Date(employee.joiningDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  employee.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {employee.status}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Profile Completion</span>
                <span className={`text-sm font-medium ${getProfileCompletionColor(stats.profileCompletion)}`}>
                  {stats.profileCompletion}%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.profileCompletion}%` }}
                />
              </div>
              {stats.profileCompletion < 100 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete your profile to unlock all features
                </p>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button variant="outline" onClick={onViewProfile} className="h-auto p-4 flex flex-col items-center space-y-2">
                <User className="h-6 w-6" />
                <span className="text-sm">View Profile</span>
              </Button>
              <Button variant="outline" onClick={onChangePassword} className="h-auto p-4 flex flex-col items-center space-y-2">
                <Shield className="h-6 w-6" />
                <span className="text-sm">Change Password</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Clock className="h-6 w-6" />
                <span className="text-sm">Time Tracking</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Schedule</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Settings className="h-6 w-6" />
                <span className="text-sm">Settings</span>
              </Button>
              <Button variant="outline" onClick={onLogout} className="h-auto p-4 flex flex-col items-center space-y-2">
                <LogOut className="h-6 w-6" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Shifts</span>
                <span className="font-semibold">{stats.totalShifts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Worked</span>
                <span className="font-semibold">{stats.hoursWorked}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="font-semibold text-xs">
                  {new Date(stats.lastLogin).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Profile Updated</p>
                  <p className="text-xs text-muted-foreground">Your profile information has been updated successfully.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Schedule Change</p>
                  <p className="text-xs text-muted-foreground">Your shift schedule for next week has been updated.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}