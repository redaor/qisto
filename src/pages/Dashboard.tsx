import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { DebtCard } from '@/components/debt/DebtCard'
import { DebtDonut } from '@/components/charts/DebtDonut'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatCurrency, getDaysUntilDue } from '@/lib/formatters'
import { calcTotals } from '@/lib/calculations'

export function Dashboard() {
  const { debts, profile, loading, fetchDebts, fetchProfile } = useDebtStore()

  useEffect(() => {
    fetchDebts()
    fetchProfile()
  }, [])

  const currency = profile?.currency ?? 'EUR'
  const totals = calcTotals(debts)

  const urgentDebts = debts.filter(d =>
    d.due_date && getDaysUntilDue(d.due_date) <= 7
  )

  const topDebts = debts.slice(0, 3)

  return (
    <div className="px-4 py-6 space-y-5">

      {/* Header dégradé */}
      <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-5 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
        <p className="text-emerald-100 text-sm mb-1 relative z-10">Solde net</p>
        <p className="text-4xl font-bold relative z-10">
          {totals.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.net), currency)}
        </p>
        <p className="text-emerald-100 text-xs mt-1 relative z-10">
          {debts.length} dette{debts.length > 1 ? 's' : ''} active{debts.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Deux cartes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8 8-8-8" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 mb-0.5">On me doit</p>
          <p className="font-bold text-emerald-600 text-lg">{formatCurrency(totals.owedToMe, currency)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m-8 8l8-8 8 8" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 mb-0.5">Je dois</p>
          <p className="font-bold text-red-500 text-lg">{formatCurrency(totals.iOwe, currency)}</p>
        </div>
      </div>

      {/* Alerte urgences */}
      {urgentDebts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-orange-700 text-sm">
              {urgentDebts.length} échéance{urgentDebts.length > 1 ? 's' : ''} urgente{urgentDebts.length > 1 ? 's' : ''}
            </p>
          </div>
          {urgentDebts.map(d => (
            <Link key={d.id} to={`/debts/${d.id}`} className="block text-xs text-orange-600 hover:underline">
              • {d.contact_name} — {formatCurrency(d.remaining_amount, currency)}
            </Link>
          ))}
        </div>
      )}

      {/* Donut chart */}
      {debts.length > 0 && (
        <DebtDonut owedToMe={totals.owedToMe} iOwe={totals.iOwe} currency={currency} />
      )}

      {/* Top dettes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">Plus grosses dettes</h2>
            <p className="text-xs text-gray-400">Triées par montant restant</p>
          </div>
          <Link to="/debts" className="text-sm text-emerald-600 font-medium">Voir tout</Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : topDebts.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-gray-500 text-sm mb-3">Aucune dette active !</p>
            <Link to="/add"><Button size="sm">Ajouter une dette</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {topDebts.map(debt => (
              <DebtCard key={debt.id} debt={debt} currency={currency} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
