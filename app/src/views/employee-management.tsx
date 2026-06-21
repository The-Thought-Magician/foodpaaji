'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Users, Plus, Search, X, Download } from 'lucide-react'
import type { Employee } from '@/types/employee'
import type { ApiResponse } from '@/types/api'
import { cn } from '@/lib/utils'
import EmployeeCard from '@/components/employee/employee-card'
import { EmployeeForm } from '@/components/employee/employee-form'
import { EmployeeDashboard } from '@/components/employee/employee-dashboard'
import { PasswordChange } from '@/components/employee/password-change'
import { EmployeeLogin } from '@/components/employee/employee-login'
import AttendanceReport from '@/components/employee/attendance-report'

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

const RESTAURANT_ID = 1
const ITEMS_PER_PAGE = 12

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [dashboardEmployee, setDashboardEmployee] = useState<Employee | null>(null)
  const [changePwdEmployee, setChangePwdEmployee] = useState<Employee | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'attendance'>('list')

  const loadEmployees = useCallback(() => {
    invoke<ApiResponse<UserDto[]>>('get_employees', { restaurant_id: RESTAURANT_ID })
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setEmployees(res.data.map(u => ({
            id: u.id ?? 0,
            name: `${u.first_name} ${u.last_name}`.trim(),
            email: u.email, phone: u.phone ?? '',
            role: u.role.toLowerCase().replace(/ /g, '_'),
            department: '', salary: Number(u.salary ?? 0),
            joiningDate: u.hire_date ?? '', address: '', emergencyContact: '',
            status: u.is_active ? 'active' : 'inactive',
          })))
        }
      })
      .catch(e => console.error('Failed to load employees:', e))
      .finally(() => setLoading(false))
  }, [])

  const toggleStatus = async (emp: Employee) => {
    const [first, ...rest] = emp.name.split(' ')
    await invoke('update_employee', { request: { id: emp.id, restaurant_id: RESTAURANT_ID, email: emp.email, phone: emp.phone || null, first_name: first, last_name: rest.join(' ') || '', role: emp.role.toUpperCase(), salary: emp.salary, hire_date: emp.joiningDate || null, is_active: emp.status !== 'active' } }).catch(console.error)
    loadEmployees()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await invoke('delete_employee', { request: { employee_id: deleteTarget.id, requesting_user_role: 'MANAGER' } })
      setDeleteTarget(null)
      loadEmployees()
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadEmployees() }, [loadEmployees])

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase()) && !e.phone.includes(search)) return false
      if (filterRole && e.role !== filterRole) return false
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      return true
    })
  }, [employees, search, filterRole, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

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
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Employee Management</h2>
          <p className="text-muted-foreground">Manage your restaurant staff and their roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => {
            const rows = ['Name,Email,Phone,Role,Salary,Status,Joining Date', ...filtered.map(e => `"${e.name}","${e.email}","${e.phone ?? ''}","${e.role}",${e.salary ?? ''},"${e.status}","${e.joiningDate ?? ''}"`)]
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: `employees-${new Date().toISOString().split('T')[0]}.csv` })
            a.click()
          }}><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button variant="outline" onClick={() => setShowLogin(true)}>Employee Login</Button>
          <Button onClick={() => setShowAddForm(true)} className="gradient-spice text-white shadow-lg"><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border pb-0">
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Staff</button>
        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Attendance Report</button>
      </div>

      {activeTab === 'attendance' && <AttendanceReport />}

      {activeTab === 'list' && <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-3">
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none cursor-pointer">
            <option value="">All Roles</option>
            <option value="restaurant_owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen_staff">Kitchen Staff</option>
            <option value="waiter">Waiter</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none cursor-pointer">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground">{search || filterRole || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Add your first employee to get started'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(emp => <EmployeeCard key={emp.id} employee={emp} onEdit={e => setEditEmployee(e)} onDelete={e => setDeleteTarget(e)} onView={e => setDashboardEmployee(e)} onToggleStatus={toggleStatus} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} employees</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return <button key={p} onClick={() => setPage(p)} className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-all', page === p ? 'gradient-spice text-white shadow-md' : 'hover:bg-muted')}>{p}</button>
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-lg font-semibold">Delete Employee</h3>
            <p className="text-muted-foreground text-sm">Remove <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {dashboardEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <EmployeeDashboard employee={dashboardEmployee} onLogout={() => setDashboardEmployee(null)} onChangePassword={() => { setChangePwdEmployee(dashboardEmployee); setDashboardEmployee(null) }} onViewProfile={() => {}} />
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full animate-scale-in">
            <EmployeeLogin restaurantId={RESTAURANT_ID} onLoginSuccess={() => setShowLogin(false)} onCancel={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      {changePwdEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full animate-scale-in">
            <PasswordChange employeeId={changePwdEmployee.id} onSuccess={() => setChangePwdEmployee(null)} onCancel={() => setChangePwdEmployee(null)} />
          </div>
        </div>
      )}

      {(showAddForm || editEmployee) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <EmployeeForm
              employee={editEmployee}
              restaurantId={RESTAURANT_ID}
              onSave={emp => {
                if (editEmployee) {
                  setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e))
                  setEditEmployee(undefined)
                } else {
                  setEmployees(prev => [...prev, emp])
                  setShowAddForm(false)
                }
              }}
              onCancel={() => { setShowAddForm(false); setEditEmployee(undefined) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
