export interface Employee {
  id: number
  name: string
  email: string
  phone: string
  role: string
  department: string
  salary: number
  joiningDate: string
  address: string
  emergencyContact: string
  status: 'active' | 'inactive'
  last_login?: string
}