import { useNavigate } from 'react-router-dom'
import type { Debt, Currency, DebtCategory } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { UrgencyBadge } from './UrgencyBadge'
import { DebtProgressBar } from './DebtProgressBar'
import { formatCurrency, getInitials, getDaysUntilDue } from '@/lib/formatters'

const CATEGORY_LABELS: Record<DebtCategory, string> = {
  loan:    'Prêt',
  rent:    'Loyer',
  food:    'Nourriture',
  travel:  'Voyage',
  service: 'Service',
  other:   'Autre',
}

interface DebtCardProps {
  debt: Debt
  currency?: Currency
  compact?: boolean
  onPay?: () => void
}

const avatarColors: Record<string, string> = {
  owed_to_me: 'bg-emerald-100 text-emerald-700',
  i_owe:      'bg-red-100 text-red-700',
}

export function DebtCard({ debt, currency = 'EUR', compact = false, onPay }: DebtCardProps) {
  const navigate = useNavigate()
  const daysLeft = debt.due_date ? getDaysUntilDue(debt.due_date) : null

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/debts/${debt.id}`)}
        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors active:scale-[0.99]"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColors[debt.type]}`}>
          {getInitials(debt.contact_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{debt.contact_name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[10px] text-gray-400">{CATEGORY_LABELS[debt.category ?? 'other']}</span>
            {debt.interest_rate > 0 && (
              <span className="text-[10px] text-orange-500 font-medium">{debt.interest_rate}% APR</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm ${debt.type === 'owed_to_me' ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(debt.remaining_amount, currency)}
          </p>
          {daysLeft !== null && daysLeft <= 7 && (
            <p className="text-[10px] text-red-400">{daysLeft}j</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div
        onClick={() => navigate(`/debts/${debt.id}`)}
        className="p-4 cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColors[debt.type]}`}>
            {getInitials(debt.contact_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 truncate">{debt.contact_name}</p>
              <Badge type={debt.type} />
              {debt.category && debt.category !== 'other' && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {CATEGORY_LABELS[debt.category]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {debt.due_date && <UrgencyBadge dueDate={debt.due_date} />}
              {debt.interest_rate > 0 && (
                <span className="text-[10px] text-orange-500 font-medium bg-orange-50 px-1.5 py-0.5 rounded-full">
                  {debt.interest_rate}% APR
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`font-bold text-lg leading-tight ${debt.type === 'owed_to_me' ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(debt.remaining_amount, currency)}
            </p>
            <p className="text-xs text-gray-400">/ {formatCurrency(debt.total_amount, currency)}</p>
          </div>
        </div>
        <DebtProgressBar total={debt.total_amount} remaining={debt.remaining_amount} />
      </div>

      {onPay && debt.remaining_amount > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={e => { e.stopPropagation(); onPay() }}
            className="w-full py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            Payer
          </button>
        </div>
      )}
    </div>
  )
}
