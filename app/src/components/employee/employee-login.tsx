import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { User, Lock, Building, Eye, EyeOff } from 'lucide-react'
import type { ApiResponse } from '@/types/api'

interface EmployeeLoginRequest {
  email: string
  password: string
  restaurant_id: number
}

interface EmployeeLoginResponse {
  user: {
    id: number
    name: string
    email: string
    role: string
    restaurant_id: number
  }
  token: string
}

interface EmployeeLoginProps {
  restaurantId: number
  onLoginSuccess: (userData: EmployeeLoginResponse) => void
  onCancel?: () => void
}

export function EmployeeLogin({ restaurantId, onLoginSuccess, onCancel }: EmployeeLoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim() || !formData.password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const request: EmployeeLoginRequest = {
        email: formData.email.trim(),
        password: formData.password,
        restaurant_id: restaurantId
      }

      const response = await invoke('authenticate_employee', { request }) as ApiResponse<EmployeeLoginResponse>
      
      if (response.success && response.data) {
        localStorage.setItem('employee_token', response.data.token)
        localStorage.setItem('employee_data', JSON.stringify(response.data.user))
        onLoginSuccess(response.data)
      } else {
        setError(response.error || 'Login failed')
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Building className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Employee Login</h2>
        <p className="text-muted-foreground">
          Sign in to access your restaurant dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Email Address</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Password</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-100 border border-red-300 rounded-md">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Having trouble? Contact your manager for assistance.
        </p>
      </div>
    </div>
  )
}