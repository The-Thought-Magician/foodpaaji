import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: ReactNode
  className?: string
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background font-sans antialiased",
      className
    )}>
      <div className="relative flex min-h-screen flex-col">
        <div className="flex flex-1">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}