'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react'

interface FeedbackSummary {
  total: number; average_rating: number; positive: number; negative: number
}

interface FeedbackEntry {
  id: number; rating: number; comment: string | null
  created_at: string; bill_id: number | null; bill_number: string | null
  customer_name: string | null
}


export default function FeedbackPage() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [filter, setFilter] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [sumRes, allRes] = await Promise.all([
      invoke<{ success: boolean; data: FeedbackSummary }>('get_feedback_summary').catch(() => null),
      invoke<{ success: boolean; data: FeedbackEntry[] }>('get_all_feedback', { limit: 100 }).catch(() => null),
    ])
    if (sumRes?.success) setSummary(sumRes.data)
    if (allRes?.success) setEntries(allRes.data)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter ? entries.filter(e => e.rating === filter) : entries
  const distribution = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: entries.filter(e => e.rating === r).length }))
  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Customer Feedback</h2>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Avg Rating (30d)</p>
            <p className="text-3xl font-bold flex items-center gap-1">
              {summary.average_rating.toFixed(1)} <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Reviews</p>
            <p className="text-3xl font-bold">{summary.total}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ThumbsUp className="w-3 h-3" />Positive</p>
            <p className="text-3xl font-bold text-green-600">{summary.positive}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ThumbsDown className="w-3 h-3" />Negative</p>
            <p className="text-3xl font-bold text-red-600">{summary.negative}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Rating Distribution</p>
          {distribution.map(d => (
            <button key={d.rating} onClick={() => setFilter(filter === d.rating ? null : d.rating)}
              className={`flex items-center gap-2 w-full text-sm py-1 rounded px-1 transition-colors ${filter === d.rating ? 'bg-muted' : 'hover:bg-muted/50'}`}>
              <span className="w-4 text-right">{d.rating}</span>
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-amber-500 rounded-full h-2" style={{ width: `${(d.count / maxCount) * 100}%` }} />
              </div>
              <span className="w-6 text-right text-xs text-muted-foreground">{d.count}</span>
            </button>
          ))}
          {filter && <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => setFilter(null)}>Clear filter</Button>}
        </div>

        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-medium">{filter ? `${filter}-star reviews` : 'All Reviews'} ({filtered.length})</p>
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No feedback yet</p>}
          {filtered.map(e => (
            <div key={e.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= e.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  {e.customer_name && <span className="text-sm font-medium">{e.customer_name}</span>}
                  {e.bill_number && <Badge variant="outline" className="text-xs">{e.bill_number}</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
              {e.comment && <p className="text-sm text-muted-foreground mt-1">{e.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
