'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'
import type { Employee } from '@/types/employee'
import type { ApiResponse } from '@/types/api'
import EmployeeFormFields, { type FormErrors } from './employee-form-fields'

interface Props {
  employee?: Partial<Employee>
  restaurantId: number
  onSave: (employee: Employee) => void
  onCancel: () => void
}

type FormData = Omit<Employee, 'id' | 'joinedDate'>

const defaults: FormData = {
  name: '', email: '', phone: '', role: '', department: '',
  salary: 0, joiningDate: new Date().toISOString().split('T')[0],
  address: '', emergencyContact: '', status: 'active',
}

export function EmployeeForm({ employee, restaurantId, onSave, onCancel }: Props) {
  const [formData, setFormData] = useState<FormData>(defaults)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name ?? '', email: employee.email ?? '', phone: employee.phone ?? '',
        role: employee.role ?? '', department: employee.department ?? '', salary: employee.salary ?? 0,
        joiningDate: employee.joiningDate ?? defaults.joiningDate, address: employee.address ?? '',
        emergencyContact: employee.emergencyContact ?? '', status: employee.status ?? 'active',
      })
    }
  }, [employee])

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!formData.name.trim()) e.name = 'Name is required'
    if (!formData.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email'
    if (!formData.phone.trim()) e.phone = 'Phone is required'
    else if (!/^[\d\s\-+()]{10,}$/.test(formData.phone)) e.phone = 'Invalid phone number'
    if (!formData.role) e.role = 'Role is required'
    if (!formData.department) e.department = 'Department is required'
    if (formData.salary <= 0) e.salary = 'Salary must be greater than 0'
    if (!formData.joiningDate) e.joiningDate = 'Joining date is required'
    if (!employee && password.trim().length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    if (employee) { console.warn('Update employee not yet implemented'); return }

    setLoading(true)
    try {
      const [first_name, ...rest] = formData.name.trim().split(' ')
      const res = await invoke<ApiResponse<{ id: number; email: string; phone?: string; first_name: string; last_name: string }>>('create_employee', {
        request: {
          restaurant_id: restaurantId, email: formData.email, phone: formData.phone, password,
          first_name: first_name || formData.name, last_name: rest.join(' ') || '',
          role: formData.role.toUpperCase(), salary: formData.salary, hire_date: formData.joiningDate,
        }
      })
      if (res.success && res.data) {
        const u = res.data
        onSave({
          id: u.id, name: `${u.first_name} ${u.last_name}`.trim() || formData.name,
          email: u.email, phone: u.phone ?? formData.phone, role: formData.role,
          department: formData.department, salary: formData.salary, joiningDate: formData.joiningDate,
          address: formData.address, emergencyContact: formData.emergencyContact, status: formData.status,
        })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleFieldChange = (field: keyof Employee, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
        <p className="text-muted-foreground">{employee ? 'Update employee information' : 'Enter details to add them to your team'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <EmployeeFormFields
          formData={formData} errors={errors} isEditing={!!employee}
          password={password} onFieldChange={handleFieldChange}
          onPasswordChange={setPassword} onPhotoChange={() => {}}
        />
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-2" />Cancel</Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />{loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}
