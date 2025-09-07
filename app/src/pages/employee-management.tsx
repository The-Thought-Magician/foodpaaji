import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Header } from '@/components/layout/header'
import { EmployeeList } from '@/components/employee/employee-list'
import { EmployeeForm } from '@/components/employee/employee-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import type { Employee } from '@/types/employee'

type ViewMode = 'list' | 'add' | 'edit' | 'view'

export function EmployeeManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const restaurantId = 1 // This would come from auth context in real app

  const handleAddEmployee = () => {
    setSelectedEmployee(null)
    setViewMode('add')
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setViewMode('edit')
  }

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setViewMode('view')
  }

  const handleDeleteEmployee = () => {
    // Employee deletion is handled in the EmployeeList component
    // This callback can be used for additional cleanup or notifications
  }

  const handleSaveEmployee = () => {
    // Return to list view after successful save
    setViewMode('list')
    setSelectedEmployee(null)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedEmployee(null)
  }

  const renderContent = () => {
    switch (viewMode) {
      case 'add':
      case 'edit':
        return (
          <EmployeeForm
            employee={viewMode === 'edit' ? selectedEmployee || undefined : undefined}
            restaurantId={restaurantId}
            onSave={handleSaveEmployee}
            onCancel={handleCancel}
          />
        )
      
      case 'view':
        return selectedEmployee ? (
          <EmployeeProfile 
            employee={selectedEmployee}
            onEdit={() => handleEditEmployee(selectedEmployee)}
          />
        ) : null

      case 'list':
      default:
        return (
          <EmployeeList
            restaurantId={restaurantId}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onViewEmployee={handleViewEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )
    }
  }

  const getPageTitle = () => {
    switch (viewMode) {
      case 'add':
        return 'Add New Employee'
      case 'edit':
        return 'Edit Employee'
      case 'view':
        return 'Employee Profile'
      default:
        return 'Employee Management'
    }
  }

  return (
    <MainLayout>
      <Header title={`FoodPaaji - ${getPageTitle()}`} />
      <div className="container mx-auto p-6">
        {viewMode !== 'list' && (
          <div className="mb-4">
            <Button variant="ghost" onClick={handleCancel} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Employee List</span>
            </Button>
          </div>
        )}
        {renderContent()}
      </div>
    </MainLayout>
  )
}

interface EmployeeProfileProps {
  employee: Employee
  onEdit: () => void
}

function EmployeeProfile({ employee, onEdit }: EmployeeProfileProps) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Profile</h2>
          <p className="text-muted-foreground">View employee details</p>
        </div>
        <Button onClick={onEdit}>Edit Employee</Button>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{employee.name}</h3>
            <p className="text-muted-foreground">{employee.role} - {employee.department}</p>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              employee.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {employee.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{employee.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-sm">{employee.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <p className="text-sm capitalize">{employee.department}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="text-sm capitalize">{employee.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Salary</label>
              <p className="text-sm">₹{employee.salary.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Joining Date</label>
              <p className="text-sm">{new Date(employee.joiningDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {employee.address && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <p className="text-sm">{employee.address}</p>
          </div>
        )}

        {employee.emergencyContact && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
            <p className="text-sm">{employee.emergencyContact}</p>
          </div>
        )}
      </div>
    </div>
  )
}