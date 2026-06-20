'use client'

import { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Users, Plus, Search, Filter } from 'lucide-react'
import type { Employee } from '@/types/employee'
import type { ApiResponse } from '@/types/api'

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

interface EmployeeListProps {
  restaurantId: number
  onAddEmployee: () => void
}

export function EmployeeList({
  restaurantId,
  onAddEmployee
}: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10

  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, currentPage, searchTerm, filterRole])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await invoke('get_employees', {
        restaurant_id: restaurantId,
      }) as ApiResponse<UserDto[]>

      if (response.success && Array.isArray(response.data)) {
        const mapped = response.data.map((u) => ({
          id: (u.id ?? 0),
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

  const normalizeRoleForUi = (role: string) => role.toLowerCase()

  // Deletion and edit/view actions will be enabled once backend supports them

  const filteredEmployees = useMemo(() => {
    const bySearch = employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm)
    )
    const byRole = filterRole ? bySearch.filter(emp => emp.role === filterRole) : bySearch
    return byRole
  }, [employees, searchTerm, filterRole])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEmployees.slice(start, start + itemsPerPage)
  }, [filteredEmployees, currentPage])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-muted-foreground">
            Manage your restaurant staff and their roles
          </p>
        </div>
        <Button onClick={onAddEmployee} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </Button>
      </div>

      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background min-w-[120px]"
        >
          <option value="">All Roles</option>
          <option value="restaurant_owner">Restaurant owner</option>
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
          <option value="kitchen_staff">Kitchen staff</option>
          <option value="waiter">Waiter</option>
        </select>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Department</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No employees found</p>
                    <Button
                      variant="outline"
                      onClick={onAddEmployee}
                      className="mt-4"
                    >
                      Add First Employee
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 capitalize">{employee.role}</td>
                    <td className="p-4 capitalize">{employee.department}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-2" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}