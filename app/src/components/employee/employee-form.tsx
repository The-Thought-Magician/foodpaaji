import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, Building, Calendar, Save, X, Upload, Lock } from 'lucide-react'
import type { Employee } from '@/types/employee'
import type { ApiResponse } from '@/types/api'

interface EmployeeFormProps {
  employee?: Partial<Employee>
  restaurantId: number
  onSave: (employee: Employee) => void
  onCancel: () => void
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  role?: string
  department?: string
  salary?: string
  joiningDate?: string
  password?: string
}

export function EmployeeForm({ employee, restaurantId, onSave, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'joinedDate'>>({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    address: '',
    emergencyContact: '',
    status: 'active'
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || '',
        department: employee.department || '',
        salary: employee.salary || 0,
        joiningDate: employee.joiningDate || new Date().toISOString().split('T')[0],
        address: employee.address || '',
        emergencyContact: employee.emergencyContact || '',
        status: employee.status || 'active'
      })
    }
  }, [employee])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[\d\s\-+()]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    if (formData.salary <= 0) {
      newErrors.salary = 'Salary must be greater than 0'
    }

    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required'
    }

    // Require password only when creating
    if (!employee && password.trim().length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // For now only support create flow aligned with backend
      if (employee) {
        console.warn('Update employee not yet implemented')
        setLoading(false)
        return
      }

      // Map UI fields to backend CreateUserRequest
      const [first_name, ...rest] = formData.name.trim().split(' ')
      const last_name = rest.join(' ')

      const response = await invoke('create_employee', {
        request: {
          restaurant_id: restaurantId,
          email: formData.email,
          phone: formData.phone,
          password,
          first_name: first_name || formData.name,
          last_name: last_name || '',
          role: toBackendRole(formData.role),
          salary: formData.salary,
          hire_date: formData.joiningDate,
        }
      }) as ApiResponse<{ id: number; email: string; phone?: string; first_name: string; last_name: string }>

      if (response.success) {
        // Minimal echo-back mapping to UI shape
        const u = response.data
        const saved: Employee = {
          id: u?.id ?? 0,
          name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || formData.name,
          email: u?.email ?? formData.email,
          phone: u?.phone ?? formData.phone,
          role: formData.role,
          department: formData.department,
          salary: formData.salary,
          joiningDate: formData.joiningDate,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
          status: formData.status,
        }
        onSave(saved)
      }
    } catch (error) {
      console.error('Failed to save employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Employee, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </h2>
        <p className="text-muted-foreground">
          {employee ? 'Update employee information' : 'Enter employee details to add them to your team'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.name ? 'border-red-500' : 'border-input'
                }`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.email ? 'border-red-500' : 'border-input'
                }`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Phone Number *</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.phone ? 'border-red-500' : 'border-input'
                }`}
              placeholder="Enter phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.role ? 'border-red-500' : 'border-input'
                }`}
            >
              <option value="">Select Role</option>
              <option value="restaurant_owner">Restaurant owner</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="kitchen_staff">Kitchen staff</option>
              <option value="waiter">Waiter</option>
            </select>
            {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Department *</span>
            </label>
            <select
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.department ? 'border-red-500' : 'border-input'
                }`}
            >
              <option value="">Select Department</option>
              <option value="kitchen">Kitchen</option>
              <option value="service">Service</option>
              <option value="management">Management</option>
              <option value="maintenance">Maintenance</option>
              <option value="delivery">Delivery</option>
            </select>
            {errors.department && <p className="text-red-500 text-sm">{errors.department}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Salary (₹) *</label>
            <input
              type="number"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.salary ? 'border-red-500' : 'border-input'
                }`}
              placeholder="Enter monthly salary"
              min="0"
            />
            {errors.salary && <p className="text-red-500 text-sm">{errors.salary}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Joining Date *</span>
            </label>
            <input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => handleInputChange('joiningDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.joiningDate ? 'border-red-500' : 'border-input'
                }`}
            />
            {errors.joiningDate && <p className="text-red-500 text-sm">{errors.joiningDate}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {!employee && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Password *</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.password ? 'border-red-500' : 'border-input'
                }`}
              placeholder="Set a password"
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
            placeholder="Enter full address"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Emergency Contact</label>
          <input
            type="tel"
            value={formData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
            placeholder="Emergency contact number"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Profile Photo</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
          {photoFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {photoFile.name}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function toBackendRole(role: string) {
  // Map UI role values to backend enum (uppercase)
  return role.toUpperCase()
}