'use client'

import { User, Mail, Phone, Building, Calendar, Upload, Lock } from 'lucide-react'
import type { Employee } from '@/types/employee'

export interface FormErrors {
  name?: string
  email?: string
  phone?: string
  role?: string
  department?: string
  salary?: string
  joiningDate?: string
  password?: string
}

type EmployeeFormData = Omit<Employee, 'id' | 'joinedDate'>

interface Props {
  formData: EmployeeFormData
  errors: FormErrors
  isEditing: boolean
  password: string
  onFieldChange: (field: keyof Employee, value: string | number) => void
  onPasswordChange: (v: string) => void
  onPhotoChange: (file: File) => void
}

const inputClass = (error?: string) =>
  `w-full px-3 py-2 border rounded-md bg-background ${error ? 'border-destructive' : 'border-input'}`

const ROLES = [
  { value: 'restaurant_owner', label: 'Restaurant owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'kitchen_staff', label: 'Kitchen staff' },
  { value: 'waiter', label: 'Waiter' },
]

const DEPARTMENTS = ['kitchen', 'service', 'management', 'maintenance', 'delivery']

export default function EmployeeFormFields({ formData, errors, isEditing, password, onFieldChange, onPasswordChange, onPhotoChange }: Props) {
  const err = (field: string) => errors[field as keyof FormErrors]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />Full Name *</label>
          <input type="text" value={formData.name} placeholder="Enter full name"
            className={inputClass(err('name'))}
            onChange={e => onFieldChange('name', e.target.value)} />
          {err('name') && <p className="text-destructive text-sm">{err('name')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" />Email Address *</label>
          <input type="email" value={formData.email} placeholder="Enter email address"
            className={inputClass(err('email'))}
            onChange={e => onFieldChange('email', e.target.value)} />
          {err('email') && <p className="text-destructive text-sm">{err('email')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-4 w-4" />Phone Number *</label>
          <input type="tel" value={formData.phone} placeholder="Enter phone number"
            className={inputClass(err('phone'))}
            onChange={e => onFieldChange('phone', e.target.value)} />
          {err('phone') && <p className="text-destructive text-sm">{err('phone')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Role *</label>
          <select value={formData.role} className={inputClass(err('role'))}
            onChange={e => onFieldChange('role', e.target.value)}>
            <option value="">Select Role</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {err('role') && <p className="text-destructive text-sm">{err('role')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Building className="h-4 w-4" />Department *</label>
          <select value={formData.department} className={inputClass(err('department'))}
            onChange={e => onFieldChange('department', e.target.value)}>
            <option value="">Select Department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          {err('department') && <p className="text-destructive text-sm">{err('department')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Monthly Salary (₹) *</label>
          <input type="number" value={formData.salary} min="0" placeholder="Enter monthly salary"
            className={inputClass(err('salary'))}
            onChange={e => onFieldChange('salary', parseFloat(e.target.value) || 0)} />
          {err('salary') && <p className="text-destructive text-sm">{err('salary')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" />Joining Date *</label>
          <input type="date" value={formData.joiningDate}
            className={inputClass(err('joiningDate'))}
            onChange={e => onFieldChange('joiningDate', e.target.value)} />
          {err('joiningDate') && <p className="text-destructive text-sm">{err('joiningDate')}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select value={formData.status} className="w-full px-3 py-2 border border-input rounded-md bg-background"
            onChange={e => onFieldChange('status', e.target.value as 'active' | 'inactive')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4" />Password *</label>
          <input type="password" value={password} placeholder="Set a password"
            className={inputClass(err('password'))}
            onChange={e => onPasswordChange(e.target.value)} />
          {err('password') && <p className="text-destructive text-sm">{err('password')}</p>}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <textarea value={formData.address} rows={3} placeholder="Enter full address"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
          onChange={e => onFieldChange('address', e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Emergency Contact</label>
        <input type="tel" value={formData.emergencyContact} placeholder="Emergency contact number"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
          onChange={e => onFieldChange('emergencyContact', e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2"><Upload className="h-4 w-4" />Profile Photo</label>
        <input type="file" accept="image/*"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
          onChange={e => { const f = e.target.files?.[0]; if (f?.type.startsWith('image/')) onPhotoChange(f) }} />
      </div>
    </div>
  )
}
