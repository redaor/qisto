import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { DebtCard } from '@/components/debt/DebtCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/formatters'
import { calcTotals } from '@/lib/calculations'

export function Dashboard() {
  const { debts, loading, fetchDebts } = useDebtStore()

  useEffect(() => { fetchDebts() }, [])

  const totals = calcTotals(debts)
  const recentDebts = debts.slice(0, 3)

  return (
    <div className="px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your debt snapshot</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 font-medium mb-1">Owed to me</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.owedToMe)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-medium mb-1">I owe</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.iOwe)}</p>
        </div>
        <div className={`rounded-2xl p-4 ${totals.net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <p className={`text-xs font-medium mb-1 ${totals.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net</p>
          <p className={`text-lg font-bold ${totals.net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            {formatCurrency(Math.abs(totals.net))}
          </p>
        </div>
      </div>

      {/* Recent Debts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent debts</h2>
          <Link to="/debts" className="text-sm text-emerald-600 font-medium">See all</Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : recentDebts.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-gray-500 text-sm mb-3">No debts yet</p>
            <Link to="/add">
              <Button size="sm">Add your first debt</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDebts.map(debt => <DebtCard key={debt.id} debt={debt} />)}
          </div>
        )}
      </div>

    </div>
  )
}
