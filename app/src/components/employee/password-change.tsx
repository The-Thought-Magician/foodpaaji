'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff, Shield } from 'lucide-react'
import type { ApiResponse } from '@/types/api'

interface UpdatePasswordRequest {
  employee_id: number
  current_password: string
  new_password: string
}

interface PasswordChangeProps {
  employeeId: number
  onSuccess: () => void
  onCancel: () => void
}

export function PasswordChange({ employeeId, onSuccess, onCancel }: PasswordChangeProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validatePassword = (password: string): string[] => {
    const errors = []
    if (password.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter')
    if (!/\d/.test(password)) errors.push('One number')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character')
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    const passwordErrors = validatePassword(formData.newPassword)
    if (passwordErrors.length > 0) {
      setError(`Password must have: ${passwordErrors.join(', ')}`)
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const request: UpdatePasswordRequest = {
        employee_id: employeeId,
        current_password: formData.currentPassword,
        new_password: formData.newPassword
      }

      const response = await invoke('update_employee_password', { request }) as ApiResponse<string>
      
      if (response.success) {
        setSuccess('Password updated successfully')
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setError(response.error || 'Failed to update password')
      }
    } catch (err) {
      setError('Failed to update password. Please try again.')
      console.error('Password update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const passwordStrength = validatePassword(formData.newPassword)

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Change Password</h2>
        <p className="text-muted-foreground">
          Update your password to keep your account secure
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Current Password</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>New Password</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.newPassword && passwordStrength.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {passwordStrength.map((req, index) => (
                  <li key={index} className="text-red-600">{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Confirm New Password</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <p className="text-sm text-red-600">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-100 border border-red-300 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-800 bg-green-100 border border-green-300 rounded-md">
            {success}
          </div>
        )}

        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || passwordStrength.length > 0 || formData.newPassword !== formData.confirmPassword} 
            className="flex-1"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  )
}