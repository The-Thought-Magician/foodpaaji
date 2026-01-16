import { useState, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Phone,
  Calendar,
  Crown,
  Shield,
  Utensils,
  Coffee,
  X
} from 'lucide-react'
import type { Employee } from '@/types/employee'
import type { ApiResponse } from '@/types/api'
import { cn } from '@/lib/utils'

interface UserDto {
  id: number | null
  restaurant_id: number
  email: string
  phone?: string | null
  first_name: string
  last_name: string
  role: string
  salary?: number | null
  hire_date?: string | null
  is_active: boolean
}

const roleConfig = {
  restaurant_owner: { icon: Crown, color: 'gradient-spice', label: 'Owner' },
  manager: { icon: Shield, color: 'gradient-accent', label: 'Manager' },
  cashier: { icon: Coffee, color: 'bg-gradient-to-br from-blue-500 to-blue-600', label: 'Cashier' },
  kitchen_staff: { icon: Utensils, color: 'bg-gradient-to-br from-orange-500 to-orange-600', label: 'Kitchen Staff' },
  waiter: { icon: Coffee, color: 'bg-gradient-to-br from-purple-500 to-purple-600', label: 'Waiter' },
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)

  const itemsPerPage = 12

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await invoke('get_employees', {
        restaurant_id: 1,
      }) as ApiResponse<UserDto[]>

      if (response.success && Array.isArray(response.data)) {
        const mapped = response.data.map((u) => ({
          id: u.id ?? 0,
          name: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email,
          phone: u.phone ?? '',
          role: normalizeRoleForUi(u.role),
          department: '',
          salary: Number(u.salary ?? 0),
          joiningDate: u.hire_date ?? '',
          address: '',
          emergencyContact: '',
          status: u.is_active ? 'active' : 'inactive',
        })) as Employee[]
        setEmployees(mapped)
      }
    } catch (error) {
      console.error('Failed to load employees:', error)
    } finally {
      setLoading(false)
    }
  }

  useMemo(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const normalizeRoleForUi = (role: string) => role.toLowerCase().replace(/ /g, '_')

  const filteredEmployees = useMemo(() => {
    let result = employees

    if (searchTerm) {
      result = result.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm)
      )
    }

    if (filterRole) {
      result = result.filter(emp => emp.role === filterRole)
    }

    if (filterStatus !== 'all') {
      result = result.filter(emp => emp.status === filterStatus)
    }

    return result
  }, [employees, searchTerm, filterRole, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEmployees.slice(start, start + itemsPerPage)
  }, [filteredEmployees, currentPage])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 gradient-spice rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Employee Management
          </h2>
          <p className="text-muted-foreground">
            Manage your restaurant staff and their roles
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gradient-spice text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="restaurant_owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen_staff">Kitchen Staff</option>
            <option value="waiter">Waiter</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || filterRole || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first employee to get started'}
          </p>
          {!searchTerm && !filterRole && filterStatus === 'all' && (
            <Button onClick={() => setShowAddForm(true)} className="gradient-spice text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add First Employee
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedEmployees.map((employee, index) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                delay={index * 50}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                          currentPage === pageNum
                            ? 'gradient-spice text-white shadow-md'
                            : 'hover:bg-muted'
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Employee</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground text-center py-8">Employee form will be implemented here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface EmployeeCardProps {
  employee: Employee
  delay?: number
}

function EmployeeCard({ employee, delay = 0 }: EmployeeCardProps) {
  const config = roleConfig[employee.role as keyof typeof roleConfig] || roleConfig.waiter
  const RoleIcon = config.icon

  const initials = employee.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-white font-bold shadow-md`}>
            {initials}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{employee.name}</h4>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className={`p-1.5 rounded-lg ${config.color} bg-opacity-10`}>
            <RoleIcon className="w-3.5 h-3.5" />
          </div>
          <span className="capitalize">{employee.role.replace('_', ' ')}</span>
        </div>

        {employee.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span>{employee.phone}</span>
          </div>
        )}

        {employee.joiningDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined {new Date(employee.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          employee.status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}>
          {employee.status}
        </span>
        <Button variant="ghost" size="sm" className="text-xs">
          View Details
        </Button>
      </div>
    </div>
  )
}
