'use client'

import { Button } from '@/components/ui/button'
import { MoreVertical, Phone, Calendar, Crown, Shield, Utensils, Coffee } from 'lucide-react'
import type { Employee } from '@/types/employee'

const ROLE_CONFIG = {
  restaurant_owner: { icon: Crown, color: 'gradient-spice', label: 'Owner' },
  manager: { icon: Shield, color: 'gradient-accent', label: 'Manager' },
  cashier: { icon: Coffee, color: 'bg-gradient-to-br from-blue-500 to-blue-600', label: 'Cashier' },
  kitchen_staff: { icon: Utensils, color: 'bg-gradient-to-br from-orange-500 to-orange-600', label: 'Kitchen Staff' },
  waiter: { icon: Coffee, color: 'bg-gradient-to-br from-purple-500 to-purple-600', label: 'Waiter' },
}

interface Props {
  employee: Employee
}

export default function EmployeeCard({ employee }: Props) {
  const config = ROLE_CONFIG[employee.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.waiter
  const RoleIcon = config.icon
  const initials = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in">
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
            <Phone className="w-3.5 h-3.5" /><span>{employee.phone}</span>
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
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          employee.status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
        }`}>{employee.status}</span>
        <Button variant="ghost" size="sm" className="text-xs">View Details</Button>
      </div>
    </div>
  )
}
