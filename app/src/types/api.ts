export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  employees: T[]
  total: number
}