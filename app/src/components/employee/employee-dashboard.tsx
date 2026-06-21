'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { User, Clock, Calendar, Settings, LogOut, Shield, IndianRupee } from 'lucide-react'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id])

  const [clockedIn, setClockedIn] = useState(false)
  const [onBreak, setOnBreak] = useState(false)

  const loadEmployeeStats = async () => {
    try {
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]
      const res = await invoke<{ success: boolean; data: { total_hours: number; total_days: number } }>(
        'get_attendance_report',
        { request: { employee_id: employee.id, start_date: monthStart, end_date: todayStr, restaurant_id: 1 } }
      )
      if (res.success && res.data) {
        setStats({ totalShifts: res.data.total_days, hoursWorked: Math.round(res.data.total_hours * 10) / 10, lastLogin: employee.last_login || '', profileCompletion: calculateProfileCompletion() })
      }
    } catch (e) { console.error(e) }
  }

  const handleClockToggle = async () => {
    try {
      if (clockedIn) {
        await invoke('clock_out', { request: { employee_id: employee.id, notes: null } })
      } else {
        await invoke('clock_in', { request: { employee_id: employee.id, notes: null } })
      }
      setClockedIn(v => !v)
      loadEmployeeStats()
    } catch (e) { console.error(e) }
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
              <Button variant="outline" onClick={handleClockToggle} className={`h-auto p-4 flex flex-col items-center space-y-2 ${clockedIn ? 'border-green-500 text-green-600' : ''}`}>
                <Clock className="h-6 w-6" />
                <span className="text-sm">{clockedIn ? 'Clock Out' : 'Clock In'}</span>
              </Button>
              <Button variant="outline" disabled={!clockedIn} onClick={async () => { try { await invoke(onBreak ? 'end_break' : 'start_break', { request: { employee_id: employee.id, break_type: 'meal', notes: null } }); setOnBreak(v => !v) } catch (e) { console.error(e) } }} className={`h-auto p-4 flex flex-col items-center space-y-2 ${onBreak ? 'border-amber-500 text-amber-600' : ''}`}>
                <Calendar className="h-6 w-6" />
                <span className="text-sm">{onBreak ? 'End Break' : 'Take Break'}</span>
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

          {(employee.salary ?? 0) > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">This Month</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly Salary</span><span className="font-semibold">₹{(employee.salary ?? 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Days Attended</span><span className="font-semibold">{stats.totalShifts}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Hours Worked</span><span className="font-semibold">{stats.hoursWorked}h</span></div>
                <div className="border-t pt-3 flex justify-between"><span className="text-sm font-medium">Est. Earned</span><span className="font-bold text-green-600">₹{Math.round(((employee.salary ?? 0) / 26) * stats.totalShifts).toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}