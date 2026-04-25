import { useNavigate } from 'react-router-dom'
import type { Debt } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { DebtProgressBar } from './DebtProgressBar'
import { formatCurrency, getInitials } from '@/lib/formatters'

interface DebtCardProps {
  debt: Debt
}

const avatarColors: Record<string, string> = {
  owed_to_me: 'bg-emerald-100 text-emerald-700',
  i_owe:      'bg-red-100 text-red-700',
}

export function DebtCard({ debt }: DebtCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/debts/${debt.id}`)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColors[debt.type]}`}>
          {getInitials(debt.contact_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{debt.contact_name}</p>
          <Badge type={debt.type} />
        </div>
        <div className="text-right">
          <p className={`font-bold text-lg ${debt.type === 'owed_to_me' ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(debt.remaining_amount)}
          </p>
          <p className="text-xs text-gray-400">of {formatCurrency(debt.total_amount)}</p>
        </div>
      </div>
      <DebtProgressBar total={debt.total_amount} remaining={debt.remaining_amount} />
    </div>
  )
}
