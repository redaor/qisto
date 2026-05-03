import type { Debt, Currency } from '@/types'
import { formatCurrency, formatDate, getInitials, calcRepaymentDuration } from '@/lib/formatters'

interface Props {
  debt: Debt
  currency: Currency
  onClick: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  loan: '🏦', rent: '🏠', food: '🍽️', travel: '✈️', service: '🔧', other: '📦',
}

export function ArchivedDebtCard({ debt, currency, onClick }: Props) {
  const isPaid     = debt.status === 'paid'
  const startDate  = debt.start_date ?? debt.created_at
  const endDate    = debt.paid_at ?? debt.start_date ?? debt.created_at
  const duration   = isPaid ? calcRepaymentDuration(startDate, endDate) : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
    >
      {/* Top banner */}
      <div className={`px-4 py-2 flex items-center justify-between ${
        isPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-bold uppercase tracking-wide">
            {isPaid ? '🏆 Soldée' : 'Archivée'}
          </span>
        </div>
        {isPaid && debt.paid_at && (
          <span className="text-white/80 text-xs">{formatDate(debt.paid_at)}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {getInitials(debt.contact_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{debt.contact_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">
                {CATEGORY_ICONS[debt.category ?? 'other']} {debt.category ?? 'Autre'}
              </span>
              {debt.interest_rate > 0 && (
                <span className="text-xs text-orange-500 font-medium">{debt.interest_rate}% APR</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`font-bold text-lg ${isPaid ? 'text-emerald-600' : 'text-gray-500'}`}>
              {formatCurrency(debt.total_amount, currency)}
            </p>
          </div>
        </div>

        {/* Montants */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Dette initiale</p>
            <p className="text-sm font-semibold text-gray-700">{formatCurrency(debt.total_amount, currency)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Remboursé</p>
            <p className="text-sm font-semibold text-emerald-700">
              {formatCurrency(debt.total_amount - debt.remaining_amount, currency)}
            </p>
          </div>
        </div>

        {/* Durée */}
        {isPaid && duration && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
            <span className="text-amber-500">⏱</span>
            <p className="text-xs text-amber-700 font-medium">Réglé en {duration}</p>
          </div>
        )}
      </div>
    </button>
  )
}
