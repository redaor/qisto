import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { DebtCard } from '@/components/debt/DebtCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { DebtType } from '@/types'

type Filter = 'all' | DebtType

export function Debts() {
  const { debts, loading, fetchDebts } = useDebtStore()
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { fetchDebts() }, [])

  const filtered = filter === 'all' ? debts : debts.filter(d => d.type === filter)

  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'owed_to_me', label: 'Owe me' },
    { value: 'i_owe', label: 'I owe' },
  ]

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Debts</h1>
        <Link to="/add"><Button size="sm">+ Add</Button></Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === tab.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          title="No debts here"
          description="Add your first debt to start tracking"
          action={<Link to="/add"><Button size="sm">Add debt</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(debt => <DebtCard key={debt.id} debt={debt} />)}
        </div>
      )}
    </div>
  )
}
