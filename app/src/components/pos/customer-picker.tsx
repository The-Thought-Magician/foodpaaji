'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface Customer { id: number; name: string; phone?: string; loyalty_points?: number }

interface Props {
  selected: Customer | null
  results: Customer[]
  search: string
  onSearch: (q: string) => void
  onSelect: (c: Customer) => void
  onClear: () => void
}

export function CustomerPicker({ selected, results, search, onSearch, onSelect, onClear }: Props) {
  if (selected) return (
    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
      <span className="font-medium">
        {selected.name}{selected.phone ? ` · ${selected.phone}` : ''}{selected.loyalty_points ? ` · ${selected.loyalty_points}pts` : ''}
      </span>
      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClear}>×</Button>
    </div>
  )
  return (
    <div className="relative">
      <Input placeholder="Search customer (name/phone)" value={search} onChange={e => onSearch(e.target.value)} />
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
          {results.map(c => (
            <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg" onClick={() => onSelect(c)}>
              <span className="font-medium">{c.name}</span>
              {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
